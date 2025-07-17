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

const movieSchema = new mongoose.Schema(
  {
    // Common fields for both movies and series
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
    overview: {
      type: String,
      required: true,
    },
    popularity: {
      type: Number,
      default: 0,
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
      default: "/uploads/image-1751130928155.jpg",
    },
    backdrop_url: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["movie", "series"],
      required: true,
      default: "movie",
    },

    // Movie-specific fields
    original_title: {
      type: String,
      required: function () {
        return this.type === "movie";
      },
    },
    title: {
      type: String,
      required: function () {
        return this.type === "movie";
      },
    },
    release_date: {
      type: String,
      required: function () {
        return this.type === "movie";
      },
    },

    // Series-specific fields
    origin_country: {
      type: [String],
      default: function () {
        return this.type === "series" ? [] : undefined;
      },
    },
    original_name: {
      type: String,
      required: function () {
        return this.type === "series";
      },
    },
    name: {
      type: String,
      required: function () {
        return this.type === "series";
      },
    },
    first_air_date: {
      type: String,
      required: function () {
        return this.type === "series";
      },
    },

    // Legacy fields (keeping for backward compatibility)
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
  }
);

module.exports = mongoose.model("Movie", movieSchema);
