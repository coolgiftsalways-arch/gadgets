import { Router } from "express";
import { createContact, subscribe } from "../controllers/contactController.js";
import { formLimiter } from "../middleware/rateLimiters.js";

// Mounted at /api — gives POST /api/contact and POST /api/newsletter
const router = Router();

router.post("/contact", formLimiter, createContact);
router.post("/newsletter", formLimiter, subscribe);

export default router;
