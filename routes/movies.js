const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const protect = require("../middleware/authMiddleware");

// @desc   Get all movies
router.get("/", async (req, res) => {
  const movies = await Movie.find();
  res.json(movies);
});

// @desc   Create new movie
router.post("/", protect, async (req, res) => {
  const { title, description, type, language, genre, releaseDate } = req.body;

  try {
    const existing = await Movie.findOne({ title });
    if (existing) {
      return res.status(400).json({ message: "Movie with this title already exists" });
    }

    const movie = new Movie({
      title,
      description,
      type,
      language,
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


// @desc   Get movie by ID
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

// @desc   Update a movie
router.put("/:id", protect, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) return res.status(404).json({ message: "Movie not found" });

    // فقط المالك يقدر يعدل
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

// @desc   Delete a movie
router.delete("/:id", protect, async (req, res) => {
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
