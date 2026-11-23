// Ships an order with Shipway and keeps its tracking up to date.
import Order from "../models/Order.js";
import * as shipway from "./shipway.js";
import { env } from "../config/env.js";
import { changeOrderStatus } from "./orderService.js";
import { conflict } from "../utils/httpError.js";

const PROGRESS = ["pending", "processing", "shipped", "out_for_delivery", "delivered"];

// Moves the order forward only (never backwards), sending the customer email.
async function advanceTo(order, mapped) {
  if (!mapped || ["cancelled", "delivered"].includes(order.status)) return;
  if (PROGRESS.indexOf(mapped) <= PROGRESS.indexOf(order.status)) return;
  await changeOrderStatus(order, mapped);
}

function applyTracking(order, tracking) {
  const ship = order.shipping;
  if (tracking.code) ship.statusCode = tracking.code;
  if (tracking.status) ship.providerStatus = tracking.status;
  if (tracking.courier && !ship.courier) ship.courier = tracking.courier;
  if (tracking.etd) {
    ship.etd = tracking.etd;
    const date = new Date(tracking.etd);
    if (!Number.isNaN(date.getTime())) ship.estimatedDelivery = date;
  }
  if (tracking.trackUrl) ship.trackingUrl = tracking.trackUrl;
  if (tracking.events) ship.events = tracking.events;
  ship.syncedAt = new Date();
}

const isShipway = (ship) => ship?.provider === "shipway";

// "Ship with Shipway": push order + courier + AWB + label → manifest → pickup.
// Safe to press again after an error: finished steps are skipped.
export async function shipOrder(order) {
  if (!["pending", "processing", "shipped"].includes(order.status)) {
    throw conflict("Only Pending, Processing or Shipped orders can be sent to Shipway.");
  }

  const mode = shipway.mode();
  const ship = order.shipping;

  if (ship.awb && !isShipway(ship)) {
    throw conflict(`This order already has a tracking number (${ship.awb}) that wasn't made by Shipway. Clear it in the manual shipping section first if you want to ship it again with Shipway.`);
  }

  // ---------- TEST: nothing is sent to Shipway ----------
  if (mode === "mock") {
    const tag = order.orderNumber.slice(-6);
    Object.assign(ship, {
      provider: "shipway",
      testMode: "mock",
      awb: `TESTAWB${tag}`,
      courier: "TEST COURIER (not real)",
      providerStatus: "TEST — NOT SENT TO SHIPWAY",
      pushedAt: new Date(),
      lastError: "",
    });
    order.markModified("shipping");
    await order.save();
    await advanceTo(order, "processing");
    return order;
  }

  if (!shipway.isConfigured()) {
    throw conflict("Shipway isn't set up yet — add SHIPWAY_EMAIL and SHIPWAY_LICENSE_KEY to backend/.env.");
  }

  if (ship.testMode === "mock") {
    for (const key of ["awb", "courier", "providerStatus", "statusCode", "testMode", "pushedAt", "carrierId", "labelUrl", "trackingUrl"]) {
      ship[key] = undefined;
    }
  }

  try {
    // ---------- TEST: only add the order in Shipway (no courier, no charge) ----------
    if (mode === "create_only") {
      if (!ship.pushedAt) {
        await shipway.pushOrder(order);
        ship.pushedAt = new Date();
      }
      Object.assign(ship, { provider: "shipway", testMode: "create_only", providerStatus: "NEW (test – no courier booked)", lastError: "" });
      order.markModified("shipping");
      await order.save();
      return order;
    }

    if (!env.shipway.warehouseId) {
      throw new Error("Add SHIPWAY_WAREHOUSE_ID to backend/.env (Shipway → Settings → Warehouse, or the admin \"warehouse\" list).");
    }
    ship.provider = "shipway";
    ship.testMode = undefined;

    // 1. Push order + courier + AWB + label (charges your Shipway wallet)
    if (!ship.awb) {
      // If an earlier try (or someone in the Shipway panel) already got an AWB, use it.
      const existing = ship.pushedAt ? await shipway.getOrder(order.orderNumber).catch(() => null) : null;
      if (existing?.tracking_number) {
        ship.awb = String(existing.tracking_number);
        ship.courier = existing.name || existing.carrier_title || "";
      } else {
        const booked = await shipway.pushOrderWithLabel(order);
        ship.awb = booked.awb;
        ship.carrierId = booked.carrierId;
        if (booked.labelUrl) ship.labelUrl = booked.labelUrl;
      }
      ship.pushedAt = ship.pushedAt || new Date();
      ship.providerStatus = "AWB ASSIGNED";
      await order.save();
    }

    // Courier name isn't in the booking reply; tracking has it.
    if (!ship.courier || !ship.trackingUrl) {
      try {
        applyTracking(order, shipway.readTracking(await shipway.trackAwb(ship.awb), ship.awb));
      } catch {
        /* tracking may not be live for a few minutes */
      }
    }

    // 2. Manifest (hands the order over for pickup)
    let stepError = "";
    if (!ship.manifestId) {
      try {
        const { manifestId } = await shipway.createManifest([order.orderNumber]);
        ship.manifestId = manifestId || "created";
        ship.providerStatus = "MANIFESTED";
      } catch (error) {
        stepError = error.message;
      }
    }

    // 3. Book the pickup
    if (!ship.pickupDate && ship.manifestId) {
      if (!ship.carrierId) {
        const existing = await shipway.getOrder(order.orderNumber).catch(() => null);
        if (existing?.carrier_id) ship.carrierId = String(existing.carrier_id);
      }
      if (ship.carrierId) {
        try {
          const { pickupDate } = await shipway.createPickup(order, ship.carrierId);
          ship.pickupDate = pickupDate;
          ship.providerStatus = "PICKUP SCHEDULED";
        } catch (error) {
          stepError = `${error.message} — you can schedule the pickup in the Shipway panel.`;
        }
      } else {
        stepError = "Couldn't find the courier for the pickup — schedule it in the Shipway panel.";
      }
    }

    ship.lastError = stepError;
    order.markModified("shipping");
    await order.save();
    await advanceTo(order, "processing");
    return order;
  } catch (error) {
    ship.lastError = error.message;
    order.markModified("shipping");
    await order.save().catch(() => {});
    throw conflict(error.message);
  }
}

// "Refresh tracking" button, the tracking sweep and the Track Order page.
export async function refreshTracking(order) {
  if (!order.shipping?.awb) throw conflict("This order has no tracking number yet.");
  if (order.shipping.testMode === "mock") throw conflict("This is a TEST shipment — there is no real tracking.");
  // Tracking numbers typed in by hand work too, as long as Shipway knows them.
  const tracking = shipway.readTracking(await shipway.trackAwb(order.shipping.awb), order.shipping.awb);
  applyTracking(order, tracking);
  order.markModified("shipping");
  await order.save();
  await advanceTo(order, shipway.mapStatus(tracking.code, tracking.text));
  return order;
}

// Shipway tracking webhook body -> update the matching order.
export async function applyWebhook(body = {}) {
  const input = body.api_input && typeof body.api_input === "object" ? body.api_input : {};
  const awb = String(body.awbno || input.awbno || "");
  const orderNumber = String(body.order_id || input.order_id || "");

  let order = awb ? await Order.findOne({ "shipping.awb": awb }) : null;
  if (!order && orderNumber) order = await Order.findOne({ orderNumber });
  if (!order) return null;

  const ship = order.shipping;
  if (!ship.provider) ship.provider = "shipway";
  if (awb && !ship.awb) ship.awb = awb;
  if (body.carrier || input.carrier) ship.courier = ship.courier || String(body.carrier || input.carrier);

  const code = String(body.current_status || input.current_status || "");
  const text = String(body.scans_current_status || input.current_status_desc || "");

  // scans come as { "0": newest, "1": … }
  const scans = input.scans && typeof input.scans === "object" ? Object.values(input.scans) : [];
  applyTracking(order, {
    code,
    status: shipway.statusLabel(code, text),
    etd: body.expected_delivery_date || input.extra_fields?.expected_delivery_date || "",
    trackUrl: input.tracking_url || "",
    events: scans.length
      ? scans.slice(0, 20).map((scan) => ({ date: scan.time || scan.date, status: scan.status || scan.activity, location: scan.location || "" }))
      : null,
  });

  order.markModified("shipping");
  await order.save();
  await advanceTo(order, shipway.mapStatus(code, text));
  return order;
}
