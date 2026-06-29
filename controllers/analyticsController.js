import pool from "../config/db.js";
import * as reportService from "../services/reportService.js";
import ReportLog from "../models/ReportLog.js";
import { computeRange, formatRangeLabel } from "../utils/dateRange.js";

// Convert rows (array of objects) to CSV string
const rowsToCsv = (rows) => {
  if (!rows || !rows.length) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.join(",") + "\n";
  const lines = rows.map((r) => keys.map((k) => {
    const v = r[k] === null || r[k] === undefined ? "" : String(r[k]);
    return `"${v.replace(/"/g, '""')}"`;
  }).join(","));
  return header + lines.join("\n");
};

export const showAnalytics = async (req, res) => {
  try {
    const type = req.query.type || "sales";
    const period = req.query.period || "month";
    const refDate = req.query.refDate || new Date().toISOString().slice(0, 10);
    const { start, end } = req.query.startDate && req.query.endDate
      ? { start: req.query.startDate, end: req.query.endDate }
      : computeRange(period, refDate);

    const filters = reportService.normalizeReportFilters({
      startDate: start,
      endDate: end,
      page: req.query.page || 1,
      limit: req.query.limit || 25,
      search: req.query.search || "",
    });

    // Role-based data visibility enforced at service level (salesperson filter)
    let data;
    if (type === "sales") {
      data = await reportService.getSalesReport({ filters, user: req.session.user, exportAll: false });
    } else if (type === "inventory") {
      data = await reportService.getInventoryReport({ filters, user: req.session.user, exportAll: false });
    } else if (type === "customers") {
      data = await reportService.getCustomerReport({ filters, user: req.session.user, exportAll: false });
    } else if (type === "procurement") {
      // Procurement derived from stock_movements where reason = 'PURCHASE' or movement_type = 'IN'
      const clauses = [];
      const values = [];
      if (filters.startDate) {
        values.push(filters.startDate);
        clauses.push(`stock_movements.created_at::date >= $${values.length}`);
      }
      if (filters.endDate) {
        values.push(filters.endDate);
        clauses.push(`stock_movements.created_at::date <= $${values.length}`);
      }
      clauses.push(`stock_movements.reason = 'PURCHASE'`);
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const rowsRes = await pool.query(
        `SELECT
           stock_movements.id,
           stock_movements.product_id,
           products.name AS product_name,
           stock_movements.quantity,
           stock_movements.created_at,
           users.name AS recorded_by
         FROM stock_movements
         LEFT JOIN products ON products.id = stock_movements.product_id
         LEFT JOIN users ON users.id = stock_movements.user_id
         ${where}
         ORDER BY stock_movements.created_at DESC
         LIMIT $${values.length + 1}`,
        [...values, filters.limit]
      );

      data = { rows: rowsRes.rows, summary: {}, chart: [], pagination: { page: filters.page, limit: filters.limit, totalRows: rowsRes.rowCount, totalPages: 1 } };
    } else if (type === "performance") {
      // Performance: sales aggregated by user
      const clauses = [];
      const values = [];
      if (filters.startDate) { values.push(filters.startDate); clauses.push(`sales.created_at::date >= $${values.length}`); }
      if (filters.endDate) { values.push(filters.endDate); clauses.push(`sales.created_at::date <= $${values.length}`); }

      // Manager and CEO access only
      if (req.session.user.role === "SALESPERSON") {
        return res.status(403).render("errors/403", { title: "Access denied" });
      }

      const perf = await pool.query(
        `SELECT users.id, users.name, COUNT(sales.id)::int AS sales_count, COALESCE(SUM(sales.total_amount),0)::numeric AS revenue
         FROM users
         LEFT JOIN sales ON sales.user_id = users.id ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
         GROUP BY users.id, users.name
         ORDER BY revenue DESC`,
        values
      );

      data = { rows: perf.rows, summary: {}, chart: perf.rows.map(r => ({ label: r.name, value: Number(r.revenue) })), pagination: { page: 1, limit: perf.rowCount, totalRows: perf.rowCount, totalPages: 1 } };
    } else {
      data = { rows: [], summary: {}, chart: [], pagination: {} };
    }

    // Log report generation
    try {
      await ReportLog.create({ reportType: type, generatedBy: req.session.user?.id || null, params: { start: filters.startDate, end: filters.endDate, search: filters.search } });
    } catch (e) {
      // non-fatal
      console.error("Report log error:", e.message);
    }

    return res.render("analytics/index", {
      title: "Analytics",
      type,
      period,
      refDate,
      rangeLabel: formatRangeLabel(period, start, end),
      filters,
      rows: data.rows,
      summary: data.summary,
      chart: data.chart,
      pagination: data.pagination,
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    req.flash("error", "Unable to load analytics.");
    return res.redirect("/");
  }
};

export const exportCsv = async (req, res) => {
  try {
    const type = req.query.type || "sales";
    const period = req.query.period || "month";
    const { start, end } = req.query.startDate && req.query.endDate
      ? { start: req.query.startDate, end: req.query.endDate }
      : computeRange(period, req.query.refDate);

    const filters = reportService.normalizeReportFilters({ startDate: start, endDate: end, page: 1, limit: 10000, search: req.query.search || "" });

    let data;
    if (type === "sales") {
      data = await reportService.getSalesReport({ filters, user: req.session.user, exportAll: true });
    } else if (type === "inventory") {
      data = await reportService.getInventoryReport({ filters, user: req.session.user, exportAll: true });
    } else if (type === "customers") {
      data = await reportService.getCustomerReport({ filters, user: req.session.user, exportAll: true });
    } else {
      data = { rows: [] };
    }

    const csv = rowsToCsv(data.rows);
    res.setHeader("Content-Disposition", `attachment; filename="${type}-report.csv"`);
    res.setHeader("Content-Type", "text/csv;charset=utf-8");
    return res.send(csv);
  } catch (error) {
    console.error("Export CSV error:", error.message);
    return res.status(500).send("Unable to export CSV");
  }
};

export const exportPdf = async (req, res) => {
  // PDF export uses Puppeteer. If not installed, inform the user.
  try {
    const puppeteer = await import('puppeteer');
    // Generate HTML by calling showAnalytics logic quickly
    // For simplicity, render the analytics page HTML and convert to PDF
    const type = req.query.type || 'sales';
    const period = req.query.period || 'month';
    const { start, end } = req.query.startDate && req.query.endDate
      ? { start: req.query.startDate, end: req.query.endDate }
      : computeRange(period, req.query.refDate);

    const filters = reportService.normalizeReportFilters({ startDate: start, endDate: end, page: 1, limit: 10000, search: req.query.search || '' });
    const data = await reportService.getSalesReport({ filters, user: req.session.user, exportAll: true });

    // Render HTML using view engine
    const html = await new Promise((resolve, reject) => {
      req.app.render(
        'analytics/index',
        {
          title: 'Analytics PDF',
          type,
          filters,
          rows: data.rows,
          summary: data.summary,
          chart: data.chart,
          currentUser: req.session.user,
        },
        (err, out) => {
          if (err) return reject(err);
          resolve(out);
        }
      );
    });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF export error:', err.message);
    return res.status(501).send('PDF export requires Puppeteer. Install it with `npm install puppeteer` on the server to enable PDF export.');
  }
};

export default { showAnalytics, exportCsv, exportPdf };
