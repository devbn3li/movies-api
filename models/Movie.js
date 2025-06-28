const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: String,
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: String,
  posterUrl: {
    type: String,
    default: "/uploads/image-1751130928155.jpg",
  },
  releaseDate: Date,
  genre: [String],
  type: {
    type: String,
    enum: ["movie", "series"],
    required: true,
    default: "movie",
  },
  language: {
    type: String,
    enum: ["Arabic", "English", "French", "Japanese", "Other"],
    default: "English",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  reviews: [reviewSchema],
  averageRating: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Movie", movieSchema);
