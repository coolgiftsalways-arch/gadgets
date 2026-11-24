// Abandoned checkouts: people who reached checkout (or started paying) but never
// placed an order. The admin page lists them with a one-tap WhatsApp follow-up.
import CheckoutLead from "../models/CheckoutLead.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { PLACED_STATUSES } from "../config/store.js";
import { badRequest } from "../utils/httpError.js";
import { email as cleanEmail, integer, isObjectId, line, phone as cleanPhone } from "../utils/validate.js";

const LOOKBACK_DAYS = 30;

// POST /api/orders/lead — called quietly from checkout once a valid mobile number is typed.
export async function saveLead(req, res) {
  const body = req.body || {};
  const phone = cleanPhone(body.phone);
  if (!phone) throw badRequest("A valid mobile number is needed.");

  const wanted = (Array.isArray(body.items) ? body.items : []).slice(0, 40);
  const ids = wanted.map((item) => item?.productId).filter(isObjectId);
  const slugs = wanted.map((item) => line(item?.slug, 80).toLowerCase()).filter(Boolean);
  const products = await Product.find({ $or: [{ _id: { $in: ids } }, { slug: { $in: slugs } }] }).select(
    "_id slug name price",
  );

  const items = [];
  for (const want of wanted) {
    const product = products.find(
      (p) => String(p._id) === want?.productId || p.slug === line(want?.slug, 80).toLowerCase(),
    );
    const quantity = integer(want?.quantity, { min: 1, max: 100 });
    if (!product || !quantity) continue;
    items.push({ product: product._id, slug: product.slug, name: product.name, price: product.price, quantity });
  }
  if (!items.length) return res.status(204).end();

  const name = [line(body.firstName, 60), line(body.lastName, 60)].filter(Boolean).join(" ");
  await CheckoutLead.findOneAndUpdate(
    { phone },
    {
      $set: {
        ...(name && { name }),
        ...(cleanEmail(body.email) && { email: cleanEmail(body.email) }),
        ...(line(body.city, 80) && { city: line(body.city, 80) }),
        ...(line(body.state, 80) && { state: line(body.state, 80) }),
        items,
        subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        lastSeenAt: new Date(),
        status: "open",
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
  res.status(204).end();
}

// GET /api/admin/abandoned — everyone who didn't finish, newest first.
export async function listAbandoned(req, res) {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [leads, unpaid, placed] = await Promise.all([
    CheckoutLead.find({ lastSeenAt: { $gte: since } }).lean(),
    Order.find({ status: { $in: ["awaiting_payment", "expired"] }, createdAt: { $gte: since } })
      .select("orderNumber customer items total status createdAt payment.method shippingAddress.city")
      .lean(),
    Order.find({ status: { $in: PLACED_STATUSES }, createdAt: { $gte: since } })
      .select("customer.phone placedAt createdAt")
      .lean(),
  ]);

  // Last real order per phone — anyone who ordered after leaving has come back.
  const lastOrder = new Map();
  for (const order of placed) {
    const at = new Date(order.placedAt || order.createdAt).getTime();
    const phone = order.customer?.phone;
    if (phone && at > (lastOrder.get(phone) || 0)) lastOrder.set(phone, at);
  }

  const byPhone = new Map();
  const consider = (entry) => {
    if (!entry.phone) return;
    if ((lastOrder.get(entry.phone) || 0) >= new Date(entry.at).getTime()) return; // ordered since
    const existing = byPhone.get(entry.phone);
    if (!existing || new Date(entry.at) > new Date(existing.at)) {
      byPhone.set(entry.phone, { ...existing, ...entry, status: existing?.status || entry.status });
    }
  };

  for (const order of unpaid) {
    consider({
      phone: order.customer?.phone,
      name: [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" "),
      city: order.shippingAddress?.city || "",
      items: order.items.map((item) => ({ slug: item.slug, name: item.name, price: item.price, quantity: item.quantity })),
      value: order.total,
      at: order.createdAt,
      stage: order.payment?.method === "cod" ? "Didn't pay the COD confirmation" : "Didn't complete UPI payment",
      orderNumber: order.orderNumber,
      status: "open",
    });
  }
  for (const lead of leads) {
    if (!lead.items?.length) continue; // only a follow-up note, no cart of its own
    consider({
      phone: lead.phone,
      name: lead.name,
      city: lead.city,
      items: lead.items,
      value: lead.subtotal,
      at: lead.lastSeenAt,
      stage: "Left at checkout",
      status: lead.status,
    });
  }
  // A follow-up status saved on the lead applies to that phone's newest entry too.
  for (const lead of leads) {
    const entry = byPhone.get(lead.phone);
    if (entry && lead.status !== "open" && new Date(lead.contactedAt || 0) >= new Date(entry.at) - 1000) {
      entry.status = lead.status;
    }
  }

  const rows = [...byPhone.values()].sort((a, b) => new Date(b.at) - new Date(a.at));
  res.set("Cache-Control", "no-store");
  res.json({ rows });
}

// PATCH /api/admin/abandoned/:phone  { status: "contacted" | "dismissed" | "open" }
export async function updateAbandoned(req, res) {
  const phone = cleanPhone(req.params.phone);
  if (!phone) throw badRequest("Invalid mobile number.");
  const status = ["open", "contacted", "dismissed"].includes(req.body?.status) ? req.body.status : null;
  if (!status) throw badRequest("Invalid status.");

  await CheckoutLead.findOneAndUpdate(
    { phone },
    { $set: { status, contactedAt: new Date() }, $setOnInsert: { lastSeenAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  res.json({ ok: true });
}
