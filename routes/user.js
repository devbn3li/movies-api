const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { validateUsername } = require("../utils/helpers");

router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("followers", "name username profilePicture")
      .populate("following", "name username profilePicture");

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

    // Handle username update
    if (req.body.username && req.body.username !== user.username) {
      // Validate username format
      const validation = validateUsername(req.body.username);
      if (!validation.isValid) {
        return res.status(400).json({ 
          message: "Invalid username", 
          errors: validation.errors 
        });
      }

      // Check if username is already taken
      const existingUser = await User.findOne({ 
        username: req.body.username.toLowerCase(),
        _id: { $ne: user._id }
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: "Username is already taken" 
        });
      }

      user.username = req.body.username.toLowerCase();
    }

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
      username: updatedUser.username,
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
      .populate("followers", "name username profilePicture")
      .populate("following", "name username profilePicture");

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
        username: user.username,
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

// Get user profile by username
router.get("/username/:username", protect, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user._id.toString();

    const user = await User.findOne({ username: username.toLowerCase() })
      .select("-password -email")
      .populate("followers", "name username profilePicture")
      .populate("following", "name username profilePicture");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if current user follows this user
    const isFollowing = user.followers.some(
      (follower) => follower._id.toString() === currentUserId
    );

    const isOwnProfile = user._id.toString() === currentUserId;

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
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

// Search users by username
router.get("/search/:query", protect, async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } }
      ]
    })
      .select("name username profilePicture country followersCount")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ followersCount: -1 });

    const total = await User.countDocuments({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } }
      ]
    });

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Check username availability
router.post("/check-username", protect, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: "Invalid username format", 
        errors: validation.errors,
        isAvailable: false
      });
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      return res.json({ 
        message: "Username is already taken",
        isAvailable: false
      });
    }

    res.json({
      message: "Username is available",
      isAvailable: true
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete profile picture
router.delete("/profile/picture", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Reset to default profile picture
    user.profilePicture = "https://i.ibb.co/5gsWWqYj/vecteezy-profile-default-icon-design-template-50018408.jpg";
    await user.save();

    res.json({
      message: "Profile picture deleted successfully",
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
