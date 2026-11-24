// Talks to the backend's /api/admin endpoints.
export const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

const TOKEN_KEY = "gadgete_admin_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "/admin/login";
}

// fetch wrapper: adds the login token, sends JSON, logs out when the session expires.
export async function adminFetch(path, { body, ...options } = {}) {
  const isForm = body instanceof FormData;

  const response = await fetch(`${API}/admin${path}`, {
    ...options,
    headers: {
      ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${getToken()}`,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (response.status === 401 && path !== "/login") {
    logout();
    throw new Error("Your session has expired. Please log in again.");
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}

// Downloads a CSV export (needs the token, so a plain link won't work).
export async function adminDownload(path, filename) {
  const response = await fetch(`${API}/admin${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error("Export failed. Please try again.");

  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Uploads a photo or video straight from the browser to Cloudinary.
// kind: "image" | "video". Returns the https:// address, or null when
// Cloudinary isn't set up (the caller then falls back to the server).
export async function uploadToCloudinary(file, kind, onProgress) {
  let sign;
  try {
    sign = await adminFetch("/media/cloudinary-signature", { method: "POST" });
  } catch {
    return null; // not configured
  }

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", sign.apiKey);
  body.append("timestamp", sign.timestamp);
  body.append("signature", sign.signature);
  body.append("folder", sign.folder);

  // XMLHttpRequest (not fetch) so big videos can show upload progress.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sign.cloudName}/${kind}/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* keep empty */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve(data.secure_url);
      else reject(new Error(data.error?.message || "Upload to Cloudinary failed."));
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your internet connection."));
    xhr.send(body);
  });
}

// Shrinks a photo in the browser (max 1600px, JPEG) so uploads are quick.
export function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not read image."))), "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("That file isn't a readable image."));
    img.src = URL.createObjectURL(file);
  });
}

// Shrinks and uploads one photo: Cloudinary when it's set up, otherwise the
// database. Returns the photo's address.
export async function uploadPhoto(file, name = "photo.jpg") {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const blob = await shrinkImage(file);
  const url = await uploadToCloudinary(new File([blob], name, { type: "image/jpeg" }), "image");
  if (url) return url;
  const body = new FormData();
  body.append("image", blob, name);
  return (await adminFetch("/media", { method: "POST", body })).url;
}

// "/api/media/…" works as-is unless the API lives on another domain.
export function imageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (/^https?:\/\//i.test(API)) return `${new URL(API).origin}${path}`;
  return path;
}

export const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const STATUS_OPTIONS = [
  ["pending", "Pending"],
  ["processing", "Processing"],
  ["shipped", "Shipped"],
  ["out_for_delivery", "Out for delivery"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

const LABELS = {
  ...Object.fromEntries(STATUS_OPTIONS),
  awaiting_payment: "Awaiting payment",
  expired: "Payment not completed",
};

export const statusLabel = (status) => LABELS[status] || status;
// CSS class used by the status pills: "out_for_delivery" -> "out-for-delivery"
export const statusClass = (status) => String(status || "").replaceAll("_", "-");

export const paymentLabel = (payment = {}) => {
  if (payment.method === "cod") {
    if (payment.status === "paid") return "COD — collected";
    return payment.advancePaidAt ? `COD · ₹${payment.advance} paid` : "Cash on Delivery";
  }
  if (payment.status === "refunded") return "Refunded";
  if (payment.status === "paid") return "Paid Online";
  return "UPI — unpaid";
};

export const customerName = (customer = {}) =>
  [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer";

export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

export const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export const formatTime = (date) =>
  date ? new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

export const formatDateTime = (date) => (date ? `${formatDate(date)} · ${formatTime(date)}` : "—");
