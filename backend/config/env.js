// Reads backend/.env once and exposes every setting the server uses.
// Nothing else in the codebase touches process.env directly.
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const str = (name, fallback = "") => {
  const value = process.env[name];
  return value === undefined || value === null ? fallback : String(value).trim();
};

const int = (name, fallback) => {
  const value = Number.parseInt(str(name), 10);
  return Number.isFinite(value) ? value : fallback;
};

const bool = (name, fallback) => {
  const value = str(name).toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const stripSlash = (url) => url.replace(/\/+$/, "");

const nodeEnv = str("NODE_ENV", "development");

// CLIENT_URL may list several storefront addresses separated by commas
// (for example the live domain and the www version of it).
const clientUrls = str("CLIENT_URL", "http://localhost:5173")
  .split(",")
  .map((url) => stripSlash(url.trim()))
  .filter(Boolean);

export const env = {
  nodeEnv,
  isProd: nodeEnv === "production",
  isTest: nodeEnv === "test",

  port: int("PORT", 5000),
  trustProxy: int("TRUST_PROXY", 1),

  mongoUri: str("MONGO_URI"),

  jwtSecret: str("JWT_SECRET"),
  adminEmail: str("ADMIN_EMAIL").toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD) : "",
  adminSessionHours: clamp(int("ADMIN_SESSION_HOURS", 12), 1, 24 * 7),

  clientUrls,
  clientUrl: clientUrls[0],
  // Public address of this API. Leave empty to detect it from each request.
  serverUrl: stripSlash(str("SERVER_URL")),

  razorpay: {
    keyId: str("RAZORPAY_KEY_ID"),
    keySecret: str("RAZORPAY_KEY_SECRET"),
    webhookSecret: str("RAZORPAY_WEBHOOK_SECRET"),
    upiOnly: bool("RAZORPAY_UPI_ONLY", false),
    apiUrl: stripSlash(str("RAZORPAY_API_URL", "https://api.razorpay.com/v1")),
  },

  smtp: {
    host: str("SMTP_HOST"),
    port: int("SMTP_PORT", 465),
    user: str("SMTP_USER"),
    pass: process.env.SMTP_PASS ? String(process.env.SMTP_PASS) : "",
    from: str("MAIL_FROM"),
    replyTo: str("MAIL_REPLY_TO"),
  },

  // Where "you have a new order" alerts and contact-form messages are sent.
  orderAlertEmail: str("ORDER_ALERT_EMAIL"),

  store: {
    name: str("STORE_NAME", "GADGETÉ"),
    timezone: str("STORE_TIMEZONE", "Asia/Kolkata"),
    supportEmail: str("SUPPORT_EMAIL"),
    supportPhone: str("SUPPORT_PHONE"),
    supportWhatsapp: str("SUPPORT_WHATSAPP").replace(/\D/g, ""),

    upiDiscountPercent: clamp(int("UPI_DISCOUNT_PERCENT", 10), 0, 90),
    codEnabled: bool("COD_ENABLED", true),
    upiDelivery: {
      minDays: clamp(int("UPI_DELIVERY_MIN_DAYS", 3), 0, 60),
      maxDays: clamp(int("UPI_DELIVERY_MAX_DAYS", 5), 0, 90),
    },
    codDelivery: {
      minDays: clamp(int("COD_DELIVERY_MIN_DAYS", 7), 0, 60),
      maxDays: clamp(int("COD_DELIVERY_MAX_DAYS", 10), 0, 90),
    },
    shippingFee: clamp(int("SHIPPING_FEE", 0), 0, 100000),
    freeShippingAbove: clamp(int("FREE_SHIPPING_ABOVE", 0), 0, 10000000),

    // How long a customer has to finish a UPI payment before the order is
    // released. Razorpay needs at least 15 minutes.
    paymentWindowMinutes: clamp(int("PAYMENT_WINDOW_MINUTES", 30), 16, 24 * 60),
    maxQuantityPerItem: clamp(int("MAX_QUANTITY_PER_ITEM", 10), 1, 100),
    lowStockThreshold: clamp(int("LOW_STOCK_THRESHOLD", 5), 0, 1000),
  },

  forcePublicDns: bool("FORCE_PUBLIC_DNS", false),
};

// Some home/office networks cannot resolve MongoDB Atlas "mongodb+srv://"
// addresses. FORCE_PUBLIC_DNS=true makes Node ask Google/Cloudflare instead.
if (env.forcePublicDns) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

// Checks the settings the server cannot run without, and warns about the
// optional ones. Returns { errors, warnings } so server.js can print them.
export function checkEnv() {
  const errors = [];
  const warnings = [];

  if (!env.mongoUri) {
    errors.push("MONGO_URI is missing — paste your MongoDB Atlas connection string.");
  }

  if (!env.jwtSecret) {
    errors.push("JWT_SECRET is missing — set it to a long random string.");
  } else if (env.jwtSecret.length < 24) {
    errors.push("JWT_SECRET is too short — use at least 24 random characters.");
  }

  if (!env.adminEmail || !env.adminPassword) {
    errors.push("ADMIN_EMAIL and ADMIN_PASSWORD are required to sign in to the admin panel.");
  } else if (env.adminPassword.length < 8) {
    errors.push("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    warnings.push(
      "Razorpay keys are not set — UPI payments are switched off, only Cash on Delivery will be offered.",
    );
  } else if (env.isProd && env.razorpay.keyId.startsWith("rzp_test_")) {
    warnings.push("Razorpay is using TEST keys — no real money will be collected.");
  }

  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    warnings.push("SMTP is not set — order emails will be skipped (orders still work).");
  }

  if (env.isProd && env.clientUrls.some((url) => url.includes("localhost"))) {
    warnings.push("CLIENT_URL still points to localhost — set it to your live website address.");
  }

  if (!env.razorpay.keyId && !env.store.codEnabled) {
    errors.push("No payment method is available: add Razorpay keys or set COD_ENABLED=true.");
  }

  return { errors, warnings };
}

export const isRazorpayConfigured = () =>
  Boolean(env.razorpay.keyId && env.razorpay.keySecret);

export const isSmtpConfigured = () =>
  Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
