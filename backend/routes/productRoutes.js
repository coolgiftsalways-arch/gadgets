import { Router } from "express";
import { getProduct, listProducts } from "../controllers/productController.js";
import { listProductReviews, submitReview } from "../controllers/reviewController.js";
import { formLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.get("/", listProducts);
router.get("/:slug", getProduct);
router.get("/:slug/reviews", listProductReviews);
router.post("/:slug/reviews", formLimiter, submitReview);

export default router;
