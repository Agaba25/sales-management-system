import express from "express";
import { showAnalytics, exportCsv, exportPdf } from "../controllers/analyticsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, showAnalytics);
router.get("/export/csv", requireAuth, exportCsv);
router.get("/export/pdf", requireAuth, exportPdf);

export default router;
