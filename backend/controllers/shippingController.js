import crypto from "node:crypto";
import Order from "../models/Order.js";
import { env } from "../config/env.js";
import { notFound } from "../utils/httpError.js";
import { isObjectId } from "../utils/validate.js";
import { applyWebhook, refreshTracking, shipOrder } from "../services/shippingService.js";

async function findOrder(id) {
  if (!isObjectId(id)) throw notFound("Order not found.");
  const order = await Order.findById(id);
  if (!order) throw notFound("Order not found.");
  return order;
}

// POST /api/admin/orders/:id/ship
export async function ship(req, res) {
  const order = await shipOrder(await findOrder(req.params.id));
  res.json({ order });
}

// POST /api/admin/orders/:id/tracking
export async function track(req, res) {
  const order = await refreshTracking(await findOrder(req.params.id));
  res.json({ order });
}

const safeEqual = (a, b) =>
  crypto.timingSafeEqual(
    crypto.createHash("sha256").update(String(a)).digest(),
    crypto.createHash("sha256").update(String(b)).digest(),
  );

// POST /api/delivery/updates — Shiprocket calls this when a shipment moves.
// Shiprocket panel → Settings → API → Webhooks: URL https://YOURDOMAIN/api/delivery/updates,
// token = SHIPROCKET_WEBHOOK_TOKEN. (Shiprocket doesn't allow its own name in the URL.)
export async function shiprocketWebhook(req, res) {
  const expected = env.shiprocket.webhookToken;
  if (!expected || !safeEqual(req.get("x-api-key") || "", expected)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const order = await applyWebhook(req.body);
    if (!order) console.warn("Shiprocket update for an unknown shipment:", req.body?.awb || req.body?.order_id);
  } catch (error) {
    console.error("Shiprocket webhook failed:", error.message);
  }
  res.json({ ok: true }); // always 200 so Shiprocket doesn't keep retrying
}
