// Customer-facing order numbers, e.g. GAD-7K3M9QX2.
//
// They are random rather than 1, 2, 3… on purpose: the Track Order page only
// asks for the order number, so it must not be guessable. Eight characters
// from a 31-letter alphabet gives about 850 billion possibilities.
import crypto from "node:crypto";

export const ORDER_PREFIX = "GAD";

// No 0/O, 1/I/L — characters people mix up when reading a number aloud.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;
const CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

export function generateOrderNumber() {
  let code = "";

  while (code.length < CODE_LENGTH) {
    // Rejection sampling keeps every character equally likely.
    for (const byte of crypto.randomBytes(16)) {
      if (byte >= 248) continue; // 248 = 31 * 8
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }

  return `${ORDER_PREFIX}-${code}`;
}

// Accepts what customers actually type: "gad-7k3m9qx2", "#GAD 7K3M9QX2",
// "7K3M9QX2". Returns the canonical form, or null if it cannot be one.
export function normalizeOrderNumber(input) {
  if (typeof input !== "string") return null;

  let value = input.trim().toUpperCase().replace(/[\s#_]/g, "");
  if (value.startsWith(`${ORDER_PREFIX}-`)) value = value.slice(ORDER_PREFIX.length + 1);
  else if (value.startsWith(ORDER_PREFIX) && value.length === ORDER_PREFIX.length + CODE_LENGTH) {
    value = value.slice(ORDER_PREFIX.length);
  }
  value = value.replace(/-/g, "");

  return CODE_PATTERN.test(value) ? `${ORDER_PREFIX}-${value}` : null;
}
