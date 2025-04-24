const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../config/db");

const router = express.Router();

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const users = await query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    req.session.user = { id: user.id, email: user.email };
    res.json({ message: "Logged in successfully", user: req.session.user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Logout Route
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully" });
  });
});

// Get Authenticated User
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json(req.session.user);
});

module.exports = router;
