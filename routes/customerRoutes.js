import express from "express";
import {
  addCustomer,
  deleteCustomer,
  editCustomer,
  listCustomers,
  showAddCustomer,
  showEditCustomer,
} from "../controllers/customerController.js";
import { authorizeRoles, requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, listCustomers);
router.get("/new", requireAuth, showAddCustomer);
router.post("/", requireAuth, addCustomer);
router.get("/:id/edit", authorizeRoles("CEO", "MANAGER"), showEditCustomer);
router.post("/:id/edit", authorizeRoles("CEO", "MANAGER"), editCustomer);
router.post("/:id/delete", authorizeRoles("CEO"), deleteCustomer);

export default router;
