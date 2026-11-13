// Customer-facing order endpoints: price check, checkout, the payment screen,
// the "thank you" page and order tracking.
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { env } from "../config/env.js";
import {
  PLACED_STATUSES,
  STATUS_LABELS,
  isCodAvailable,
  isUpiAvailable,
  priceOrder,
} from "../config/store.js";
import { HttpError, badRequest, conflict, notFound } from "../utils/httpError.js";
import { normalizeOrderNumber } from "../utils/orderNumber.js";
import { email, integer, isObjectId, line, phone, pincode } from "../utils/validate.js";
import * as razorpay from "../services/razorpay.js";
import { checkCoupon, couponDiscountFor } from "../services/couponService.js";
import {
  expireOrder,
  markPaid,
  newAccessToken,
  placeCodOrder,
  releaseStock,
  reserveStock,
  saveNewOrder,
  syncPayment,
} from "../services/orderService.js";

const TOKEN_PATTERN = /^[0-9a-f]{32}$/;
const CHECKOUT_KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- the cart ----------

function pickColor(product, wanted) {
  if (!product.colors.length) return "";
  const match = product.colors.find(
    (color) => color.toLowerCase() === String(wanted || "").toLowerCase(),
  );
  return match || product.colors[0];
}

// Looks up every cart line in the database. Prices and stock always come from
// here — whatever the browser sent is ignored.
//
// strict = true  (checkout): any problem stops the order.
// strict = false (cart page): problems are reported and quantities trimmed.
async function resolveCart(rawItems, { strict }) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw badRequest("Your cart is empty.", { code: "CART_EMPTY" });
  }
  if (rawItems.length > 40) throw badRequest("There are too many items in your cart.");

  const wanted = [];

  for (const raw of rawItems) {
    const productId = isObjectId(raw?.productId) ? raw.productId : "";
    const slug = line(raw?.slug, 80).toLowerCase();
    const quantity = integer(raw?.quantity, { min: 1, max: 1000 });

    if ((!productId && !slug) || quantity === null) {
      if (strict) {
        throw badRequest("An item in your cart could not be read. Please refresh your cart.", {
          code: "CART_CHANGED",
        });
      }
      continue;
    }

    wanted.push({ key: line(raw?.key, 120), productId, slug, quantity, color: line(raw?.color, 30) });
  }

  const ids = [...new Set(wanted.map((item) => item.productId).filter(Boolean))];
  const slugs = [...new Set(wanted.map((item) => item.slug).filter(Boolean))];

  const products = await Product.find({ $or: [{ _id: { $in: ids } }, { slug: { $in: slugs } }] });
  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  const maxPerItem = env.store.maxQuantityPerItem;
  const takenPerProduct = new Map();
  const lines = [];
  const problems = [];

  for (const want of wanted) {
    const product = byId.get(want.productId) || bySlug.get(want.slug);

    if (!product || product.status !== "active") {
      problems.push({
        key: want.key,
        code: "UNAVAILABLE",
        message: "An item in your cart is no longer available and was removed.",
      });
      continue;
    }

    const id = product._id.toString();
    const alreadyTaken = takenPerProduct.get(id) || 0;
    const available = Math.max(0, Math.min(maxPerItem, product.stock) - alreadyTaken);

    if (available <= 0) {
      problems.push({
        key: want.key,
        code: product.stock <= 0 ? "SOLD_OUT" : "LIMIT",
        message:
          product.stock <= 0
            ? `${product.name} is sold out.`
            : `You can order up to ${Math.min(maxPerItem, product.stock)} of ${product.name}.`,
      });
      continue;
    }

    let quantity = want.quantity;

    if (quantity > available) {
      problems.push({
        key: want.key,
        code: "QUANTITY_REDUCED",
        message:
          product.stock < maxPerItem
            ? `Only ${product.stock} of ${product.name} left in stock.`
            : `You can order up to ${maxPerItem} of ${product.name}.`,
      });
      quantity = available;
    }

    takenPerProduct.set(id, alreadyTaken + quantity);

    const color = pickColor(product, want.color);
    const existing = lines.find((entry) => entry.product === product && entry.color === color);

    if (existing) existing.quantity += quantity;
    else lines.push({ key: want.key, product, color, quantity });
  }

  if (strict && problems.length) {
    throw conflict(problems[0].message, { code: "CART_CHANGED", problems });
  }

  const subtotal = lines.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);

  return { lines, problems, subtotal };
}

const toOrderItem = ({ product, color, quantity }) => ({
  product: product._id,
  name: product.name,
  sku: product.sku,
  slug: product.slug,
  image: product.images[0] || "",
  color,
  price: product.price,
  quantity,
});

// POST /api/orders/quote  { items: [{ productId | slug, quantity, color }] }
// The cart and checkout pages call this to show live prices, stock and totals.
export async function quote(req, res) {
  const { lines, problems, subtotal } = await resolveCart(req.body?.items, { strict: false });

  // Optional coupon: checked here so the checkout page can show it straight away.
  const { coupon, error: couponError } = await checkCoupon(req.body?.couponCode, { subtotal });
  const couponDiscount = coupon ? couponDiscountFor(coupon, subtotal) : 0;
  const couponInfo = coupon
    ? {
        code: coupon.code,
        description: coupon.description,
        paymentMethod: coupon.paymentMethod,
        discount: couponDiscount,
      }
    : couponError
      ? { error: couponError }
      : null;

  // A coupon limited to one payment method only applies to that option.
  const optionPrice = (method) =>
    priceOrder(
      subtotal,
      method,
      coupon && (coupon.paymentMethod === "any" || coupon.paymentMethod === method) ? couponDiscount : 0,
    );

  res.set("Cache-Control", "no-store");
  res.json({
    items: lines.map(({ key, product, color, quantity }) => ({
      key,
      productId: product._id.toString(),
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      category: product.category,
      icon: product.icon,
      shortDescription: product.shortDescription,
      image: product.images[0] || "",
      color,
      price: product.price,
      compareAtPrice: product.compareAtPrice > product.price ? product.compareAtPrice : 0,
      quantity,
      stock: product.stock,
      maxQuantity: Math.min(env.store.maxQuantityPerItem, product.stock),
      lineTotal: product.price * quantity,
    })),
    problems,
    itemCount: lines.reduce((sum, entry) => sum + entry.quantity, 0),
    subtotal,
    coupon: couponInfo,
    options: {
      upi: { enabled: isUpiAvailable(), ...optionPrice("upi") },
      cod: { enabled: isCodAvailable(), ...optionPrice("cod") },
    },
  });
}

// ---------- checkout ----------

function cleanCustomer(raw = {}) {
  return {
    firstName: line(raw.firstName, 60),
    lastName: line(raw.lastName, 60),
    // Left as typed when invalid so the model can answer with a clear message.
    email: email(raw.email) || line(raw.email, 254).toLowerCase(),
    phone: phone(raw.phone) || line(raw.phone, 20),
  };
}

function cleanAddress(raw = {}) {
  return {
    line1: line(raw.line1 ?? raw.address1, 200),
    line2: line(raw.line2 ?? raw.address2, 200),
    city: line(raw.city, 80),
    state: line(raw.state, 60),
    pincode: pincode(raw.pincode) || line(raw.pincode, 12),
  };
}

// Where the shopper came from, so links in emails and the redirect after
// payment go back to the same address. Only our own addresses are accepted.
function requestLinks(req) {
  const self = `${req.protocol}://${req.host}`;
  const origin = String(req.get("origin") || "").replace(/\/+$/, "");

  const site = origin && (env.clientUrls.includes(origin) || origin === self) ? origin : env.clientUrl;

  return { site, api: env.serverUrl || self };
}

function checkoutResponse(order) {
  const awaiting = order.status === "awaiting_payment";

  return {
    orderId: order.accessToken,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.payment.method,
    paymentStatus: order.payment.status,
    subtotal: order.subtotal,
    discount: order.discount,
    couponCode: order.coupon?.code || "",
    couponDiscount: order.couponDiscount || 0,
    discountPercent: order.payment.discountPercent,
    shippingFee: order.shippingFee,
    total: order.total,
    delivery: order.delivery,
    paymentUrl: awaiting ? order.payment.linkUrl || null : null,
    expiresAt: awaiting ? order.payment.linkExpiresAt || null : null,
  };
}

// The same checkout sent twice (double click, flaky network retry) returns
// the order that already exists instead of creating another.
async function existingCheckout(checkoutKey) {
  if (!checkoutKey) return null;

  let order = await Order.findOne({ checkoutKey });

  // The first request may still be creating its payment link.
  for (let tries = 0; order && tries < 12; tries += 1) {
    const linkPending = order.status === "awaiting_payment" && !order.payment.linkUrl;
    if (!linkPending) break;
    await sleep(400);
    order = await Order.findOne({ checkoutKey });
  }

  return order;
}

function describeOrder(order) {
  const list = order.items.map((item) => `${item.name} x${item.quantity}`).join(", ");
  const note = order.discount > 0 ? ` (${order.payment.discountPercent}% UPI discount applied)` : "";
  return `${env.store.name} order ${order.orderNumber} — ${list}${note}`;
}

// POST /api/orders/checkout
// body: { items, customer, shippingAddress, paymentMethod: "upi" | "cod",
//         expectedTotal?, checkoutKey? }
export async function checkout(req, res) {
  const body = req.body || {};
  const method = ["upi", "cod"].includes(body.paymentMethod) ? body.paymentMethod : null;

  if (!method) throw badRequest("Please choose a payment method.");

  if (method === "upi" && !isUpiAvailable()) {
    throw new HttpError(
      503,
      isCodAvailable()
        ? "Online payment isn't available right now. Please choose Cash on Delivery."
        : "Online payment isn't available right now. Please try again later.",
    );
  }

  if (method === "cod" && !isCodAvailable()) {
    throw badRequest("Cash on Delivery isn't available. Please pay online.");
  }

  const checkoutKey = CHECKOUT_KEY_PATTERN.test(body.checkoutKey) ? body.checkoutKey : undefined;

  const repeat = await existingCheckout(checkoutKey);
  if (repeat) return res.json(checkoutResponse(repeat));

  const { lines, subtotal } = await resolveCart(body.items, { strict: true });
  const items = lines.map(toOrderItem);
  const customer = cleanCustomer(body.customer);

  let coupon = null;
  if (body.couponCode) {
    const result = await checkCoupon(body.couponCode, { subtotal, method, phone: customer.phone });
    if (result.error) throw badRequest(result.error, { code: "COUPON_INVALID" });
    coupon = result.coupon;
  }

  const price = priceOrder(subtotal, method, couponDiscountFor(coupon, subtotal));

  // The shopper agreed to the total on their screen. If a price changed since
  // the page loaded, show them the new total instead of charging it silently.
  const expectedTotal = integer(body.expectedTotal, { min: 0 });
  if (expectedTotal !== null && expectedTotal !== price.total) {
    throw conflict("Prices in your cart have changed. Please review your order and try again.", {
      code: "PRICE_CHANGED",
    });
  }

  const order = new Order({
    orderNumber: "PENDING", // replaced with a real number when saved
    accessToken: newAccessToken(),
    items,
    customer,
    shippingAddress: cleanAddress(body.shippingAddress),
    subtotal: price.subtotal,
    discount: price.discount,
    coupon: coupon ? { code: coupon.code, description: coupon.description } : undefined,
    couponDiscount: price.couponDiscount,
    shippingFee: price.shippingFee,
    total: price.total,
    payment: { method, status: "pending", discountPercent: price.discountPercent },
    delivery: price.delivery,
    status: method === "cod" ? "pending" : "awaiting_payment",
    source: /Mobi|Android|iPhone|iPad/i.test(req.get("user-agent") || "")
      ? "Mobile website"
      : "Website",
    links: requestLinks(req),
    checkoutKey,
  });

  // Check the form before touching stock (errors become a 400 with a clear message).
  await order.validate();

  const soldOut = await reserveStock(items);
  if (soldOut) {
    throw conflict(`${soldOut.name} just sold out. Please update your cart.`, {
      code: "CART_CHANGED",
    });
  }
  order.stockReserved = true;

  try {
    if (method === "cod") {
      await placeCodOrder(order);
      return res.status(201).json(checkoutResponse(order));
    }

    order.timeline.push({ status: "awaiting_payment", message: "Checkout started — waiting for payment." });
    await saveNewOrder(order);
  } catch (error) {
    await releaseStock(items);

    // Lost a race with an identical request: hand back that order.
    if (error?.code === 11000 && error?.keyPattern?.checkoutKey) {
      const winner = await existingCheckout(checkoutKey);
      if (winner) return res.json(checkoutResponse(winner));
    }

    throw error;
  }

  // UPI: one fixed-amount Razorpay payment link for this order.
  try {
    const expiresAt = new Date(Date.now() + env.store.paymentWindowMinutes * 60 * 1000);

    const link = await razorpay.createPaymentLink({
      amount: order.total,
      referenceId: order.orderNumber,
      description: describeOrder(order),
      customer: {
        name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        email: order.customer.email,
        contact: `+91${order.customer.phone}`,
      },
      expiresAt,
      callbackUrl: `${order.links.api}/api/orders/payment-callback`,
      notes: { brand: env.store.name, orderNumber: order.orderNumber },
    });

    order.payment.linkId = link.id;
    order.payment.linkUrl = link.short_url;
    order.payment.linkExpiresAt = expiresAt;
    await order.save();
  } catch (error) {
    console.error(`Razorpay payment link error for ${order.orderNumber}:`, error.message);
    await expireOrder(order._id, { cancelLink: false, message: "Payment could not be started." });
    throw new HttpError(502, "We couldn't start the payment. Please try again in a moment.");
  }

  res.status(201).json(checkoutResponse(order));
}

// ---------- payment results ----------

// GET /api/orders/payment-callback
// Razorpay sends the customer's browser here after they pay through the link.
export async function paymentCallback(req, res) {
  const {
    razorpay_payment_id: paymentId,
    razorpay_payment_link_id: linkId,
    razorpay_payment_link_reference_id: referenceId,
    razorpay_payment_link_status: status,
    razorpay_signature: signature,
  } = req.query;

  const allStrings = [paymentId, linkId, referenceId, status, signature].every(
    (value) => typeof value === "string" && value.length > 0 && value.length < 200,
  );

  const order = allStrings ? await Order.findOne({ "payment.linkId": linkId }) : null;
  const site = order?.links?.site || env.clientUrl;

  if (!order) return res.redirect(`${site}/order-failed`);

  // Proves this redirect really came from Razorpay and not a typed-in address.
  const genuine = razorpay.verifyCallbackSignature({
    linkId,
    referenceId,
    status,
    paymentId,
    signature,
  });

  if (!genuine || status !== "paid") {
    return res.redirect(`${site}/order-failed?order=${order.accessToken}`);
  }

  await markPaid(order._id, paymentId);
  res.redirect(`${site}/order-success?order=${order.accessToken}`);
}

// POST /api/payments/razorpay/webhook
// Optional but recommended: Razorpay calls this from its own servers, so the
// order is confirmed even if the customer closes the page right after paying.
export async function razorpayWebhook(req, res) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : null;

  if (!env.razorpay.webhookSecret) {
    return res.status(503).json({ message: "Webhook secret is not configured." });
  }

  if (!razorpay.verifyWebhookSignature(rawBody, req.get("x-razorpay-signature"))) {
    return res.status(400).json({ message: "Invalid signature." });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ message: "Invalid payload." });
  }

  // Always answer 200 from here on so Razorpay doesn't keep retrying;
  // anything that goes wrong is logged instead.
  try {
    const link = event?.payload?.payment_link?.entity;
    const payment = event?.payload?.payment?.entity;
    const order =
      link?.id && typeof link.id === "string"
        ? await Order.findOne({ "payment.linkId": link.id })
        : null;

    if (order) {
      if (event.event === "payment_link.paid") {
        await markPaid(order._id, typeof payment?.id === "string" ? payment.id : "");
      } else if (["payment_link.expired", "payment_link.cancelled"].includes(event.event)) {
        await expireOrder(order._id, { cancelLink: false });
      }
    }
  } catch (error) {
    console.error("Razorpay webhook handling failed:", error.message);
  }

  res.json({ ok: true });
}

// ---------- the customer's own order pages ----------

async function findByToken(token) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) throw notFound("Order not found.");
  const order = await Order.findOne({ accessToken: token });
  if (!order) throw notFound("Order not found.");
  return order;
}

const statusPayload = (order) => ({
  orderNumber: order.orderNumber,
  status: order.status,
  paymentStatus: order.payment.status,
  placed: PLACED_STATUSES.includes(order.status),
  expiresAt: order.payment.linkExpiresAt || null,
});

// The payment screen polls every few seconds; ask Razorpay at most this often per order.
const SYNC_EVERY_MS = 2500;
const lastSync = new Map();

function shouldSync(orderId) {
  const key = orderId.toString();
  const now = Date.now();

  if (now - (lastSync.get(key) || 0) < SYNC_EVERY_MS) return false;

  if (lastSync.size > 2000) lastSync.clear();
  lastSync.set(key, now);
  return true;
}

// GET /api/orders/:token/status — "has the payment come through yet?"
export async function orderStatus(req, res) {
  let order = await findByToken(req.params.token);

  if (order.status === "awaiting_payment" && shouldSync(order._id)) {
    try {
      order = await syncPayment(order);
    } catch (error) {
      console.warn(`Payment status check failed for ${order.orderNumber}:`, error.message);
    }
  }

  res.set("Cache-Control", "no-store");
  res.json(statusPayload(order));
}

// POST /api/orders/:token/cancel-payment — the customer went back to change
// their details. Frees the stock straight away (unless they did pay).
export async function cancelPayment(req, res) {
  let order = await findByToken(req.params.token);

  if (order.status === "awaiting_payment") {
    try {
      order = await syncPayment(order);
    } catch {
      /* fall through and cancel */
    }

    if (order.status === "awaiting_payment") {
      await expireOrder(order._id, { message: "Checkout cancelled before payment." });
      order = await Order.findById(order._id);
    }
  }

  res.set("Cache-Control", "no-store");
  res.json(statusPayload(order));
}

const maskEmail = (address = "") => {
  const [name, domain] = address.split("@");
  if (!name || !domain) return "";
  return `${name[0]}${"*".repeat(Math.max(2, Math.min(6, name.length - 1)))}@${domain}`;
};

const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000);

const paymentLabel = (order) => {
  if (order.payment.method === "cod") return "Cash on Delivery";
  if (order.payment.status === "refunded") return "Paid online — refunded";
  if (order.payment.status === "paid") return "Paid online (UPI)";
  return "Online payment (UPI)";
};

// What a customer may see about an order. No street address, phone or full
// email — the Track Order page only asks for an order number.
function publicOrder(order, { includeEmail = false } = {}) {
  const placedAt = order.placedAt || order.createdAt;

  let estimatedDelivery = null;
  if (order.shipping?.estimatedDelivery) {
    estimatedDelivery = {
      from: order.shipping.estimatedDelivery,
      to: order.shipping.estimatedDelivery,
    };
  } else if (order.delivery?.maxDays !== undefined && order.delivery?.maxDays !== null) {
    estimatedDelivery = {
      from: addDays(placedAt, order.delivery.minDays || 0),
      to: addDays(placedAt, order.delivery.maxDays),
    };
  }

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] || order.status,
    placed: PLACED_STATUSES.includes(order.status),
    placedAt,
    customer: {
      firstName: order.customer.firstName,
      ...(includeEmail ? { email: maskEmail(order.customer.email) } : {}),
    },
    shipTo: `${order.shippingAddress.city}, ${order.shippingAddress.state} – ${order.shippingAddress.pincode}`,
    payment: {
      method: order.payment.method,
      status: order.payment.status,
      label: paymentLabel(order),
      discountPercent: order.payment.discountPercent,
    },
    subtotal: order.subtotal,
    discount: order.discount,
    couponCode: order.coupon?.code || "",
    couponDiscount: order.couponDiscount || 0,
    shippingFee: order.shippingFee,
    total: order.total,
    items: order.items.map((item) => ({
      name: item.name,
      slug: item.slug,
      color: item.color,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
    })),
    delivery: order.delivery,
    estimatedDelivery,
    tracking: {
      courier: order.shipping?.courier || "",
      awb: order.shipping?.awb || "",
      trackingUrl: order.shipping?.trackingUrl || "",
      status: order.shipping?.srStatus || "",
      shippedAt: order.shipping?.shippedAt || null,
      deliveredAt: order.shipping?.deliveredAt || null,
    },
    // Courier scans from Shiprocket (newest first), then our own updates.
    courierEvents: (order.shipping?.events || []).map((event) => ({
      message: event.status,
      location: event.location || "",
      date: event.date,
    })),
    timeline: [...order.timeline]
      .filter((entry) => entry.status !== "awaiting_payment")
      .reverse()
      .map((entry) => ({
        status: entry.status,
        message: entry.message,
        location: entry.location || "",
        date: entry.at,
      })),
  };
}

// GET /api/orders/:token — the "thank you" page
export async function getOrder(req, res) {
  const order = await findByToken(req.params.token);

  res.set("Cache-Control", "no-store");
  res.json({ order: publicOrder(order, { includeEmail: true }) });
}

// GET /api/orders/:orderNumber/tracking — the Track Order page
export async function trackOrder(req, res) {
  const orderNumber = normalizeOrderNumber(req.params.orderNumber);

  if (!orderNumber) {
    throw badRequest("Please enter your order number exactly as shown in your confirmation email (for example GAD-7K3M9QX2).");
  }

  const order = await Order.findOne({ orderNumber, status: { $in: PLACED_STATUSES } });

  if (!order) {
    throw notFound("We couldn't find an order with that number. Please check it and try again.");
  }

  res.set("Cache-Control", "no-store");
  res.json({ order: publicOrder(order) });
}
