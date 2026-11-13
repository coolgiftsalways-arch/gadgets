import mongoose from "mongoose";

// Product photos uploaded from the admin panel.
//
// They are kept in MongoDB (not on the server's disk) so they survive
// redeploys and work on any host — Hostinger, Render, Railway — without a
// separate storage account. The admin panel shrinks each photo in the
// browser before uploading, so a typical image is 100–300 KB.
const mediaSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    filename: { type: String, default: "" },
    // Lets us spot the same file being uploaded twice.
    sha256: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

mediaSchema.virtual("url").get(function url() {
  return `/api/media/${this._id}`;
});

export const MEDIA_URL_PATTERN = /^\/api\/media\/([0-9a-f]{24})$/;

export default mongoose.model("Media", mediaSchema);
