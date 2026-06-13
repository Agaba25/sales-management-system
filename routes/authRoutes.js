import express from "express";
import { login, logout, showLogin } from "../controllers/authController.js";
import { redirectIfAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/login", redirectIfAuthenticated, showLogin);
router.post("/login", redirectIfAuthenticated, login);
router.post("/logout", logout);
router.get("/logout", logout);

export default router;
