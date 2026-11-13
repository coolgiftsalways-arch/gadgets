// Admin: add, edit and remove products.
import Product from "../models/Product.js";
import { MEDIA_URL_PATTERN } from "../models/Media.js";
import { PRODUCT_CATEGORIES, PRODUCT_ICONS } from "../config/store.js";
import { env } from "../config/env.js";
import { badRequest, conflict, notFound } from "../utils/httpError.js";
import { boolean, integer, isObjectId, line, slugify, stringList, text } from "../utils/validate.js";
import { CATALOGUE_SORT } from "./productController.js";
import { deleteUnusedMedia } from "./mediaController.js";

const MAX_IMAGES = 8;

// The icon a new product gets when none is chosen.
const CATEGORY_ICONS = {
  Audio: "headphones",
  Wearables: "watch",
  Power: "battery",
  Camera: "camera",
  Accessories: "plug",
  "Smart Home": "home",
  Other: "package",
};

function cleanImages(value) {
  if (!Array.isArray(value)) throw badRequest("Images must be a list.");
  if (value.length > MAX_IMAGES) throw badRequest(`A product can have up to ${MAX_IMAGES} images.`);

  const images = [];
  for (const entry of value) {
    const url = line(entry, 600);
    if (!url) continue;

    const uploaded = MEDIA_URL_PATTERN.test(url);
    const external = /^https:\/\/[^\s"'<>]+$/i.test(url);
    if (!uploaded && !external) {
      throw badRequest("Images must be uploaded here or be a full https:// address.");
    }
    if (!images.includes(url)) images.push(url);
  }
  return images;
}

function cleanSpecs(value) {
  if (!Array.isArray(value)) throw badRequest("Specifications must be a list.");

  const specs = [];
  for (const entry of value.slice(0, 20)) {
    // Accepts { label, value } or ["label", "value"].
    const label = line(Array.isArray(entry) ? entry[0] : entry?.label, 60);
    const detail = line(Array.isArray(entry) ? entry[1] : entry?.value, 200);
    if (label && detail) specs.push({ label, value: detail });
  }
  return specs;
}

function cleanPrice(value, label) {
  const amount = integer(value, { min: 0, max: 100000000 });
  if (amount === null) throw badRequest(`${label} must be a whole number of rupees (no decimals).`);
  return amount;
}

// Picks the fields an admin may set out of a request body, cleaned up.
// Only fields that were actually sent are returned, so the same function
// serves "create" and "edit one thing".
function cleanProductInput(body) {
  const data = {};
  const has = (field) => body[field] !== undefined;

  if (has("name")) data.name = line(body.name, 120);
  if (has("sku")) data.sku = line(body.sku, 40).toUpperCase();

  if (has("category")) {
    if (!PRODUCT_CATEGORIES.includes(body.category)) throw badRequest("Please choose a valid category.");
    data.category = body.category;
  }

  if (has("icon")) {
    if (!PRODUCT_ICONS.includes(body.icon)) throw badRequest("Please choose a valid icon.");
    data.icon = body.icon;
  }

  if (has("label")) data.label = line(body.label, 80);
  if (has("shortDescription")) data.shortDescription = line(body.shortDescription, 160);
  if (has("description")) data.description = text(body.description, 4000);

  if (has("price")) data.price = cleanPrice(body.price, "Selling price");
  if (has("compareAtPrice")) {
    data.compareAtPrice = body.compareAtPrice === "" || body.compareAtPrice === null
      ? 0
      : cleanPrice(body.compareAtPrice, "Compare-at price");
  }

  if (has("stock")) {
    const stock = integer(body.stock, { min: 0, max: 1000000 });
    if (stock === null) throw badRequest("Stock must be a whole number, 0 or more.");
    data.stock = stock;
  }

  if (has("status")) {
    if (!["active", "draft"].includes(body.status)) throw badRequest("Status must be active or draft.");
    data.status = body.status;
  }

  if (has("featured")) data.featured = boolean(body.featured);

  if (has("sortOrder")) {
    const sortOrder = integer(body.sortOrder, { min: -100000, max: 100000 });
    if (sortOrder === null) throw badRequest("Position must be a whole number.");
    data.sortOrder = sortOrder;
  }

  if (has("images")) data.images = cleanImages(body.images);
  if (has("colors")) data.colors = stringList(body.colors, { maxItems: 12, maxLength: 30 });
  if (has("features")) data.features = stringList(body.features, { maxItems: 12, maxLength: 120 });
  if (has("specs")) data.specs = cleanSpecs(body.specs);

  return data;
}

async function uniqueSlug(name, excludeId) {
  const base = slugify(name);
  let slug = base;

  for (let suffix = 2; await Product.exists({ slug, _id: { $ne: excludeId } }); suffix += 1) {
    slug = `${base}-${suffix}`;
  }

  return slug;
}

// "G-21" after "G-20": continues the numbering used by the starter products.
async function nextSku() {
  const skus = await Product.find({ sku: /^G-\d+$/ }).select("sku").lean();
  const highest = skus.reduce((max, { sku }) => Math.max(max, Number(sku.slice(2))), 0);
  return `G-${String(highest + 1).padStart(2, "0")}`;
}

async function assertSkuFree(sku, excludeId) {
  if (await Product.exists({ sku, _id: { $ne: excludeId } })) {
    throw conflict(`SKU ${sku} is already used by another product.`);
  }
}

// What the admin panel receives: the full record plus a few handy extras.
const toAdmin = (product) => ({
  ...product.toObject({ versionKey: false }),
  id: product._id.toString(),
  lowStock: product.stock > 0 && product.stock <= env.store.lowStockThreshold,
});

// GET /api/admin/products — everything, drafts included
export async function listProducts(req, res) {
  const products = await Product.find().sort(CATALOGUE_SORT);

  res.set("Cache-Control", "no-store");
  res.json({
    products: products.map(toAdmin),
    categories: PRODUCT_CATEGORIES,
    icons: PRODUCT_ICONS,
    lowStockThreshold: env.store.lowStockThreshold,
  });
}

// POST /api/admin/products
export async function createProduct(req, res) {
  const data = cleanProductInput(req.body || {});

  if (!data.name || data.name.length < 2) throw badRequest("Please enter the product name.");
  if (data.price === undefined) throw badRequest("Please enter the selling price.");

  if (!data.sku) data.sku = await nextSku();
  await assertSkuFree(data.sku);

  if (!data.icon) data.icon = CATEGORY_ICONS[data.category] || "package";
  data.slug = await uniqueSlug(data.name);

  // New products go to the end of the catalogue unless a position was given.
  if (data.sortOrder === undefined) {
    const last = await Product.findOne().sort({ sortOrder: -1 }).select("sortOrder").lean();
    data.sortOrder = (last?.sortOrder || 0) + 1;
  }

  const product = await Product.create(data);
  res.status(201).json({ product: toAdmin(product) });
}

async function findProduct(id) {
  if (!isObjectId(id)) throw notFound("Product not found.");
  const product = await Product.findById(id);
  if (!product) throw notFound("Product not found.");
  return product;
}

// PATCH /api/admin/products/:id — send only the fields that changed
export async function updateProduct(req, res) {
  const product = await findProduct(req.params.id);
  const data = cleanProductInput(req.body || {});

  if (data.name !== undefined && data.name.length < 2) throw badRequest("Please enter the product name.");

  if (data.sku !== undefined) {
    if (!data.sku) throw badRequest("Please enter a SKU.");
    if (data.sku !== product.sku) await assertSkuFree(data.sku, product._id);
  }

  // The page address (slug) is deliberately left alone when a product is
  // renamed, so links people have already shared keep working.
  const previousImages = [...product.images];
  product.set(data);
  await product.save();

  const removed = previousImages.filter((url) => !product.images.includes(url));
  if (removed.length) await deleteUnusedMedia(removed);

  res.json({ product: toAdmin(product) });
}

// DELETE /api/admin/products/:id
// Past orders keep their own copy of the name, price and photo address, so
// deleting a product never breaks order history.
export async function deleteProduct(req, res) {
  const product = await findProduct(req.params.id);
  const images = [...product.images];

  await product.deleteOne();
  await deleteUnusedMedia(images);

  res.json({ message: `${product.name} was deleted.` });
}
