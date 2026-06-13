import ActivityLog from "../models/ActivityLog.js";

export const listActivity = async (req, res) => {
  try {
    const activities = await ActivityLog.findAll();

    return res.render("activity/index", {
      title: "Activity Log",
      activities,
    });
  } catch (error) {
    console.error("List activity error:", error.message);
    req.flash("error", "Unable to load activity log.");
    return res.redirect("/");
  }
};
