const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");


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

    if (req.query.genre) {
      query.genre = { $in: [req.query.genre] };
    }

    const total = await Movie.countDocuments(query);
    const movies = await Movie.find(query).skip(skip).limit(limit);

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalMovies: total,
      movies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// Create new movie
router.post("/", protect, admin, async (req, res) => {
  const { title, description, type, language, genre, releaseDate, cast, length } = req.body;

  try {
    const existing = await Movie.findOne({ title });
    if (existing) {
      return res.status(400).json({ message: "Movie with this title already exists" });
    }

    const movie = new Movie({
      title,
      description,
      type,
      cast,
      language,
      length,
      genre,
      releaseDate,
      createdBy: req.user._id,
    });

    await movie.save();
    res.status(201).json(movie);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// Get movie by ID
router.get("/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(movie);
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

    const updatedFields = req.body;
    Object.assign(movie, updatedFields);

    const updatedMovie = await movie.save();
    res.json(updatedMovie);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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
