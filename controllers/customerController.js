import Customer from "../models/Customer.js";
import ActivityLog from "../models/ActivityLog.js";

const customerPayload = (body) => ({
  name: body.name?.trim(),
  email: body.email?.trim() || null,
  phone: body.phone?.trim() || null,
  address: body.address?.trim() || null,
  is_active: body.is_active === "on",
});

export const listCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll();

    return res.render("customers/index", {
      title: "Customers",
      customers,
    });
  } catch (error) {
    console.error("List customers error:", error.message);
    req.flash("error", "Unable to load customers.");
    return res.redirect("/");
  }
};

export const showAddCustomer = (req, res) => {
  return res.render("customers/form", {
    title: "Add Customer",
    customer: {},
    action: "/customers",
  });
};

export const addCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(customerPayload(req.body));
    await ActivityLog.create({
      userId: req.session.user.id,
      role: req.session.user.role,
      action: "CREATE_CUSTOMER",
      description: `${req.session.user.name} created customer ${customer.name}`,
      entityType: "customer",
      entityId: customer.id,
    });

    req.flash("success", "Customer added successfully.");
    return res.redirect("/customers");
  } catch (error) {
    console.error("Add customer error:", error.message);
    req.flash("error", error.message || "Unable to add customer.");
    return res.redirect("/customers/new");
  }
};

export const showEditCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      req.flash("error", "Customer not found.");
      return res.redirect("/customers");
    }

    return res.render("customers/form", {
      title: "Edit Customer",
      customer,
      action: `/customers/${customer.id}/edit`,
    });
  } catch (error) {
    console.error("Show edit customer error:", error.message);
    req.flash("error", "Unable to load customer.");
    return res.redirect("/customers");
  }
};

export const editCustomer = async (req, res) => {
  try {
    const customer = await Customer.update(req.params.id, customerPayload(req.body));

    if (!customer) {
      req.flash("error", "Customer not found.");
      return res.redirect("/customers");
    }

    req.flash("success", "Customer updated successfully.");
    await ActivityLog.create({
      userId: req.session.user.id,
      role: req.session.user.role,
      action: "UPDATE_CUSTOMER",
      description: `${req.session.user.name} updated customer ${customer.name}`,
      entityType: "customer",
      entityId: customer.id,
    });

    return res.redirect("/customers");
  } catch (error) {
    console.error("Edit customer error:", error.message);
    req.flash("error", error.message || "Unable to update customer.");
    return res.redirect(`/customers/${req.params.id}/edit`);
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    await Customer.delete(req.params.id);
    if (customer) {
      await ActivityLog.create({
        userId: req.session.user.id,
        role: req.session.user.role,
        action: "DELETE_CUSTOMER",
        description: `${req.session.user.name} deleted customer ${customer.name}`,
        entityType: "customer",
        entityId: customer.id,
      });
    }

    req.flash("success", "Customer deleted successfully.");
  } catch (error) {
    console.error("Delete customer error:", error.message);
    req.flash("error", "Unable to delete customer.");
  }

  return res.redirect("/customers");
};
