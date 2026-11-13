
import crypto from "crypto";

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// ==========================================
// CONFIGURATION
// ==========================================

export function isConfigured() {
  return Boolean(KEY_ID && KEY_SECRET);
}

function getAuthHeader() {
  if (!isConfigured()) {
    throw new Error("Razorpay credentials are not configured.");
  }

  return `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`;
}

// ==========================================
// RAZORPAY API REQUEST HELPER
// ==========================================

async function request(endpoint, options = {}) {
  const response = await fetch(`${RAZORPAY_BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.description ||
      data?.error?.reason ||
      `Razorpay API error (${response.status})`;

    const error = new Error(message);
    error.statusCode = response.status;
    error.razorpayError = data.error || data;
    throw error;
  }

  return data;
}

// ==========================================
// PAYMENT LINK FUNCTIONS - EXISTING SUPPORT
// ==========================================

export async function createPaymentLink(payload) {
  return request("/payment_links", {
    method: "POST",
    body: payload,
  });
}

export async function fetchPaymentLink(paymentLinkId) {
  if (!paymentLinkId) {
    throw new Error("Payment Link ID is required.");
  }

  return request(`/payment_links/${encodeURIComponent(paymentLinkId)}`);
}

export async function cancelPaymentLink(paymentLinkId) {
  if (!paymentLinkId) {
    throw new Error("Payment Link ID is required.");
  }

  return request(
    `/payment_links/${encodeURIComponent(paymentLinkId)}/cancel`,
    { method: "POST" }
  );
}

// ==========================================
// CREATE SINGLE-USE UPI QR CODE
// ==========================================

export async function createQrCode({
  amount,
  orderNumber,
  orderId,
  expiresAt,
  description,
}) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("QR amount must be a positive integer in paise.");
  }

  if (!orderNumber || !orderId) {
    throw new Error("Order details are required to create a QR code.");
  }

  const closeBy = Math.floor(new Date(expiresAt).getTime() / 1000);

  if (!Number.isFinite(closeBy)) {
    throw new Error("A valid QR expiry date is required.");
  }

  const minimumCloseBy = Math.floor(Date.now() / 1000) + 15 * 60;

  if (closeBy < minimumCloseBy) {
    throw new Error(
      "Razorpay QR expiry must be at least 15 minutes after creation."
    );
  }

  return request("/payments/qr_codes", {
    method: "POST",
    body: {
      type: "upi_qr",
      name: `GADGETE ${orderNumber}`,
      usage: "single_use",
      fixed_amount: true,
      payment_amount: amount,
      description:
        description || `Payment for GADGETE order ${orderNumber}`,
      close_by: closeBy,
      notes: {
        orderId: String(orderId),
        orderNumber: String(orderNumber),
      },
    },
  });
}

// ==========================================
// FETCH QR CODE
// ==========================================

export async function fetchQrCode(qrId) {
  if (!qrId) {
    throw new Error("QR Code ID is required.");
  }

  return request(`/payments/qr_codes/${encodeURIComponent(qrId)}`);
}

// ==========================================
// FETCH PAYMENTS MADE THROUGH QR CODE
// ==========================================

export async function fetchQrPayments(qrId, count = 10) {
  if (!qrId) {
    throw new Error("QR Code ID is required.");
  }

  const safeCount = Math.min(Math.max(Number(count) || 10, 1), 100);

  return request(
    `/payments/qr_codes/${encodeURIComponent(qrId)}/payments?count=${safeCount}`
  );
}

// ==========================================
// CLOSE QR CODE
// ==========================================

export async function closeQrCode(qrId) {
  if (!qrId) {
    throw new Error("QR Code ID is required.");
  }

  return request(
    `/payments/qr_codes/${encodeURIComponent(qrId)}/close`,
    { method: "POST" }
  );
}

// ==========================================
// PAYMENT SIGNATURE VERIFICATION
// ==========================================

export function verifyCallbackSignature({
  paymentLinkId,
  paymentId,
  signature,
}) {
  if (!KEY_SECRET || !paymentLinkId || !paymentId || !signature) {
    return false;
  }

  const body = `${paymentLinkId}|${paymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(body)
    .digest("hex");

  return safeCompare(expectedSignature, signature);
}

// ==========================================
// WEBHOOK SIGNATURE VERIFICATION
// ==========================================

export function verifyWebhookSignature(rawBody, signature) {
  if (!WEBHOOK_SECRET || !rawBody || !signature) {
    return false;
  }

  const body = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody);

  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return safeCompare(expectedSignature, signature);
}

// ==========================================
// TIMING-SAFE SIGNATURE COMPARISON
// ==========================================

function safeCompare(expected, received) {
  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(received, "hex");

    if (
      expectedBuffer.length === 0 ||
      expectedBuffer.length !== receivedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}
