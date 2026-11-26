// Shipway API helper.
// Docs: https://apidocs.shipway.com — Basic auth with your Shipway login email
// as the username and your License Key (Shipway → Profile → Manage Profile)
// as the password.
import { env } from "../config/env.js";
import { advancePaid } from "../config/store.js";

const BASE = "https://app.shipway.com/api";

// The order number Shipway knows this order by. Normally our order number; after the
// order was cancelled in Shipway and sent again it gets a suffix (GAD-XXXX-R1, -R2 …),
// because Shipway keeps a cancelled order number cancelled.
export const shipwayId = (order) => order.shipping?.shipwayOrderId || order.orderNumber;

export function nextShipwayId(order) {
  const current = shipwayId(order);
  const match = /-R(\d+)$/.exec(current);
  return match ? current.replace(/-R\d+$/, `-R${Number(match[1]) + 1}`) : `${order.orderNumber}-R1`;
}

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

// ---------- warehouse (pickup address) ----------

let warehouseCache = null;
let warehouseCacheAt = 0;

export async function getWarehouses() {
  const data = await api("/getwarehouses");
  const message = data?.message;
  const list = Array.isArray(message) ? message : message && typeof message === "object" ? Object.values(message) : [];
  return list.map((w) => ({
    id: String(w.warehouse_id),
    title: w.title || "",
    city: w.city || "",
    pincode: String(w.pincode || ""),
    isDefault: String(w.default) === "1",
  }));
}

// The pickup warehouse: SHIPWAY_WAREHOUSE_ID if set, otherwise your default one in Shipway.
export async function resolveWarehouse() {
  if (warehouseCache && Date.now() - warehouseCacheAt < 10 * 60 * 1000) return warehouseCache;
  const wanted = env.shipway.warehouseId;
  let list = [];
  try {
    list = await getWarehouses();
  } catch (error) {
    if (wanted) return { id: wanted, pincode: "", title: "" }; // can still ship without its PIN code
    throw error;
  }
  const found = wanted ? list.find((w) => w.id === String(wanted)) : list.find((w) => w.isDefault) || list[0];
  if (!found) {
    throw new Error(
      wanted
        ? `Warehouse ${wanted} (SHIPWAY_WAREHOUSE_ID) isn't in your Shipway account. Remove that line to use your default pickup address.`
        : "No pickup address in Shipway yet. Add one in Shipway → Settings → Warehouse.",
    );
  }
  warehouseCache = found;
  warehouseCacheAt = Date.now();
  return found;
}

// ---------- couriers ----------

const unitsOf = (order) => order.items.reduce((sum, item) => sum + item.quantity, 0);
const weightKg = (order) => Math.max(0.1, +(unitsOf(order) * env.shipway.itemWeightKg).toFixed(2));

// Couriers that can take this order, cheapest first:
// Shipway's own couriers (with prices) + your own courier accounts that serve the PIN code.
export async function courierOptions(order, parcel) {
  const warehouse = await resolveWarehouse();
  const cod = order.payment.method === "cod";
  const toPin = order.shippingAddress.pincode;
  const options = new Map();
  const notes = [];

  if (warehouse.pincode) {
    try {
      const data = await api("/getshipwaycarrierrates", {
        query: {
          fromPincode: warehouse.pincode,
          toPincode: toPin,
          paymentType: cod ? "cod" : "prepaid",
          weight: parcel ? parcel.weightKg : weightKg(order),
          length: parcel ? parcel.lengthCm : env.shipway.boxLengthCm,
          breadth: parcel ? parcel.breadthCm : env.shipway.boxBreadthCm,
          height: parcel ? parcel.heightCm : env.shipway.boxHeightCm,
          cummulativePrice: cod ? order.total : undefined,
        },
      });
      for (const rate of Array.isArray(data?.rate_card) ? data.rate_card : []) {
        options.set(String(rate.carrier_id), {
          id: String(rate.carrier_id),
          name: rate.courier_name || `Courier ${rate.carrier_id}`,
          charge: Number(rate.delivery_charge) || null,
          rtoCharge: Number(rate.rto_charge) || null,
        });
      }
    } catch (error) {
      notes.push(`Prices unavailable: ${error.message}`);
    }
  }

  try {
    const data = await api("/pincodeserviceable", { query: { pincode: toPin, payment_type: cod ? "C" : "P" } });
    for (const carrier of Array.isArray(data?.message) ? data.message : []) {
      const id = String(carrier.carrier_id);
      if (!options.has(id)) {
        options.set(id, { id, name: carrier.carrier_title || carrier.name || `Courier ${id}`, charge: null, rtoCharge: null });
      }
    }
  } catch (error) {
    notes.push(`Serviceability check failed: ${error.message}`);
  }

  const couriers = [...options.values()].sort((a, b) => (a.charge ?? Infinity) - (b.charge ?? Infinity));
  return { warehouse, couriers, notes };
}

// One of our orders -> Shipway's "push order" request. Amounts are rupees.
export function buildOrderPayload(order, { withLabel = false, warehouseId = "", carrierId = "", parcel = null } = {}) {
  const units = unitsOf(order);
  const address = order.shippingAddress;
  const { returnWarehouseId, itemWeightKg, boxLengthCm, boxBreadthCm, boxHeightCm } = env.shipway;
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
    order_id: shipwayId(order),
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
    // COD advance already paid online: Shipway takes it off the cash the courier collects.
    ...(advancePaid(order) ? { gift_card_amt: String(advancePaid(order)) } : {}),
    taxes: "0", // prices already include GST
    payment_type: order.payment.method === "cod" ? "C" : "P",
    email: customer.email,
    ...person("billing"),
    ...person("shipping"),
    // grams / cm — from the admin panel (or the products), else the .env defaults
    order_weight: String(Math.max(50, Math.round((parcel ? parcel.weightKg : units * itemWeightKg) * 1000))),
    box_length: String(Math.round(parcel ? parcel.lengthCm : boxLengthCm)),
    box_breadth: String(Math.round(parcel ? parcel.breadthCm : boxBreadthCm)),
    box_height: String(Math.round(parcel ? parcel.heightCm : boxHeightCm)),
    order_date: swDateTime(order.placedAt || order.createdAt),
  };

  if (withLabel) {
    payload.warehouse_id = String(warehouseId);
    payload.return_warehouse_id = String(returnWarehouseId || warehouseId);
    // Empty = Shipway picks its recommended courier.
    if (carrierId && /^\d+$/.test(String(carrierId))) payload.carrier_id = Number(carrierId);
  }
  return payload;
}

// Push the order to Shipway only (no courier, nothing charged).
export async function pushOrder(order, parcel = null) {
  const data = await api("/v2orders", { method: "POST", body: buildOrderPayload(order, { parcel }) });
  if (failed(data)) throw new Error(`Shipway: ${messageOf(data) || "order was not added"}`);
  return data;
}

// Push the order + assign a courier and AWB + make the label (charges your Shipway wallet).
// Returns { awb, carrierId, labelUrl, message }.
export async function pushOrderWithLabel(order, { warehouseId, carrierId, parcel = null } = {}) {
  const data = await api("/v2orders", { method: "POST", body: buildOrderPayload(order, { withLabel: true, warehouseId, carrierId, parcel }) });
  const awb = data?.awb_response || {};
  if (awb.AWB) {
    return { awb: String(awb.AWB), carrierId: awb.carrier_id ? String(awb.carrier_id) : "", labelUrl: awb.shipping_url || "" };
  }
  if (failed(data)) {
    const reason = messageOf(data) || "order was not added";
    if (/carrier/i.test(reason)) {
      throw new Error(`Shipway: ${reason} — choose a courier from the list and try again.`);
    }
    throw new Error(`Shipway: ${reason}`);
  }
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

export async function createPickup(order, carrierId, warehouseId) {
  const { returnWarehouseId, pickupTime, officeCloseTime } = env.shipway;
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
      order_ids: [shipwayId(order)],
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

const STAGES = ["shipped", "out_for_delivery", "delivered"];

// Furthest stage the courier scans prove the parcel has reached (null = none).
// Backup for when Shipway's current status is something we don't recognise
// (e.g. "Exchange"), so the order doesn't stay stuck on "Packed".
export function statusFromEvents(events = []) {
  let best = -1;
  for (const event of events || []) {
    const s = String(event?.status || "").toUpperCase();
    if (!s || /RTO|RETURN|CANCEL|LOST|DAMAGED/.test(s)) continue;
    let stage = -1;
    if (/\bDELIVERED\b/.test(s) && !/UNDELIVERED|NOT DELIVERED/.test(s)) stage = 2;
    else if (s.includes("OUT FOR DELIVERY")) stage = 1;
    else if (/PICKED UP|IN TRANSIT|SHIPPED|DISPATCHED|RECEIVED AT|ORIGIN CENTER|BAG|TRIP|VEHICLE|REACHED|ARRIVED/.test(s)) stage = 0;
    best = Math.max(best, stage);
  }
  return best < 0 ? null : STAGES[best];
}

// Whichever of two order statuses is further along (null-safe).
export function furthest(a, b) {
  return STAGES.indexOf(b) > STAGES.indexOf(a) ? b : a || b || null;
}

// Latest courier scan says the delivery attempt failed (customer to be contacted).
export const isFailedAttempt = (text = "") =>
  /CONSIGNEE UNAVAILABLE|NOT AVAILABLE|DOOR LOCKED|PREMISES CLOSED|REFUSED|ADDRESS (ISSUE|INCOMPLETE|NOT FOUND)|NOT REACHABLE|UNDELIVERED|DELIVERY ATTEMPT/i.test(
    String(text),
  );

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
