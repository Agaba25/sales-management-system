import pool from "../config/db.js";

const categories = [
  { name: "Electronics", description: "Electronic products" },
  { name: "Groceries", description: "Food and grocery items" },
  { name: "Beverages", description: "Drinks and beverages" },
];

const products = [
  {
    name: "Coffee",
    sku: "P-001",
    description: "Premium arabica coffee",
    quantity: 50,
    unit_price: 8.99,
    cost_price: 4.50,
    reorder_level: 10,
    category_name: "Groceries",
  },
  {
    name: "Maize",
    sku: "M-001",
    description: "Quality maize grain",
    quantity: 100,
    unit_price: 5.50,
    cost_price: 3.00,
    reorder_level: 20,
    category_name: "Groceries",
  },
  {
    name: "Mangoes",
    sku: "F-002",
    description: "Fresh tropical mangoes",
    quantity: 75,
    unit_price: 12.99,
    cost_price: 6.00,
    reorder_level: 15,
    category_name: "Groceries",
  },
  {
    name: "Apple Juice",
    sku: "BEV-001",
    description: "100% natural apple juice",
    quantity: 40,
    unit_price: 3.99,
    cost_price: 1.50,
    reorder_level: 10,
    category_name: "Beverages",
  },
  {
    name: "Laptop",
    sku: "ELEC-001",
    description: "High-performance laptop",
    quantity: 10,
    unit_price: 899.99,
    cost_price: 600.00,
    reorder_level: 2,
    category_name: "Electronics",
  },
  {
    name: "USB Cable",
    sku: "ELEC-002",
    description: "3-meter USB 3.0 cable",
    quantity: 120,
    unit_price: 9.99,
    cost_price: 3.00,
    reorder_level: 30,
    category_name: "Electronics",
  },
];

const seed = async () => {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting product seed...\n");

    // Create categories
    for (const cat of categories) {
      const existingCat = await client.query(
        `SELECT id FROM categories WHERE name = $1 LIMIT 1`,
        [cat.name]
      );

      if (existingCat.rows.length > 0) {
        console.log(`✓ Category already exists: ${cat.name}`);
        continue;
      }

      await client.query(
        `INSERT INTO categories (name, description, is_active)
         VALUES ($1, $2, TRUE)`,
        [cat.name, cat.description]
      );
      console.log(`✓ Category created: ${cat.name}`);
    }

    console.log("");

    // Create products
    for (const prod of products) {
      const existingProd = await client.query(
        `SELECT id FROM products WHERE sku = $1 LIMIT 1`,
        [prod.sku]
      );

      if (existingProd.rows.length > 0) {
        console.log(`✓ Product already exists: ${prod.name} (${prod.sku})`);
        continue;
      }

      const categoryResult = await client.query(
        `SELECT id FROM categories WHERE name = $1`,
        [prod.category_name]
      );

      const categoryId = categoryResult.rows[0]?.id || null;

      await client.query(
        `INSERT INTO products (category_id, name, sku, description, quantity, unit_price, cost_price, reorder_level, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
        [
          categoryId,
          prod.name,
          prod.sku,
          prod.description,
          prod.quantity,
          prod.unit_price,
          prod.cost_price,
          prod.reorder_level,
        ]
      );
      console.log(
        `✓ Product created: ${prod.name} (${prod.sku}) - Qty: ${prod.quantity}, Price: $${prod.unit_price}`
      );
    }

    console.log("\n✅ Product seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
};

seed();
