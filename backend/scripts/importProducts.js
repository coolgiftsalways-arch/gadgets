// Bulk-adds products from a folder of product folders.
//
//   S:\COOL_GADGETS_PHOTOS\
//     Alpine Prism\      1.jpg  2.jpg  video.mp4
//     Diamond Prism\     ...
//     products.json      ← prices, stock, descriptions (created by --init)
//
// Run from the backend folder:
//   1. node scripts/importProducts.js "S:\COOL_GADGETS_PHOTOS" --init
//        creates products.json with one entry per folder — fill in prices etc.
//   2. node scripts/importProducts.js "S:\COOL_GADGETS_PHOTOS" --dry
//        shows what would happen, changes nothing
//   3. node scripts/importProducts.js "S:\COOL_GADGETS_PHOTOS"
//        uploads the photos/videos and creates or updates the products
//
// Running it again updates the same products (matched by name), so it is
// safe to fix products.json and re-run. Photos go to Cloudinary when the
// CLOUDINARY_* settings exist, otherwise into MongoDB.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDB } from "../config/db.js";
import { PRODUCT_CATEGORIES } from "../config/store.js";
import Product from "../models/Product.js";
import Media from "../models/Media.js";
import { slugify } from "../utils/validate.js";

const IMAGE_TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const VIDEO_TYPES = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" };
const MAX_IMAGES = 8;
const MAX_VIDEOS = 4;

const args = process.argv.slice(2);
const source = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry");
const initOnly = args.includes("--init");

if (!source || !fs.existsSync(source)) {
  console.error('Give the folder path, e.g.\n  node scripts/importProducts.js "S:\\COOL_GADGETS_PHOTOS" --init');
  process.exit(1);
}

const configPath = path.join(source, "products.json");
const folders = fs
  .readdirSync(source, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

// ---------- step 1: create products.json ----------
if (initOnly) {
  const existing = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
  for (const folder of folders) {
    existing[folder] ??= {
      name: folder,
      price: 0,
      compareAtPrice: 0,
      stock: 10,
      category: "Other",
      label: "",
      description: "",
      colors: [],
      features: [],
      status: "active",
    };
  }
  fs.writeFileSync(configPath, `${JSON.stringify(existing, null, 2)}\n`);
  console.log(`Wrote ${configPath} with ${folders.length} product(s).`);
  console.log("Fill in price, stock, category, description… then run without --init.");
  console.log(`Categories you can use: ${PRODUCT_CATEGORIES.join(", ")}`);
  process.exit(0);
}

if (!fs.existsSync(configPath)) {
  console.error(`No products.json in that folder yet. Run first with --init.`);
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

// ---------- uploads ----------
const cloud = env.cloudinary;
const useCloudinary = Boolean(cloud.cloudName && cloud.apiKey && cloud.apiSecret);

async function uploadToCloudinary(file, kind, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  // Signed parameters, alphabetical order, then the secret.
  const toSign = `folder=${cloud.folder}&overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(`${toSign}${cloud.apiSecret}`).digest("hex");

  const body = new FormData();
  body.append("file", new Blob([fs.readFileSync(file)]), path.basename(file));
  body.append("api_key", cloud.apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", cloud.folder);
  body.append("public_id", publicId);
  body.append("overwrite", "true");
  body.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud.cloudName}/${kind}/upload`, {
    method: "POST",
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    throw new Error(`Cloudinary upload failed for ${path.basename(file)}: ${data.error?.message || response.status}`);
  }
  return data.secure_url;
}

async function storeInMongo(file, contentType) {
  const buffer = fs.readFileSync(file);
  if (buffer.length > 15 * 1024 * 1024) {
    throw new Error(`${path.basename(file)} is over 15 MB — set up Cloudinary or shrink the photo.`);
  }
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const media =
    (await Media.findOne({ sha256 }).select("_id")) ||
    (await Media.create({ data: buffer, contentType, size: buffer.length, filename: path.basename(file), sha256 }));
  return `/api/media/${media._id}`;
}

const numberOr = (value, fallback) => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback);

async function nextSku() {
  const skus = await Product.find({ sku: /^G-\d+$/ }).select("sku").lean();
  const highest = skus.reduce((max, { sku }) => Math.max(max, Number(sku.slice(2))), 0);
  return `G-${String(highest + 1).padStart(2, "0")}`;
}

// ---------- step 2/3: import ----------
async function main() {
  if (!dryRun) await connectDB(env.mongoUri);

  console.log(`Photos go to: ${useCloudinary ? `Cloudinary (${cloud.folder})` : "MongoDB"}${dryRun ? "  — DRY RUN, nothing is changed" : ""}\n`);

  const results = [];

  for (const folder of folders) {
    const entry = config[folder];
    if (!entry) {
      console.warn(`⚠ "${folder}" is not in products.json — skipped (run --init again to add it).`);
      continue;
    }

    const name = String(entry.name || folder).trim();
    const price = numberOr(entry.price, 0);
    if (price <= 0) {
      console.warn(`⚠ "${name}" has no price in products.json — skipped.`);
      continue;
    }
    if (entry.category && !PRODUCT_CATEGORIES.includes(entry.category)) {
      console.warn(`⚠ "${name}": category "${entry.category}" isn't allowed — using "Other". Allowed: ${PRODUCT_CATEGORIES.join(", ")}`);
    }

    const files = fs
      .readdirSync(path.join(source, folder))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((file) => path.join(source, folder, file));
    const imageFiles = files.filter((file) => IMAGE_TYPES[path.extname(file).toLowerCase()]).slice(0, MAX_IMAGES);
    const videoFiles = files.filter((file) => VIDEO_TYPES[path.extname(file).toLowerCase()]).slice(0, MAX_VIDEOS);
    const slug = slugify(name);

    if (dryRun) {
      results.push({ product: name, price, images: imageFiles.length, videos: videoFiles.length, action: "would import" });
      continue;
    }

    try {
      const images = [];
      for (const [index, file] of imageFiles.entries()) {
        images.push(
          useCloudinary
            ? await uploadToCloudinary(file, "image", `${slug}-${index + 1}`)
            : await storeInMongo(file, IMAGE_TYPES[path.extname(file).toLowerCase()]),
        );
        process.stdout.write(".");
      }

      const videos = [];
      for (const [index, file] of videoFiles.entries()) {
        if (!useCloudinary) {
          console.warn(`\n⚠ Skipping video ${path.basename(file)} — videos need Cloudinary.`);
          break;
        }
        videos.push(await uploadToCloudinary(file, "video", `${slug}-video-${index + 1}`));
        process.stdout.write(".");
      }

      const data = {
        name,
        category: PRODUCT_CATEGORIES.includes(entry.category) ? entry.category : "Other",
        icon: "package",
        label: String(entry.label || ""),
        description: String(entry.description || ""),
        shortDescription: String(entry.description || "").split("\n")[0].slice(0, 160),
        price,
        compareAtPrice: numberOr(entry.compareAtPrice, 0),
        stock: numberOr(entry.stock, 0),
        status: entry.status === "draft" ? "draft" : "active",
        colors: Array.isArray(entry.colors) ? entry.colors : [],
        features: Array.isArray(entry.features) ? entry.features : [],
      };
      if (images.length) data.images = images;
      if (videos.length) data.videos = videos;

      const existing = await Product.findOne({ $or: [{ slug }, { name }] });
      if (existing) {
        existing.set(data);
        await existing.save();
        results.push({ product: name, price, images: images.length, videos: videos.length, action: "updated" });
      } else {
        const last = await Product.findOne().sort({ sortOrder: -1 }).select("sortOrder").lean();
        await Product.create({ ...data, slug, sku: await nextSku(), sortOrder: (last?.sortOrder || 0) + 1 });
        results.push({ product: name, price, images: images.length, videos: videos.length, action: "created" });
      }
    } catch (error) {
      console.error(`\n✖ ${name}: ${error.message}`);
      results.push({ product: name, price, images: 0, videos: 0, action: "FAILED" });
    }
  }

  console.log("\n");
  console.table(results);
  if (!dryRun) await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
