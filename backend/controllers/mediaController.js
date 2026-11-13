// Product photos: upload (admin) and serve (public).
import crypto from "node:crypto";
import multer from "multer";
import Media, { MEDIA_URL_PATTERN } from "../models/Media.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { isObjectId, line } from "../utils/validate.js";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — the admin panel shrinks photos well below this

// Decide the type from the file's first bytes, not from what the browser claims.
function detectImageType(buffer) {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, index) => buffer[index] === byte)) return "image/png";

  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 5 },
});

// POST /api/admin/media  (multipart form, field "image") -> { id, url }
export function uploadMedia(req, res, next) {
  upload.single("image")(req, res, async (error) => {
    try {
      if (error) {
        throw badRequest(
          error.code === "LIMIT_FILE_SIZE"
            ? "That image is too large. Please use one under 4 MB."
            : "The image could not be uploaded. Please try again.",
        );
      }

      if (!req.file?.buffer?.length) throw badRequest("Please choose an image to upload.");

      const contentType = detectImageType(req.file.buffer);
      if (!contentType) throw badRequest("Please upload a JPG, PNG or WebP image.");

      const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");

      // The same photo uploaded again reuses the copy we already have.
      let media = await Media.findOne({ sha256 }).select("_id");

      if (!media) {
        media = await Media.create({
          data: req.file.buffer,
          contentType,
          size: req.file.buffer.length,
          filename: line(req.file.originalname, 120),
          sha256,
        });
      }

      res.status(201).json({ id: media._id.toString(), url: `/api/media/${media._id}` });
    } catch (failure) {
      next(failure);
    }
  });
}

// GET /api/media/:id — the image itself
export async function serveMedia(req, res) {
  if (!isObjectId(req.params.id)) throw notFound("Image not found.");

  const media = await Media.findById(req.params.id);
  if (!media) throw notFound("Image not found.");

  const etag = `"${media.sha256.slice(0, 32)}"`;

  // An image never changes once stored, so browsers can keep it for a year.
  res.set({
    "Content-Type": media.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
    ETag: etag,
  });

  if (req.get("if-none-match") === etag) return res.status(304).end();

  res.send(media.data);
}

// Removes uploaded photos that nothing uses any more. A photo is kept while
// any product shows it or any past order still refers to it.
export async function deleteUnusedMedia(urls = []) {
  for (const url of urls) {
    const id = MEDIA_URL_PATTERN.exec(String(url))?.[1];
    if (!id) continue;

    const stillUsed =
      (await Product.exists({ images: url })) || (await Order.exists({ "items.image": url }));

    if (!stillUsed) await Media.deleteOne({ _id: id });
  }
}
