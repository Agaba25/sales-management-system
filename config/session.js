const sessionConfig = {
  secret: process.env.SESSION_SECRET || "replace-this-secret-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 2,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

export default sessionConfig;
