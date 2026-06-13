import pool from "../config/db.js";

class Customer {
  static async findAll() {
    const result = await pool.query(
      `SELECT id, name, email, phone, address, is_active
       FROM customers
       ORDER BY name ASC`
    );

    return result.rows;
  }

  static async findActive() {
    const result = await pool.query(
      `SELECT id, name, email, phone, address, is_active
       FROM customers
       WHERE is_active = TRUE
       ORDER BY name ASC`
    );

    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, name, email, phone, address, is_active
       FROM customers
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    return result.rows[0] || null;
  }

  static async create({ name, email, phone, address, is_active = true }) {
    if (!name) {
      throw new Error("Customer name is required.");
    }

    const result = await pool.query(
      `INSERT INTO customers
        (name, email, phone, address, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        email || null,
        phone || null,
        address || null,
        is_active,
      ]
    );

    return result.rows[0];
  }

  static async update(id, { name, email, phone, address, is_active = true }) {
    if (!name) {
      throw new Error("Customer name is required.");
    }

    const result = await pool.query(
      `UPDATE customers
       SET name = $1,
           email = $2,
           phone = $3,
           address = $4,
           is_active = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, email || null, phone || null, address || null, is_active, id]
    );

    return result.rows[0] || null;
  }

  static async delete(id) {
    await pool.query("DELETE FROM customers WHERE id = $1", [id]);
  }
}

export default Customer;
