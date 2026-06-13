import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import ActivityLog from "../models/ActivityLog.js";

const parseSaleItems = (body) => {
  const productIds = Array.isArray(body.product_id)
    ? body.product_id
    : [body.product_id];
  const quantities = Array.isArray(body.quantity)
    ? body.quantity
    : [body.quantity];

  const items = [];

  for (let index = 0; index < productIds.length; index += 1) {
    const productId = productIds[index];
    const quantity = Number(quantities[index]);

    if (!productId || !quantity || quantity <= 0) {
      continue;
    }

    items.push({
      productId,
      quantity,
    });
  }

  return items;
};

export const listSales = async (req, res) => {
  try {
    const userId = req.session.user.role === "SALESPERSON" ? req.session.user.id : null;
    const sales = await Sale.findAll(userId);

    return res.render("sales/index", {
      title: "Sales",
      sales,
    });
  } catch (error) {
    console.error("List sales error:", error.message);
    req.flash("error", "Unable to load sales.");
    return res.redirect("/");
  }
};

export const showNewSale = async (req, res) => {
  try {
    const [customers, products] = await Promise.all([
      Customer.findActive(),
      Product.findAvailable(),
    ]);

    return res.render("sales/new", {
      title: "New Sale",
      customers,
      products,
    });
  } catch (error) {
    console.error("Show new sale error:", error.message);
    req.flash("error", "Unable to load sale form.");
    return res.redirect("/sales");
  }
};

export const createSale = async (req, res) => {
  try {
    const customerId = Number(req.body.customer_id);
    const items = parseSaleItems(req.body);

    if (!customerId) {
      req.flash("error", "Please select a customer.");
      return res.redirect("/sales/new");
    }

    const customer = await Customer.findById(customerId);
    if (!customer || !customer.is_active) {
      req.flash("error", "Selected customer is not active.");
      return res.redirect("/sales/new");
    }

    if (items.length === 0) {
      req.flash("error", "Please add at least one product to the sale.");
      return res.redirect("/sales/new");
    }

    const saleResult = await Sale.create({
      customerId,
      userId: req.session.user.id,
      items,
    });

    await ActivityLog.create({
      userId: req.session.user.id,
      role: req.session.user.role,
      action: "CREATE_SALE",
      description: `Sale #${saleResult.id} created for customer #${customerId} by ${req.session.user.name}`,
      entityType: "sale",
      entityId: saleResult.id,
    });

    req.flash("success", "Sale saved successfully.");
    return res.redirect(`/sales/${saleResult.id}/receipt`);
  } catch (error) {
    console.error("Create sale error:", error.message);
    req.flash("error", error.message || "Unable to save sale.");
    return res.redirect("/sales/new");
  }
};

export const showReceipt = async (req, res) => {
  try {
    const data = await Sale.findByIdWithItems(req.params.id);

    if (!data) {
      req.flash("error", "Sale not found.");
      return res.redirect("/sales");
    }

    const { sale, items } = data;

    if (req.session.user.role === "SALESPERSON" && sale.user_id !== req.session.user.id) {
      return res.status(403).render("errors/403", { title: "Access denied" });
    }

    return res.render("sales/receipt", {
      title: "Sale Receipt",
      sale,
      items,
    });
  } catch (error) {
    console.error("Show receipt error:", error.message);
    req.flash("error", "Unable to load receipt.");
    return res.redirect("/sales");
  }
};
