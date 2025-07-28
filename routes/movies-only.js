const express = require("express");
const router = express.Router();
const MovieOnly = require("../models/MovieOnly");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  validateMovieData,
  transformExternalData,
  formatMovieResponse,
} = require("../utils/helpers");

// Get all movies with advanced filtering
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    let sort = { popularity: -1 }; // Default sort

    // Language filters
    if (req.query.language) {
      query.language = req.query.language;
    }

    if (req.query.original_language) {
      query.original_language = req.query.original_language;
    }

    // Genre filter
    if (req.query.genre) {
      query.genre_names = { $in: [req.query.genre] };
    }

    // Adult content filter
    if (req.query.adult !== undefined) {
      query.adult = req.query.adult === "true";
    }

    // Year filter
    if (req.query.year) {
      query.release_date = { $regex: `^${req.query.year}` };
    }

    // Rating filters
    if (req.query.min_rating) {
      query.vote_average = { ...query.vote_average, $gte: parseFloat(req.query.min_rating) };
    }

    if (req.query.max_rating) {
      query.vote_average = { ...query.vote_average, $lte: parseFloat(req.query.max_rating) };
    }

    // Popularity filter
    if (req.query.min_popularity) {
      query.popularity = { ...query.popularity, $gte: parseFloat(req.query.min_popularity) };
    }

    // Vote count filter
    if (req.query.min_votes) {
      query.vote_count = { ...query.vote_count, $gte: parseInt(req.query.min_votes) };
    }

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { title: searchRegex },
        { original_title: searchRegex },
        { overview: searchRegex },
      ];
    }

    // Sorting options
    if (req.query.sort_by) {
      switch (req.query.sort_by) {
        case "rating":
        case "vote_average":
          sort = { vote_average: req.query.order === "asc" ? 1 : -1 };
          break;
        case "popularity":
          sort = { popularity: req.query.order === "asc" ? 1 : -1 };
          break;
        case "release_date":
          sort = { release_date: req.query.order === "asc" ? 1 : -1 };
          break;
        case "title":
          sort = { title: req.query.order === "asc" ? 1 : -1 };
          break;
        case "vote_count":
          sort = { vote_count: req.query.order === "asc" ? 1 : -1 };
          break;
        default:
          sort = { popularity: -1 };
      }
    }

    // Special filters
    if (req.query.filter) {
      switch (req.query.filter) {
        case "top_rated":
          sort = { vote_average: -1 };
          query.vote_count = { $gte: 100 }; // Minimum votes for credibility
          break;
        case "popular":
          sort = { popularity: -1 };
          break;
        case "recent":
          const currentYear = new Date().getFullYear();
          query.release_date = { $regex: `^${currentYear}|^${currentYear - 1}` };
          sort = { release_date: -1 };
          break;
        case "upcoming":
          const currentDate = new Date().toISOString().split('T')[0];
          query.release_date = { $gt: currentDate };
          sort = { release_date: 1 };
          break;
        case "classic":
          query.release_date = { $regex: "^19" }; // Movies from 1900s
          sort = { vote_average: -1 };
          break;
      }
    }

    const total = await MovieOnly.countDocuments(query);
    const adultMoviesCount = await MovieOnly.countDocuments({ ...query, adult: true });
    const movies = await MovieOnly.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Format the response
    const formattedMovies = movies.map((movie) => formatMovieResponse(movie));

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalMovies: total,
      adultMovies: adultMoviesCount,
      filters: {
        applied: Object.keys(req.query).filter(key => !['page', 'limit'].includes(key)),
        available: [
          'language', 'original_language', 'genre', 'adult', 'year',
          'min_rating', 'max_rating', 'min_popularity', 'min_votes',
          'search', 'sort_by', 'order', 'filter'
        ]
      },
      movies: formattedMovies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get movie by ID
router.get("/:id", async (req, res) => {
  try {
    const movie = await MovieOnly.findOne({ _id: req.params.id });

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(formatMovieResponse(movie));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get movie by external ID
router.get("/external/:id", async (req, res) => {
  try {
    const movie = await MovieOnly.findOne({ id: req.params.id });

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(formatMovieResponse(movie));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Create new movie
router.post("/", protect, admin, async (req, res) => {
  try {
    // Validate the data for movie type
    const validation = validateMovieData(req.body, "movie");
    if (!validation.isValid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    // Check if movie with this external ID already exists
    const existing = await MovieOnly.findOne({ id: req.body.id });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Movie with this ID already exists" });
    }

    // Transform and prepare the data
    const movieData = transformExternalData(req.body, "movie");

    // Add legacy fields if provided
    if (req.body.language) movieData.language = req.body.language;
    if (req.body.cast) movieData.cast = req.body.cast;
    if (req.body.length) movieData.length = req.body.length;

    movieData.createdBy = req.user._id;

    const movie = new MovieOnly(movieData);
    await movie.save();

    res.status(201).json(formatMovieResponse(movie));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update a movie
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const movie = await MovieOnly.findOne({ _id: req.params.id });

    if (!movie) return res.status(404).json({ message: "Movie not found" });

    if (movie.createdBy && movie.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Filter out fields that shouldn't be updated directly
    const { _id, createdBy, createdAt, updatedAt, ...updatedFields } = req.body;

    Object.assign(movie, updatedFields);

    const updatedMovie = await movie.save();
    res.json(formatMovieResponse(updatedMovie));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete a movie
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const movie = await MovieOnly.findOne({ _id: req.params.id });

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    if (movie.createdBy && movie.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await movie.deleteOne();

    res.json({ message: "Movie deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
