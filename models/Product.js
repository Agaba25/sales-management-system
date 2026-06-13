import pool from "../config/db.js";

class Product {
  static async findAll(search = "", availableOnly = false) {
    const searchTerm = `%${search}%`;
    const result = await pool.query(
      `SELECT
         products.id,
         products.name,
         products.sku,
         products.quantity,
         products.unit_price,
         products.cost_price,
         products.reorder_level,
         products.is_active,
         products.created_at,
         categories.name AS category_name
       FROM products
       LEFT JOIN categories ON products.category_id = categories.id
       WHERE (
          $1 = ''
          OR products.name ILIKE $2
          OR products.sku ILIKE $2
          OR categories.name ILIKE $2
       )
       ${availableOnly ? "AND products.is_active = TRUE AND products.quantity > 0" : ""}
       ORDER BY products.created_at DESC`,
      [search, searchTerm]
    );

    return result.rows;
  }

  static async findAvailable() {
    const result = await pool.query(
      `SELECT id, name, sku, quantity, unit_price
       FROM products
       WHERE is_active = TRUE
         AND quantity > 0
       ORDER BY name ASC`
    );

    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT *
       FROM products
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    return result.rows[0] || null;
  }

  static async create(product) {
    const result = await pool.query(
      `INSERT INTO products
        (category_id, name, sku, description, quantity, unit_price, cost_price, reorder_level, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        product.category_id || null,
        product.name,
        product.sku,
        product.description || null,
        product.quantity,
        product.unit_price,
        product.cost_price,
        product.reorder_level,
        product.is_active,
      ]
    );

    return result.rows[0];
  }

  static async update(id, product) {
    const result = await pool.query(
      `UPDATE products
       SET category_id = $1,
           name = $2,
           sku = $3,
           description = $4,
           quantity = $5,
           unit_price = $6,
           cost_price = $7,
           reorder_level = $8,
           is_active = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        product.category_id || null,
        product.name,
        product.sku,
        product.description || null,
        product.quantity,
        product.unit_price,
        product.cost_price,
        product.reorder_level,
        product.is_active,
        id,
      ]
    );

    return result.rows[0] || null;
  }

  static async delete(id) {
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
  }

  static async findCategories() {
    const result = await pool.query(
      `SELECT id, name
       FROM categories
       WHERE is_active = TRUE
       ORDER BY name ASC`
    );

    return result.rows;
  }
}

export default Product;
