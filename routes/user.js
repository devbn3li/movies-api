const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("followers", "name email profilePicture")
      .populate("following", "name email profilePicture");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Welcome to your profile",
      user: {
        ...user.toObject(),
        followersCount: user.followersCount,
        followingCount: user.followingCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.country = req.body.country || user.country;
    user.profilePicture = req.body.profilePicture || user.profilePicture;

    // Update user settings
    if (req.body.settings) {
      user.settings = user.settings || {};
      if (typeof req.body.settings.showAdultContent !== 'undefined') {
        user.settings.showAdultContent = req.body.settings.showAdultContent;
      }
    }

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
      profilePicture: updatedUser.profilePicture,
      isAdmin: updatedUser.isAdmin,
      settings: updatedUser.settings,
      followersCount: updatedUser.followersCount,
      followingCount: updatedUser.followingCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Route to update user settings
router.put("/settings", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Initialize settings if not exists
    user.settings = user.settings || {};

    // Update showAdultContent setting
    if (typeof req.body.showAdultContent !== 'undefined') {
      user.settings.showAdultContent = req.body.showAdultContent;
    }

    const updatedUser = await user.save();

    res.json({
      message: "Settings updated successfully",
      settings: updatedUser.settings,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Route to get user settings
router.get("/settings", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      settings: user.settings || { showAdultContent: false },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get public user profile
router.get("/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();

    const user = await User.findById(userId)
      .select("-password -email")
      .populate("followers", "name profilePicture")
      .populate("following", "name profilePicture");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if current user follows this user
    const isFollowing = user.followers.some(
      (follower) => follower._id.toString() === currentUserId
    );

    const isOwnProfile = userId === currentUserId;

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        profilePicture: user.profilePicture,
        country: user.country,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        createdAt: user.createdAt,
        isFollowing,
        isOwnProfile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
