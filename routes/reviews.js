const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const TVShow = require("../models/TVShow");
const protect = require("../middleware/authMiddleware");

// Helper function to find either movie or TV show by ID
const findMediaById = async (id) => {
  try {
    let media = await Movie.findById(id);
    if (media) {
      return { media, type: "movie" };
    }

    media = await TVShow.findById(id);
    if (media) {
      return { media, type: "tvshow" };
    }

    return { media: null, type: null };
  } catch (err) {
    return { media: null, type: null };
  }
};

router.post("/:movieId", protect, async (req, res) => {
  const { comment, rating } = req.body;

  try {
    const { media, type } = await findMediaById(req.params.movieId);

    if (!media)
      return res.status(404).json({ message: "Movie/Series not found" });

    const alreadyReviewed = media.reviews.find(
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

    media.reviews.push(review);

    calculateAverageRating(media);

    await media.save();

    res.status(201).json({ message: "Review added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:movieId", async (req, res) => {
  try {
    const { media, type } = await findMediaById(req.params.movieId);

    if (!media)
      return res.status(404).json({ message: "Movie/Series not found" });

    // Populate the user data for reviews
    await media.populate("reviews.user", "name username profilePicture");

    res.json(media.reviews);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:movieId", protect, async (req, res) => {
  const { comment, rating } = req.body;

  try {
    const { media, type } = await findMediaById(req.params.movieId);

    if (!media)
      return res.status(404).json({ message: "Movie/Series not found" });

    const review = media.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    review.comment = comment || review.comment;
    review.rating = rating || review.rating;

    calculateAverageRating(media);
    await media.save();

    res.json({ message: "Review updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:movieId", protect, async (req, res) => {
  try {
    const { media, type } = await findMediaById(req.params.movieId);

    if (!media)
      return res.status(404).json({ message: "Movie/Series not found" });

    const reviewIndex = media.reviews.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (reviewIndex === -1) {
      return res.status(404).json({ message: "Review not found" });
    }

    media.reviews.splice(reviewIndex, 1);

    calculateAverageRating(media);
    await media.save();

    res.json({ message: "Review removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

const calculateAverageRating = (media) => {
  const total = media.reviews.reduce((acc, review) => acc + review.rating, 0);
  media.averageRating = media.reviews.length ? total / media.reviews.length : 0;
};

module.exports = router;
