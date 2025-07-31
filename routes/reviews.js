const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const protect = require("../middleware/authMiddleware");

router.post("/:movieId", protect, async (req, res) => {
  const { comment, rating } = req.body;

  try {
    const movie = await Movie.findById(req.params.movieId);

    if (!movie)
      return res.status(404).json({ message: "Movie/Series not found" });

    const alreadyReviewed = movie.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: "Movie/Series already reviewed" });
    }

    const review = {
      user: req.user._id,
      comment,
      rating: Number(rating),
    };

    movie.reviews.push(review);

    calculateAverageRating(movie);

    await movie.save();

    res.status(201).json({ message: "Review added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:movieId", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.movieId).populate(
      "reviews.user",
      "name username profilePicture"
    );

    if (!movie)
      return res.status(404).json({ message: "Movie/Series not found" });

    res.json(movie.reviews);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:movieId", protect, async (req, res) => {
  const { comment, rating } = req.body;

  try {
    const movie = await Movie.findById(req.params.movieId);
    if (!movie)
      return res.status(404).json({ message: "Movie/Series not found" });

    const review = movie.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    review.comment = comment || review.comment;
    review.rating = rating || review.rating;

    calculateAverageRating(movie);
    await movie.save();

    res.json({ message: "Review updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:movieId", protect, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.movieId);
    if (!movie)
      return res.status(404).json({ message: "Movie/Series not found" });

    const reviewIndex = movie.reviews.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (reviewIndex === -1) {
      return res.status(404).json({ message: "Review not found" });
    }

    movie.reviews.splice(reviewIndex, 1);

    calculateAverageRating(movie);
    await movie.save();

    res.json({ message: "Review removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

const calculateAverageRating = (movie) => {
  const total = movie.reviews.reduce((acc, review) => acc + review.rating, 0);
  movie.averageRating = movie.reviews.length ? total / movie.reviews.length : 0;
};

module.exports = router;
