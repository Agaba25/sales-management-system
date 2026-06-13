export const setAuthLocals = (req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.successMessages = req.flash("success");
  res.locals.errorMessages = req.flash("error");
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error", "Please login to continue.");
    return res.redirect("/auth/login");
  }

  return next();
};

export const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  return next();
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      req.flash("error", "Please login to continue.");
      return res.redirect("/auth/login");
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).render("errors/403", { title: "Access denied" });
    }

    return next();
  };
};
