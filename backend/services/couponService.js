// Works out whether a coupon can be used, and how much it takes off.
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import { PLACED_STATUSES } from "../config/store.js";

const COUNTED = PLACED_STATUSES.filter((status) => status !== "cancelled");

export const normalizeCode = (code) =>
  typeof code === "string" ? code.trim().toUpperCase().replace(/\s+/g, "").slice(0, 20) : "";

const rupees = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;

export function couponDiscountFor(coupon, subtotal) {
  if (!coupon) return 0;
  let discount =
    coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : Math.round(coupon.value);
  if (coupon.type === "percent" && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  return Math.max(0, Math.min(discount, subtotal));
}

// Returns { coupon } or { error } for a code typed at checkout.
// method / phone are optional: without them those rules are checked later.
export async function checkCoupon(rawCode, { subtotal, method, phone } = {}) {
  const code = normalizeCode(rawCode);
  if (!code) return { error: "" };

  const coupon = await Coupon.findOne({ code });
  const now = new Date();

  if (!coupon || !coupon.active) return { error: "This coupon code isn't valid." };
  if (coupon.startsAt && coupon.startsAt > now) return { error: "This coupon isn't active yet." };
  if (coupon.expiresAt && coupon.expiresAt < now) return { error: "This coupon has expired." };
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { error: "This coupon has reached its usage limit." };
  }
  if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
    return { error: `Add ${rupees(coupon.minOrder - subtotal)} more to use this coupon (minimum order ${rupees(coupon.minOrder)}).` };
  }
  if (method && coupon.paymentMethod !== "any" && coupon.paymentMethod !== method) {
    return {
      error: coupon.paymentMethod === "upi" ? "This coupon is only valid when paying online (UPI)." : "This coupon is only valid for Cash on Delivery.",
      coupon,
      wrongMethod: true,
    };
  }
  if (phone && coupon.perCustomerLimit > 0) {
    const used = await Order.countDocuments({
      "coupon.code": code,
      "customer.phone": phone,
      status: { $in: COUNTED },
    });
    if (used >= coupon.perCustomerLimit) return { error: "You have already used this coupon." };
  }

  return { coupon };
}

// Usage counts go up when an order becomes real and down if it is cancelled.
export async function countCouponUse(code, change) {
  if (!code) return;
  await Coupon.updateOne(
    { code, ...(change < 0 ? { usedCount: { $gt: 0 } } : {}) },
    { $inc: { usedCount: change } },
  );
}
