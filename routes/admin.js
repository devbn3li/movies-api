const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

// Data migration route (admin only)
router.post("/migrate", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

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

router.get("/stats", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const totalUsers = await User.countDocuments();
    const totalMovies = await Movie.countDocuments({ type: "movie" });
    const totalSeries = await Movie.countDocuments({ type: "series" });
    const totalContent = totalMovies + totalSeries;

    const movies = await Movie.find({}, "reviews vote_average vote_count");

    const totalReviews = movies.reduce(
      (acc, movie) => acc + movie.reviews.length,
      0
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
      0
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
