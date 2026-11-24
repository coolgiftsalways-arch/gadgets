// Product reviews: shoppers write them on the product page (they wait for your
// approval), and you can add, approve, hide or delete them in the admin panel.
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import { MEDIA_URL_PATTERN } from "../models/Media.js";
import { PLACED_STATUSES } from "../config/store.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { integer, isObjectId, line, phone as cleanPhone, text } from "../utils/validate.js";

const MAX_PHOTOS = 4;
const STATUSES = ["pending", "approved", "hidden"];

function cleanRating(value) {
  const rating = integer(value, { min: 1, max: 5 });
  if (!rating) throw badRequest("Please choose a rating from 1 to 5 stars.");
  return rating;
}

function cleanPhotos(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw badRequest("Photos must be a list.");
  const photos = [];
  for (const entry of value.slice(0, MAX_PHOTOS)) {
    const url = line(entry, 600);
    if (!url) continue;
    if (!MEDIA_URL_PATTERN.test(url) && !/^https:\/\/[^\s"'<>]+$/i.test(url)) {
      throw badRequest("Photos must be uploaded here or be a full https:// address.");
    }
    if (!photos.includes(url)) photos.push(url);
  }
  return photos;
}

// Average and count of approved reviews for each product id given.
export async function ratingSummaries(productIds) {
  if (!productIds.length) return new Map();
  const rows = await Review.aggregate([
    { $match: { product: { $in: productIds }, status: "approved" } },
    { $group: { _id: "$product", count: { $sum: 1 }, average: { $avg: "$rating" } } },
  ]);
  return new Map(
    rows.map((row) => [String(row._id), { count: row.count, average: Math.round(row.average * 10) / 10 }]),
  );
}

async function findLiveProduct(slugParam) {
  const slug = line(slugParam, 80).toLowerCase();
  const product = await Product.findOne({ slug, status: "active" }).select("_id name slug");
  if (!product) throw notFound("This product is no longer available.");
  return product;
}

// ---------- public ----------

// GET /api/products/:slug/reviews
export async function listProductReviews(req, res) {
  const product = await findLiveProduct(req.params.slug);
  const reviews = await Review.find({ product: product._id, status: "approved" })
    .sort({ verified: -1, createdAt: -1 })
    .limit(50);
  const summary = (await ratingSummaries([product._id])).get(String(product._id)) || { count: 0, average: 0 };

  res.set("Cache-Control", "public, max-age=60");
  res.json({ summary, reviews: reviews.map((review) => review.toPublic()) });
}

// POST /api/products/:slug/reviews — goes live only after you approve it
export async function submitReview(req, res) {
  const body = req.body || {};
  // Bots fill every field; people never see this one.
  if (line(body.website, 50)) return res.status(201).json({ message: "Thanks for your review!" });

  const product = await findLiveProduct(req.params.slug);
  const name = line(body.name, 60);
  if (name.length < 2) throw badRequest("Please enter your name.");
  const reviewText = text(body.text, 1500);
  if (reviewText.length < 10) throw badRequest("Please write at least a few words about the product.");

  const buyerPhone = cleanPhone(body.phone);
  const verified = buyerPhone
    ? Boolean(
        await Order.exists({
          "customer.phone": buyerPhone,
          "items.product": product._id,
          status: { $in: PLACED_STATUSES },
        }),
      )
    : false;

  await Review.create({
    product: product._id,
    productName: product.name,
    productSlug: product.slug,
    name,
    city: line(body.city, 60),
    rating: cleanRating(body.rating),
    text: reviewText,
    phone: buyerPhone,
    verified,
    status: "pending",
    source: "customer",
  });

  res.status(201).json({ message: "Thanks for your review! It will appear here once we've checked it." });
}

// ---------- admin ----------

// GET /api/admin/reviews?status=pending
export async function adminListReviews(req, res) {
  const filter = {};
  if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const reviews = await Review.find(filter).select("+phone").sort({ createdAt: -1 }).limit(500);
  const counts = await Review.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

  res.set("Cache-Control", "no-store");
  res.json({
    reviews,
    counts: Object.fromEntries(STATUSES.map((s) => [s, counts.find((c) => c._id === s)?.count || 0])),
  });
}

// POST /api/admin/reviews — add a review a customer sent you (shown straight away)
export async function adminCreateReview(req, res) {
  const body = req.body || {};
  if (!isObjectId(body.product)) throw badRequest("Please choose a product.");
  const product = await Product.findById(body.product).select("_id name slug");
  if (!product) throw badRequest("That product no longer exists.");
  const name = line(body.name, 60);
  if (name.length < 2) throw badRequest("Please enter the customer's name.");

  const review = await Review.create({
    product: product._id,
    productName: product.name,
    productSlug: product.slug,
    name,
    city: line(body.city, 60),
    rating: cleanRating(body.rating),
    text: text(body.text, 1500),
    photos: cleanPhotos(body.photos) || [],
    verified: body.verified !== false,
    status: STATUSES.includes(body.status) ? body.status : "approved",
    source: "admin",
  });
  res.status(201).json({ review });
}

// PATCH /api/admin/reviews/:id
export async function adminUpdateReview(req, res) {
  if (!isObjectId(req.params.id)) throw notFound("Review not found.");
  const body = req.body || {};
  const data = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw badRequest("Invalid status.");
    data.status = body.status;
  }
  if (body.name !== undefined) {
    data.name = line(body.name, 60);
    if (data.name.length < 2) throw badRequest("Please enter the customer's name.");
  }
  if (body.city !== undefined) data.city = line(body.city, 60);
  if (body.text !== undefined) data.text = text(body.text, 1500);
  if (body.rating !== undefined) data.rating = cleanRating(body.rating);
  if (body.verified !== undefined) data.verified = Boolean(body.verified);
  const photos = cleanPhotos(body.photos);
  if (photos) data.photos = photos;

  const review = await Review.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!review) throw notFound("Review not found.");
  res.json({ review });
}

// DELETE /api/admin/reviews/:id
export async function adminDeleteReview(req, res) {
  if (!isObjectId(req.params.id)) throw notFound("Review not found.");
  await Review.findByIdAndDelete(req.params.id);
  res.status(204).end();
}
