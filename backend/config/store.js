// Store rules that the storefront, the checkout and the emails all share.
// The server is the only place prices are calculated — the browser just
// displays what these functions return.
import { env, isRazorpayConfigured } from "./env.js";

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export const PRODUCT_CATEGORIES = [
  "Audio",
  "Wearables",
  "Power",
  "Camera",
  "Accessories",
  "Smart Home",
  "Other",
];

// Line-art used on the storefront when a product has no photo yet.
export const PRODUCT_ICONS = [
  "headphones",
  "watch",
  "battery",
  "zap",
  "camera",
  "speaker",
  "smartphone",
  "plug",
  "home",
  "package",
];

export const PAYMENT_METHODS = ["upi", "cod"];

// Every stage an order can be in.
//   awaiting_payment – UPI checkout started, money not received yet
//   expired          – the customer never paid; stock was put back
//   pending          – a real order (UPI paid or COD placed), waiting for you
//   processing       – confirmed and being packed
//   shipped / out_for_delivery / delivered / cancelled
export const ORDER_STATUSES = [
  "awaiting_payment",
  "expired",
  "pending",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

// Statuses that count as a real order (shown to the admin by default).
export const PLACED_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const STATUS_LABELS = {
  awaiting_payment: "Awaiting payment",
  expired: "Payment not completed",
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const isUpiAvailable = () => isRazorpayConfigured();
export const isCodAvailable = () => env.store.codEnabled;

export function shippingFor(subtotal) {
  const { shippingFee, freeShippingAbove } = env.store;
  if (!shippingFee) return 0;
  if (freeShippingAbove > 0 && subtotal >= freeShippingAbove) return 0;
  return shippingFee;
}

export function deliveryFor(method) {
  const window = method === "upi" ? env.store.upiDelivery : env.store.codDelivery;
  const minDays = Math.min(window.minDays, window.maxDays);
  const maxDays = Math.max(window.minDays, window.maxDays);
  return { minDays, maxDays };
}

// All amounts are whole rupees. A coupon comes off the subtotal first, then
// UPI orders get their discount on what is left. The total can never drop
// below ₹1 (Razorpay's minimum charge).
export function priceOrder(subtotal, method, couponDiscount = 0) {
  const discountPercent = method === "upi" ? env.store.upiDiscountPercent : 0;
  const shippingFee = shippingFor(subtotal);

  const coupon = Math.max(0, Math.min(couponDiscount, subtotal + shippingFee - 1));
  const afterCoupon = subtotal - coupon;

  let discount = Math.round((afterCoupon * discountPercent) / 100);
  discount = Math.max(0, Math.min(discount, afterCoupon + shippingFee - 1));

  return {
    subtotal,
    couponDiscount: coupon,
    discount,
    discountPercent,
    shippingFee,
    total: afterCoupon - discount + shippingFee,
    delivery: deliveryFor(method),
  };
}

// What the storefront needs to know before checkout.
export function publicStoreConfig() {
  return {
    storeName: env.store.name,
    currency: "INR",
    maxQuantityPerItem: env.store.maxQuantityPerItem,
    shipping: {
      fee: env.store.shippingFee,
      freeAbove: env.store.freeShippingAbove,
    },
    payment: {
      upi: {
        enabled: isUpiAvailable(),
        discountPercent: env.store.upiDiscountPercent,
        delivery: deliveryFor("upi"),
        windowMinutes: env.store.paymentWindowMinutes,
      },
      cod: {
        enabled: isCodAvailable(),
        discountPercent: 0,
        delivery: deliveryFor("cod"),
      },
    },
    support: {
      email: env.store.supportEmail,
      phone: env.store.supportPhone,
      whatsapp: env.store.supportWhatsapp,
    },
    states: INDIAN_STATES,
    categories: PRODUCT_CATEGORIES,
  };
}
