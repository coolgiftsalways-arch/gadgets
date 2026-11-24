// Search engines and WhatsApp/Facebook link previews read the page's HTML
// without running the React app, so the server fills in each page's title,
// description and preview image before sending index.html.
import Product from "../models/Product.js";
import { ratingSummaries } from "../controllers/reviewController.js";

const SITE_NAME = "GADGETÉ by Cool Gadgets Hub";
const DEFAULT_TITLE = `${SITE_NAME} – Cool Gadgets & Gifts Online in India`;
const DEFAULT_DESCRIPTION =
  "Cool gadgets & gifts in India — glowing lamps, colour-changing mugs, bike lights and desk décor. Cash on Delivery, free shipping and extra off with UPI.";

const PAGES = {
  "/": { title: DEFAULT_TITLE },
  "/shop": {
    title: `Shop All Gadgets | ${SITE_NAME}`,
    description: "Browse every gadget we sell — lamps, terrariums, colour-changing mugs, bike lights and more. Cash on Delivery available across India.",
  },
  "/about": { title: `About Us | ${SITE_NAME}` },
  "/contact": {
    title: `Customer Care | ${SITE_NAME}`,
    description: "Questions about an order or a product? Reach us on WhatsApp, phone or email.",
  },
  "/track-order": { title: `Track Your Order | ${SITE_NAME}`, description: "Track your Cool Gadgets Hub order with your order number." },
  "/privacy-policy": { title: `Privacy Policy | ${SITE_NAME}` },
  "/terms": { title: `Terms & Conditions | ${SITE_NAME}` },
  "/shipping-policy": {
    title: `Shipping & Delivery Policy | ${SITE_NAME}`,
    description: "Free delivery across India. Delivery times, charges and tracking for Cool Gadgets Hub orders.",
  },
  "/cancellation-policy": { title: `Cancellation Policy | ${SITE_NAME}` },
};

// Pages Google should list (products are added from the database).
export const SITEMAP_PAGES = ["/", "/shop", "/about", "/contact", "/shipping-policy", "/cancellation-policy", "/privacy-policy", "/terms"];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// JSON inside <script>: stop "</script>" from ending the tag early.
const safeJson = (data) => JSON.stringify(data).replace(/</g, "\\u003c");

export const siteOrigin = (req) => `${req.protocol}://${req.host}`;

const absolute = (origin, url) => (!url ? "" : /^https?:\/\//i.test(url) ? url : `${origin}${url.startsWith("/") ? "" : "/"}${url}`);

async function productMeta(slug, origin) {
  const product = await Product.findOne({ slug, status: "active" });
  if (!product) return null;

  const url = `${origin}/product/${product.slug}`;
  const image = absolute(origin, product.images?.[0]);
  const description =
    product.shortDescription || product.label || String(product.description || "").slice(0, 160) || DEFAULT_DESCRIPTION;
  const rating = (await ratingSummaries([product._id])).get(String(product._id));

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    sku: product.sku,
    url,
    ...(product.images?.length && { image: product.images.map((src) => absolute(origin, src)) }),
    brand: { "@type": "Brand", name: "GADGETÉ" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    },
    ...(rating?.count && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average, reviewCount: rating.count },
    }),
  };

  return {
    title: `${product.name} – ₹${product.price.toLocaleString("en-IN")} | ${SITE_NAME}`,
    description,
    image,
    url,
    type: "product",
    schema,
  };
}

/** index.html with this page's title, description, preview image and structured data filled in. */
export async function renderIndex(html, req) {
  const origin = siteOrigin(req);
  const path = req.path.replace(/\/+$/, "") || "/";

  let meta = null;
  const productSlug = /^\/product\/([^/]+)$/.exec(path)?.[1];
  if (productSlug) {
    try {
      meta = await productMeta(decodeURIComponent(productSlug).toLowerCase().slice(0, 80), origin);
    } catch {
      meta = null; // never let previews break the page
    }
  }
  if (!meta) meta = { ...(PAGES[path] || {}), url: `${origin}${path === "/" ? "/" : path}` };

  const title = meta.title || DEFAULT_TITLE;
  const description = meta.description || DEFAULT_DESCRIPTION;
  const image = meta.image || `${origin}/Images/icon-512.png`;
  const noindex = /^\/(admin|checkout|cart|order-)/.test(path);

  const head = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    noindex ? `<meta name="robots" content="noindex" />` : "",
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:type" content="${meta.type || "website"}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    meta.schema ? `<script type="application/ld+json">${safeJson(meta.schema)}</script>` : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  // index.html carries the default <title> and description; replace them.
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/i, "")
    .replace(/<\/head>/i, `    ${head}\n  </head>`);
}

export async function renderSitemap(req) {
  const origin = siteOrigin(req);
  const products = await Product.find({ status: "active" }).select("slug updatedAt").lean();
  const urls = [
    ...SITEMAP_PAGES.map((page) => `  <url><loc>${origin}${page}</loc></url>`),
    ...products.map(
      (product) =>
        `  <url><loc>${origin}/product/${encodeURIComponent(product.slug)}</loc>${
          product.updatedAt ? `<lastmod>${new Date(product.updatedAt).toISOString().slice(0, 10)}</lastmod>` : ""
        }</url>`,
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function renderRobots(req) {
  return [
    "User-agent: *",
    "Disallow: /admin",
    "Disallow: /checkout",
    "Disallow: /cart",
    "Disallow: /order-success",
    "Disallow: /order-failed",
    "Disallow: /api/",
    "",
    `Sitemap: ${siteOrigin(req)}/sitemap.xml`,
    "",
  ].join("\n");
}
