import mongoose from "mongoose";
import { EMAIL_PATTERN } from "../utils/validate.js";

// Newsletter sign-ups from the footer form.
const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_PATTERN, "Please enter a valid email."],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Subscriber", subscriberSchema);
