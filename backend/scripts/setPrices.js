// Sets every product's price between ₹2,000 and ₹6,000, based on what it is.
//
// Run from the backend folder:
//   node scripts/setPrices.js                         preview only (changes nothing)
//   node scripts/setPrices.js --apply                 save the new prices
//   node scripts/setPrices.js --apply "S:\COOL_GADGETS_PHOTOS\products.json"
//        also writes the prices into products.json, so a later import keeps them
//
// Prices end in 99 (₹2,499, ₹3,999 …). A crossed-out "was" price about 30–40%
// higher is set too, so the shop shows a discount badge.
import fs from "node:fs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDB } from "../config/db.js";
import Product from "../models/Product.js";

const MIN = 2000;
const MAX = 6000;

// First matching rule wins. [words in the name or category] → [lowest, highest]
const TIERS = [
  { name: "budget", words: /mug|cup|glass|mould|mold|keychain|strip|sake|soda|coin/i, range: [2099, 2999] },
  { name: "premium", words: /glow|light|lamp|crystal|charg|camera|watch|headphone|speaker|projector/i, range: [4499, 5999] },
  { name: "mid", words: /prism|pod|dome|terrarium|planter|plant|decor|skull|figure|frame|shirt|tee|hoodie|wearable|power|hub|buds|band/i, range: [2999, 4499] },
];
const DEFAULT_TIER = { name: "mid", range: [2999, 3999] };

// Small, stable variation per product (so similar items don't all cost the same).
function wobble(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 1000) / 1000; // 0 … 0.999
}

const endIn99 = (value) => Math.max(MIN - 1, Math.round(value / 100) * 100 - 1);
const clamp = (value) => Math.min(MAX - 1, Math.max(MIN + 99, value));

function priceFor(product) {
  const text = `${product.name} ${product.category}`;
  const tier = TIERS.find((rule) => rule.words.test(text)) || DEFAULT_TIER;
  const [low, high] = tier.range;
  const price = clamp(endIn99(low + (high - low) * wobble(product.slug)));
  const markup = 1.3 + 0.1 * wobble(`${product.slug}-was`); // 30–40% higher
  const compareAtPrice = endIn99(price * markup);
  return { tier: tier.name, price, compareAtPrice };
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const jsonPath = args.find((arg) => !arg.startsWith("--"));

async function main() {
  await connectDB(env.mongoUri);
  const products = await Product.find().sort({ sortOrder: 1, createdAt: 1 });

  const rows = products.map((product) => {
    const next = priceFor(product);
    return { product, ...next };
  });

  console.table(
    rows.map(({ product, tier, price, compareAtPrice }) => ({
      product: product.name,
      tier,
      "old price": product.price,
      "new price": price,
      "was (crossed out)": compareAtPrice,
    })),
  );

  if (!apply) {
    console.log("\nPREVIEW ONLY — nothing changed. Add --apply to save these prices.");
    await mongoose.disconnect();
    return;
  }

  for (const { product, price, compareAtPrice } of rows) {
    await Product.updateOne({ _id: product._id }, { $set: { price, compareAtPrice } });
  }
  console.log(`\nSaved new prices for ${rows.length} products.`);

  // Keep products.json in step, so the next import doesn't put old prices back.
  if (jsonPath) {
    if (!fs.existsSync(jsonPath)) {
      console.warn(`products.json not found at ${jsonPath} — skipped.`);
    } else {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8").replace(/^\uFEFF/, ""));
      const byName = new Map(rows.map((row) => [row.product.name.toLowerCase(), row]));
      let updated = 0;
      for (const entry of Object.values(data)) {
        const row = byName.get(String(entry.name || "").toLowerCase());
        if (!row) continue;
        entry.price = row.price;
        entry.compareAtPrice = row.compareAtPrice;
        updated += 1;
      }
      fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
      console.log(`Updated ${updated} products in ${jsonPath}.`);
    }
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
