import { Router } from "express";
import {
  cancelPayment,
  checkout,
  getOrder,
  orderStatus,
  paymentCallback,
  quote,
  trackOrder,
} from "../controllers/orderController.js";
import { checkoutLimiter, statusLimiter, trackLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.post("/quote", quote);
router.post("/checkout", checkoutLimiter, checkout);

// Razorpay sends the customer here after paying. Must stay above "/:token".
router.get("/payment-callback", paymentCallback);

// Track Order page: looked up by the order number (GAD-XXXXXXXX)
router.get("/:orderNumber/tracking", trackLimiter, trackOrder);

// The customer's own order pages: looked up by the private order key
router.get("/:token/status", statusLimiter, orderStatus);
router.post("/:token/cancel-payment", statusLimiter, cancelPayment);
router.get("/:token", statusLimiter, getOrder);

export default router;
