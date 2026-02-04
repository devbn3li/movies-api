const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const TVShow = require("../models/TVShow");
const Review = require("../models/Review");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  generateVerificationToken,
  sendVerificationReminderEmail,
} = require("../utils/emailService");

// Send verification reminder to a single user (admin only)
router.post(
  "/send-verification-reminder/:userId",
  protect,
  admin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isEmailVerified) {
        return res
          .status(400)
          .json({ message: "User email is already verified" });
      }

      const deletionDate = new Date();
      deletionDate.setMonth(deletionDate.getMonth() + 1); // 1 month from now

      // Generate verification token
      const verificationToken = generateVerificationToken();

      // Update user with token and deletion date
      user.emailVerificationToken = verificationToken;
      user.accountDeletionDate = deletionDate;
      user.verificationReminderSent = true;
      await user.save();

      // Send email
      const emailSent = await sendVerificationReminderEmail(
        user.email,
        user.name,
        verificationToken,
        deletionDate,
      );

      if (!emailSent) {
        return res
          .status(500)
          .json({ message: "Failed to send verification email" });
      }

      res.json({
        message: "Verification reminder sent successfully",
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
        },
        deletionDate,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

// Send verification reminders to multiple users (bulk) (admin only)
router.post(
  "/send-verification-reminders-bulk",
  protect,
  admin,
  async (req, res) => {
    try {
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "userIds array is required" });
      }

      // Find unverified users from the provided IDs
      const users = await User.find({
        _id: { $in: userIds },
        isEmailVerified: false,
      });

      if (users.length === 0) {
        return res.json({
          message: "No unverified users found from the provided IDs",
          sent: 0,
        });
      }

      const deletionDate = new Date();
      deletionDate.setMonth(deletionDate.getMonth() + 1); // 1 month from now

      let sent = 0;
      let failed = 0;
      const results = [];

      for (const user of users) {
        try {
          // Generate verification token
          const verificationToken = generateVerificationToken();

          // Update user with token and deletion date
          user.emailVerificationToken = verificationToken;
          user.accountDeletionDate = deletionDate;
          user.verificationReminderSent = true;
          await user.save();

          // Send email
          const emailSent = await sendVerificationReminderEmail(
            user.email,
            user.name,
            verificationToken,
            deletionDate,
          );

          if (emailSent) {
            sent++;
            results.push({ _id: user._id, email: user.email, status: "sent" });
          } else {
            failed++;
            results.push({
              _id: user._id,
              email: user.email,
              status: "failed",
            });
          }
        } catch (error) {
          failed++;
          results.push({
            _id: user._id,
            email: user.email,
            status: "error",
            error: error.message,
          });
        }
      }

      res.json({
        message: `Verification reminders sent`,
        totalRequested: userIds.length,
        totalUnverified: users.length,
        sent,
        failed,
        deletionDate,
        results,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

// Send verification reminder emails to ALL unverified users (admin only)
router.post(
  "/send-verification-reminders",
  protect,
  admin,
  async (req, res) => {
    try {
      // Find all unverified users who haven't received a reminder yet
      const unverifiedUsers = await User.find({
        isEmailVerified: false,
        verificationReminderSent: { $ne: true },
      });

      if (unverifiedUsers.length === 0) {
        return res.json({
          message: "No unverified users to send reminders to",
          sent: 0,
        });
      }

      const deletionDate = new Date();
      deletionDate.setMonth(deletionDate.getMonth() + 1); // 1 month from now

      let sent = 0;
      let failed = 0;
      const results = [];

      for (const user of unverifiedUsers) {
        try {
          // Generate verification token
          const verificationToken = generateVerificationToken();

          // Update user with token and deletion date
          user.emailVerificationToken = verificationToken;
          user.accountDeletionDate = deletionDate;
          user.verificationReminderSent = true;
          await user.save();

          // Send email
          const emailSent = await sendVerificationReminderEmail(
            user.email,
            user.name,
            verificationToken,
            deletionDate,
          );

          if (emailSent) {
            sent++;
            results.push({ email: user.email, status: "sent" });
          } else {
            failed++;
            results.push({ email: user.email, status: "failed" });
          }
        } catch (error) {
          failed++;
          results.push({
            email: user.email,
            status: "error",
            error: error.message,
          });
        }
      }

      res.json({
        message: `Verification reminders sent`,
        totalUnverified: unverifiedUsers.length,
        sent,
        failed,
        deletionDate,
        results,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

// Get unverified users list (admin only)
router.get("/unverified-users", protect, admin, async (req, res) => {
  try {
    const unverifiedUsers = await User.find({ isEmailVerified: false })
      .select(
        "name email username createdAt verificationReminderSent accountDeletionDate",
      )
      .sort({ createdAt: -1 });

    res.json({
      totalUnverified: unverifiedUsers.length,
      users: unverifiedUsers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete expired unverified accounts (admin only or cron job)
router.delete("/cleanup-unverified", protect, admin, async (req, res) => {
  try {
    const now = new Date();

    // Find users whose deletion date has passed
    const expiredUsers = await User.find({
      isEmailVerified: false,
      accountDeletionDate: { $lt: now },
    });

    if (expiredUsers.length === 0) {
      return res.json({
        message: "No expired accounts to delete",
        deleted: 0,
      });
    }

    const deletedUserIds = expiredUsers.map((user) => user._id);

    // Delete reviews by these users
    await Review.deleteMany({ user: { $in: deletedUserIds } });

    // Remove from followers/following lists
    await User.updateMany(
      { following: { $in: deletedUserIds } },
      {
        $pull: { following: { $in: deletedUserIds } },
        $inc: { followingCount: -1 },
      },
    );

    await User.updateMany(
      { followers: { $in: deletedUserIds } },
      {
        $pull: { followers: { $in: deletedUserIds } },
        $inc: { followersCount: -1 },
      },
    );

    // Delete the users
    const result = await User.deleteMany({
      isEmailVerified: false,
      accountDeletionDate: { $lt: now },
    });

    res.json({
      message: `Deleted ${result.deletedCount} expired unverified accounts`,
      deleted: result.deletedCount,
      deletedEmails: expiredUsers.map((u) => u.email),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all users (admin only)
router.get("/users", protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const totalUsers = await User.countDocuments(searchQuery);
    const users = await User.find(searchQuery)
      .select("-password -emailVerificationCode -passwordResetCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: page < Math.ceil(totalUsers / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get single user details (admin only)
router.get("/users/:userId", protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("-password -emailVerificationCode -passwordResetCode")
      .populate("favorites", "title poster_url type");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get user's content (reviews, favorites) - admin only
router.get("/users/:userId/content", protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's reviews
    const reviews = await Review.find({ user: req.params.userId })
      .populate("movie", "title poster_url type")
      .sort({ createdAt: -1 });

    // Get user's favorites
    const favorites = await User.findById(req.params.userId)
      .select("favorites")
      .populate("favorites", "title poster_url type vote_average");

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
      reviews,
      favorites: favorites.favorites,
      stats: {
        totalReviews: reviews.length,
        totalFavorites: favorites.favorites.length,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete user (admin only)
router.delete("/users/:userId", protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    // Delete user's reviews
    await Review.deleteMany({ user: req.params.userId });

    // Remove user from followers/following lists of other users
    await User.updateMany(
      { following: req.params.userId },
      {
        $pull: { following: req.params.userId },
        $inc: { followingCount: -1 },
      },
    );

    await User.updateMany(
      { followers: req.params.userId },
      {
        $pull: { followers: req.params.userId },
        $inc: { followersCount: -1 },
      },
    );

    // Delete the user
    await User.findByIdAndDelete(req.params.userId);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Toggle user admin status (admin only)
router.patch(
  "/users/:userId/toggle-admin",
  protect,
  admin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent admin from removing their own admin status
      if (user._id.toString() === req.user._id.toString()) {
        return res
          .status(400)
          .json({ message: "You cannot modify your own admin status" });
      }

      user.isAdmin = !user.isAdmin;
      await user.save();

      res.json({
        message: `User ${user.isAdmin ? "promoted to" : "removed from"} admin`,
        isAdmin: user.isAdmin,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

// Data migration route (admin only)
router.post("/migrate", protect, admin, async (req, res) => {
  try {
    // This route can be used to migrate old data to new schema
    const oldMovies = await Movie.find({
      $or: [{ id: { $exists: false } }, { overview: { $exists: false } }],
    });

    let migrated = 0;
    for (const movie of oldMovies) {
      try {
        // Generate a temporary ID if doesn't exist
        if (!movie.id) {
          movie.id = Math.floor(Math.random() * 1000000);
        }

        // Map old fields to new fields
        if (movie.description && !movie.overview) {
          movie.overview = movie.description;
        }

        if (movie.genre && !movie.genre_names) {
          movie.genre_names = movie.genre;
        }

        if (movie.posterUrl && !movie.poster_url) {
          movie.poster_url = movie.posterUrl;
        }

        if (
          movie.releaseDate &&
          !movie.release_date &&
          movie.type === "movie"
        ) {
          movie.release_date = movie.releaseDate.toISOString().split("T")[0];
        }

        if (
          movie.releaseDate &&
          !movie.first_air_date &&
          movie.type === "series"
        ) {
          movie.first_air_date = movie.releaseDate.toISOString().split("T")[0];
        }

        // Set default values for new required fields
        if (!movie.original_language) {
          movie.original_language = movie.language || "en";
        }

        if (movie.type === "movie") {
          if (!movie.original_title) {
            movie.original_title = movie.title;
          }
        } else if (movie.type === "series") {
          if (!movie.original_name) {
            movie.original_name = movie.title;
          }
          if (!movie.name) {
            movie.name = movie.title;
          }
        }

        await movie.save();
        migrated++;
      } catch (error) {
        console.error(`Error migrating movie ${movie._id}:`, error);
      }
    }

    res.json({ message: `Migrated ${migrated} movies/series` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/stats", protect, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMovies = await Movie.countDocuments({ type: "movie" });
    const totalSeries = await Movie.countDocuments({ type: "series" });
    const totalContent = totalMovies + totalSeries;

    const movies = await Movie.find({}, "reviews vote_average vote_count");

    const totalReviews = movies.reduce(
      (acc, movie) => acc + movie.reviews.length,
      0,
    );

    const totalRating = movies.reduce((acc, movie) => {
      return acc + movie.reviews.reduce((sum, r) => sum + r.rating, 0);
    }, 0);

    const averageRating = totalReviews
      ? (totalRating / totalReviews).toFixed(2)
      : 0;

    // Calculate average vote from external sources
    const totalVotes = movies.reduce((acc, movie) => acc + movie.vote_count, 0);
    const totalVoteAverage = movies.reduce(
      (acc, movie) => acc + movie.vote_average * movie.vote_count,
      0,
    );
    const externalAverageRating = totalVotes
      ? (totalVoteAverage / totalVotes).toFixed(2)
      : 0;

    res.json({
      totalUsers,
      totalMovies,
      totalSeries,
      totalContent,
      totalReviews,
      averageRating,
      externalAverageRating,
      totalVotes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
