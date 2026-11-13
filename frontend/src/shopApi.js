// Storefront helpers for talking to the backend.
import { getProductById } from "./data/products";

export const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
export const CART_KEY = "gadgete_cart";

export async function api(path, { body, method } = {}) {
  const response = await fetch(`${API}${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong. Please try again.");
    error.code = data.code;
    throw error;
  }
  return data;
}

export const getCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
};

export const clearCart = () => {
  localStorage.setItem(CART_KEY, "[]");
  window.dispatchEvent(new CustomEvent("gadgete-cart-updated", { detail: [] }));
};

// Cart items saved by the older pages only have id "01"; the backend wants the slug.
export const cartToApiItems = (cart) =>
  cart.map((item, index) => ({
    key: String(index),
    slug: item.slug || getProductById(item.id)?.slug || "",
    productId: /^[0-9a-f]{24}$/i.test(String(item.id)) ? item.id : undefined,
    quantity: Number(item.quantity) || 1,
    color: item.color || "",
  }));

export function imageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (/^https?:\/\//i.test(API)) return `${new URL(API).origin}${path}`;
  return path;
}

export const formatPrice = (price) =>
  `₹${Number(price || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const shortDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// "16 Nov – 18 Nov"
export function deliveryWindow({ minDays, maxDays }, from = new Date()) {
  const add = (days) => new Date(new Date(from).getTime() + days * 86400000);
  return `${shortDate(add(minDays))} – ${shortDate(add(maxDays))}`;
}
