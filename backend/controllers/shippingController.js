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

// POST /api/delivery/updates?token=SHIPWAY_WEBHOOK_TOKEN — Shipway calls this when a shipment moves.
// Shipway panel → Track → Tracking Webhooks → add
//   https://YOURDOMAIN/api/delivery/updates?token=<SHIPWAY_WEBHOOK_TOKEN>
// (Shipway doesn't sign webhooks, so the secret token in the URL is what keeps strangers out.)
export async function shipwayWebhook(req, res) {
  const expected = env.shipway.webhookToken;
  const given = req.query?.token || req.get("x-api-key") || "";
  if (!expected || !safeEqual(given, expected)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const order = await applyWebhook(req.body || {});
    if (!order) console.warn("Shipway update for an unknown shipment:", req.body?.awbno || req.body?.order_id);
  } catch (error) {
    console.error("Shipway webhook failed:", error.message);
  }
  res.json({ ok: true }); // always 200 so Shipway doesn't keep retrying
}
