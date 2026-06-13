import pool from "../config/db.js";

class Sale {
  static async findAll(userId = null) {
    const values = [];
    const whereClause = userId ? "WHERE sales.user_id = $1" : "";

    if (userId) {
      values.push(userId);
    }

    const result = await pool.query(
      `SELECT
         sales.id,
         sales.total_amount,
         sales.created_at,
         customers.name AS customer_name,
         users.name AS user_name,
         COUNT(sale_items.id)::int AS item_count
       FROM sales
       JOIN customers ON sales.customer_id = customers.id
       LEFT JOIN users ON sales.user_id = users.id
       LEFT JOIN sale_items ON sale_items.sale_id = sales.id
       ${whereClause}
       GROUP BY sales.id, customers.name, users.name
       ORDER BY sales.created_at DESC`,
      values
    );

    return result.rows;
  }

  static async findByIdWithItems(id) {
    const saleResult = await pool.query(
      `SELECT
         sales.id,
         sales.customer_id,
         sales.user_id,
         sales.total_amount,
         sales.status,
         sales.created_at,
         customers.name AS customer_name,
         users.name AS user_name
       FROM sales
       JOIN customers ON sales.customer_id = customers.id
       LEFT JOIN users ON sales.user_id = users.id
       WHERE sales.id = $1
       LIMIT 1`,
      [id]
    );

    const sale = saleResult.rows[0];
    if (!sale) {
      return null;
    }

    const itemsResult = await pool.query(
      `SELECT
         sale_items.id,
         sale_items.product_id,
         sale_items.quantity,
         sale_items.unit_price,
         sale_items.total_price,
         products.name AS product_name,
         products.sku
       FROM sale_items
       LEFT JOIN products ON sale_items.product_id = products.id
       WHERE sale_items.sale_id = $1
       ORDER BY sale_items.id ASC`,
      [id]
    );

    return { sale, items: itemsResult.rows };
  }

  static async create({ customerId, userId, items }) {
    if (!customerId) {
      throw new Error("Customer is required.");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("At least one product is required for a sale.");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const saleResult = await client.query(
        `INSERT INTO sales (customer_id, user_id, total_amount)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [customerId, userId, 0]
      );

      const saleId = saleResult.rows[0].id;
      let totalAmount = 0;

      for (const item of items) {
        const productId = Number(item.productId);
        const quantity = Number(item.quantity);

        if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
          throw new Error("Each sale item must include a valid product and quantity.");
        }

        const productResult = await client.query(
          `SELECT id, quantity, unit_price, is_active
           FROM products
           WHERE id = $1
           FOR UPDATE`,
          [productId]
        );

        const product = productResult.rows[0];

        if (!product) {
          throw new Error("Selected product does not exist.");
        }

        if (!product.is_active) {
          throw new Error(`Product ${productId} is not active for sale.`);
        }

        if (product.quantity < quantity) {
          throw new Error(`Not enough stock for product ${productId}.`);
        }

        const lineTotal = Number(product.unit_price) * quantity;

        const previousQuantity = Number(product.quantity);
        const newQuantity = previousQuantity - quantity;

        await client.query(
          `UPDATE products
           SET quantity = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [newQuantity, productId]
        );

        await client.query(
          `INSERT INTO sale_items
            (sale_id, product_id, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [saleId, productId, quantity, product.unit_price, lineTotal]
        );

        await client.query(
          `INSERT INTO stock_movements
            (product_id, user_id, movement_type, quantity, previous_quantity, new_quantity, reason, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [productId, userId, 'OUT', quantity, previousQuantity, newQuantity, 'SALE', `Sale #${saleId}`]
        );

        totalAmount += lineTotal;
      }

      await client.query(
        `UPDATE sales
         SET total_amount = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [totalAmount, saleId]
      );

      await client.query("COMMIT");

      return { id: saleId, total_amount: totalAmount };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Sale;
