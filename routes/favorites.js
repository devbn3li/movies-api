const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Movie = require("../models/Movie");
const protect = require("../middleware/authMiddleware");

// ✅ Add to favorites
router.post("/:movieId", protect, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.movieId);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    const user = await User.findById(req.user._id);

    if (user.favorites.includes(movie._id)) {
      return res.status(400).json({ message: "Movie already in favorites" });
    }

    user.favorites.push(movie._id);
    await user.save();

    res.json({ message: "Movie added to favorites" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get my favorites
router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("favorites");
    res.json(user.favorites);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Remove from favorites
router.delete("/:movieId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.favorites = user.favorites.filter(
      (id) => id.toString() !== req.params.movieId
    );

    await user.save();
    res.json({ message: "Movie removed from favorites" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
