import bcrypt from "bcrypt";
import pool from "../config/db.js";

const SALT_ROUNDS = 12;
const VALID_ROLES = ["CEO", "MANAGER", "SALESPERSON"];

class User {
  static roles() {
    return VALID_ROLES;
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       ORDER BY role ASC, name ASC`
    );

    return result.rows;
  }

  static async findByEmail(email) {
    const result = await pool.query(
      `SELECT id, name, email, password_hash, role, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    return result.rows[0] || null;
  }

  static async create({ name, email, password, role }) {
    if (!name || !email || !password) {
      throw new Error("Name, email, and password are required.");
    }

    if (!VALID_ROLES.includes(role)) {
      throw new Error("Invalid user role");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email.toLowerCase(), passwordHash, role]
    );

    return result.rows[0];
  }

  static async update(id, { name, email, role, password }) {
    if (!name || !email) {
      throw new Error("Name and email are required.");
    }

    if (!VALID_ROLES.includes(role)) {
      throw new Error("Invalid user role");
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = await pool.query(
        `UPDATE users
         SET name = $1,
             email = $2,
             role = $3,
             password_hash = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING id, name, email, role, created_at, updated_at`,
        [name, email.toLowerCase(), role, passwordHash, id]
      );

      return result.rows[0] || null;
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           email = $2,
           role = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email.toLowerCase(), role, id]
    );

    return result.rows[0] || null;
  }

  static async verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }
}

export default User;
