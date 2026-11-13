// Admin: create and manage discount coupons.
import Coupon from "../models/Coupon.js";
import { badRequest, conflict, notFound } from "../utils/httpError.js";
import { boolean, integer, isObjectId, line } from "../utils/validate.js";
import { normalizeCode } from "../services/couponService.js";

function clean(body, { creating }) {
  const data = {};
  const has = (key) => body[key] !== undefined;
  const whole = (key, label, { min = 0, max = 10000000 } = {}) => {
    const value = body[key] === "" || body[key] === null ? 0 : integer(body[key], { min, max });
    if (value === null) throw badRequest(`${label} must be a whole number.`);
    return value;
  };
  const date = (key) => {
    if (!body[key]) return null;
    const value = new Date(body[key]);
    if (Number.isNaN(value.getTime())) throw badRequest("Please enter a valid date.");
    return value;
  };

  if (creating || has("code")) {
    data.code = normalizeCode(body.code);
    if (!data.code) throw badRequest("Please enter a coupon code.");
  }
  if (has("description")) data.description = line(body.description, 120);
  if (has("type")) {
    if (!["percent", "flat"].includes(body.type)) throw badRequest("Type must be percent or flat.");
    data.type = body.type;
  }
  if (creating || has("value")) data.value = whole("value", "Discount value", { min: 1 });
  if (has("maxDiscount")) data.maxDiscount = whole("maxDiscount", "Maximum discount");
  if (has("minOrder")) data.minOrder = whole("minOrder", "Minimum order");
  if (has("usageLimit")) data.usageLimit = whole("usageLimit", "Usage limit");
  if (has("perCustomerLimit")) data.perCustomerLimit = whole("perCustomerLimit", "Per-customer limit");
  if (has("paymentMethod")) {
    if (!["any", "upi", "cod"].includes(body.paymentMethod)) throw badRequest("Invalid payment method.");
    data.paymentMethod = body.paymentMethod;
  }
  if (has("startsAt")) data.startsAt = date("startsAt");
  if (has("expiresAt")) data.expiresAt = date("expiresAt");
  if (has("active")) data.active = boolean(body.active, true);

  if (data.startsAt && data.expiresAt && data.expiresAt <= data.startsAt) {
    throw badRequest("The expiry date must be after the start date.");
  }
  return data;
}

// GET /api/admin/coupons
export async function listCoupons(req, res) {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.set("Cache-Control", "no-store");
  res.json({ coupons });
}

// POST /api/admin/coupons
export async function createCoupon(req, res) {
  const data = clean(req.body || {}, { creating: true });
  if (await Coupon.exists({ code: data.code })) throw conflict(`Coupon ${data.code} already exists.`);
  const coupon = await Coupon.create(data);
  res.status(201).json({ coupon });
}

async function find(id) {
  if (!isObjectId(id)) throw notFound("Coupon not found.");
  const coupon = await Coupon.findById(id);
  if (!coupon) throw notFound("Coupon not found.");
  return coupon;
}

// PATCH /api/admin/coupons/:id
export async function updateCoupon(req, res) {
  const coupon = await find(req.params.id);
  const data = clean(req.body || {}, { creating: false });
  if (data.code && data.code !== coupon.code && (await Coupon.exists({ code: data.code }))) {
    throw conflict(`Coupon ${data.code} already exists.`);
  }
  coupon.set(data);
  await coupon.save();
  res.json({ coupon });
}

// DELETE /api/admin/coupons/:id — past orders keep their copy of the code.
export async function deleteCoupon(req, res) {
  const coupon = await find(req.params.id);
  await coupon.deleteOne();
  res.json({ message: `Coupon ${coupon.code} deleted.` });
}
