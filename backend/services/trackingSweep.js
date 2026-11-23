// Keeps Shipway tracking up to date without a webhook.
//
// Every 3 hours the server asks Shipway about each order that is on its
// way. When the courier reports a change (picked up, out for delivery,
// delivered) the order status moves forward and the customer gets the email.
import Order from "../models/Order.js";
import { isDbReady } from "../config/db.js";
import * as shipway from "./shipway.js";
import { refreshTracking, syncFromShipway } from "./shippingService.js";

const SWEEP_EVERY_MS = 3 * 60 * 60 * 1000; // 3 hours
const STALE_AFTER_MS = 2 * 60 * 60 * 1000; // skip orders checked in the last 2 hours
const PAUSE_BETWEEN_MS = 1500; // be gentle with Shipway's API

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Orders worth asking Shipway about.
export const trackableFilter = () => ({
  status: { $in: ["processing", "shipped", "out_for_delivery"] },
  "shipping.provider": "shipway",
  "shipping.awb": { $nin: ["", null] },
  "shipping.testMode": { $in: [null, ""] },
});

let running = false;

export async function sweepTracking() {
  if (running || !isDbReady() || !shipway.isConfigured()) return { checked: 0 };
  running = true;
  let checked = 0;

  try {
    const orders = await Order.find({
      ...trackableFilter(),
      $or: [
        { "shipping.syncedAt": { $exists: false } },
        { "shipping.syncedAt": { $lt: new Date(Date.now() - STALE_AFTER_MS) } },
      ],
    })
      .sort({ "shipping.syncedAt": 1 })
      .limit(300);

    // Orders sent to Shipway whose courier was booked in the Shipway dashboard.
    const waiting = await Order.find({
      status: { $in: ["pending", "processing"] },
      "shipping.provider": "shipway",
      "shipping.pushedAt": { $ne: null },
      "shipping.awb": { $in: ["", null] },
      "shipping.testMode": { $in: [null, ""] },
    }).limit(100);
    for (const order of waiting) {
      try {
        await syncFromShipway(order);
      } catch (error) {
        console.warn(`Shipway sync failed for ${order.orderNumber}: ${error.message}`);
      }
      await sleep(PAUSE_BETWEEN_MS);
    }

    for (const order of orders) {
      try {
        await refreshTracking(order);
      } catch (error) {
        console.warn(`Tracking refresh failed for ${order.orderNumber}: ${error.message}`);
      }
      checked += 1;
      await sleep(PAUSE_BETWEEN_MS);
    }
  } catch (error) {
    console.error("Tracking sweep failed:", error.message);
  } finally {
    running = false;
  }

  if (checked) console.log(`Tracking sweep: checked ${checked} shipment(s).`);
  return { checked };
}

// Returns a function that stops the job (used on shutdown).
export function startTrackingSweep() {
  const timer = setInterval(sweepTracking, SWEEP_EVERY_MS);
  timer.unref();
  setTimeout(sweepTracking, 60 * 1000).unref(); // first run a minute after start-up
  return () => clearInterval(timer);
}
