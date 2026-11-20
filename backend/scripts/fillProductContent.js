// Fills in product names, taglines, descriptions, features and specs on the
// LIVE store, using the same admin login as the admin panel.
// Prices, stock, photos, videos and draft/active status are never touched.
//
// Run from the backend folder (Node 20+, nothing to install):
//
//   1. See what is on the site right now:
//        node scripts/fillProductContent.js --list
//
//   2. Preview the changes (changes nothing):
//        node scripts/fillProductContent.js
//
//   3. Apply them:
//        node scripts/fillProductContent.js --apply
//
//   Save the full current text of every product to current-products.json:
//        node scripts/fillProductContent.js --export
//
// In product-content.json, "keepExisting": true on a product means only
// EMPTY fields are filled — text already on the site is left alone.
//
// Text comes from scripts/product-content.json — edit it and re-run any time.
//
// Login: uses ADMIN_EMAIL / ADMIN_PASSWORD from backend/.env (or the
// environment); asks for them if they are missing.
// Site:  --site=https://coolgadgetshub.in  (this is the default)
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;

const SITE = option("site", process.env.SITE_URL || "https://coolgadgetshub.in").replace(/\/+$/, "");
const API = `${SITE}/api`;
const CONTENT_FILE = option("file", path.join(here, "product-content.json"));
const APPLY = flag("apply");
const LIST = flag("list");
const EXPORT = flag("export");

const FIELDS = ["name", "label", "shortDescription", "description", "features", "specs"];
const LIMITS = { name: 120, label: 80, shortDescription: 160, description: 4000 };

// ---------- read backend/.env without needing dotenv ----------
function readDotEnv() {
  const file = path.join(here, "..", ".env");
  if (!fs.existsSync(file)) return {};
  const values = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

async function credentials() {
  const dotenv = readDotEnv();
  let email = process.env.ADMIN_EMAIL || dotenv.ADMIN_EMAIL || "";
  let password = process.env.ADMIN_PASSWORD || dotenv.ADMIN_PASSWORD || "";
  if (email && password) return { email, password };

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (!email) email = (await rl.question("Admin email: ")).trim();
  if (!password) password = await rl.question("Admin password: ");
  rl.close();
  return { email, password };
}

async function call(pathname, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${pathname} → ${response.status}: ${data.message || "request failed"}`);
  return data;
}

const key = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const isEmpty = (value) => (Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim());
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const normSpecs = (specs = []) =>
  specs.map((spec) => (Array.isArray(spec) ? { label: spec[0], value: spec[1] } : { label: spec.label, value: spec.value }));

function checkLimits(title, entry) {
  const problems = [];
  for (const [field, max] of Object.entries(LIMITS)) {
    if (typeof entry[field] === "string" && entry[field].length > max) {
      problems.push(`${field} is ${entry[field].length} chars (max ${max})`);
    }
  }
  if (entry.features?.length > 12) problems.push("more than 12 features");
  entry.features?.forEach((feature, i) => feature.length > 120 && problems.push(`feature ${i + 1} is over 120 chars`));
  if (problems.length) throw new Error(`"${title}": ${problems.join(", ")}`);
}

async function main() {
  console.log(`Site: ${SITE}${APPLY || LIST || EXPORT ? "" : "   (PREVIEW — add --apply to save)"}\n`);

  const { email, password } = await credentials();
  const { token } = await call("/admin/login", { method: "POST", body: { email, password } });
  const { products } = await call("/admin/products", { token });

  if (EXPORT) {
    const out = path.join(here, "current-products.json");
    const pick = ({ name, slug, price, status, label, shortDescription, description, features, specs }) =>
      ({ name, slug, price, status, label, shortDescription, description, features, specs: normSpecs(specs) });
    fs.writeFileSync(out, `${JSON.stringify(products.map(pick), null, 2)}\n`);
    console.log(`Saved ${products.length} products to ${out}`);
    return;
  }

  if (LIST) {
    console.table(
      products.map((p) => ({
        name: p.name,
        slug: p.slug,
        price: p.price,
        status: p.status,
        description: (p.description || "").slice(0, 50) || "(empty)",
      })),
    );
    return;
  }

  const content = JSON.parse(fs.readFileSync(CONTENT_FILE, "utf8"));
  const byName = new Map();
  for (const product of products) {
    byName.set(key(product.name), product);
    byName.set(key(product.slug), product);
  }

  const results = [];
  const matched = new Set();

  for (const [title, entry] of Object.entries(content)) {
    if (title.startsWith("_")) continue;
    checkLimits(title, entry);

    const product = byName.get(key(title)) || byName.get(key(entry.name));
    if (!product) {
      results.push({ product: title, result: "NOT FOUND on site — check the name with --list" });
      continue;
    }
    matched.add(product.id);

    const changes = {};
    for (const field of FIELDS) {
      if (entry[field] === undefined) continue;
      if (entry.keepExisting && !isEmpty(product[field])) continue;
      const wanted = field === "specs" ? normSpecs(entry[field]) : entry[field];
      const current = field === "specs" ? normSpecs(product[field]) : product[field];
      if (!same(wanted, current)) changes[field] = wanted;
    }

    const changed = Object.keys(changes);
    if (!changed.length) {
      results.push({ product: product.name, result: entry.keepExisting ? "nothing empty to fill" : "already up to date" });
      continue;
    }

    if (!APPLY) {
      results.push({ product: product.name, result: `would update: ${changed.join(", ")}` });
      continue;
    }

    try {
      await call(`/admin/products/${product.id}`, { token, method: "PATCH", body: changes });
      results.push({ product: entry.name || product.name, result: `updated: ${changed.join(", ")}` });
    } catch (error) {
      results.push({ product: product.name, result: `FAILED: ${error.message}` });
    }
  }

  for (const product of products) {
    if (!matched.has(product.id)) results.push({ product: product.name, result: "not in product-content.json (left as is)" });
  }

  console.table(results);
  if (!APPLY) console.log("\nNothing was changed. Run again with --apply to save.");
}

main().catch((error) => {
  console.error(`\n✖ ${error.message}`);
  process.exit(1);
});
