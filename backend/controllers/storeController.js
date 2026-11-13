import { publicStoreConfig } from "../config/store.js";
import { isDbReady } from "../config/db.js";
import { badRequest, notFound, HttpError } from "../utils/httpError.js";
import { pincode as cleanPincode } from "../utils/validate.js";

// GET /api/health — used by hosting platforms to check the server is alive
export function health(req, res) {
  const ready = isDbReady();
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "starting", database: ready });
}

// GET /api/store/config — payment options, discount and delivery promises
export function getStoreConfig(req, res) {
  res.set("Cache-Control", "public, max-age=30");
  res.json(publicStoreConfig());
}

// PIN code lookups never change, so remember them while the server is running.
const pincodeCache = new Map();
const PINCODE_CACHE_LIMIT = 5000;

// GET /api/store/pincode/400001 -> { city: "Mumbai", state: "Maharashtra" }
// Uses India Post's free public API to fill in city and state at checkout.
// If it is down the customer simply types them.
export async function lookupPincode(req, res) {
  const pin = cleanPincode(req.params.pin);
  if (!pin) throw badRequest("Please enter a valid 6-digit PIN code.");

  if (pincodeCache.has(pin)) return res.json(pincodeCache.get(pin));

  let data;
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: AbortSignal.timeout(5000),
    });
    data = await response.json();
  } catch {
    throw new HttpError(502, "PIN code lookup is unavailable right now.");
  }

  const office = data?.[0]?.Status === "Success" ? data[0].PostOffice?.[0] : null;
  if (!office) throw notFound("We couldn't find that PIN code.");

  const result = { city: office.District, state: office.State };

  if (pincodeCache.size >= PINCODE_CACHE_LIMIT) pincodeCache.clear();
  pincodeCache.set(pin, result);

  res.set("Cache-Control", "public, max-age=86400");
  res.json(result);
}
