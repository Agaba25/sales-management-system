import express from "express";
import {
  addUser,
  editUser,
  listUsers,
  showAddUser,
  showEditUser,
} from "../controllers/userController.js";
import { authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authorizeRoles("CEO"), listUsers);
router.get("/new", authorizeRoles("CEO"), showAddUser);
router.post("/", authorizeRoles("CEO"), addUser);
router.get("/:id/edit", authorizeRoles("CEO"), showEditUser);
router.post("/:id/edit", authorizeRoles("CEO"), editUser);

export default router;
