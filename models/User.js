const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    country: { type: String },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Movie",
      },
    ],
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    profilePicture: {
      type: String,
      default: "https://imgur.com/gallery/default-profile-image-JAvXY#jNNT4LE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
