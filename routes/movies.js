const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  validateMovieData,
  transformExternalData,
  formatApiResponse,
} = require("../utils/helpers");

// Get all movies
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.type) {
      query.type = req.query.type;
    }

    if (req.query.language) {
      query.language = req.query.language;
    }

    if (req.query.original_language) {
      query.original_language = req.query.original_language;
    }

    if (req.query.genre) {
      query.genre_names = { $in: [req.query.genre] };
    }

    if (req.query.adult !== undefined) {
      query.adult = req.query.adult === "true";
    }

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { title: searchRegex },
        { name: searchRegex },
        { original_title: searchRegex },
        { original_name: searchRegex },
        { overview: searchRegex },
      ];
    }

    const total = await Movie.countDocuments(query);
    const movies = await Movie.find(query)
      .sort({ popularity: -1 })
      .skip(skip)
      .limit(limit);

    // Format the response
    const formattedMovies = movies.map((movie) => formatApiResponse(movie));

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalMovies: total,
      movies: formattedMovies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new movie
router.post("/", protect, admin, async (req, res) => {
  try {
    const { type } = req.body;

    // Validate the type
    if (!type || !["movie", "series"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Invalid type. Must be 'movie' or 'series'" });
    }

    // Validate the data
    const validation = validateMovieData(req.body, type);
    if (!validation.isValid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    // Check if movie/series with this external ID already exists
    const existing = await Movie.findOne({ id: req.body.id });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Movie/Series with this ID already exists" });
    }

    // Transform and prepare the data
    const movieData = transformExternalData(req.body, type);

    // Add legacy fields if provided
    if (req.body.language) movieData.language = req.body.language;
    if (req.body.cast) movieData.cast = req.body.cast;
    if (req.body.length) movieData.length = req.body.length;

    movieData.createdBy = req.user._id;

    const movie = new Movie(movieData);
    await movie.save();

    res.status(201).json(formatApiResponse(movie));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get movie by ID
router.get("/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(formatApiResponse(movie));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get movie by external ID
router.get("/external/:id", async (req, res) => {
  try {
    const movie = await Movie.findOne({ id: req.params.id });

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(formatApiResponse(movie));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get top rated movies/series
router.get("/top/rated", async (req, res) => {
  try {
    const type = req.query.type;
    const limit = parseInt(req.query.limit) || 10;

    const query = {};
    if (type) {
      query.type = type;
    }

    const movies = await Movie.find(query)
      .sort({ vote_average: -1 })
      .limit(limit);

    const formattedMovies = movies.map((movie) => formatApiResponse(movie));
    res.json(formattedMovies);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get popular movies/series
router.get("/popular/list", async (req, res) => {
  try {
    const type = req.query.type;
    const limit = parseInt(req.query.limit) || 10;

    const query = {};
    if (type) {
      query.type = type;
    }

    const movies = await Movie.find(query)
      .sort({ popularity: -1 })
      .limit(limit);

    const formattedMovies = movies.map((movie) => formatApiResponse(movie));
    res.json(formattedMovies);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update a movie
router.put("/:id", protect, admin, async (req, res) => {
  try {
    console.log("Updating movie:", req.body);
    const movie = await Movie.findById(req.params.id);

    if (!movie) return res.status(404).json({ message: "Movie not found" });

    if (movie.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Filter out fields that shouldn't be updated directly
    const { _id, createdBy, createdAt, updatedAt, ...updatedFields } = req.body;

    // Validate type-specific fields
    if (updatedFields.type && updatedFields.type !== movie.type) {
      return res
        .status(400)
        .json({ message: "Cannot change type of existing movie/series" });
    }

    Object.assign(movie, updatedFields);

    const updatedMovie = await movie.save();
    res.json(updatedMovie);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete a movie
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      console.log("Movie not found");
      return res.status(404).json({ message: "Movie not found" });
    }

    if (movie.createdBy.toString() !== req.user._id.toString()) {
      console.log("Not authorized user");
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
