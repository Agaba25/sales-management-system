import express from "express";
import {
  getRecentCustomers,
  quickAddCustomer,
  searchCustomers,
  searchProducts,
} from "../controllers/apiController.js";
import { authorizeRoles, requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/customers/search", searchCustomers);
router.get("/customers/recent", getRecentCustomers);
router.post("/customers/quick", quickAddCustomer);

router.get("/products/search", searchProducts);

export default router;
