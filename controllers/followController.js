const User = require("../models/User");
const { transformUserWithFullUrls } = require("../utils/helpers");

// Follow a user
const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Check if trying to follow themselves
    if (userId === currentUserId) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    // Check if user exists
    const userToFollow = await User.findById(userId);
    if (!userToFollow) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentUser = await User.findById(currentUserId);

    // Check if already following
    if (currentUser.following.includes(userId)) {
      return res.status(400).json({ error: "You are already following this user" });
    }

    // Add to following and followers lists
    currentUser.following.push(userId);
    userToFollow.followers.push(currentUserId);

    // Update counts
    currentUser.followingCount += 1;
    userToFollow.followersCount += 1;

    // Save both users
    await currentUser.save();
    await userToFollow.save();

    res.status(200).json({
      message: "User followed successfully",
      following: true,
      followersCount: userToFollow.followersCount,
      followingCount: currentUser.followingCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Unfollow a user
const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Check if trying to unfollow themselves
    if (userId === currentUserId) {
      return res.status(400).json({ error: "You cannot unfollow yourself" });
    }

    // Check if user exists
    const userToUnfollow = await User.findById(userId);
    if (!userToUnfollow) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentUser = await User.findById(currentUserId);

    // Check if not following
    if (!currentUser.following.includes(userId)) {
      return res.status(400).json({ error: "You are not following this user" });
    }

    // Remove from following and followers lists
    currentUser.following.pull(userId);
    userToUnfollow.followers.pull(currentUserId);

    // Update counts
    currentUser.followingCount -= 1;
    userToUnfollow.followersCount -= 1;

    // Save both users
    await currentUser.save();
    await userToUnfollow.save();

    res.status(200).json({
      message: "User unfollowed successfully",
      following: false,
      followersCount: userToUnfollow.followersCount,
      followingCount: currentUser.followingCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's followers
const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId)
      .populate({
        path: "followers",
        select: "name username profilePicture followersCount followingCount",
        options: {
          skip: skip,
          limit: limit,
        },
      });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Transform followers to include full image URLs
    const followersWithFullUrls = user.followers.map(follower => 
      transformUserWithFullUrls(follower, req)
    );

    const totalFollowers = user.followersCount;
    const totalPages = Math.ceil(totalFollowers / limit);

    res.status(200).json({
      followers: followersWithFullUrls,
      totalFollowers,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's following
const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId)
      .populate({
        path: "following",
        select: "name username profilePicture followersCount followingCount",
        options: {
          skip: skip,
          limit: limit,
        },
      });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Transform following to include full image URLs
    const followingWithFullUrls = user.following.map(following => 
      transformUserWithFullUrls(following, req)
    );

    const totalFollowing = user.followingCount;
    const totalPages = Math.ceil(totalFollowing / limit);

    res.status(200).json({
      following: followingWithFullUrls,
      totalFollowing,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check if current user follows a specific user
const checkFollowStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(200).json({
        isFollowing: false,
        canFollow: false,
        message: "This is your own profile",
      });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFollowing = currentUser.following.includes(userId);

    res.status(200).json({
      isFollowing,
      canFollow: true,
      followersCount: targetUser.followersCount,
      followingCount: targetUser.followingCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get suggested users to follow
const getSuggestedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const currentUser = await User.findById(currentUserId);

    // Get users that current user is not following and exclude current user
    const suggestedUsers = await User.find({
      _id: { 
        $nin: [...currentUser.following, currentUserId] 
      }
    })
    .select("name username profilePicture followersCount followingCount")
    .sort({ followersCount: -1 }) // Sort by most followed users
    .limit(limit);

    // Transform suggested users to include full image URLs
    const suggestedUsersWithFullUrls = suggestedUsers.map(user => 
      transformUserWithFullUrls(user, req)
    );

    res.status(200).json({
      suggestedUsers: suggestedUsersWithFullUrls,
      count: suggestedUsersWithFullUrls.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowStatus,
  getSuggestedUsers,
};
