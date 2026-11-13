import mongoose from "mongoose";
import { EMAIL_PATTERN } from "../utils/validate.js";

// Messages sent from the Customer Care page.
const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name."],
      trim: true,
      minlength: [2, "Please enter your name."],
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, "Please enter your email address."],
      trim: true,
      lowercase: true,
      match: [EMAIL_PATTERN, "Please enter a valid email address."],
    },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    topic: {
      type: String,
      enum: ["Order help", "Product question", "Returns & refunds", "Warranty", "Other"],
      default: "Other",
    },
    orderNumber: { type: String, trim: true, maxlength: 20, default: "" },
    message: {
      type: String,
      required: [true, "Please write your message."],
      trim: true,
      minlength: [10, "Please tell us a little more so we can help."],
      maxlength: [3000, "Your message is too long."],
    },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const CONTACT_TOPICS = contactSchema.path("topic").enumValues;

export default mongoose.model("Contact", contactSchema);
