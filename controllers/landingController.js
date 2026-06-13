export const showLanding = (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  return res.render("landing", {
    title: "Sales Management System",
  });
};
