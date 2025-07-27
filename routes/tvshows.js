const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  validateMovieData,
  transformExternalData,
  formatApiResponse,
} = require("../utils/helpers");

// Redirect to the new tvshows-only route
router.use("/", (req, res, next) => {
  res.redirect(`/api/tvshows-only${req.url}`);
});

module.exports = router;