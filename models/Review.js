const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'mediaType',
      required: true,
    },
    mediaType: {
      type: String,
      required: true,
      enum: ['Movie', 'TVShow']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

// Index to ensure one review per user per movie/show
reviewSchema.index({ movie: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
