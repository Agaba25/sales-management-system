import User from "../models/User.js";

const renderLogin = (res, status, { email = "", errorMessages = [], successMessages = [] } = {}) => {
  return res.status(status).render("auth/login", {
    title: "Login",
    email,
    errorMessages,
    successMessages,
  });
};

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
    return renderLogin(res, 400, {
      email: email || "",
      errorMessages: ["Email and password are required."],
    });
  }

  try {
    const user = await User.findByEmail(email);
    const passwordMatches = user
      ? await User.verifyPassword(password, user.password_hash)
      : false;

    if (!user) {
      return renderLogin(res, 401, {
        email,
        errorMessages: ["Invalid email or password."],
      });
    }

    if (!passwordMatches) {
      return renderLogin(res, 401, {
        email,
        errorMessages: ["Wrong password. Please try again."],
      });
    }

    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        return renderLogin(res, 500, {
          email,
          errorMessages: ["Unable to start a secure session."],
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
    return renderLogin(res, 500, {
      email,
      errorMessages: ["Something went wrong. Please try again."],
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
