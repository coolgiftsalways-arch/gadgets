import { Router } from "express";
import { getStoreConfig, lookupPincode } from "../controllers/storeController.js";

const router = Router();

router.get("/config", getStoreConfig);
router.get("/pincode/:pin", lookupPincode);

export default router;
