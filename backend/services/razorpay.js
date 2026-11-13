// Razorpay Payment Links — the same payment method lights.bio uses.
//
// For every UPI order we create one fixed-amount payment link. The checkout
// page shows it as a QR code plus a "Pay" button; Razorpay then tells us the
// result three ways (any one is enough): the signed redirect back to our
// site, a webhook, and our own status check.
//
// Docs: https://razorpay.com/docs/api/payments/payment-links/
import crypto from "node:crypto";
import { env, isRazorpayConfigured } from "../config/env.js";

export const isConfigured = isRazorpayConfigured;

async function request(path, { method = "GET", body } = {}) {
  if (!isConfigured()) {
    throw new Error("Razorpay is not set up (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  }

  const { keyId, keySecret, apiUrl } = env.razorpay;

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.error?.description || `Razorpay request failed (${response.status})`,
    );
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }

  return data;
}

// amount is in rupees; Razorpay wants paise.
export function createPaymentLink({
  amount,
  referenceId,
  description,
  customer,
  expiresAt,
  callbackUrl,
  notes,
}) {
  const payload = {
    amount: Math.round(amount * 100),
    currency: "INR",
    accept_partial: false,
    reference_id: referenceId,
    description: description.slice(0, 250),
    customer,
    notify: { sms: false, email: false },
    reminder_enable: false,
    expire_by: Math.floor(expiresAt.getTime() / 1000),
    callback_url: callbackUrl,
    callback_method: "get",
    notes,
  };

  if (env.razorpay.upiOnly) {
    payload.options = {
      checkout: { method: { upi: true, card: false, netbanking: false, wallet: false } },
    };
  }

  return request("/payment_links", { method: "POST", body: payload });
}

export const fetchPaymentLink = (linkId) =>
  request(`/payment_links/${encodeURIComponent(linkId)}`);

export const cancelPaymentLink = (linkId) =>
  request(`/payment_links/${encodeURIComponent(linkId)}/cancel`, { method: "POST" });

const hmac = (secret, value) =>
  crypto.createHmac("sha256", secret).update(value).digest("hex");

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

// Proves the "you have paid" redirect really came from Razorpay.
export function verifyCallbackSignature({ linkId, referenceId, status, paymentId, signature }) {
  if (!isConfigured() || !signature) return false;
  const expected = hmac(
    env.razorpay.keySecret,
    `${linkId}|${referenceId}|${status}|${paymentId}`,
  );
  return safeEqual(expected, signature);
}

// Proves a webhook body really came from Razorpay. rawBody must be the exact
// bytes received, before any JSON parsing.
export function verifyWebhookSignature(rawBody, signature) {
  const secret = env.razorpay.webhookSecret;
  if (!secret || !signature || !rawBody) return false;
  return safeEqual(hmac(secret, rawBody), signature);
}
