import { Router } from "express";
import requireAdmin from "../middleware/requireAdmin.js";
import { loginLimiter } from "../middleware/rateLimiters.js";
import {
  login,
  me,
  notifications,
  readAllNotifications,
  sendTestEmail,
  stats,
  system,
} from "../controllers/adminController.js";
import {
  exportOrders,
  getOrder,
  listOrders,
  recheckPayment,
  resendEmail,
  updateOrder,
} from "../controllers/adminOrderController.js";
import { getCustomer, listCustomers } from "../controllers/adminCustomerController.js";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "../controllers/adminProductController.js";
import {
  deleteMessage,
  deleteSubscriber,
  exportSubscribers,
  listMessages,
  listSubscribers,
  updateMessage,
} from "../controllers/adminInboxController.js";
import { uploadMedia } from "../controllers/mediaController.js";
import { ship, track } from "../controllers/shippingController.js";
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
} from "../controllers/adminCouponController.js";

const router = Router();

router.post("/login", loginLimiter, login);

// Everything below needs a valid admin token.
router.use(requireAdmin);

router.get("/me", me);
router.get("/stats", stats);
router.get("/notifications", notifications);
router.post("/notifications/read-all", readAllNotifications);
router.get("/system", system);
router.post("/system/test-email", sendTestEmail);

router.get("/orders", listOrders);
router.get("/orders/export.csv", exportOrders);
router.get("/orders/:id", getOrder);
router.patch("/orders/:id", updateOrder);
router.post("/orders/:id/email", resendEmail);
router.post("/orders/:id/recheck-payment", recheckPayment);
router.post("/orders/:id/ship", ship);
router.post("/orders/:id/tracking", track);

router.get("/coupons", listCoupons);
router.post("/coupons", createCoupon);
router.patch("/coupons/:id", updateCoupon);
router.delete("/coupons/:id", deleteCoupon);

router.get("/customers", listCustomers);
router.get("/customers/:phone", getCustomer);

router.get("/products", listProducts);
router.post("/products", createProduct);
router.patch("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.post("/media", uploadMedia);

router.get("/subscribers", listSubscribers);
router.get("/subscribers/export.csv", exportSubscribers);
router.delete("/subscribers/:id", deleteSubscriber);

router.get("/messages", listMessages);
router.patch("/messages/:id", updateMessage);
router.delete("/messages/:id", deleteMessage);

export default router;
