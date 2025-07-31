const express = require("express");
const router = express.Router();
const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowStatus,
  getSuggestedUsers,
} = require("../controllers/followController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// Follow/Unfollow routes
router.post("/:userId/follow", followUser);
router.delete("/:userId/unfollow", unfollowUser);

// Get followers and following
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);

// Check follow status
router.get("/:userId/follow-status", checkFollowStatus);

// Get suggested users to follow
router.get("/suggestions", getSuggestedUsers);

module.exports = router;
