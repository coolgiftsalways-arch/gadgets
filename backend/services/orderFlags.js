// Warnings shown to the admin on risky orders:
//   duplicate    — same phone ordered the same product within 48 hours
//   addressIssue — the delivery address looks too short or is just a phone number
import Order from "../models/Order.js";
import { PLACED_STATUSES } from "../config/store.js";

const DUPLICATE_WINDOW_MS = 48 * 60 * 60 * 1000;
const ACTIVE = PLACED_STATUSES.filter((status) => status !== "cancelled");

const when = (order) => new Date(order.placedAt || order.createdAt).getTime();
const productIds = (order) => new Set((order.items || []).map((item) => String(item.product)));

// Returns a reason string when the address needs a check, otherwise "".
export function addressIssue(address = {}, phone = "") {
  const line1 = String(address.line1 || "").trim();
  const line2 = String(address.line2 || "").trim();
  const both = `${line1} ${line2}`.trim();
  const digitsOnly = (value) => value.replace(/[\s\-+,./#]/g, "");

  if (/^\d{10,12}$/.test(digitsOnly(line1)) || (phone && digitsOnly(line1).endsWith(phone))) {
    return "Address line 1 is a phone number";
  }
  if (both.replace(/\s/g, "").length < 15) return "Address looks too short";
  if (!/[a-z]{3,}/i.test(both)) return "Address has no street or area name";
  return "";
}

// orders: documents with customer.phone, items.product, status, placedAt/createdAt, orderNumber.
// Returns Map(orderId -> { duplicateOf: [orderNumber], addressIssue }).
export async function flagOrders(orders) {
  const flags = new Map();
  if (!orders.length) return flags;

  const phones = [...new Set(orders.map((order) => order.customer?.phone).filter(Boolean))];
  const times = orders.map(when).filter(Number.isFinite);
  const from = new Date(Math.min(...times) - DUPLICATE_WINDOW_MS);
  const to = new Date(Math.max(...times) + DUPLICATE_WINDOW_MS);

  const siblings = phones.length
    ? await Order.find({
        "customer.phone": { $in: phones },
        status: { $in: ACTIVE },
        $or: [{ placedAt: { $gte: from, $lte: to } }, { placedAt: null, createdAt: { $gte: from, $lte: to } }],
      }).select("orderNumber customer.phone items.product placedAt createdAt status")
    : [];

  for (const order of orders) {
    const mine = productIds(order);
    const duplicateOf = ACTIVE.includes(order.status)
      ? siblings
          .filter(
            (other) =>
              String(other._id) !== String(order._id) &&
              other.customer?.phone === order.customer?.phone &&
              Math.abs(when(other) - when(order)) <= DUPLICATE_WINDOW_MS &&
              [...productIds(other)].some((id) => mine.has(id)),
          )
          .map((other) => other.orderNumber)
      : [];

    flags.set(String(order._id), {
      duplicateOf,
      addressIssue: order.shippingAddress?.line1 !== undefined ? addressIssue(order.shippingAddress, order.customer?.phone) : "",
    });
  }
  return flags;
}

// One order -> plain object with .flags attached.
export async function withFlags(order) {
  const flags = await flagOrders([order]);
  return { ...order.toObject(), flags: flags.get(String(order._id)) };
}
