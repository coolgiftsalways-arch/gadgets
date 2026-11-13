// Public product catalogue (what the shop shows). Managing products lives in
// adminProductController.js.
import Product from "../models/Product.js";
import { notFound } from "../utils/httpError.js";
import { line } from "../utils/validate.js";

// The order products appear in everywhere: your chosen position, then oldest first.
export const CATALOGUE_SORT = { sortOrder: 1, createdAt: 1, _id: 1 };

// GET /api/products — every product that is live in the shop
export async function listProducts(req, res) {
  const products = await Product.find({ status: "active" }).sort(CATALOGUE_SORT);

  res.set("Cache-Control", "public, max-age=30");
  res.json({ products: products.map((product) => product.toPublic()) });
}

// GET /api/products/:slug — one product page
export async function getProduct(req, res) {
  const slug = line(req.params.slug, 80).toLowerCase();
  const product = await Product.findOne({ slug, status: "active" });

  if (!product) throw notFound("This product is no longer available.");

  res.set("Cache-Control", "public, max-age=30");
  res.json({ product: product.toPublic() });
}
