import pool from "../config/db.js";

const DEFAULT_PAGE_SIZE = 10;

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const normalizeReportFilters = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE, 1), 100);

  return {
    startDate: query.startDate || query.start_date || "",
    endDate: query.endDate || query.end_date || "",
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const buildPagination = (totalRows, page, limit) => {
  const totalPages = Math.max(Math.ceil(totalRows / limit), 1);

  return {
    page,
    limit,
    totalRows,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
};

const addDateFilters = ({ clauses, values, columnName, startDate, endDate }) => {
  // Date values are always parameterized so report filters cannot inject SQL.
  if (startDate) {
    values.push(startDate);
    clauses.push(`${columnName}::date >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    clauses.push(`${columnName}::date <= $${values.length}`);
  }
};

const addSalespersonFilter = ({ clauses, values, user }) => {
  // Salespeople only see sales data that belongs to their own user account.
  if (user?.role === "SALESPERSON") {
    values.push(user.id);
    clauses.push(`sales.user_id = $${values.length}`);
  }
};

const addSearchFilter = ({ clauses, values, filters, allowedFields = [] }) => {
  // Add a parameterized search clause depending on which fields are available
  const q = filters.search?.trim();
  if (!q) return;

  const like = `%${q}%`;
  const parts = [];

  if (allowedFields.includes("customers")) {
    values.push(like);
    parts.push(`customers.name ILIKE $${values.length}`);
  }

  if (allowedFields.includes("users")) {
    values.push(like);
    parts.push(`users.name ILIKE $${values.length}`);
  }

  if (allowedFields.includes("sales")) {
    values.push(q);
    parts.push(`sales.id::text = $${values.length}`);
  }

  if (allowedFields.includes("products")) {
    values.push(like);
    parts.push(`products.name ILIKE $${values.length}`);
    values.push(like);
    parts.push(`products.sku ILIKE $${values.length}`);
  }

  if (parts.length) {
    clauses.push(`(${parts.join(" OR ")})`);
  }
};

const whereSql = (clauses) => (clauses.length ? `WHERE ${clauses.join(" AND ")}` : "");

export const getSalesReport = async ({ filters, user, exportAll = false }) => {
  const clauses = [];
  const values = [];

  addDateFilters({
    clauses,
    values,
    columnName: "sales.created_at",
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  addSalespersonFilter({ clauses, values, user });
  // Apply search across customer name, salesperson name, or exact sale id
  addSearchFilter({ clauses, values, filters, allowedFields: ["customers", "users", "sales"] });

  const whereClause = whereSql(clauses);

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total_rows
     FROM sales
     ${whereClause}`,
    values
  );

  const summaryResult = await pool.query(
    `SELECT
       COUNT(sales.id)::int AS total_sales,
       COALESCE(SUM(sales.total_amount), 0)::numeric AS total_revenue,
       COALESCE(AVG(sales.total_amount), 0)::numeric AS average_sale,
       COALESCE(SUM(item_totals.item_count), 0)::int AS total_items
     FROM sales
     LEFT JOIN (
       SELECT sale_id, SUM(quantity)::int AS item_count
       FROM sale_items
       GROUP BY sale_id
     ) item_totals ON item_totals.sale_id = sales.id
     ${whereClause}`,
    values
  );

  const chartResult = await pool.query(
    `SELECT
       sales.created_at::date AS label,
       COALESCE(SUM(sales.total_amount), 0)::numeric AS value
     FROM sales
     ${whereClause}
     GROUP BY sales.created_at::date
     ORDER BY label ASC`,
    values
  );

  const dataValues = [...values];
  const limitSql = exportAll ? "" : `LIMIT $${dataValues.length + 1} OFFSET $${dataValues.length + 2}`;
  if (!exportAll) {
    dataValues.push(filters.limit, filters.offset);
  }

  const rowsResult = await pool.query(
    `SELECT
       sales.id,
       sales.total_amount,
       sales.status,
       sales.created_at,
       customers.name AS customer_name,
       users.name AS salesperson_name,
       COALESCE(item_totals.item_count, 0)::int AS item_count
     FROM sales
     JOIN customers ON customers.id = sales.customer_id
     LEFT JOIN users ON users.id = sales.user_id
     LEFT JOIN (
       SELECT sale_id, SUM(quantity)::int AS item_count
       FROM sale_items
       GROUP BY sale_id
     ) item_totals ON item_totals.sale_id = sales.id
     ${whereClause}
     ORDER BY sales.created_at DESC
     ${limitSql}`,
    dataValues
  );

  return {
    rows: rowsResult.rows,
    summary: {
      totalSales: toNumber(summaryResult.rows[0].total_sales),
      totalRevenue: toNumber(summaryResult.rows[0].total_revenue),
      averageSale: toNumber(summaryResult.rows[0].average_sale),
      totalItems: toNumber(summaryResult.rows[0].total_items),
    },
    chart: chartResult.rows.map((row) => ({
      label: new Date(row.label).toISOString().slice(0, 10),
      value: toNumber(row.value),
    })),
    pagination: buildPagination(countResult.rows[0].total_rows, filters.page, filters.limit),
  };
};

export const getInventoryReport = async ({ filters, user, exportAll = false }) => {
  const clauses = [];
  const values = [];

  addDateFilters({
    clauses,
    values,
    columnName: "stock_movements.created_at",
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  if (user?.role === "SALESPERSON") {
    values.push(user.id);
    clauses.push(`stock_movements.user_id = $${values.length}`);
  }

  const whereClause = whereSql(clauses);

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total_rows
     FROM stock_movements
     ${whereClause}`,
    values
  );

  const summaryResult = await pool.query(
    `SELECT
       COUNT(*)::int AS movement_count,
       COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'IN'), 0)::int AS stock_in,
       COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'OUT'), 0)::int AS stock_out
     FROM stock_movements
     ${whereClause}`,
    values
  );

  const productSummaryResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total_products,
       COUNT(*) FILTER (WHERE quantity <= reorder_level AND quantity > 0)::int AS low_stock,
       COUNT(*) FILTER (WHERE quantity = 0)::int AS out_of_stock,
       COALESCE(SUM(quantity * cost_price), 0)::numeric AS stock_value
     FROM products`
  );

  const chartResult = await pool.query(
    `SELECT movement_type AS label, COALESCE(SUM(quantity), 0)::int AS value
     FROM stock_movements
     ${whereClause}
     GROUP BY movement_type
     ORDER BY movement_type ASC`,
    values
  );

  const dataValues = [...values];
  const limitSql = exportAll ? "" : `LIMIT $${dataValues.length + 1} OFFSET $${dataValues.length + 2}`;
  if (!exportAll) {
    dataValues.push(filters.limit, filters.offset);
  }

  const rowsResult = await pool.query(
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
       users.name AS recorded_by
     FROM stock_movements
     JOIN products ON products.id = stock_movements.product_id
     LEFT JOIN users ON users.id = stock_movements.user_id
     ${whereClause}
     ORDER BY stock_movements.created_at DESC
     ${limitSql}`,
    dataValues
  );

  const productSummary = productSummaryResult.rows[0];

  return {
    rows: rowsResult.rows,
    summary: {
      movementCount: toNumber(summaryResult.rows[0].movement_count),
      stockIn: toNumber(summaryResult.rows[0].stock_in),
      stockOut: toNumber(summaryResult.rows[0].stock_out),
      totalProducts: toNumber(productSummary.total_products),
      lowStock: toNumber(productSummary.low_stock),
      outOfStock: toNumber(productSummary.out_of_stock),
      stockValue: toNumber(productSummary.stock_value),
    },
    chart: chartResult.rows.map((row) => ({ label: row.label, value: toNumber(row.value) })),
    pagination: buildPagination(countResult.rows[0].total_rows, filters.page, filters.limit),
  };
};

export const getProductReport = async ({ filters, user, exportAll = false }) => {
  const saleClauses = [];
  const saleValues = [];

  addDateFilters({
    clauses: saleClauses,
    values: saleValues,
    columnName: "sales.created_at",
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  addSalespersonFilter({ clauses: saleClauses, values: saleValues, user });

  const salesJoinFilter = saleClauses.length ? `AND ${saleClauses.join(" AND ")}` : "";

  const countResult = await pool.query("SELECT COUNT(*)::int AS total_rows FROM products");

  const summaryResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total_products,
       COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_products,
       COUNT(*) FILTER (WHERE quantity <= reorder_level AND quantity > 0)::int AS low_stock,
       COUNT(*) FILTER (WHERE quantity = 0)::int AS out_of_stock,
       COALESCE(SUM(quantity * unit_price), 0)::numeric AS retail_value
     FROM products`
  );

  const chartResult = await pool.query(
    `SELECT
       products.name AS label,
       COALESCE(SUM(sale_items.quantity), 0)::int AS value
     FROM products
     LEFT JOIN sale_items ON sale_items.product_id = products.id
     LEFT JOIN sales ON sales.id = sale_items.sale_id ${salesJoinFilter}
     GROUP BY products.id, products.name
     ORDER BY value DESC, products.name ASC
     LIMIT 10`,
    saleValues
  );

  let dataValues = [...saleValues];

  // If a product search is provided, add product name/sku match when selecting products
  const productSearch = filters.search?.trim();
  let productWhere = "";
  if (productSearch) {
    // productWhere uses parameter indexes relative to dataValues
    productWhere = `WHERE (products.name ILIKE $${dataValues.length + 1} OR products.sku ILIKE $${dataValues.length + 2})`;
    dataValues.push(`%${productSearch}%`, `%${productSearch}%`);
  }

  const limitSql = exportAll ? "" : `LIMIT $${dataValues.length + 1} OFFSET $${dataValues.length + 2}`;
  if (!exportAll) {
    dataValues.push(filters.limit, filters.offset);
  }

  const rowsResult = await pool.query(
    `SELECT
       products.id,
       products.name,
       products.sku,
       products.quantity,
       products.unit_price,
       products.cost_price,
       products.reorder_level,
       products.is_active,
       categories.name AS category_name,
       COALESCE(SUM(sale_items.quantity), 0)::int AS units_sold,
       COALESCE(SUM(sale_items.total_price), 0)::numeric AS sales_value
     FROM products
     LEFT JOIN categories ON categories.id = products.category_id
     LEFT JOIN sale_items ON sale_items.product_id = products.id
     LEFT JOIN sales ON sales.id = sale_items.sale_id ${salesJoinFilter}
     ${productWhere}
     GROUP BY products.id, categories.name
     ORDER BY products.name ASC
     ${limitSql}`,
    dataValues
  );
  return {
    rows: rowsResult.rows,
    summary: {
      totalProducts: toNumber(summaryResult.rows[0].total_products),
      activeProducts: toNumber(summaryResult.rows[0].active_products),
      lowStock: toNumber(summaryResult.rows[0].low_stock),
      outOfStock: toNumber(summaryResult.rows[0].out_of_stock),
      retailValue: toNumber(summaryResult.rows[0].retail_value),
    },
    chart: chartResult.rows.map((row) => ({ label: row.label, value: toNumber(row.value) })),
    pagination: buildPagination(countResult.rows[0].total_rows, filters.page, filters.limit),
  };
};

  
export const getCustomerReport = async ({ filters, user, exportAll = false }) => {
  const saleClauses = [];
  const saleValues = [];

  addDateFilters({
    clauses: saleClauses,
    values: saleValues,
    columnName: "sales.created_at",
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  addSalespersonFilter({ clauses: saleClauses, values: saleValues, user });

  const salesJoinFilter = saleClauses.length ? `AND ${saleClauses.join(" AND ")}` : "";
  const customerVisibilityWhere = user?.role === "SALESPERSON" ? "WHERE sales.id IS NOT NULL" : "";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total_rows
     FROM (
       SELECT customers.id
       FROM customers
       LEFT JOIN sales ON sales.customer_id = customers.id ${salesJoinFilter}
       ${customerVisibilityWhere}
       GROUP BY customers.id
     ) counted_customers`,
    saleValues
  );

  const summaryResult = await pool.query(
    `SELECT
       COUNT(DISTINCT customers.id)::int AS total_customers,
       COUNT(DISTINCT customers.id) FILTER (WHERE customers.is_active = TRUE)::int AS active_customers,
       COUNT(sales.id)::int AS total_orders,
       COALESCE(SUM(sales.total_amount), 0)::numeric AS customer_revenue
     FROM customers
     LEFT JOIN sales ON sales.customer_id = customers.id ${salesJoinFilter}
     ${customerVisibilityWhere}`,
    saleValues
  );

  const chartResult = await pool.query(
    `SELECT
       customers.name AS label,
       COALESCE(SUM(sales.total_amount), 0)::numeric AS value
     FROM customers
     LEFT JOIN sales ON sales.customer_id = customers.id ${salesJoinFilter}
     ${customerVisibilityWhere}
     GROUP BY customers.id, customers.name
     ORDER BY value DESC, customers.name ASC
     LIMIT 10`,
    saleValues
  );

  const dataValues = [...saleValues];
  const limitSql = exportAll ? "" : `LIMIT $${dataValues.length + 1} OFFSET $${dataValues.length + 2}`;
  if (!exportAll) {
    dataValues.push(filters.limit, filters.offset);
  }

  const rowsResult = await pool.query(
    `SELECT
       customers.id,
       customers.name,
       customers.email,
       customers.phone,
       customers.is_active,
       COUNT(sales.id)::int AS order_count,
       COALESCE(SUM(sales.total_amount), 0)::numeric AS total_spent,
       MAX(sales.created_at) AS last_purchase_at
     FROM customers
     LEFT JOIN sales ON sales.customer_id = customers.id ${salesJoinFilter}
     ${customerVisibilityWhere}
     GROUP BY customers.id
     ORDER BY total_spent DESC, customers.name ASC
     ${limitSql}`,
    dataValues
  );

  return {
    rows: rowsResult.rows,
    summary: {
      totalCustomers: toNumber(summaryResult.rows[0].total_customers),
      activeCustomers: toNumber(summaryResult.rows[0].active_customers),
      totalOrders: toNumber(summaryResult.rows[0].total_orders),
      customerRevenue: toNumber(summaryResult.rows[0].customer_revenue),
    },
    chart: chartResult.rows.map((row) => ({ label: row.label, value: toNumber(row.value) })),
    pagination: buildPagination(countResult.rows[0].total_rows, filters.page, filters.limit),
  };
};
