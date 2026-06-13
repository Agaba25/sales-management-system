import express from "express";
import { createSale, listSales, showNewSale, showReceipt } from "../controllers/salesController.js";
import { authorizeRoles, requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, listSales);
router.get("/new", authorizeRoles("SALESPERSON"), showNewSale);
router.get("/:id/receipt", requireAuth, showReceipt);
router.post("/", authorizeRoles("SALESPERSON"), createSale);

export default router;
