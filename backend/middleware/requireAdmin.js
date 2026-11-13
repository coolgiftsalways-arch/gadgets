import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// A short fingerprint of the admin password that is baked into every login
// token. Changing ADMIN_PASSWORD changes the fingerprint, which signs every
// existing session out.
export const passwordFingerprint = () =>
  crypto
    .createHmac("sha256", env.jwtSecret)
    .update(`admin:${env.adminEmail}:${env.adminPassword}`)
    .digest("hex")
    .slice(0, 16);

export function signAdminToken() {
  const expiresInSeconds = env.adminSessionHours * 60 * 60;

  const token = jwt.sign(
    { role: "admin", email: env.adminEmail, v: passwordFingerprint() },
    env.jwtSecret,
    { algorithm: "HS256", expiresIn: expiresInSeconds },
  );

  return { token, expiresAt: new Date(Date.now() + expiresInSeconds * 1000) };
}

// Protects /api/admin/*. Expects "Authorization: Bearer <token>" from /api/admin/login.
export default function requireAdmin(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) return res.status(401).json({ message: "Please log in." });

  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    if (payload.role !== "admin" || payload.v !== passwordFingerprint()) throw new Error("stale");

    req.admin = { email: payload.email };
    next();
  } catch {
    res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
}
