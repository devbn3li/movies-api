const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const TVShow = require("../models/TVShow");
const Review = require("../models/Review");
const protect = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const validateObjectId = require("../middleware/validateObjectId");

// Helper function to find either movie or TV show by ID and determine type
const findMediaById = async (id) => {
  try {
    let media = await Movie.findById(id);
    if (media) {
      return { media, type: "Movie" };
    }

    media = await TVShow.findById(id);
    if (media) {
      return { media, type: "TVShow" };
    }

    return { media: null, type: null };
  } catch (err) {
    return { media: null, type: null };
  }
};

router.post(
  "/:movieId",
  validateObjectId("movieId"),
  protect,
  async (req, res) => {
    const { comment, rating } = req.body;

    try {
      const { media, type } = await findMediaById(req.params.movieId);

      if (!media)
        return res.status(404).json({ message: "Movie/Series not found" });

      // Check if user already reviewed this movie/show
      const alreadyReviewed = await Review.findOne({
        movie: req.params.movieId,
        user: req.user._id
      });

      if (alreadyReviewed) {
        return res
          .status(400)
          .json({ message: "Movie/Series already reviewed" });
      }

      // Create new review
      const review = new Review({
        movie: req.params.movieId,
        mediaType: type,
        user: req.user._id,
        comment,
        rating: Number(rating),
      });

      await review.save();

      // Update average rating for the media
      await updateAverageRating(req.params.movieId, type);

      res.status(201).json({ message: "Review added", review });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.get("/:movieId", validateObjectId("movieId"), async (req, res) => {
  try {
    const { media, type } = await findMediaById(req.params.movieId);

    if (!media)
      return res.status(404).json({ message: "Movie/Series not found" });

    // Get all reviews for this movie/show
    const reviews = await Review.find({ movie: req.params.movieId })
      .populate("user", "name username profilePicture")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put(
  "/:movieId",
  validateObjectId("movieId"),
  protect,
  async (req, res) => {
    const { comment, rating } = req.body;

    try {
      const { media, type } = await findMediaById(req.params.movieId);

      if (!media)
        return res.status(404).json({ message: "Movie/Series not found" });

      // Find user's review for this movie/show
      const review = await Review.findOne({
        movie: req.params.movieId,
        user: req.user._id
      });

      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Update review
      review.comment = comment || review.comment;
      review.rating = rating || review.rating;

      await review.save();

      // Update average rating
      await updateAverageRating(req.params.movieId, type);

      res.json({ message: "Review updated", review });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.delete(
  "/:movieId",
  validateObjectId("movieId"),
  protect,
  async (req, res) => {
    try {
      const { media, type } = await findMediaById(req.params.movieId);

      if (!media)
        return res.status(404).json({ message: "Movie/Series not found" });

      // Find and delete user's review
      const review = await Review.findOneAndDelete({
        movie: req.params.movieId,
        user: req.user._id
      });

      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Update average rating
      await updateAverageRating(req.params.movieId, type);

      res.json({ message: "Review removed" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get reviews statistics for a movie/show
router.get("/:movieId/stats", validateObjectId("movieId"), async (req, res) => {
  try {
    const { media, type } = await findMediaById(req.params.movieId);

    if (!media)
      return res.status(404).json({ message: "Movie/Series not found" });

    const reviews = await Review.find({ movie: req.params.movieId });
    
    const stats = {
      totalReviews: reviews.length,
      averageRating: 0,
      ratingDistribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0
      }
    };

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
      stats.averageRating = Number((totalRating / reviews.length).toFixed(1));
      
      // Count rating distribution
      reviews.forEach(review => {
        stats.ratingDistribution[review.rating]++;
      });
    }

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Function to calculate and update average rating for media
const updateAverageRating = async (mediaId, mediaType) => {
  try {
    // Get all reviews for this media
    const reviews = await Review.find({ movie: mediaId });
    
    let averageRating = 0;
    if (reviews.length > 0) {
      const total = reviews.reduce((acc, review) => acc + review.rating, 0);
      averageRating = total / reviews.length;
    }

    // Update the media with new average rating
    if (mediaType === "Movie") {
      await Movie.findByIdAndUpdate(mediaId, { averageRating });
    } else {
      await TVShow.findByIdAndUpdate(mediaId, { averageRating });
    }
  } catch (err) {
    console.error("Error updating average rating:", err);
  }
};

module.exports = router;
