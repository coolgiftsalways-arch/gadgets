
// Everything that changes an order lives here: taking and returning stock,
// turning a checkout into a real order, recording payments, moving an order
// through its statuses, and sending the matching emails.

import crypto from "node:crypto";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { env } from "../config/env.js";
import { PLACED_STATUSES } from "../config/store.js";
import { badRequest, conflict } from "../utils/httpError.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import * as razorpay from "./razorpay.js";
import { sendMail } from "./mailer.js";
import { customerOrderEmail, newOrderAlert } from "./emailTemplates.js";
import { runInBackground } from "./background.js";

// Statuses the admin can move a placed order between.
export const ADMIN_STATUSES = PLACED_STATUSES;

// ---------- stock ----------

// Takes stock for every item. If any item runs out, everything taken so far
// is put back and that item is returned (null means success).
export async function reserveStock(items) {
  const taken = [];

  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );

    if (result.modifiedCount === 0) {
      await releaseStock(taken);
      return item;
    }

    taken.push(item);
  }

  return null;
}

export async function releaseStock(items) {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );
  }
}

// ---------- emails ----------

async function logEmail(orderId, entry) {
  await Order.updateOne(
    { _id: orderId },
    {
      $push: {
        emails: {
          $each: [{ ...entry, at: new Date() }],
          $slice: -40,
        },
      },
    }
  );
}

// Sends one of the customer emails (confirmation, shipped, …) and records the
// result on the order so the admin can see whether it went out.
export async function sendOrderEmail(orderId, type) {
  const order = await Order.findById(orderId);
  if (!order) return { ok: false, error: "Order not found." };

  const { subject, html, text } = customerOrderEmail(order, type);
  const to = order.customer.email;
  const result = await sendMail({ to, subject, html, text });

  await logEmail(order._id, {
    type,
    to,
    ok: result.ok,
    error: result.ok ? "" : result.error,
  });

  if (result.ok) {
    console.log(`Email "${type}" sent to ${to} for ${order.orderNumber}`);
  } else if (!result.skipped) {
    console.error(
      `Email "${type}" failed for ${order.orderNumber}: ${result.error}`
    );
  }

  return result;
}

async function sendAdminAlert(orderId) {
  if (!env.orderAlertEmail) return;

  const order = await Order.findById(orderId);
  if (!order) return;

  const { subject, html, text } = newOrderAlert(order);

  const result = await sendMail({
    to: env.orderAlertEmail,
    subject,
    html,
    text,
    replyTo: order.customer.email,
  });

  await logEmail(order._id, {
    type: "admin-alert",
    to: env.orderAlertEmail,
    ok: result.ok,
    error: result.ok ? "" : result.error,
  });
}

// Called once, the moment an order becomes real (COD placed / UPI paid).
function announceNewOrder(order) {
  runInBackground(`confirmation email ${order.orderNumber}`, () =>
    sendOrderEmail(order._id, "confirmation")
  );

  runInBackground(`admin alert ${order.orderNumber}`, () =>
    sendAdminAlert(order._id)
  );
}

// ---------- creating orders ----------

export const newAccessToken = () => crypto.randomBytes(16).toString("hex");

// Saves a new order, retrying in the (very unlikely) event that the random
// order number is already taken.
export async function saveNewOrder(order) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    order.orderNumber = generateOrderNumber();

    try {
      await order.save();
      return order;
    } catch (error) {
      const duplicateNumber =
        error?.code === 11000 && error?.keyPattern?.orderNumber;

      if (!duplicateNumber) throw error;
    }
  }

  throw new Error("Could not generate a unique order number.");
}

// Cash on Delivery: the order is real straight away.
export async function placeCodOrder(order) {
  const now = new Date();

  order.status = "pending";
  order.placedAt = now;
  order.seenByAdmin = false;
  order.payment.status = "pending";

  order.timeline.push({
    status: "pending",
    message: "Order placed — Cash on Delivery.",
    at: now,
  });

  await saveNewOrder(order);
  announceNewOrder(order);

  return order;
}

// ---------- UPI QR payments ----------

// Records a successful payment exactly once, whether Razorpay reports it
// through a webhook or our own status check.
export async function markPaid(orderId, paymentId = "") {
  if (!paymentId) {
    console.warn(`Payment confirmation rejected for order ${orderId}: missing payment ID.`);
    return null;
  }

  const now = new Date();

  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      "payment.method": "upi",
      "payment.status": { $in: ["pending", "failed"] },
      status: { $in: ["awaiting_payment", "expired"] },
    },
    {
      $set: {
        status: "pending",
        placedAt: now,
        seenByAdmin: false,
        "payment.status": "paid",
        "payment.paymentId": paymentId,
        "payment.paidAt": now,
      },
      $push: {
        timeline: {
          status: "pending",
          message: "Payment received. Your order is confirmed.",
          at: now,
        },
      },
    },
    { returnDocument: "after" }
  );

  if (!order) return null;

  // If payment arrived after the QR expired, stock may already have been
  // released. Try to reserve it again.
  if (!order.stockReserved) {
    const missing = await reserveStock(order.items);

    if (missing) {
      order.attention =
        `Paid after the payment window closed and "${missing.name}" is now out of stock. Restock it or refund the customer.`;

      await Order.updateOne(
        { _id: order._id },
        { $set: { attention: order.attention } }
      );

      console.warn(
        `Order ${order.orderNumber} needs attention: ${order.attention}`
      );
    } else {
      order.stockReserved = true;

      await Order.updateOne(
        { _id: order._id },
        { $set: { stockReserved: true } }
      );
    }
  }

  announceNewOrder(order);

  return order;
}

// Gives up on a UPI checkout that was never paid.
// The stock goes back and its QR code is closed.
export async function expireOrder(
  orderId,
  { cancelLink = true, message } = {}
) {
  const before = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: "awaiting_payment",
      "payment.status": { $ne: "paid" },
    },
    {
      $set: {
        status: "expired",
        "payment.status": "failed",
        stockReserved: false,
      },
      $push: {
        timeline: {
          status: "expired",
          message: message || "Payment was not completed.",
          at: new Date(),
        },
      },
    },
    { returnDocument: "before" }
  );

  if (!before) return null;

  if (before.stockReserved) {
    await releaseStock(before.items);
  }

  if (razorpay.isConfigured()) {
    if (before.payment?.qrId) {
      runInBackground(`close QR code ${before.orderNumber}`, () =>
        razorpay.closeQrCode(before.payment.qrId).catch((error) => {
          console.warn(
            `Could not close QR for ${before.orderNumber}:`,
            error.message
          );
        })
      );
    } else if (cancelLink && before.payment?.linkId) {
      // Backward compatibility for older Payment Link orders.
      runInBackground(`cancel payment link ${before.orderNumber}`, () =>
        razorpay.cancelPaymentLink(before.payment.linkId).catch(() => {
          // Already expired or paid — nothing to close.
        })
      );
    }
  }

  return before;
}

// Asks Razorpay whether an unpaid QR order has been paid.
// The amount and currency are checked against the saved order.
// Returns the up-to-date order.
export async function syncPayment(order) {
  const unpaid = ["awaiting_payment", "expired"].includes(order.status);

  if (
    !unpaid ||
    order.payment?.method !== "upi" ||
    !order.payment.qrId
  ) {
    return order;
  }

  if (!razorpay.isConfigured()) {
    return order;
  }

  const result = await razorpay.fetchQrPayments(order.payment.qrId, 100);

  const payments = Array.isArray(result?.items) ? result.items : [];

  const expectedAmount = Math.round(Number(order.total) * 100);

  const captured = payments.find(
    (payment) =>
      payment.status === "captured" &&
      payment.currency === "INR" &&
      Number(payment.amount) === expectedAmount &&
      typeof payment.id === "string"
  );

  if (captured) {
    await markPaid(order._id, captured.id);
    return Order.findById(order._id);
  }

  // Check expiry only after checking Razorpay's payment records.
  if (
    order.status === "awaiting_payment" &&
    order.payment.qrExpiresAt &&
    new Date(order.payment.qrExpiresAt).getTime() <= Date.now()
  ) {
    try {
      await razorpay.closeQrCode(order.payment.qrId);
    } catch (error) {
      console.warn(
        `QR close failed for ${order.orderNumber}:`,
        error.message
      );
    }

    // Check once more after closing, in case payment was completed around
    // the expiry time.
    const finalResult = await razorpay.fetchQrPayments(
      order.payment.qrId,
      100
    );

    const finalPayments = Array.isArray(finalResult?.items)
      ? finalResult.items
      : [];

    const finalCaptured = finalPayments.find(
      (payment) =>
        payment.status === "captured" &&
        payment.currency === "INR" &&
        Number(payment.amount) === expectedAmount &&
        typeof payment.id === "string"
    );

    if (finalCaptured) {
      await markPaid(order._id, finalCaptured.id);
      return Order.findById(order._id);
    }

    await expireOrder(order._id, {
      cancelLink: false,
      message: "Payment window expired.",
    });

    return Order.findById(order._id);
  }

  return order;
}

// ---------- admin status changes ----------

const timelineMessage = (status, order) => {
  switch (status) {
    case "pending":
      return "Order received.";

    case "processing":
      return "Your order is confirmed and being prepared.";

    case "shipped": {
      const { courier, awb } = order.shipping || {};
      const parts = ["Your order has shipped"];

      if (courier) parts.push(`with ${courier}`);

      return `${parts.join(" ")}.${awb ? ` Tracking number ${awb}.` : ""}`;
    }

    case "out_for_delivery":
      return "Out for delivery.";

    case "delivered":
      return "Delivered.";

    case "cancelled":
      return "Order cancelled.";

    default:
      return "Order updated.";
  }
};

const STATUS_EMAILS = {
  shipped: "shipped",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

// Moves a placed order to another status, with the side effects that go with
// it (stock, COD collection, dates, the customer email).
export async function changeOrderStatus(
  order,
  nextStatus,
  { reason = "", notify = true } = {}
) {
  const previous = order.status;

  if (!ADMIN_STATUSES.includes(nextStatus)) {
    throw badRequest("That is not a valid order status.");
  }

  if (!PLACED_STATUSES.includes(previous)) {
    throw conflict(
      "This checkout was never paid, so it has no order status to change."
    );
  }

  if (previous === nextStatus) {
    return { order, changed: false };
  }

  const now = new Date();
  const isCod = order.payment.method === "cod";

  if (nextStatus === "cancelled") {
    if (order.stockReserved) {
      await releaseStock(order.items);
      order.stockReserved = false;
    }

    order.cancelledAt = now;
    order.cancelReason = reason;

    if (isCod && order.payment.status === "pending") {
      order.payment.status = "failed";
    }
  } else {
    if (previous === "cancelled") {
      if (order.payment.status === "refunded") {
        throw conflict(
          "This order has been refunded, so it can't be re-opened. Ask the customer to place a new order."
        );
      }

      const missing = await reserveStock(order.items);

      if (missing) {
        throw conflict(
          `Can't re-open this order — "${missing.name}" doesn't have enough stock.`
        );
      }

      order.stockReserved = true;
      order.cancelledAt = undefined;
      order.cancelReason = "";

      if (isCod && order.payment.status === "failed") {
        order.payment.status = "pending";
      }
    }

    const hasShipped = [
      "shipped",
      "out_for_delivery",
      "delivered",
    ].includes(nextStatus);

    if (hasShipped && !order.shipping.shippedAt) {
      order.shipping.shippedAt = now;
    }

    if (!hasShipped) {
      order.shipping.shippedAt = undefined;
    }

    if (nextStatus === "delivered") {
      order.shipping.deliveredAt = now;

      // Cash is collected at the door.
      if (isCod && order.payment.status === "pending") {
        order.payment.status = "paid";
        order.payment.paidAt = now;
      }
    } else if (previous === "delivered") {
      order.shipping.deliveredAt = undefined;

      if (isCod && order.payment.status === "paid") {
        order.payment.status = "pending";
        order.payment.paidAt = undefined;
      }
    }
  }

  order.status = nextStatus;

  order.timeline.push({
    status: nextStatus,
    message: timelineMessage(nextStatus, order),
    at: now,
  });

  await order.save();

  const emailType = STATUS_EMAILS[nextStatus];

  if (notify && emailType) {
    runInBackground(`${emailType} email ${order.orderNumber}`, () =>
      sendOrderEmail(order._id, emailType)
    );
  }

  return { order, changed: true, previous };
}

// Marks a paid UPI order as refunded (or undoes that).
// The refund itself is made in the Razorpay dashboard — this only records it.
export async function setRefunded(order, refunded) {
  if (order.payment.method !== "upi") {
    throw badRequest("Only online payments can be marked as refunded.");
  }

  if (refunded) {
    if (order.payment.status !== "paid") {
      throw conflict("Only a paid order can be refunded.");
    }

    order.payment.status = "refunded";
    order.payment.refundedAt = new Date();

    order.timeline.push({
      status: order.status,
      message: "Refund issued.",
      at: new Date(),
    });
  } else {
    if (order.payment.status !== "refunded") return order;

    order.payment.status = "paid";
    order.payment.refundedAt = undefined;
  }

  await order.save();

  return order;
}
