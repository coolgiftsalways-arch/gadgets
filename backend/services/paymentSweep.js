// A small background job that looks after unpaid UPI checkouts.
//
// Once a minute it asks Razorpay about every checkout still waiting for
// money. Paid ones become real orders (this covers the customer who paid and
// closed the page before we were told); ones whose payment window has passed
// are closed and their stock goes back on the shelf.
import Order from "../models/Order.js";
import { env } from "../config/env.js";
import { isDbReady } from "../config/db.js";
import * as razorpay from "./razorpay.js";
import { expireOrder, syncPayment } from "./orderService.js";

const SWEEP_EVERY_MS = 60 * 1000;
const GRACE_MS = 2 * 60 * 1000; // extra time for a payment made at the last second
const GIVE_UP_MS = 60 * 60 * 1000; // close it even if Razorpay can't be reached

let running = false;

export async function sweepPendingPayments() {
  if (running || !isDbReady()) return { checked: 0, paid: 0, expired: 0 };
  running = true;

  const result = { checked: 0, paid: 0, expired: 0 };

  try {
    const orders = await Order.find({ status: "awaiting_payment" }).sort({ createdAt: 1 }).limit(200);
    const windowMs = env.store.paymentWindowMinutes * 60 * 1000;

    for (const order of orders) {
      result.checked += 1;

      const deadline =
        (order.payment?.linkExpiresAt?.getTime() ?? order.createdAt.getTime() + windowMs) + GRACE_MS;
      const overdue = Date.now() > deadline;

      let current = order;
      let reachedRazorpay = true;

      if (order.payment?.linkId && razorpay.isConfigured()) {
        try {
          current = await syncPayment(order);
        } catch (error) {
          reachedRazorpay = false;
          console.warn(`Payment check failed for ${order.orderNumber}: ${error.message}`);
        }
      }

      if (current.status !== "awaiting_payment") {
        result.paid += 1;
        continue;
      }

      // Don't close an order we couldn't check — unless it is long overdue.
      const safeToExpire = reachedRazorpay || Date.now() > deadline + GIVE_UP_MS;

      if (overdue && safeToExpire) {
        await expireOrder(order._id, { message: "Payment window closed without payment." });
        result.expired += 1;
      }
    }
  } catch (error) {
    console.error("Payment sweep failed:", error.message);
  } finally {
    running = false;
  }

  return result;
}

// Returns a function that stops the job (used on shutdown).
export function startPaymentSweep() {
  const timer = setInterval(sweepPendingPayments, SWEEP_EVERY_MS);
  timer.unref();

  // Catch up straight away on anything left over from before a restart.
  setTimeout(sweepPendingPayments, 5000).unref();

  return () => clearInterval(timer);
}
