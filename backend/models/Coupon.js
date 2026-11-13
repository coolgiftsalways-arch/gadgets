import mongoose from "mongoose";

// Discount codes created from the admin panel's Coupons page.
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required."],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_-]{3,20}$/, "Use 3–20 letters, numbers, - or _ for the code."],
    },
    description: { type: String, trim: true, maxlength: 120, default: "" },

    // percent: value% off the subtotal (up to maxDiscount)  ·  flat: ₹value off
    type: { type: String, enum: ["percent", "flat"], default: "percent" },
    value: {
      type: Number,
      required: [true, "Discount value is required."],
      min: [1, "Discount must be at least 1."],
    },
    maxDiscount: { type: Number, default: 0, min: 0 }, // 0 = no cap (percent only)
    minOrder: { type: Number, default: 0, min: 0 }, // minimum subtotal in ₹

    paymentMethod: { type: String, enum: ["any", "upi", "cod"], default: "any" },

    startsAt: Date,
    expiresAt: Date,

    usageLimit: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    perCustomerLimit: { type: Number, default: 0, min: 0 }, // per mobile number; 0 = unlimited
    usedCount: { type: Number, default: 0, min: 0 },

    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

couponSchema.pre("validate", function checkPercent() {
  if (this.type === "percent" && this.value > 100) {
    this.invalidate("value", "A percentage discount can't be more than 100%.");
  }
});

export default mongoose.model("Coupon", couponSchema);
