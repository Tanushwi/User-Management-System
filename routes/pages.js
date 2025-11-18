const express = require("express");
const router = express.Router();

function ensureLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  next();
}

router.get("/dashboard", ensureLoggedIn, (req, res) => {
  res.render("pages/dashboard", {
    title: "Dashboard",
    user: req.session.user
  });
});

router.get("/profile", ensureLoggedIn, (req, res) => {
  res.render("pages/profile", {
    title: "Profile",
    user: req.session.user
  });
});

module.exports = router;
