// Ships an order with Shiprocket and keeps its tracking up to date.
import Order from "../models/Order.js";
import * as shiprocket from "./shiprocket.js";
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
  if (tracking.status) ship.srStatus = tracking.status;
  if (tracking.etd) {
    ship.etd = tracking.etd;
    const date = new Date(tracking.etd);
    if (!Number.isNaN(date.getTime())) ship.estimatedDelivery = date;
  }
  if (tracking.trackUrl) ship.trackingUrl = tracking.trackUrl;
  if (tracking.events) ship.events = tracking.events;
  ship.syncedAt = new Date();
}

// "Ship with Shiprocket": create order → assign courier + AWB → book pickup → label.
// Safe to press again after an error: finished steps are skipped.
export async function shipOrder(order) {
  if (!["pending", "processing", "shipped"].includes(order.status)) {
    throw conflict("Only Pending or Processing orders can be shipped.");
  }

  const mode = shiprocket.mode();
  const ship = order.shipping;

  // ---------- TEST: nothing is sent to Shiprocket ----------
  if (mode === "mock") {
    const tag = order.orderNumber.slice(-6);
    Object.assign(ship, {
      testMode: "mock",
      srOrderId: `TEST-${tag}`,
      shipmentId: `TEST-${tag}`,
      awb: `TESTAWB${tag}`,
      courier: "TEST COURIER (not real)",
      srStatus: "TEST — NOT SENT TO SHIPROCKET",
      lastError: "",
    });
    order.markModified("shipping");
    await order.save();
    await advanceTo(order, "processing");
    return order;
  }

  if (!shiprocket.isConfigured()) {
    throw conflict("Shiprocket isn't set up yet — add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to backend/.env.");
  }

  if (ship.testMode === "mock") {
    for (const key of ["srOrderId", "shipmentId", "awb", "courier", "srStatus", "testMode"]) ship[key] = undefined;
  }

  try {
    // 1. Create the order in Shiprocket (free)
    if (!ship.shipmentId) {
      const created = await shiprocket.createOrder(order);
      if (!created.shipment_id) throw new Error(`Shiprocket: ${created.message || "order was not created"}`);
      ship.srOrderId = String(created.order_id);
      ship.shipmentId = String(created.shipment_id);
      ship.srStatus = created.status || "NEW";
      await order.save();
    }

    if (mode === "create_only") {
      ship.testMode = "create_only";
      ship.srStatus = "NEW (test – no courier booked)";
      ship.lastError = "";
      order.markModified("shipping");
      await order.save();
      return order;
    }
    ship.testMode = undefined;

    // 2. Courier + tracking number (charges your Shiprocket wallet)
    if (!ship.awb) {
      const result = await shiprocket.assignAwb(ship.shipmentId);
      const data = result?.response?.data || {};
      if (!data.awb_code) {
        throw new Error(`Shiprocket couldn't assign a courier: ${data.awb_assign_error || result.message || "no courier available for this PIN code"}`);
      }
      ship.awb = data.awb_code;
      ship.courier = data.courier_name || "";
      ship.trackingUrl = shiprocket.trackingUrl(ship.awb);
      ship.srStatus = "AWB ASSIGNED";
      await order.save();
    }

    // 3. Book the pickup
    if (!ship.pickupDate) {
      try {
        const pickup = await shiprocket.generatePickup(ship.shipmentId);
        ship.pickupDate = pickup?.response?.pickup_scheduled_date || "requested";
        ship.srStatus = "PICKUP SCHEDULED";
      } catch (error) {
        ship.lastError = error.message;
      }
    }

    // 4. Shipping label to print
    if (!ship.labelUrl) {
      const label = await shiprocket.generateLabel(ship.shipmentId).catch(() => null);
      if (label?.label_url) ship.labelUrl = label.label_url;
    }

    if (ship.pickupDate) ship.lastError = "";
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

// "Refresh tracking" button and the Track Order page.
export async function refreshTracking(order) {
  if (!order.shipping?.awb) throw conflict("This order has no tracking number yet.");
  if (order.shipping.testMode === "mock") throw conflict("This is a TEST shipment — there is no real tracking.");

  const tracking = shiprocket.readTracking(await shiprocket.trackAwb(order.shipping.awb));
  applyTracking(order, tracking);
  order.markModified("shipping");
  await order.save();
  await advanceTo(order, shiprocket.mapStatus(tracking.status));
  return order;
}

// Shiprocket webhook body -> update the matching order.
export async function applyWebhook(body = {}) {
  const awb = body.awb ? String(body.awb) : "";
  const orderNumber = body.order_id ? String(body.order_id) : "";

  let order = awb ? await Order.findOne({ "shipping.awb": awb }) : null;
  if (!order && orderNumber) order = await Order.findOne({ orderNumber });
  if (!order) return null;

  const ship = order.shipping;
  if (awb) ship.awb = awb;
  if (body.courier_name) ship.courier = body.courier_name;
  if (!ship.trackingUrl && ship.awb) ship.trackingUrl = shiprocket.trackingUrl(ship.awb);

  applyTracking(order, {
    status: body.current_status || "",
    etd: body.etd || "",
    trackUrl: "",
    events: Array.isArray(body.scans) && body.scans.length
      ? body.scans.slice(-20).reverse().map((scan) => ({
          date: scan.date,
          status: scan.activity || scan["sr-status-label"] || scan.status,
          location: scan.location || "",
        }))
      : null,
  });

  order.markModified("shipping");
  await order.save();
  await advanceTo(order, shiprocket.mapStatus(body.current_status));
  return order;
}
