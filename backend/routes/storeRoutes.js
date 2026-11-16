import { Router } from "express";
import { getStoreConfig, lookupPincode } from "../controllers/storeController.js";
import { getHomepage } from "../controllers/homepageController.js";

const router = Router();

router.get("/config", getStoreConfig);
router.get("/homepage", getHomepage);
router.get("/pincode/:pin", lookupPincode);

export default router;
