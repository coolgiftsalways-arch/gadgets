import { Router } from "express";
import { getProduct, listProducts } from "../controllers/productController.js";

const router = Router();

router.get("/", listProducts);
router.get("/:slug", getProduct);

export default router;
