import express from "express";
import { showReport } from "../controllers/reportsController.js";
import { requireAuth, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Only MANAGER and CEO should access summary reports
router.get("/", requireAuth, authorizeRoles("CEO", "MANAGER"), showReport);

export default router;
