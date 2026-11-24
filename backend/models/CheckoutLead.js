// Someone who reached checkout and typed their mobile number, saved so you can
// follow up on WhatsApp if they leave without ordering. One record per number;
// it is updated each time they come back, and deleted after 60 days.
import mongoose from "mongoose";

const leadItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    slug: String,
    name: String,
    price: Number,
    quantity: Number,
  },
  { _id: false },
);

const checkoutLeadSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    items: { type: [leadItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
    // open → you haven't followed up yet; contacted / dismissed are set by you.
    status: { type: String, enum: ["open", "contacted", "dismissed"], default: "open" },
    contactedAt: Date,
  },
  { timestamps: true },
);

checkoutLeadSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export default mongoose.models.CheckoutLead || mongoose.model("CheckoutLead", checkoutLeadSchema);
