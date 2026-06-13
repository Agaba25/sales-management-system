import User from "../models/User.js";

export const showLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  return res.render("auth/login", {
    title: "Login",
    email: "",
  });
};

export const login = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    req.flash("error", "Email and password are required.");
    return res.status(400).render("auth/login", {
      title: "Login",
      email: email || "",
    });
  }

  try {
    const user = await User.findByEmail(email);
    const passwordMatches = user
      ? await User.verifyPassword(password, user.password_hash)
      : false;

    if (!user || !passwordMatches) {
      req.flash("error", "Invalid email or password.");
      return res.status(401).render("auth/login", {
        title: "Login",
        email,
      });
    }

    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        req.flash("error", "Unable to start a secure session.");
        return res.status(500).render("auth/login", {
          title: "Login",
          email,
        });
      }

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      return res.redirect("/");
    });
  } catch (error) {
    console.error("Login error:", error.message);
    req.flash("error", "Something went wrong. Please try again.");
    return res.status(500).render("auth/login", {
      title: "Login",
      email,
    });
  }
};

export const logout = (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error.message);
      return res.redirect("/");
    }

    res.clearCookie("connect.sid");
    return res.redirect("/auth/login");
  });
};
