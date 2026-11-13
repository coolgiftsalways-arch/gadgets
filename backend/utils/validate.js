// Small helpers for cleaning values that arrive from the browser.
// Request bodies are never trusted: every field is coerced to the type we
// expect before it goes anywhere near the database.
import mongoose from "mongoose";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_PATTERN = /^[6-9]\d{9}$/;
export const PINCODE_PATTERN = /^[1-9]\d{5}$/;

// Plain text: a string, trimmed, without control characters, capped in length.
export function text(value, maxLength = 200) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

// Single-line text (newlines collapsed) — names, cities, subjects.
export function line(value, maxLength = 200) {
  return text(value, maxLength * 2).replace(/\s+/g, " ").slice(0, maxLength).trim();
}

export function email(value) {
  const cleaned = line(value, 254).toLowerCase();
  return EMAIL_PATTERN.test(cleaned) ? cleaned : "";
}

// "+91 98765-43210", "09876543210", "919876543210" -> "9876543210"
export function phone(value) {
  let digits = text(value, 30).replace(/\D/g, "");
  if (digits.length > 10) digits = digits.replace(/^(91|0)(?=\d{10}$)/, "");
  return PHONE_PATTERN.test(digits) ? digits : "";
}

export function pincode(value) {
  const digits = text(value, 12).replace(/\D/g, "");
  return PINCODE_PATTERN.test(digits) ? digits : "";
}

// Whole number within a range, or null when the value is not one.
export function integer(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof value === "boolean" || value === null || value === undefined || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

export function boolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

export const isObjectId = (value) =>
  typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value) && mongoose.isValidObjectId(value);

// A list of short strings (colours, features), de-duplicated.
export function stringList(value, { maxItems = 12, maxLength = 60 } = {}) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/)
      : [];

  const seen = new Set();
  const result = [];

  for (const entry of source) {
    const cleaned = line(entry, maxLength);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= maxItems) break;
  }

  return result;
}

// Makes text safe to use inside a regular expression (admin search boxes).
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const slugify = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "product";
