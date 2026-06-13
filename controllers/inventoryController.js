import Inventory from "../models/Inventory.js";
import ActivityLog from "../models/ActivityLog.js";

export const showInventory = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";

    return res.render("inventory/index", {
      title: "Inventory",
      inventory: await Inventory.getInventory(search),
      lowStockProducts: await Inventory.getLowStockProducts(),
      search,
    });
  } catch (error) {
    console.error("Inventory error:", error.message);
    req.flash("error", "Unable to load inventory.");
    return res.redirect("/");
  }
};

export const stockIn = async (req, res) => {
  return recordStockMovement(req, res, "IN");
};

export const stockOut = async (req, res) => {
  return recordStockMovement(req, res, "OUT");
};

export const showHistory = async (req, res) => {
  try {
    return res.render("inventory/history", {
      title: "Inventory History",
      movements: await Inventory.getMovements(),
    });
  } catch (error) {
    console.error("Inventory history error:", error.message);
    req.flash("error", "Unable to load inventory history.");
    return res.redirect("/inventory");
  }
};

const recordStockMovement = async (req, res, movementType) => {
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    req.flash("error", "Quantity must be greater than zero.");
    return res.redirect("/inventory");
  }

  try {
    await Inventory.recordMovement({
      productId: req.params.productId,
      userId: req.session.user.id,
      movementType,
      quantity,
      reason: req.body.reason?.trim(),
      notes: req.body.notes?.trim(),
    });

    await ActivityLog.create({
      userId: req.session.user.id,
      role: req.session.user.role,
      action: movementType === "IN" ? "STOCK_IN" : "STOCK_OUT",
      description: `${req.session.user.name} recorded stock ${movementType === "IN" ? "in" : "out"} for product #${req.params.productId}`,
      entityType: "product",
      entityId: Number(req.params.productId),
    });

    req.flash("success", `Stock ${movementType === "IN" ? "in" : "out"} recorded.`);
  } catch (error) {
    console.error("Stock movement error:", error.message);
    req.flash("error", error.message);
  }

  return res.redirect("/inventory");
};
