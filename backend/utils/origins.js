// Decides which website addresses are allowed to use this API from a browser.
import { env } from "../config/env.js";

const LOCAL_NETWORK =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/i;

export const stripSlash = (url) => String(url || "").replace(/\/+$/, "");

// The address this server is being reached on (https://your-domain.com).
export const selfOrigin = (req) => `${req.protocol}://${req.host}`;

export function isAllowedOrigin(origin, req) {
  const value = stripSlash(origin);
  if (!value) return false;

  // The storefront address(es) from CLIENT_URL.
  if (env.clientUrls.includes(value)) return true;

  // The website served by this same server (single-domain hosting).
  if (req && value === selfOrigin(req)) return true;

  // While developing: your own computer and phones on the same Wi-Fi.
  if (!env.isProd && LOCAL_NETWORK.test(value)) return true;

  return false;
}
