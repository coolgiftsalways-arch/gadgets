// Admin: list, search, export and manage orders.
import Order from "../models/Order.js";
import { ORDER_STATUSES, PAYMENT_METHODS, PLACED_STATUSES, STATUS_LABELS } from "../config/store.js";
import { env } from "../config/env.js";
import { HttpError, badRequest, conflict, notFound } from "../utils/httpError.js";
import { boolean, escapeRegex, isObjectId, line, text } from "../utils/validate.js";
import { CUSTOMER_EMAIL_TYPES } from "../services/emailTemplates.js";
import {
  changeOrderStatus,
  sendOrderEmail,
  setRefunded,
  syncPayment,
} from "../services/orderService.js";
import { parsePage } from "./adminController.js";

const UNPAID_STATUSES = ["awaiting_payment", "expired"];

// Turns the list filters (?status=&payment=&q=) into a database query.
function buildFilter(query) {
  const filter = {};
  const status = line(query.status, 30);

  if (status === "unpaid") filter.status = { $in: UNPAID_STATUSES };
  else if (ORDER_STATUSES.includes(status)) filter.status = status;
  else filter.status = { $in: PLACED_STATUSES }; // real orders only

  const payment = line(query.payment, 10);
  if (PAYMENT_METHODS.includes(payment)) filter["payment.method"] = payment;

  // Every word typed must match the order number, name, email, phone or city.
  const terms = line(query.q, 80).split(" ").filter(Boolean).slice(0, 5);
  if (terms.length) {
    filter.$and = terms.map((term) => {
      const pattern = new RegExp(escapeRegex(term), "i");
      return {
        $or: [
          { orderNumber: pattern },
          { "customer.firstName": pattern },
          { "customer.lastName": pattern },
          { "customer.email": pattern },
          { "customer.phone": pattern },
          { "shippingAddress.city": pattern },
          { "shipping.awb": pattern },
        ],
      };
    });
  }

  return filter;
}

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  highest: { total: -1, createdAt: -1 },
  lowest: { total: 1, createdAt: -1 },
};

const LIST_FIELDS =
  "orderNumber customer shippingAddress.city shippingAddress.state shippingAddress.pincode items.quantity items.name total payment.method payment.status status placedAt createdAt seenByAdmin attention source";

// GET /api/admin/orders?status=&payment=&q=&sort=&page=&limit=
export async function listOrders(req, res) {
  const filter = buildFilter(req.query);
  const sort = SORTS[req.query.sort] || SORTS.newest;
  const { page, limit, skip } = parsePage(req.query);

  const [items, total, statusAgg, revenueAgg] = await Promise.all([
    Order.find(filter).sort(sort).skip(skip).limit(limit).select(LIST_FIELDS),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { "payment.status": "paid", status: { $in: PLACED_STATUSES, $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);

  const counts = Object.fromEntries(statusAgg.map((row) => [row._id, row.count]));

  res.set("Cache-Control", "no-store");
  res.json({
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      total: PLACED_STATUSES.reduce((sum, status) => sum + (counts[status] || 0), 0),
      pending: counts.pending || 0,
      processing: counts.processing || 0,
      shipped: (counts.shipped || 0) + (counts.out_for_delivery || 0),
      delivered: counts.delivered || 0,
      cancelled: counts.cancelled || 0,
      unpaid: UNPAID_STATUSES.reduce((sum, status) => sum + (counts[status] || 0), 0),
      revenue: revenueAgg[0]?.total || 0,
    },
  });
}

async function findOrder(id) {
  if (!isObjectId(id)) throw notFound("Order not found.");
  const order = await Order.findById(id);
  if (!order) throw notFound("Order not found.");
  return order;
}

// GET /api/admin/orders/:id — opening an order also marks its notification read
export async function getOrder(req, res) {
  const order = await findOrder(req.params.id);

  if (order.seenByAdmin === false) {
    await Order.updateOne({ _id: order._id }, { $set: { seenByAdmin: true } });
    order.seenByAdmin = true;
  }

  res.set("Cache-Control", "no-store");
  res.json({ order });
}

function applyShipping(order, raw) {
  if (!raw || typeof raw !== "object") return;

  if (raw.courier !== undefined) order.shipping.courier = line(raw.courier, 80);
  if (raw.awb !== undefined) order.shipping.awb = line(raw.awb, 80);

  if (raw.trackingUrl !== undefined) {
    const url = line(raw.trackingUrl, 500);
    if (url && !/^https?:\/\/[^\s]+$/i.test(url)) {
      throw badRequest("The tracking link must start with http:// or https://");
    }
    order.shipping.trackingUrl = url;
  }

  if (raw.estimatedDelivery !== undefined) {
    if (!raw.estimatedDelivery) {
      order.shipping.estimatedDelivery = undefined;
    } else {
      const date = new Date(raw.estimatedDelivery);
      if (Number.isNaN(date.getTime())) throw badRequest("Please enter a valid delivery date.");
      order.shipping.estimatedDelivery = date;
    }
  }
}

// PATCH /api/admin/orders/:id
// body (all optional): { status, cancelReason, notify, shipping: { courier,
//   awb, trackingUrl, estimatedDelivery }, adminNote, refunded }
export async function updateOrder(req, res) {
  const order = await findOrder(req.params.id);
  const body = req.body || {};

  // Shipping details first, so a "shipped" email includes the courier.
  applyShipping(order, body.shipping);

  if (body.adminNote !== undefined) order.adminNote = text(body.adminNote, 2000);

  if (body.refunded !== undefined) await setRefunded(order, boolean(body.refunded));

  if (body.status !== undefined && body.status !== order.status) {
    await changeOrderStatus(order, line(body.status, 30), {
      reason: line(body.cancelReason, 300),
      notify: boolean(body.notify, true),
    });
  } else {
    await order.save();
  }

  res.json({ order });
}

// POST /api/admin/orders/:id/email  { type } — send (or re-send) a customer email
export async function resendEmail(req, res) {
  const order = await findOrder(req.params.id);
  const type = line(req.body?.type, 30) || "confirmation";

  if (!CUSTOMER_EMAIL_TYPES.includes(type)) throw badRequest("Unknown email type.");

  if (!PLACED_STATUSES.includes(order.status)) {
    throw conflict("This checkout was never paid, so there is nothing to email.");
  }

  const result = await sendOrderEmail(order._id, type);
  if (!result.ok) throw new HttpError(502, result.error || "The email could not be sent.");

  const fresh = await Order.findById(order._id);
  res.json({ message: `Email sent to ${order.customer.email}.`, order: fresh });
}

// POST /api/admin/orders/:id/recheck-payment — ask Razorpay again
export async function recheckPayment(req, res) {
  const order = await findOrder(req.params.id);

  if (order.payment.method !== "upi" || !UNPAID_STATUSES.includes(order.status)) {
    return res.json({ order, message: "This order doesn't have a payment waiting." });
  }

  let fresh;
  try {
    fresh = await syncPayment(order);
  } catch (error) {
    throw new HttpError(502, `Razorpay could not be reached: ${error.message}`);
  }

  res.json({
    order: fresh,
    message: PLACED_STATUSES.includes(fresh.status)
      ? "Payment found — the order is now confirmed."
      : "Razorpay shows no payment for this checkout.",
  });
}

// ---------- CSV export ----------

// Spreadsheet apps treat cells starting with = + - @ as formulas; a leading
// apostrophe makes them plain text.
const csvCell = (value) => {
  let cell = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""')}"`;
};

export const toCsv = (rows) => `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;

const inStoreTime = (date, options) =>
  date ? new Date(date).toLocaleString("en-IN", { timeZone: env.store.timezone, ...options }) : "";

// GET /api/admin/orders/export.csv — everything matching the current filters
export async function exportOrders(req, res) {
  const orders = await Order.find(buildFilter(req.query))
    .sort(SORTS[req.query.sort] || SORTS.newest)
    .limit(5000);

  const rows = [
    [
      "Order number",
      "Date",
      "Time",
      "Order status",
      "Customer",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "PIN code",
      "Items",
      "Units",
      "Subtotal",
      "Discount",
      "Shipping",
      "Total",
      "Payment method",
      "Payment status",
      "Courier",
      "Tracking number",
      "Source",
    ],
    ...orders.map((order) => {
      const when = order.placedAt || order.createdAt;
      return [
        order.orderNumber,
        inStoreTime(when, { day: "2-digit", month: "short", year: "numeric" }),
        inStoreTime(when, { hour: "2-digit", minute: "2-digit", hour12: true }),
        STATUS_LABELS[order.status] || order.status,
        `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        order.customer.email,
        order.customer.phone,
        [order.shippingAddress.line1, order.shippingAddress.line2].filter(Boolean).join(", "),
        order.shippingAddress.city,
        order.shippingAddress.state,
        order.shippingAddress.pincode,
        order.items
          .map((item) => `${item.name}${item.color ? ` (${item.color})` : ""} x${item.quantity}`)
          .join("; "),
        order.items.reduce((sum, item) => sum + item.quantity, 0),
        order.subtotal,
        order.discount,
        order.shippingFee,
        order.total,
        order.payment.method === "cod" ? "Cash on Delivery" : "Online (UPI)",
        order.payment.status,
        order.shipping?.courier || "",
        order.shipping?.awb || "",
        order.source || "",
      ];
    }),
  ];

  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="gadgete-orders.csv"',
    "Cache-Control": "no-store",
  });
  res.send(toCsv(rows));
}
