import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import ActivityLog from "../models/ActivityLog.js";

export const searchCustomers = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit) || 10, 20);
    const customers = await Customer.searchActive(query, limit);

    return res.json({ customers });
  } catch (error) {
    console.error("Search customers error:", error.message);
    return res.status(500).json({ error: "Unable to search customers." });
  }
};

export const quickAddCustomer = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const phone = req.body.phone?.trim() || null;

    if (!name) {
      return res.status(400).json({ error: "Customer name is required." });
    }

    const customer = await Customer.create({ name, phone, is_active: true });

    await ActivityLog.create({
      userId: req.session.user.id,
      role: req.session.user.role,
      action: "CREATE_CUSTOMER",
      description: `${req.session.user.name} quick-added customer ${customer.name}`,
      entityType: "customer",
      entityId: customer.id,
    });

    return res.status(201).json({ customer });
  } catch (error) {
    console.error("Quick add customer error:", error.message);
    return res.status(400).json({ error: error.message || "Unable to add customer." });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const limit = Math.min(Number(req.query.limit) || 24, 50);

    let products = await Product.searchAvailable(query, limit);

    if (category) {
      products = products.filter(
        (product) => product.category_name?.toLowerCase() === category.toLowerCase()
      );
    }

    return res.json({ products });
  } catch (error) {
    console.error("Search products error:", error.message);
    return res.status(500).json({ error: "Unable to search products." });
  }
};

export const getRecentCustomers = async (req, res) => {
  try {
    const customers = await Sale.findRecentCustomers(req.session.user.id, 6);
    return res.json({ customers });
  } catch (error) {
    console.error("Recent customers error:", error.message);
    return res.status(500).json({ error: "Unable to load recent customers." });
  }
};
