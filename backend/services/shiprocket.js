// Shiprocket API helper (same approach as lights.bio).
// Docs: https://apidocs.shiprocket.in — log in with an "API user":
// Shiprocket panel → Settings → API → Create API User.
import { env } from "../config/env.js";

const BASE = "https://apiv2.shiprocket.in/v1/external";
const TOKEN_MAX_AGE = 20 * 60 * 60 * 1000; // tokens last ~10 days; refresh daily

let token = null;
let tokenAt = 0;

export const isConfigured = () => Boolean(env.shiprocket.email && env.shiprocket.password);
export const mode = () => env.shiprocket.mode;

async function login() {
  const response = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.shiprocket.email, password: env.shiprocket.password }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) {
    throw new Error(`Shiprocket login failed: ${data.message || response.status}. Check SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD (use an API user).`);
  }
  token = data.token;
  tokenAt = Date.now();
}

async function api(path, { method = "GET", body } = {}, retried = false) {
  if (!isConfigured()) {
    throw new Error("Shiprocket is not set up — add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to backend/.env.");
  }
  if (!token || Date.now() - tokenAt > TOKEN_MAX_AGE) await login();

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  if (response.status === 401 && !retried) {
    token = null;
    return api(path, { method, body }, true);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = data.errors ? Object.values(data.errors).flat().join(" ") : "";
    throw new Error(`Shiprocket: ${data.message || response.statusText}${details ? ` — ${details}` : ""}`);
  }
  return data;
}

// "2026-11-05 14:30" in India time
function srDate(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
}

// One of our orders -> Shiprocket's "create order" request. Amounts are rupees.
export function buildOrderPayload(order) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const address = order.shippingAddress;
  const { pickupLocation, itemWeightKg, boxLengthCm, boxBreadthCm, boxHeightCm } = env.shiprocket;
  const discount = (order.discount || 0) + (order.couponDiscount || 0);

  return {
    order_id: order.orderNumber,
    order_date: srDate(order.placedAt || order.createdAt),
    pickup_location: pickupLocation,
    billing_customer_name: order.customer.firstName,
    billing_last_name: order.customer.lastName,
    billing_address: address.line1,
    billing_address_2: address.line2 || "",
    billing_city: address.city,
    billing_pincode: address.pincode,
    billing_state: address.state,
    billing_country: "India",
    billing_email: order.customer.email,
    billing_phone: order.customer.phone,
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: item.color ? `${item.name} (${item.color})` : item.name,
      sku: item.sku || String(item.product),
      units: item.quantity,
      selling_price: item.price,
    })),
    payment_method: order.payment.method === "cod" ? "COD" : "Prepaid",
    shipping_charges: order.shippingFee || 0,
    total_discount: discount,
    sub_total: order.subtotal, // Shiprocket subtracts total_discount itself
    length: boxLengthCm,
    breadth: boxBreadthCm,
    height: boxHeightCm,
    weight: Math.max(0.1, +(units * itemWeightKg).toFixed(2)),
  };
}

export const createOrder = (order) =>
  api("/orders/create/adhoc", { method: "POST", body: buildOrderPayload(order) });
export const assignAwb = (shipmentId) =>
  api("/courier/assign/awb", { method: "POST", body: { shipment_id: shipmentId } });
export const generatePickup = (shipmentId) =>
  api("/courier/generate/pickup", { method: "POST", body: { shipment_id: [shipmentId] } });
export const generateLabel = (shipmentId) =>
  api("/courier/generate/label", { method: "POST", body: { shipment_id: [shipmentId] } });
export const trackAwb = (awb) => api(`/courier/track/awb/${encodeURIComponent(awb)}`);
export const cancelOrders = (srOrderIds) =>
  api("/orders/cancel", { method: "POST", body: { ids: srOrderIds } });

export const trackingUrl = (awb) => `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;

// Shiprocket status text -> our order status (null = leave it alone).
export function mapStatus(srStatus = "") {
  const s = String(srStatus).toUpperCase();
  if (!s || /RTO|UNDELIVERED|CANCEL|LOST|DAMAGED|DESTROYED/.test(s)) return null;
  if (s.includes("OUT FOR DELIVERY")) return "out_for_delivery";
  if (s.includes("DELIVERED")) return "delivered";
  if (s.includes("OUT FOR PICKUP") || s.includes("PICKUP SCHEDULED") || s.includes("AWB ASSIGNED")) return null;
  if (/PICKED UP|IN TRANSIT|SHIPPED|REACHED|DISPATCHED/.test(s)) return "shipped";
  return null;
}

// Turns Shiprocket's tracking reply into { status, etd, trackUrl, events }.
export function readTracking(data) {
  const t = data?.tracking_data || {};
  const current = t.shipment_track?.[0] || {};
  return {
    status: current.current_status || "",
    etd: t.etd || current.edd || "",
    trackUrl: t.track_url || "",
    events: Array.isArray(t.shipment_track_activities)
      ? t.shipment_track_activities.slice(0, 20).map((event) => ({
          date: event.date,
          status: event.activity || event["sr-status-label"] || event.status,
          location: event.location || "",
        }))
      : null,
  };
}
