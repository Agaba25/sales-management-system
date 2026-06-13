import express from "express";
import { listActivity } from "../controllers/activityController.js";
import { authorizeRoles, requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, authorizeRoles("CEO", "MANAGER"), listActivity);

export default router;
