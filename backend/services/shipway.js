// Shipway API helper.
// Docs: https://apidocs.shipway.com — Basic auth with your Shipway login email
// as the username and your License Key (Shipway → Profile → Manage Profile)
// as the password.
import { env } from "../config/env.js";

const BASE = "https://app.shipway.com/api";

export const isConfigured = () => Boolean(env.shipway.email && env.shipway.licenseKey);
export const mode = () => env.shipway.mode;

const authHeader = () =>
  `Basic ${Buffer.from(`${env.shipway.email}:${env.shipway.licenseKey}`).toString("base64")}`;

// Shipway often answers 200 with { success: false / "" , error: 1, message }.
const failed = (data) =>
  data && typeof data === "object" && !Array.isArray(data) &&
  (data.success === false || data.success === "" || data.success === 0 || data.error === 1 || data.error === true || data.error === "1");

const messageOf = (data) =>
  typeof data?.message === "string" ? data.message : data?.error && typeof data.error === "string" ? data.error : "";

async function api(path, { method = "GET", body, query } = {}) {
  if (!isConfigured()) {
    throw new Error("Shipway is not set up — add SHIPWAY_EMAIL and SHIPWAY_LICENSE_KEY to backend/.env.");
  }

  const url = new URL(`${BASE}${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: authHeader() },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Shipway rejected the login. Check SHIPWAY_EMAIL and SHIPWAY_LICENSE_KEY (Shipway → Profile → Manage Profile).");
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Shipway: unexpected reply (${response.status}) ${text.slice(0, 200)}`);
  }
  if (!response.ok) throw new Error(`Shipway: ${messageOf(data) || response.statusText || response.status}`);
  return data;
}

// India-time date parts.
function istParts(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  if (parts.hour === "24") parts.hour = "00";
  return parts;
}

// "2026-11-05 14:30:00" in India time
function swDateTime(date = new Date()) {
  const p = istParts(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Next pickup day: today if there's still an hour before the pickup time,
// otherwise the next day; Sundays are skipped.
export function nextPickupDate(now = new Date()) {
  const p = istParts(now);
  let date = new Date(now);
  if (Number(p.hour) * 60 + Number(p.minute) > toMinutes(env.shipway.pickupTime) - 60) {
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  }
  if (istParts(date).weekday === "Sun") date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const d = istParts(date);
  return `${d.year}-${d.month}-${d.day}`;
}

// One of our orders -> Shipway's "push order" request. Amounts are rupees.
export function buildOrderPayload(order, { withLabel = false } = {}) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const address = order.shippingAddress;
  const { warehouseId, returnWarehouseId, carrierId, itemWeightKg, boxLengthCm, boxBreadthCm, boxHeightCm } = env.shipway;
  const discount = (order.discount || 0) + (order.couponDiscount || 0);
  const customer = order.customer;

  const person = (prefix) => ({
    [`${prefix}_firstname`]: customer.firstName,
    [`${prefix}_lastname`]: customer.lastName || "",
    [`${prefix}_address`]: address.line1,
    [`${prefix}_address2`]: address.line2 || "",
    [`${prefix}_city`]: address.city,
    [`${prefix}_state`]: address.state,
    [`${prefix}_country`]: "India",
    [`${prefix}_phone`]: customer.phone,
    [`${prefix}_zipcode`]: address.pincode,
  });

  const payload = {
    order_id: order.orderNumber,
    products: order.items.map((item) => ({
      product: item.color ? `${item.name} (${item.color})` : item.name,
      price: String(item.price),
      product_code: item.sku || String(item.product),
      product_quantity: String(item.quantity),
      discount: "0",
      tax_rate: "0",
      tax_title: "IGST",
    })),
    discount: String(discount),
    shipping: String(order.shippingFee || 0),
    order_total: String(order.total),
    taxes: "0", // prices already include GST
    payment_type: order.payment.method === "cod" ? "C" : "P",
    email: customer.email,
    ...person("billing"),
    ...person("shipping"),
    order_weight: String(Math.max(100, Math.round(units * itemWeightKg * 1000))), // grams
    box_length: String(boxLengthCm),
    box_breadth: String(boxBreadthCm),
    box_height: String(boxHeightCm),
    order_date: swDateTime(order.placedAt || order.createdAt),
  };

  if (withLabel) {
    payload.warehouse_id = String(warehouseId);
    payload.return_warehouse_id = String(returnWarehouseId || warehouseId);
    // Empty = Shipway picks its recommended courier.
    if (carrierId) payload.carrier_id = Number(carrierId);
  }
  return payload;
}

// Push the order to Shipway only (no courier, nothing charged).
export async function pushOrder(order) {
  const data = await api("/v2orders", { method: "POST", body: buildOrderPayload(order) });
  if (failed(data)) throw new Error(`Shipway: ${messageOf(data) || "order was not added"}`);
  return data;
}

// Push the order + assign a courier and AWB + make the label (charges your Shipway wallet).
// Returns { awb, carrierId, labelUrl, message }.
export async function pushOrderWithLabel(order) {
  const data = await api("/v2orders", { method: "POST", body: buildOrderPayload(order, { withLabel: true }) });
  const awb = data?.awb_response || {};
  if (awb.AWB) {
    return { awb: String(awb.AWB), carrierId: awb.carrier_id ? String(awb.carrier_id) : "", labelUrl: awb.shipping_url || "" };
  }
  if (failed(data)) throw new Error(`Shipway: ${messageOf(data) || "order was not added"}`);
  throw new Error(`Shipway couldn't assign a courier: ${messageOf(awb) || messageOf(data) || "no courier available for this PIN code"}`);
}

// Our order as Shipway has it (null if Shipway doesn't know it).
export async function getOrder(orderNumber) {
  const data = await api("/getorders", { query: { orderid: orderNumber } });
  const list = Array.isArray(data?.message) ? data.message : [];
  return list.find((entry) => String(entry.order_id) === String(orderNumber)) || null;
}

export async function createManifest(orderNumbers) {
  const data = await api("/Createmanifest/", { method: "POST", body: { order_ids: orderNumbers } });
  if (failed(data) || data?.status === false) throw new Error(`Shipway manifest: ${messageOf(data) || "failed"}`);
  return { manifestId: String(data["manifest ids"] || data.manifest_ids || data.manifest_id || "") };
}

export async function createPickup(order, carrierId) {
  const { warehouseId, returnWarehouseId, pickupTime, officeCloseTime } = env.shipway;
  const pickupDate = nextPickupDate();
  const data = await api("/createpickup/", {
    method: "POST",
    body: {
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      office_close_time: officeCloseTime,
      package_count: "1",
      carrier_id: String(carrierId),
      warehouse_id: String(warehouseId),
      return_warehouse_id: String(returnWarehouseId || warehouseId),
      payment_type: order.payment.method === "cod" ? "C" : "P",
      order_ids: [order.orderNumber],
    },
  });
  if (failed(data)) throw new Error(`Shipway pickup: ${messageOf(data) || "failed"}`);
  return { pickupDate: `${pickupDate} ${pickupTime}` };
}

export const trackAwb = (awb) =>
  api("/tracking", { query: { awb_numbers: awb, tracking_history: 1 } });

// Cancels the shipment (AWB) and then the order in Shipway. Best effort.
export async function cancel({ awb, orderNumber }) {
  if (awb) {
    const data = await api("/Cancel/", { method: "POST", body: { awb_number: [awb] } });
    if (failed(data)) throw new Error(messageOf(data) || "shipment could not be cancelled");
  }
  if (orderNumber) {
    const data = await api("/Cancelorders/", { method: "POST", body: { order_ids: [orderNumber] } });
    const row = Array.isArray(data) ? data[0] : data;
    // Once a courier is assigned Shipway may refuse the order cancel; the AWB cancel above is what matters.
    if (!awb && (failed(row) || row?.success === false)) throw new Error(messageOf(row) || "order could not be cancelled");
  }
}

// Shipway shipment status codes -> readable text.
export const STATUS_LABELS = {
  SCH: "Shipment booked",
  ONH: "On hold",
  NFI: "Status pending",
  NFIDS: "Status pending",
  PKF: "Pickup failed",
  PCAN: "Pickup cancelled",
  INT: "In transit",
  OOD: "Out for delivery",
  OFD: "Out for delivery",
  DEL: "Delivered",
  UND: "Undelivered",
  RTO: "RTO (returning to you)",
  RTD: "RTO delivered (back with you)",
  CAN: "Cancelled",
};

export const statusLabel = (code, text = "") => STATUS_LABELS[String(code || "").toUpperCase()] || text || code || "";

// Shipway status -> our order status (null = leave it alone).
// Uses the status code when there is one, the status text otherwise.
export function mapStatus(code = "", text = "") {
  const c = String(code || "").toUpperCase();
  if (c) {
    if (c === "DEL") return "delivered";
    if (c === "OOD" || c === "OFD") return "out_for_delivery";
    if (c === "INT") return "shipped";
    if (STATUS_LABELS[c] || /^(R|SH|RTO|QC)/.test(c)) return null;
  }
  const s = String(text || "").toUpperCase();
  if (!s || /RTO|UNDELIVERED|CANCEL|LOST|DAMAGED|FAIL|RETURN/.test(s)) return null;
  if (s.includes("OUT FOR DELIVERY")) return "out_for_delivery";
  if (s.includes("DELIVERED")) return "delivered";
  if (/OUT FOR PICKUP|BOOKED|SCHEDULED|MANIFEST/.test(s)) return null;
  if (/PICKED UP|IN TRANSIT|SHIPPED|REACHED|DISPATCHED|RECEIVED AT/.test(s)) return "shipped";
  return null;
}

// Turns Shipway's tracking reply for one AWB into { code, status, courier, trackUrl, events }.
export function readTracking(data, awb) {
  const list = Array.isArray(data) ? data : [];
  const entry = list.find((row) => String(row.awb) === String(awb)) || list[0] || {};
  if (entry.error && !entry.tracking_details) throw new Error(`Shipway: ${entry.error}`);

  const t = entry.tracking_details || {};
  const details = Array.isArray(t.shipment_details) ? t.shipment_details[0] || {} : {};
  const history = Array.isArray(t.shipment_track_activities)
    ? t.shipment_track_activities.map((event) => ({ date: event.date, status: event.activity || event.status, location: event.location || "" }))
    : Array.isArray(t.tracking_history)
      ? t.tracking_history.map((event) => ({ date: event.timestamp || event.date, status: event.status || event.remarks, location: event.location || "" }))
      : null;

  return {
    code: t.shipment_status || "",
    status: statusLabel(t.shipment_status, details.current_status),
    text: details.current_status || "",
    courier: details.courier_name || "",
    trackUrl: t.track_url || "",
    etd: "",
    events: history ? history.slice(0, 20) : null,
  };
}
