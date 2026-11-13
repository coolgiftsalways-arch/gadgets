// Builds the Express app: security headers, the API routes and (when the
// frontend has been built) the website itself.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { health } from "./controllers/storeController.js";
import { serveMedia } from "./controllers/mediaController.js";
import { razorpayWebhook } from "./controllers/orderController.js";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import adminRoutes from "./routes/adminRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import { isAllowedOrigin } from "./utils/origins.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Hosting platforms put a proxy in front of the app; this makes Express
  // read the visitor's real IP and https status from it.
  app.set("trust proxy", env.trustProxy);

  app.use(
    helmet({
      // Product photos and the API are also used by the storefront when it is
      // hosted on a different address.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:", "blob:", "https:"],
          "connect-src": ["'self'"],
          "object-src": ["'none'"],
          "frame-ancestors": ["'self'"],
          "upgrade-insecure-requests": null,
        },
      },
    }),
  );

  app.use(compression());

  // Browsers on other websites may only call the API if they are on the list.
  app.use(
    "/api",
    cors((req, callback) => {
      callback(null, {
        origin: isAllowedOrigin(req.get("origin"), req),
        methods: ["GET", "POST", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        maxAge: 600,
      });
    }),
  );

  // Razorpay signs the exact bytes it sends, so this one route must receive
  // the body untouched — before the JSON parser below.
  app.post(
    "/api/payments/razorpay/webhook",
    express.raw({ type: "*/*", limit: "1mb" }),
    razorpayWebhook,
  );

  app.use(express.json({ limit: "200kb" }));

  // ---------- API ----------
  app.get("/api/health", health);
  app.get("/api/media/:id", serveMedia);

  app.use("/api", apiLimiter);
  app.use("/api/store", storeRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", contactRoutes);
  app.use("/api", notFoundHandler);

  // ---------- the website ----------
  // After "npm run build" the React site lives in frontend/dist and is served
  // from this same server, so one deployment runs everything.
  if (fs.existsSync(path.join(FRONTEND_DIST, "index.html"))) {
    app.use(
      "/assets",
      express.static(path.join(FRONTEND_DIST, "assets"), {
        immutable: true,
        maxAge: "365d",
        fallthrough: false,
      }),
    );

    app.use(express.static(FRONTEND_DIST, { index: false, maxAge: env.isProd ? "1d" : 0 }));

    // Every other address (/shop, /admin/orders, …) loads the React app,
    // which then shows the right page.
    app.get(/^(?!\/api(\/|$)).*/, (req, res) => {
      res.set("Cache-Control", "no-cache");
      res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    });
  } else {
    app.get("/", (req, res) => {
      res.json({ name: `${env.store.name} API`, status: "ok", health: "/api/health" });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
