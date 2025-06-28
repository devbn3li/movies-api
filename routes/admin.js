const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

router.get("/stats", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const totalUsers = await User.countDocuments();
    const totalMovies = await Movie.countDocuments();

    const movies = await Movie.find({}, "reviews");

    const totalReviews = movies.reduce((acc, movie) => acc + movie.reviews.length, 0);

    const totalRating = movies.reduce((acc, movie) => {
      return acc + movie.reviews.reduce((sum, r) => sum + r.rating, 0);
    }, 0);

    const averageRating = totalReviews ? (totalRating / totalReviews).toFixed(2) : 0;

    res.json({
      totalUsers,
      totalMovies,
      totalReviews,
      averageRating,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
