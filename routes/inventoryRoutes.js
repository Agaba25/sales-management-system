import express from "express";
import {
  showHistory,
  showInventory,
  stockIn,
  stockOut,
} from "../controllers/inventoryController.js";
import { authorizeRoles, requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, showInventory);
router.get("/history", requireAuth, showHistory);
router.post("/:productId/stock-in", authorizeRoles("CEO", "MANAGER"), stockIn);
router.post("/:productId/stock-out", authorizeRoles("CEO", "MANAGER"), stockOut);

export default router;
