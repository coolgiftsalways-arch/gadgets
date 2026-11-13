// Admin sign-in, the dashboard numbers, new-order notifications and the
// "is everything set up?" status page.
import crypto from "node:crypto";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Subscriber from "../models/Subscriber.js";
import Contact from "../models/Contact.js";
import { env, isRazorpayConfigured, isSmtpConfigured } from "../config/env.js";
import { isDbReady } from "../config/db.js";
import { PLACED_STATUSES, deliveryFor } from "../config/store.js";
import { HttpError, badRequest, unauthorized } from "../utils/httpError.js";
import { email as cleanEmail, integer, line } from "../utils/validate.js";
import { signAdminToken } from "../middleware/requireAdmin.js";
import { sendMail, verifyConnection, fromAddress } from "../services/mailer.js";
import { testEmail } from "../services/emailTemplates.js";

// ---------- sign in ----------

// Compare without leaking how many characters matched.
const safeEqual = (a, b) =>
  crypto.timingSafeEqual(
    crypto.createHash("sha256").update(String(a)).digest(),
    crypto.createHash("sha256").update(String(b)).digest(),
  );

// POST /api/admin/login  { email, password }
export function login(req, res) {
  if (!env.adminEmail || !env.adminPassword || !env.jwtSecret) {
    throw new HttpError(500, "Admin login is not configured on the server (backend/.env).");
  }

  const emailInput = line(req.body?.email, 254).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const emailOk = safeEqual(emailInput, env.adminEmail);
  const passwordOk = safeEqual(password, env.adminPassword);

  if (!emailOk || !passwordOk) throw unauthorized("Wrong email or password.");

  const { token, expiresAt } = signAdminToken();
  res.json({ token, expiresAt, email: env.adminEmail });
}

// GET /api/admin/me — lets the panel check a saved session is still valid
export function me(req, res) {
  res.json({ email: req.admin.email });
}

// ---------- dashboard ----------

const NOT_CANCELLED = PLACED_STATUSES.filter((status) => status !== "cancelled");
const OPEN_STATUSES = ["pending", "processing", "shipped", "out_for_delivery"];

// Orders that count as sales, and money actually received.
const SALES = { status: { $in: NOT_CANCELLED } };
const COLLECTED = { "payment.status": "paid", status: { $in: NOT_CANCELLED } };

const dayKey = (date) => new Date(date).toLocaleDateString("en-CA", { timeZone: env.store.timezone });

const sumOf = (rows) => ({ total: rows[0]?.total || 0, count: rows[0]?.count || 0 });

const percentChange = (current, previous) => {
  if (!previous) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// GET /api/admin/stats?days=7
export async function stats(req, res) {
  const days = [7, 14, 30].includes(Number(req.query.days)) ? Number(req.query.days) : 7;

  const now = new Date();
  const dayMs = 86400000;
  // A little wider than needed; days are bucketed in the store's timezone below.
  const since = new Date(now.getTime() - days * dayMs);
  const previousSince = new Date(since.getTime() - days * dayMs);

  const totals = { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } };

  const [
    revenueAgg,
    salesAgg,
    statusAgg,
    pendingCodAgg,
    daily,
    previousAgg,
    recent,
    lowStock,
    productCount,
    activeProductCount,
    customerAgg,
    subscriberCount,
    unreadMessages,
    unseenOrders,
    attentionCount,
  ] = await Promise.all([
    Order.aggregate([{ $match: COLLECTED }, totals]),
    Order.aggregate([{ $match: SALES }, totals]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { "payment.method": "cod", "payment.status": "pending", status: { $in: OPEN_STATUSES } } },
      totals,
    ]),
    Order.aggregate([
      { $match: { ...SALES, placedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$placedAt", timezone: env.store.timezone } },
          sales: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([{ $match: { ...SALES, placedAt: { $gte: previousSince, $lt: since } } }, totals]),
    Order.find({ status: { $in: PLACED_STATUSES } })
      .sort({ placedAt: -1 })
      .limit(6)
      .select("orderNumber customer.firstName customer.lastName total status payment.method payment.status placedAt items.quantity"),
    Product.find({ status: "active", stock: { $lte: env.store.lowStockThreshold } })
      .sort({ stock: 1, name: 1 })
      .limit(6)
      .select("name sku stock images icon"),
    Product.countDocuments(),
    Product.countDocuments({ status: "active" }),
    Order.aggregate([
      { $match: { status: { $in: PLACED_STATUSES } } },
      { $group: { _id: "$customer.phone" } },
      { $count: "count" },
    ]),
    Subscriber.countDocuments(),
    Contact.countDocuments({ read: false }),
    Order.countDocuments({ seenByAdmin: false, status: { $in: PLACED_STATUSES } }),
    Order.countDocuments({ attention: { $nin: ["", null] }, status: { $in: NOT_CANCELLED } }),
  ]);

  // One bar per day, including days with no sales.
  const byDay = new Map(daily.map((day) => [day._id, day]));
  const chart = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * dayMs);
    const key = dayKey(date);
    chart.push({
      date: key,
      label: date
        .toLocaleDateString("en-IN", { weekday: "short", timeZone: env.store.timezone })
        .toUpperCase(),
      sales: byDay.get(key)?.sales || 0,
      orders: byDay.get(key)?.orders || 0,
    });
  }

  const periodSales = chart.reduce((sum, day) => sum + day.sales, 0);
  const periodOrders = chart.reduce((sum, day) => sum + day.orders, 0);
  const previous = sumOf(previousAgg);
  const today = chart[chart.length - 1];

  const statusCounts = Object.fromEntries(statusAgg.map((row) => [row._id, row.count]));
  const totalOrders = PLACED_STATUSES.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);

  res.json({
    revenue: sumOf(revenueAgg).total,
    paidOrders: sumOf(revenueAgg).count,
    sales: sumOf(salesAgg).total,
    pendingCod: sumOf(pendingCodAgg).total,
    totalOrders,
    statusCounts,
    toFulfil: (statusCounts.pending || 0) + (statusCounts.processing || 0),
    customerCount: customerAgg[0]?.count || 0,
    productCount,
    activeProductCount,
    subscriberCount,
    unreadMessages,
    unseenOrders,
    attentionCount,
    period: {
      days,
      sales: periodSales,
      orders: periodOrders,
      salesChange: percentChange(periodSales, previous.total),
      ordersChange: percentChange(periodOrders, previous.count),
    },
    today: { sales: today?.sales || 0, orders: today?.orders || 0 },
    chart,
    recent,
    lowStock,
    lowStockThreshold: env.store.lowStockThreshold,
  });
}

// ---------- notifications ----------

// GET /api/admin/notifications -> { unread, items: latest orders, newest first }
export async function notifications(req, res) {
  const placed = { status: { $in: PLACED_STATUSES } };

  const [items, unread, unreadMessages] = await Promise.all([
    Order.find(placed)
      .sort({ placedAt: -1 })
      .limit(20)
      .select("orderNumber customer.firstName customer.lastName shippingAddress.city total payment.method status placedAt seenByAdmin items.quantity"),
    Order.countDocuments({ ...placed, seenByAdmin: false }),
    Contact.countDocuments({ read: false }),
  ]);

  res.set("Cache-Control", "no-store");
  res.json({ unread, unreadMessages, items });
}

// POST /api/admin/notifications/read-all
export async function readAllNotifications(req, res) {
  await Order.updateMany({ seenByAdmin: false }, { $set: { seenByAdmin: true } });
  res.json({ unread: 0 });
}

// ---------- system status ----------

// GET /api/admin/system — what is and isn't set up, without revealing secrets
export function system(req, res) {
  const { razorpay, smtp, store } = env;
  const from = fromAddress();

  res.json({
    database: { connected: isDbReady() },
    payments: {
      upi: {
        enabled: isRazorpayConfigured(),
        mode: !isRazorpayConfigured() ? "off" : razorpay.keyId.startsWith("rzp_live_") ? "live" : "test",
        webhook: Boolean(razorpay.webhookSecret),
        upiOnly: razorpay.upiOnly,
        discountPercent: store.upiDiscountPercent,
        delivery: deliveryFor("upi"),
        paymentWindowMinutes: store.paymentWindowMinutes,
      },
      cod: { enabled: store.codEnabled, delivery: deliveryFor("cod") },
    },
    email: {
      enabled: isSmtpConfigured(),
      host: smtp.host,
      port: smtp.port,
      from: typeof from === "string" ? from : from.address ? `${from.name} <${from.address}>` : "",
      orderAlertEmail: env.orderAlertEmail,
    },
    store: {
      name: store.name,
      clientUrl: env.clientUrl,
      serverUrl: env.serverUrl || `${req.protocol}://${req.host}`,
      webhookUrl: `${env.serverUrl || `${req.protocol}://${req.host}`}/api/payments/razorpay/webhook`,
      shippingFee: store.shippingFee,
      freeShippingAbove: store.freeShippingAbove,
      maxQuantityPerItem: store.maxQuantityPerItem,
      lowStockThreshold: store.lowStockThreshold,
      timezone: store.timezone,
    },
    admin: { email: env.adminEmail, sessionHours: env.adminSessionHours },
  });
}

// POST /api/admin/system/test-email  { to? } — proves the SMTP settings work
export async function sendTestEmail(req, res) {
  const to = cleanEmail(req.body?.to) || env.adminEmail;
  if (!cleanEmail(to)) throw badRequest("Please enter a valid email address.");

  const check = await verifyConnection();
  if (!check.ok) throw new HttpError(502, check.error);

  const result = await sendMail({ to, ...testEmail() });
  if (!result.ok) throw new HttpError(502, result.error);

  res.json({ message: `Test email sent to ${to}. Check the inbox (and the spam folder).` });
}

export const parsePage = (query, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = integer(query.page, { min: 1, max: 100000 }) || 1;
  const limit = integer(query.limit, { min: 1, max: maxLimit }) || defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
};
