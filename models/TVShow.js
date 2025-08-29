const mongoose = require("mongoose");

const tvShowSchema = new mongoose.Schema(
  {
    // TV Show specific fields
    adult: {
      type: Boolean,
      default: false,
    },
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    origin_country: {
      type: [String],
      default: [],
    },
    original_language: {
      type: String,
      required: true,
    },
    original_name: {
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
    first_air_date: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
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
    cast: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    averageRating: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'tvshows' // specify collection name
  }
);

module.exports = mongoose.model("TVShow", tvShowSchema);
