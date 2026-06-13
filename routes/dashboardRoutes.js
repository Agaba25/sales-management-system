import express from "express";
import { showDashboard } from "../controllers/dashboardController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, showDashboard);

export default router;
