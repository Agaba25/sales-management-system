import express from "express";
import {
  addProduct,
  deleteProduct,
  editProduct,
  listProducts,
  showAddProduct,
  showEditProduct,
} from "../controllers/productController.js";
import { authorizeRoles, requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, listProducts);
router.get("/new", authorizeRoles("CEO", "MANAGER"), showAddProduct);
router.post("/", authorizeRoles("CEO", "MANAGER"), addProduct);
router.get("/:id/edit", authorizeRoles("CEO", "MANAGER"), showEditProduct);
router.post("/:id/edit", authorizeRoles("CEO", "MANAGER"), editProduct);
router.post("/:id/delete", authorizeRoles("CEO"), deleteProduct);

export default router;
