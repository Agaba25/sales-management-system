import * as reportService from "../services/reportService.js";

/**
 * Reports controller
 * - summary view shows aggregated product sales for a period
 * - supports query params: period=day|week|month or startDate/endDate
 */

// Helper to compute start/end timestamps for period
const computeRange = (period, refDateStr) => {
  const ref = refDateStr ? new Date(refDateStr) : new Date();
  ref.setHours(0, 0, 0, 0);

  if (period === "day") {
    const start = new Date(ref);
    const end = new Date(ref);
    end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (period === "week") {
    const day = (ref.getDay() + 6) % 7; // 0=Monday
    const start = new Date(ref);
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // month
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const showReport = async (req, res) => {
  try {
    const { period = "month", startDate, endDate, page = 1, limit = 25 } = req.query;

    let range = { start: startDate || "", end: endDate || "" };
    if (!startDate && !endDate) {
      range = computeRange(period, req.query.refDate);
    }

    const filters = reportService.normalizeReportFilters({
      startDate: range.start,
      endDate: range.end,
      page,
      limit,
    });

    // Use product report which includes units_sold and sales_value
    const data = await reportService.getProductReport({ filters, user: req.session.user, exportAll: false });

    return res.render("reports/index", {
      title: "Sales Reports",
      period,
      startDate: filters.startDate,
      endDate: filters.endDate,
      rows: data.rows,
      summary: data.summary,
      pagination: data.pagination,
    });
  } catch (error) {
    console.error("Reports error:", error.message);
    req.flash("error", "Unable to load reports. Please try again.");
    return res.redirect("/");
  }
};

export default { showReport };