import Product from "../models/Product.js";
import ActivityLog from "../models/ActivityLog.js";

const productPayload = (body) => ({
  category_id: body.category_id || null,
  name: body.name?.trim(),
  sku: body.sku?.trim(),
  description: body.description?.trim(),
  quantity: Number(body.quantity) || 0,
  unit_price: Number(body.unit_price) || 0,
  cost_price: Number(body.cost_price) || 0,
  reorder_level: Number(body.reorder_level) || 0,
  is_active: body.is_active === "on",
});

const productPayloadWithCategory = async (body) => {
  const payload = productPayload(body);
  const manualCategory = body.new_category?.trim();

  if (manualCategory) {
    // A typed category intentionally overrides the dropdown during product save.
    const category = await Product.findOrCreateCategory(manualCategory);
    payload.category_id = category?.id || null;
  }

  return payload;
};

export const listProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const availableOnly = req.session.user.role === "SALESPERSON";
    const products = await Product.findAll(search, availableOnly);

    return res.render("products/index", {
      title: "Products",
      products,
      search,
      availableOnly,
    });
  } catch (error) {
    console.error("List products error:", error.message);
    req.flash("error", "Unable to load products.");
    return res.redirect("/");
  }
};

export const showAddProduct = async (req, res) => {
  const categories = await Product.findCategories();

  return res.render("products/form", {
    title: "Add Product",
    product: {},
    categories,
    action: "/products",
  });
};

export const addProduct = async (req, res) => {
  try {
    const product = await Product.create(await productPayloadWithCategory(req.body));
    await ActivityLog.create({
      userId: req.session.user.id,
      role: req.session.user.role,
      action: "CREATE_PRODUCT",
      description: `${req.session.user.name} created product ${product.name}`,
      entityType: "product",
      entityId: product.id,
    });

    req.flash("success", "Product added successfully.");
    return res.redirect("/products");
  } catch (error) {
    console.error("Add product error:", error.message);
    req.flash("error", "Unable to add product.");
    return res.redirect("/products/new");
  }
};

export const showEditProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    req.flash("error", "Product not found.");
    return res.redirect("/products");
  }

  const categories = await Product.findCategories();

  return res.render("products/form", {
    title: "Edit Product",
    product,
    categories,
    action: `/products/${product.id}/edit`,
  });
};

export const editProduct = async (req, res) => {
  try {
    const product = await Product.update(req.params.id, await productPayloadWithCategory(req.body));

    if (!product) {
      req.flash("error", "Product not found.");
    } else {
      await ActivityLog.create({
        userId: req.session.user.id,
        role: req.session.user.role,
        action: "UPDATE_PRODUCT",
        description: `${req.session.user.name} updated product ${product.name}`,
        entityType: "product",
        entityId: product.id,
      });

      req.flash("success", "Product updated successfully.");
    }

    return res.redirect("/products");
  } catch (error) {
    console.error("Edit product error:", error.message);
    req.flash("error", "Unable to update product.");
    return res.redirect(`/products/${req.params.id}/edit`);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    await Product.delete(req.params.id);
    if (product) {
      await ActivityLog.create({
        userId: req.session.user.id,
        role: req.session.user.role,
        action: "DELETE_PRODUCT",
        description: `${req.session.user.name} deleted product ${product.name}`,
        entityType: "product",
        entityId: product.id,
      });
    }

    req.flash("success", "Product deleted successfully.");
  } catch (error) {
    console.error("Delete product error:", error.message);
    req.flash("error", "Unable to delete product.");
  }

  return res.redirect("/products");
};
