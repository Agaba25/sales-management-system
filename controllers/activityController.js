import ActivityLog from "../models/ActivityLog.js";
import { computeRange, formatRangeLabel, groupByCalendarDate } from "../utils/dateRange.js";

const countForPeriod = (period, refDate) => {
  const { start, end } = computeRange(period, refDate || undefined);
  return ActivityLog.countInRange(start, end);
};

export const listActivity = async (req, res) => {
  try {
    const period = req.query.period || "week";
    const refDate = req.query.refDate || "";
    const action = req.query.action || "";
    const role = req.query.role || "";
    const search = req.query.search || "";

    const { start, end } = computeRange(period, refDate || undefined);

    const [activities, actions, countToday, countWeek, countMonth] = await Promise.all([
      ActivityLog.findFiltered({ start, end, action, role, search }),
      ActivityLog.listActions(),
      countForPeriod("day", refDate),
      countForPeriod("week", refDate),
      countForPeriod("month", refDate),
    ]);

    const groupedActivities = groupByCalendarDate(activities);

    return res.render("activity/index", {
      title: "Activity Log",
      activities,
      groupedActivities,
      period,
      refDate: refDate || new Date().toISOString().slice(0, 10),
      action,
      role,
      search,
      actions,
      rangeLabel: formatRangeLabel(period, start, end),
      periodCounts: { day: countToday, week: countWeek, month: countMonth },
    });
  } catch (error) {
    console.error("List activity error:", error.message);
    req.flash("error", "Unable to load activity log.");
    return res.redirect("/");
  }
};
