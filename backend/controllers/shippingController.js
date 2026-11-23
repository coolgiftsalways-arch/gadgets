import crypto from "node:crypto";
import Order from "../models/Order.js";
import { env } from "../config/env.js";
import { notFound } from "../utils/httpError.js";
import { isObjectId } from "../utils/validate.js";
import { applyWebhook, courierChoices, refreshTracking, sendToShipway, shipOrder, syncFromShipway } from "../services/shippingService.js";

async function findOrder(id) {
  if (!isObjectId(id)) throw notFound("Order not found.");
  const order = await Order.findById(id);
  if (!order) throw notFound("Order not found.");
  return order;
}

// GET /api/admin/orders/:id/couriers — couriers (with prices) that can deliver this order
export async function couriers(req, res) {
  const q = req.query || {};
  const parcel = q.weightKg ? { weightKg: q.weightKg, lengthCm: q.lengthCm, breadthCm: q.breadthCm, heightCm: q.heightCm } : null;
  const result = await courierChoices(await findOrder(req.params.id), parcel);
  res.set("Cache-Control", "no-store");
  res.json(result);
}

// POST /api/admin/orders/:id/ship  { carrierId? }
export async function ship(req, res) {
  const raw = String(req.body?.carrierId ?? "").trim();
  // a courier id, "auto" (Shipway's recommendation) or nothing (SHIPWAY_CARRIER_ID / recommendation)
  const carrierId = /^\d{1,10}$/.test(raw) || raw === "auto" ? raw : "";
  const order = await shipOrder(await findOrder(req.params.id), { carrierId, parcel: req.body?.parcel || null });
  res.json({ order });
}

// POST /api/admin/orders/:id/send — add the order to Shipway only (no courier, no pickup)
export async function send(req, res) {
  const order = await sendToShipway(await findOrder(req.params.id), {
    parcel: req.body?.parcel || null,
    resend: req.body?.resend === true,
  });
  res.json({ order });
}

// POST /api/admin/orders/:id/sync — pick up the courier + AWB booked in Shipway's dashboard
export async function sync(req, res) {
  const { order, linked, removed = false } = await syncFromShipway(await findOrder(req.params.id));
  res.json({ order, linked, removed });
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
