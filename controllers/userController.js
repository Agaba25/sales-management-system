import ActivityLog from "../models/ActivityLog.js";
import User from "../models/User.js";

const userPayload = (body) => ({
  name: body.name?.trim(),
  email: body.email?.trim().toLowerCase(),
  password: body.password,
  role: body.role,
});

const logUserActivity = async (req, action, user) => {
  await ActivityLog.create({
    userId: req.session.user.id,
    role: req.session.user.role,
    action,
    description: `${req.session.user.name} ${action === "CREATE_USER" ? "created" : "updated"} ${user.name} (${user.role})`,
    entityType: "user",
    entityId: user.id,
  });
};

export const listUsers = async (req, res) => {
  try {
    return res.render("users/index", {
      title: "Staff Users",
      users: await User.findAll(),
    });
  } catch (error) {
    console.error("List users error:", error.message);
    req.flash("error", "Unable to load users.");
    return res.redirect("/");
  }
};

export const showAddUser = (req, res) => {
  return res.render("users/form", {
    title: "Add Staff User",
    user: {},
    roles: User.roles(),
    action: "/users",
    requirePassword: true,
  });
};

export const addUser = async (req, res) => {
  try {
    const user = await User.create(userPayload(req.body));
    await logUserActivity(req, "CREATE_USER", user);

    req.flash("success", "Staff user added successfully.");
    return res.redirect("/users");
  } catch (error) {
    console.error("Add user error:", error.message);
    req.flash("error", error.message || "Unable to add user.");
    return res.redirect("/users/new");
  }
};

export const showEditUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/users");
    }

    return res.render("users/form", {
      title: "Edit Staff User",
      user,
      roles: User.roles(),
      action: `/users/${user.id}/edit`,
      requirePassword: false,
    });
  } catch (error) {
    console.error("Show edit user error:", error.message);
    req.flash("error", "Unable to load user.");
    return res.redirect("/users");
  }
};

export const editUser = async (req, res) => {
  try {
    const user = await User.update(req.params.id, userPayload(req.body));

    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/users");
    }

    await logUserActivity(req, "UPDATE_USER", user);

    req.flash("success", "Staff user updated successfully.");
    return res.redirect("/users");
  } catch (error) {
    console.error("Edit user error:", error.message);
    req.flash("error", error.message || "Unable to update user.");
    return res.redirect(`/users/${req.params.id}/edit`);
  }
};
