import express from "express";
import bcrypt from "bcrypt";
import pool from "../config/db.js";

const router = express.Router();
const SALT_ROUNDS = 10;

router.get("/status", async (req, res) => {
  try {
    const countResult = await pool.query("SELECT COUNT(*) FROM users");
    const userCount = Number(countResult.rows[0].count);

    return res.status(200).json({
      locked: userCount > 0,
      message:
        userCount > 0
          ? "Initial configuration is locked. Setup already completed."
          : "Initial configuration is available.",
    });
  } catch (error) {
    console.error("Initial setup status error:", error.message);

    return res.status(500).json({
      message: "Unable to check initial setup status.",
    });
  }
});

router.post("/ceo", async (req, res) => {
  const name = req.body.name?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email, and password are required.",
    });
  }

  try {
    const countResult = await pool.query("SELECT COUNT(*) FROM users");
    const userCount = Number(countResult.rows[0].count);

    if (userCount > 0) {
      return res.status(403).json({
        message: "Initial configuration is locked. Setup already completed.",
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, passwordHash, "CEO"]
    );

    return res.status(201).json({
      message: "CEO account created successfully. Initial setup is now complete.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Initial CEO setup error:", error.message);

    return res.status(500).json({
      message: "Unable to complete initial setup.",
    });
  }
});

export default router;
