import mongoose from "mongoose";
import { INDIAN_STATES, ORDER_STATUSES, PAYMENT_METHODS } from "../config/store.js";
import { EMAIL_PATTERN, PHONE_PATTERN, PINCODE_PATTERN } from "../utils/validate.js";

// A copy of the product as it was when bought, so old orders stay correct
// even if the product is later renamed, repriced or deleted.
const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: String,
    slug: String,
    image: String,
    color: String,
    price: { type: Number, required: true, min: 0 }, // rupees, per unit
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const timelineSchema = new mongoose.Schema(
  {
    status: String,
    message: { type: String, required: true },
    location: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const emailLogSchema = new mongoose.Schema(
  {
    type: String, // confirmation, shipped, delivered, cancelled, admin-alert
    to: String,
    ok: Boolean,
    error: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    // What the customer sees and types on the Track Order page.
    orderNumber: { type: String, required: true, unique: true },
    // Long random key for the customer's own order pages (payment screen,
    // "thank you" page). Unlike a database id it cannot be guessed.
    accessToken: { type: String, required: true, unique: true },

    items: {
      type: [itemSchema],
      validate: [(items) => items.length > 0, "Your cart is empty."],
    },

    customer: {
      firstName: {
        type: String,
        required: [true, "Please enter your first name."],
        trim: true,
        maxlength: 60,
      },
      lastName: {
        type: String,
        required: [true, "Please enter your last name."],
        trim: true,
        maxlength: 60,
      },
      email: {
        type: String,
        required: [true, "Please enter your email address."],
        trim: true,
        lowercase: true,
        match: [EMAIL_PATTERN, "Please enter a valid email address."],
      },
      phone: {
        type: String,
        required: [true, "Please enter your mobile number."],
        match: [PHONE_PATTERN, "Please enter a valid 10-digit Indian mobile number."],
        index: true,
      },
    },

    shippingAddress: {
      line1: {
        type: String,
        required: [true, "Please enter your address."],
        trim: true,
        maxlength: 200,
      },
      line2: { type: String, trim: true, maxlength: 200, default: "" },
      city: {
        type: String,
        required: [true, "Please enter your city."],
        trim: true,
        maxlength: 80,
      },
      state: {
        type: String,
        required: [true, "Please select your state."],
        enum: { values: INDIAN_STATES, message: "Please select a valid state." },
      },
      pincode: {
        type: String,
        required: [true, "Please enter your PIN code."],
        match: [PINCODE_PATTERN, "Please enter a valid 6-digit PIN code."],
      },
    },

    // All amounts are whole rupees.
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 }, // UPI discount
    // Coupon used at checkout (code is copied so deleting the coupon is safe).
    coupon: {
      code: { type: String, default: "" },
      description: { type: String, default: "" },
    },
    couponDiscount: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR" },

    payment: {
      method: { type: String, enum: PAYMENT_METHODS, required: true },
      // pending  = UPI not paid yet / COD cash not collected yet
      // paid     = money received (UPI captured, or COD delivered)
      // failed   = never paid (UPI abandoned, or COD order cancelled)
      // refunded = you sent the money back
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      discountPercent: { type: Number, default: 0 },
      linkId: { type: String, index: true, sparse: true }, // Razorpay payment link
      linkUrl: String,
      linkExpiresAt: Date,
      paymentId: String, // Razorpay payment id (pay_…)
      paidAt: Date,
      refundedAt: Date,
    },

    delivery: { minDays: Number, maxDays: Number }, // promised at checkout

    status: { type: String, enum: ORDER_STATUSES, required: true, index: true },

    // True while this order is holding units out of product stock.
    stockReserved: { type: Boolean, default: false },
    // Set when something needs a human (e.g. paid after stock ran out).
    attention: { type: String, default: "" },

    placedAt: { type: Date, index: true }, // when it became a real order
    seenByAdmin: { type: Boolean, default: true, index: true },

    shipping: {
      courier: { type: String, trim: true, maxlength: 80, default: "" },
      awb: { type: String, trim: true, maxlength: 80, default: "" },
      trackingUrl: { type: String, trim: true, maxlength: 500, default: "" },
      estimatedDelivery: Date,
      shippedAt: Date,
      deliveredAt: Date,

      // Shiprocket (filled in by "Ship with Shiprocket" in the admin panel)
      srOrderId: String,
      shipmentId: String,
      labelUrl: String,
      pickupDate: String,
      srStatus: String, // latest status text from Shiprocket, e.g. "IN TRANSIT"
      etd: String, // courier's expected delivery date
      lastError: String,
      testMode: String, // "mock" / "create_only" while testing
      syncedAt: Date,
      events: {
        type: [{ date: String, status: String, location: String, _id: false }],
        default: undefined,
      },
    },

    timeline: { type: [timelineSchema], default: [] },
    emails: { type: [emailLogSchema], default: [] },

    adminNote: { type: String, trim: true, maxlength: 2000, default: "" },
    cancelReason: { type: String, trim: true, maxlength: 300, default: "" },
    cancelledAt: Date,

    source: { type: String, default: "Website" }, // Website / Mobile website
    // Where this order was placed from, so emails and the "payment done"
    // redirect link back to the right address.
    links: { site: String, api: String },
    // Sent by the browser so a double-click or retry never creates two orders.
    checkoutKey: { type: String, index: { unique: true, sparse: true } },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, placedAt: -1 });
orderSchema.index({ "payment.method": 1, status: 1 });
orderSchema.index({ status: 1, "payment.linkExpiresAt": 1 });

orderSchema.virtual("customer.name").get(function customerName() {
  return [this.customer?.firstName, this.customer?.lastName].filter(Boolean).join(" ");
});

orderSchema.virtual("itemCount").get(function itemCount() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

export default mongoose.model("Order", orderSchema);
