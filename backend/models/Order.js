
import mongoose from "mongoose";
import {
  INDIAN_STATES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
} from "../config/store.js";

import {
  EMAIL_PATTERN,
  PHONE_PATTERN,
  PINCODE_PATTERN,
} from "../utils/validate.js";

// ==========================================
// ORDER ITEM
// ==========================================

const itemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    sku: String,
    slug: String,
    image: String,
    color: String,
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// ==========================================
// ORDER TIMELINE
// ==========================================

const timelineSchema = new mongoose.Schema(
  {
    status: String,
    message: { type: String, required: true },
    location: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ==========================================
// EMAIL LOG
// ==========================================

const emailLogSchema = new mongoose.Schema(
  {
    type: String,
    to: String,
    ok: Boolean,
    error: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ==========================================
// ORDER SCHEMA
// ==========================================

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    accessToken: {
      type: String,
      required: true,
      unique: true,
    },

    // ======================================
    // PRODUCTS
    // ======================================

    items: {
      type: [itemSchema],
      validate: [
        (items) => items.length > 0,
        "Your cart is empty.",
      ],
    },

    // ======================================
    // CUSTOMER
    // ======================================

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
        match: [
          EMAIL_PATTERN,
          "Please enter a valid email address.",
        ],
      },

      phone: {
        type: String,
        required: [true, "Please enter your mobile number."],
        match: [
          PHONE_PATTERN,
          "Please enter a valid 10-digit Indian mobile number.",
        ],
        index: true,
      },
    },

    // ======================================
    // SHIPPING ADDRESS
    // ======================================

    shippingAddress: {
      line1: {
        type: String,
        required: [true, "Please enter your address."],
        trim: true,
        maxlength: 200,
      },

      line2: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },

      city: {
        type: String,
        required: [true, "Please enter your city."],
        trim: true,
        maxlength: 80,
      },

      state: {
        type: String,
        required: [true, "Please select your state."],
        enum: {
          values: INDIAN_STATES,
          message: "Please select a valid state.",
        },
      },

      pincode: {
        type: String,
        required: [true, "Please enter your PIN code."],
        match: [
          PINCODE_PATTERN,
          "Please enter a valid 6-digit PIN code.",
        ],
      },
    },

    // ======================================
    // ORDER AMOUNTS
    // All amounts are in INR.
    // ======================================

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "INR",
    },

    // ======================================
    // PAYMENT DETAILS
    // ======================================

    payment: {
      method: {
        type: String,
        enum: PAYMENT_METHODS,
        required: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "paid",
          "failed",
          "refunded",
        ],
        default: "pending",
      },

      discountPercent: {
        type: Number,
        default: 0,
      },

      // ====================================
      // EXISTING RAZORPAY PAYMENT LINK
      // Kept for backward compatibility.
      // ====================================

      linkId: {
        type: String,
        index: true,
        sparse: true,
      },

      linkUrl: String,

      linkExpiresAt: Date,

      // ====================================
      // NEW RAZORPAY QR PAYMENT
      // ====================================

      qrId: {
        type: String,
        index: true,
        sparse: true,
      },

      qrImageUrl: {
        type: String,
        default: "",
      },

      qrExpiresAt: {
        type: Date,
      },

      // ====================================
      // PAYMENT CONFIRMATION
      // ====================================

      paymentId: {
        type: String,
      },

      paidAt: {
        type: Date,
      },

      refundedAt: {
        type: Date,
      },
    },

    // ======================================
    // DELIVERY
    // ======================================

    delivery: {
      minDays: Number,
      maxDays: Number,
    },

    // ======================================
    // ORDER STATUS
    // ======================================

    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
      index: true,
    },

    stockReserved: {
      type: Boolean,
      default: false,
    },

    attention: {
      type: String,
      default: "",
    },

    placedAt: {
      type: Date,
      index: true,
    },

    seenByAdmin: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ======================================
    // SHIPPING / TRACKING
    // ======================================

    shipping: {
      courier: {
        type: String,
        trim: true,
        maxlength: 80,
        default: "",
      },

      awb: {
        type: String,
        trim: true,
        maxlength: 80,
        default: "",
      },

      trackingUrl: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      estimatedDelivery: Date,

      shippedAt: Date,

      deliveredAt: Date,
    },

    // ======================================
    // TIMELINE AND EMAILS
    // ======================================

    timeline: {
      type: [timelineSchema],
      default: [],
    },

    emails: {
      type: [emailLogSchema],
      default: [],
    },

    // ======================================
    // ADMIN DETAILS
    // ======================================

    adminNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    cancelReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    cancelledAt: Date,

    // ======================================
    // ORDER SOURCE
    // ======================================

    source: {
      type: String,
      default: "Website",
    },

    links: {
      site: String,
      api: String,
    },

    // ======================================
    // CHECKOUT DUPLICATE PREVENTION
    // ======================================

    checkoutKey: {
      type: String,
      index: {
        unique: true,
        sparse: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// DATABASE INDEXES
// ==========================================

orderSchema.index({
  status: 1,
  placedAt: -1,
});

orderSchema.index({
  "payment.method": 1,
  status: 1,
});

orderSchema.index({
  status: 1,
  "payment.linkExpiresAt": 1,
});

orderSchema.index({
  status: 1,
  "payment.qrExpiresAt": 1,
});

// ==========================================
// VIRTUAL: CUSTOMER NAME
// ==========================================

orderSchema.virtual("customer.name").get(function () {
  return [
    this.customer?.firstName,
    this.customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
});

// ==========================================
// VIRTUAL: TOTAL ITEM COUNT
// ==========================================

orderSchema.virtual("itemCount").get(function () {
  return this.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
});

// ==========================================
// JSON CONFIGURATION
// ==========================================

orderSchema.set("toJSON", {
  virtuals: true,
});

orderSchema.set("toObject", {
  virtuals: true,
});

// ==========================================
// EXPORT MODEL
// ==========================================

export default mongoose.model("Order", orderSchema);
