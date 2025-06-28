const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

router.get("/profile", protect, (req, res) => {
  res.json({
    message: "Welcome to your profile",
    user: req.user,
  });
});

router.put("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.country = req.body.country || user.country;

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      country: updatedUser.country,
      isAdmin: updatedUser.isAdmin,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
