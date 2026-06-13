import pool from "../config/db.js";
import Product from "../models/Product.js";

const tableExists = async (tableName) => {
  const result = await pool.query("SELECT to_regclass($1) AS table_name", [
    `public.${tableName}`,
  ]);

  return Boolean(result.rows[0].table_name);
};

const countRows = async (tableName, whereClause = "", values = []) => {
  if (!(await tableExists(tableName))) {
    return 0;
  }

  const result = await pool.query(
    `SELECT COUNT(*)::int AS total FROM ${tableName} ${whereClause}`,
    values
  );

  return result.rows[0].total;
};

const columnExists = async (tableName, columnName) => {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );

  return result.rowCount > 0;
};

const getInventorySummary = async () => {
  const productsExist = await tableExists("products");

  if (!productsExist) {
    return {
      totalProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
    };
  }

  if (!(await columnExists("products", "quantity"))) {
    return {
      totalProducts: await countRows("products"),
      lowStockProducts: 0,
      outOfStockProducts: 0,
    };
  }

  const result = await pool.query(`
    SELECT
      COUNT(*)::int AS total_products,
      COUNT(*) FILTER (WHERE quantity > 0 AND quantity <= 5)::int AS low_stock_products,
      COUNT(*) FILTER (WHERE quantity = 0)::int AS out_of_stock_products
    FROM products
  `);

  return {
    totalProducts: result.rows[0].total_products,
    lowStockProducts: result.rows[0].low_stock_products,
    outOfStockProducts: result.rows[0].out_of_stock_products,
  };
};

export const showDashboard = async (req, res) => {
  const { role, id } = req.session.user;

  try {
    if (role === "CEO") {
      const totalSales = (await tableExists("sales"))
        ? await countRows("sales")
        : 0;
      const totalActivities = (await tableExists("activity_logs"))
        ? await countRows("activity_logs")
        : 0;

      return res.render("dashboards/ceo", {
        title: "CEO Dashboard",
        totalProducts: await countRows("products"),
        totalSales,
        totalUsers: await countRows("users"),
        totalActivities,
      });
    }

    if (role === "MANAGER") {
      const activityCount = (await tableExists("activity_logs"))
        ? await countRows("activity_logs")
        : 0;

      return res.render("dashboards/manager", {
        title: "Manager Dashboard",
        inventory: await getInventorySummary(),
        activityCount,
      });
    }

    if (role === "SALESPERSON") {
      const mySales = (await columnExists("sales", "user_id"))
        ? await countRows("sales", "WHERE user_id = $1", [id])
        : 0;

      const products = await Product.findAvailable();

      return res.render("dashboards/salesperson", {
        title: "Salesperson Dashboard",
        mySales,
        products,
      });
    }

    return res.status(403).render("errors/403", { title: "Access denied" });
  } catch (error) {
    console.error("Dashboard error:", error.message);
    req.flash("error", "Unable to load dashboard.");
    return res.redirect("/auth/login");
  }
};
