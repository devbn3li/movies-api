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

const movieOnlySchema = new mongoose.Schema(
  {
    // Movie specific fields
    adult: {
      type: Boolean,
      default: false,
    },
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    original_language: {
      type: String,
      required: true,
    },
    original_title: {
      type: String,
      required: true,
    },
    overview: {
      type: String,
      required: true,
    },
    popularity: {
      type: Number,
      default: 0,
    },
    release_date: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    video: {
      type: Boolean,
      default: false,
    },
    vote_average: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    vote_count: {
      type: Number,
      default: 0,
    },
    genre_names: {
      type: [String],
      default: [],
    },
    poster_url: {
      type: String,
      default: "",
    },
    backdrop_url: {
      type: String,
      default: "",
    },

    // Additional fields
    language: {
      type: String,
      enum: [
        "Arabic",
        "English",
        "French",
        "Japanese",
        "Spanish",
        "Korean",
        "Other",
      ],
      default: "English",
    },
    length: {
      type: Number,
      default: 0,
    },
    cast: {
      type: [String],
      default: [],
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
  },
  {
    timestamps: true,
    collection: 'movies' // specify collection name
  }
);

module.exports = mongoose.model("MovieOnly", movieOnlySchema);
