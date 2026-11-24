// A customer review of one product.
//   source "customer" – written on the product page; waits for your approval
//   source "admin"    – added by you (e.g. a review a buyer sent on WhatsApp)
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productName: { type: String, default: "" },
    productSlug: { type: String, default: "" },

    name: { type: String, required: true, trim: true, maxlength: 60 },
    city: { type: String, trim: true, maxlength: 60, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, maxlength: 1500, default: "" },
    photos: { type: [String], default: [] },

    // Private: used only to check the reviewer really bought the product.
    phone: { type: String, default: "", select: false },
    verified: { type: Boolean, default: false },

    status: { type: String, enum: ["pending", "approved", "hidden"], default: "pending", index: true },
    source: { type: String, enum: ["customer", "admin"], default: "customer" },
  },
  { timestamps: true },
);

reviewSchema.index({ product: 1, status: 1, createdAt: -1 });

reviewSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    city: this.city,
    rating: this.rating,
    text: this.text,
    photos: this.photos,
    verified: this.verified,
    createdAt: this.createdAt,
  };
};

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
