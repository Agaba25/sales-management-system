import pool from "../config/db.js";

class Inventory {
  static async getInventory(search = "") {
    const searchTerm = `%${search}%`;
    const result = await pool.query(
      `SELECT
         products.id,
         products.name,
         products.sku,
         products.quantity,
         products.reorder_level,
         categories.name AS category_name
       FROM products
       LEFT JOIN categories ON products.category_id = categories.id
       WHERE products.is_active = TRUE
         AND (
           $1 = ''
           OR products.name ILIKE $2
           OR products.sku ILIKE $2
           OR categories.name ILIKE $2
         )
       ORDER BY products.name ASC`,
      [search, searchTerm]
    );

    return result.rows;
  }

  static async getLowStockProducts() {
    const result = await pool.query(
      `SELECT id, name, sku, quantity, reorder_level
       FROM products
       WHERE is_active = TRUE
         AND quantity <= reorder_level
       ORDER BY quantity ASC, name ASC`
    );

    return result.rows;
  }

  static async getMovements() {
    const result = await pool.query(
      `SELECT
         stock_movements.id,
         stock_movements.movement_type,
         stock_movements.quantity,
         stock_movements.previous_quantity,
         stock_movements.new_quantity,
         stock_movements.reason,
         stock_movements.notes,
         stock_movements.created_at,
         products.name AS product_name,
         products.sku,
         users.name AS user_name
       FROM stock_movements
       JOIN products ON stock_movements.product_id = products.id
       LEFT JOIN users ON stock_movements.user_id = users.id
       ORDER BY stock_movements.created_at DESC`
    );

    return result.rows;
  }

  static async recordMovement({ productId, userId, movementType, quantity, reason, notes }) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const productResult = await client.query(
        "SELECT id, quantity FROM products WHERE id = $1 FOR UPDATE",
        [productId]
      );
      const product = productResult.rows[0];

      if (!product) {
        throw new Error("Product not found");
      }

      const previousQuantity = product.quantity;
      const newQuantity =
        movementType === "IN"
          ? previousQuantity + quantity
          : previousQuantity - quantity;

      if (newQuantity < 0) {
        throw new Error("Stock out quantity cannot exceed current stock");
      }

      await client.query(
        `UPDATE products
         SET quantity = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newQuantity, productId]
      );

      const movementResult = await client.query(
        `INSERT INTO stock_movements
          (product_id, user_id, movement_type, quantity, previous_quantity, new_quantity, reason, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          productId,
          userId,
          movementType,
          quantity,
          previousQuantity,
          newQuantity,
          reason || null,
          notes || null,
        ]
      );

      await client.query("COMMIT");
      return movementResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Inventory;
