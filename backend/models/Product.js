import mongoose from "mongoose";
import { PRODUCT_CATEGORIES, PRODUCT_ICONS } from "../config/store.js";

const specSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 60 },
    value: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const wholeRupees = {
  validator: Number.isInteger,
  message: "{PATH} must be a whole number of rupees.",
};

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required."],
      trim: true,
      minlength: [2, "Product name is too short."],
      maxlength: [120, "Product name is too long."],
    },
    // Used in the page address: /product/air-pods-pro
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: {
      type: String,
      required: [true, "SKU is required."],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 40,
    },

    category: { type: String, enum: PRODUCT_CATEGORIES, default: "Other" },
    // Line-art shown on the storefront while the product has no photo.
    icon: { type: String, enum: PRODUCT_ICONS, default: "package" },

    label: { type: String, trim: true, maxlength: 80, default: "" }, // tagline
    shortDescription: { type: String, trim: true, maxlength: 160, default: "" },
    description: { type: String, trim: true, maxlength: 4000, default: "" },

    // Prices are whole rupees: 3499 = ₹3,499.
    price: {
      type: Number,
      required: [true, "Selling price is required."],
      min: [0, "Price cannot be negative."],
      validate: wholeRupees,
    },
    compareAtPrice: { type: Number, default: 0, min: 0, validate: wholeRupees },

    // "/api/media/<id>" for uploads, or a full https:// address.
    images: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    features: { type: [String], default: [] },
    specs: { type: [specSchema], default: [] },

    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative."],
      validate: { validator: Number.isInteger, message: "Stock must be a whole number." },
    },
    // draft = hidden from the shop. "Out of stock" is simply stock === 0.
    status: { type: String, enum: ["active", "draft"], default: "active", index: true },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

productSchema.index({ status: 1, sortOrder: 1, createdAt: 1 });

// The shape sent to the storefront (no internal fields).
productSchema.methods.toPublic = function toPublic() {
  const compareAt = this.compareAtPrice > this.price ? this.compareAtPrice : 0;

  return {
    id: this._id.toString(),
    slug: this.slug,
    sku: this.sku,
    name: this.name,
    category: this.category,
    icon: this.icon,
    label: this.label,
    shortDescription: this.shortDescription,
    description: this.description,
    price: this.price,
    compareAtPrice: compareAt,
    discountPercent: compareAt ? Math.round((1 - this.price / compareAt) * 100) : 0,
    images: this.images,
    colors: this.colors,
    features: this.features,
    specs: this.specs.map((spec) => ({ label: spec.label, value: spec.value })),
    stock: this.stock,
    inStock: this.stock > 0,
    featured: this.featured,
  };
};

export default mongoose.model("Product", productSchema);
