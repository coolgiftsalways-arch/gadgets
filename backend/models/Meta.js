import mongoose from "mongoose";

// Tiny key/value store for one-off flags, e.g. "the starter products have
// already been added, don't add them again".
const metaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

export default mongoose.model("Meta", metaSchema);
