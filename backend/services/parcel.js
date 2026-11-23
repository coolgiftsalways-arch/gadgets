// The parcel (weight + box size) sent to Shipway for an order.
//
// 1. If the admin set it on the order, that wins.
// 2. Otherwise it is worked out from the products: weight = each product's packed
//    weight × quantity, box = the biggest product box in the order.
// 3. Products without shipping details use the SHIPWAY_* defaults from .env.
import Product from "../models/Product.js";
import { env } from "../config/env.js";
import { badRequest } from "../utils/httpError.js";

const round = (n, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

export const volumetricKg = ({ lengthCm, breadthCm, heightCm }) => round((lengthCm * breadthCm * heightCm) / 5000);

function withCharges(parcel, source) {
  const volumetric = volumetricKg(parcel);
  return { ...parcel, volumetricKg: volumetric, chargeableKg: Math.max(parcel.weightKg, volumetric), source };
}

export async function suggestedParcel(order) {
  const defaults = {
    weightKg: env.shipway.itemWeightKg,
    lengthCm: env.shipway.boxLengthCm,
    breadthCm: env.shipway.boxBreadthCm,
    heightCm: env.shipway.boxHeightCm,
  };
  const ids = [...new Set(order.items.map((item) => String(item.product)))];
  const products = await Product.find({ _id: { $in: ids } }).select("shipping").lean();
  const byId = new Map(products.map((p) => [String(p._id), p.shipping || {}]));

  let weightKg = 0;
  let box = null;
  let missing = 0;
  for (const item of order.items) {
    const s = byId.get(String(item.product)) || {};
    if (!s.weightKg) missing += 1;
    weightKg += (s.weightKg || defaults.weightKg) * item.quantity;
    const itemBox = {
      lengthCm: s.lengthCm || defaults.lengthCm,
      breadthCm: s.breadthCm || defaults.breadthCm,
      heightCm: s.heightCm || defaults.heightCm,
    };
    if (!box || volumetricKg(itemBox) > volumetricKg(box)) box = itemBox;
  }

  return withCharges(
    { weightKg: round(Math.max(0.05, weightKg)), ...(box || defaults) },
    missing ? "products + defaults" : "products",
  );
}

// What to send: the admin's saved parcel, or the suggestion.
export async function parcelFor(order) {
  const saved = order.shipping?.parcel;
  if (saved?.weightKg && saved?.lengthCm && saved?.breadthCm && saved?.heightCm) {
    return withCharges(
      { weightKg: saved.weightKg, lengthCm: saved.lengthCm, breadthCm: saved.breadthCm, heightCm: saved.heightCm },
      "order",
    );
  }
  return suggestedParcel(order);
}

// Validates a parcel typed in the admin panel.
export function cleanParcel(raw) {
  if (!raw || typeof raw !== "object") return null;
  const num = (value, label, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) throw badRequest(`${label} must be between ${min} and ${max}.`);
    return round(n, 3);
  };
  return {
    weightKg: num(raw.weightKg, "Parcel weight (kg)", 0.01, 100),
    lengthCm: num(raw.lengthCm, "Box length (cm)", 1, 200),
    breadthCm: num(raw.breadthCm, "Box breadth (cm)", 1, 200),
    heightCm: num(raw.heightCm, "Box height (cm)", 1, 200),
  };
}
