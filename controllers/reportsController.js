import * as reportService from "../services/reportService.js";
import { computeRange, formatRangeLabel } from "../utils/dateRange.js";

export const showReport = async (req, res) => {
  try {
    const period = req.query.period || "month";
    const refDate = req.query.refDate || new Date().toISOString().slice(0, 10);
    const { startDate, endDate, page = 1, limit = 25 } = req.query;

    let range = { start: startDate || "", end: endDate || "" };
    if (!startDate && !endDate) {
      range = computeRange(period, refDate);
    }

    const filters = reportService.normalizeReportFilters({
      startDate: range.start,
      endDate: range.end,
      page,
      limit,
    });

    const data = await reportService.getProductReport({
      filters,
      user: req.session.user,
      exportAll: false,
    });

    const periodRevenue = data.rows.reduce(
      (sum, row) => sum + Number(row.sales_value || 0),
      0
    );
    const periodUnits = data.rows.reduce(
      (sum, row) => sum + Number(row.units_sold || 0),
      0
    );
    const productsSold = data.rows.filter((row) => Number(row.units_sold || 0) > 0).length;

    return res.render("reports/index", {
      title: "Sales Reports",
      period,
      refDate,
      startDate: filters.startDate,
      endDate: filters.endDate,
      rangeLabel: formatRangeLabel(period, range.start, range.end),
      rows: data.rows,
      summary: data.summary,
      pagination: data.pagination,
      periodStats: {
        revenue: periodRevenue,
        units: periodUnits,
        productsSold,
      },
    });
  } catch (error) {
    console.error("Reports error:", error.message);
    req.flash("error", "Unable to load reports. Please try again.");
    return res.redirect("/");
  }
};

export default { showReport };
