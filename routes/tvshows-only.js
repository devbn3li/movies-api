const express = require("express");
const router = express.Router();
const TVShow = require("../models/TVShow");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  validateMovieData,
  transformExternalData,
  formatTVShowResponse,
} = require("../utils/helpers");

// Get all TV shows with advanced filtering
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    let sort = { popularity: -1 }; // Default sort

    // Language filters
    if (req.query.language) {
      query.language = req.query.language;
    }

    if (req.query.original_language) {
      query.original_language = req.query.original_language;
    }

    // Genre filter
    if (req.query.genre) {
      query.genre_names = { $in: [req.query.genre] };
    }

    // Adult content filter
    if (req.query.adult !== undefined) {
      query.adult = req.query.adult === "true";
    }

    // Country filter
    if (req.query.country) {
      query.origin_country = { $in: [req.query.country] };
    }

    // Year filter (first air date)
    if (req.query.year) {
      query.first_air_date = { $regex: `^${req.query.year}` };
    }

    // Rating filters
    if (req.query.min_rating) {
      query.vote_average = { ...query.vote_average, $gte: parseFloat(req.query.min_rating) };
    }

    if (req.query.max_rating) {
      query.vote_average = { ...query.vote_average, $lte: parseFloat(req.query.max_rating) };
    }

    // Popularity filter
    if (req.query.min_popularity) {
      query.popularity = { ...query.popularity, $gte: parseFloat(req.query.min_popularity) };
    }

    // Vote count filter
    if (req.query.min_votes) {
      query.vote_count = { ...query.vote_count, $gte: parseInt(req.query.min_votes) };
    }

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { name: searchRegex },
        { original_name: searchRegex },
        { overview: searchRegex },
      ];
    }

    // Sorting options
    if (req.query.sort_by) {
      switch (req.query.sort_by) {
        case "rating":
        case "vote_average":
          sort = { vote_average: req.query.order === "asc" ? 1 : -1 };
          break;
        case "popularity":
          sort = { popularity: req.query.order === "asc" ? 1 : -1 };
          break;
        case "first_air_date":
          sort = { first_air_date: req.query.order === "asc" ? 1 : -1 };
          break;
        case "name":
          sort = { name: req.query.order === "asc" ? 1 : -1 };
          break;
        case "vote_count":
          sort = { vote_count: req.query.order === "asc" ? 1 : -1 };
          break;
        default:
          sort = { popularity: -1 };
      }
    }

    // Special filters
    if (req.query.filter) {
      switch (req.query.filter) {
        case "top_rated":
          sort = { vote_average: -1 };
          query.vote_count = { $gte: 100 }; // Minimum votes for credibility
          break;
        case "popular":
          sort = { popularity: -1 };
          break;
        case "recent":
          const currentYear = new Date().getFullYear();
          query.first_air_date = { $regex: `^${currentYear}|^${currentYear - 1}` };
          sort = { first_air_date: -1 };
          break;
        case "upcoming":
          const currentDate = new Date().toISOString().split('T')[0];
          query.first_air_date = { $gt: currentDate };
          sort = { first_air_date: 1 };
          break;
        case "classic":
          query.first_air_date = { $regex: "^19" }; // Shows from 1900s
          sort = { vote_average: -1 };
          break;
        case "airing":
          const today = new Date().toISOString().split('T')[0];
          query.first_air_date = { $lte: today };
          sort = { popularity: -1 };
          break;
      }
    }

    const total = await TVShow.countDocuments(query);
    const tvShows = await TVShow.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Format the response
    const formattedTvShows = tvShows.map((show) => formatTVShowResponse(show));

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalShows: total,
      filters: {
        applied: Object.keys(req.query).filter(key => !['page', 'limit'].includes(key)),
        available: [
          'language', 'original_language', 'genre', 'adult', 'country', 'year',
          'min_rating', 'max_rating', 'min_popularity', 'min_votes',
          'search', 'sort_by', 'order', 'filter'
        ]
      },
      tvShows: formattedTvShows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new TV show
router.post("/", protect, admin, async (req, res) => {
  try {
    // Validate the data for series type
    const validation = validateMovieData(req.body, "series");
    if (!validation.isValid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    // Check if TV show with this external ID already exists
    const existing = await TVShow.findOne({ id: req.body.id });
    if (existing) {
      return res
        .status(400)
        .json({ message: "TV Show with this ID already exists" });
    }

    // Transform and prepare the data
    const tvShowData = transformExternalData(req.body, "series");

    // Add legacy fields if provided
    if (req.body.language) tvShowData.language = req.body.language;
    if (req.body.cast) tvShowData.cast = req.body.cast;

    tvShowData.createdBy = req.user._id;

    const tvShow = new TVShow(tvShowData);
    await tvShow.save();

    res.status(201).json(formatTVShowResponse(tvShow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get TV show by ID
router.get("/:id", async (req, res) => {
  try {
    const tvShow = await TVShow.findOne({ _id: req.params.id });

    if (!tvShow) {
      return res.status(404).json({ message: "TV Show not found" });
    }

    res.json(formatTVShowResponse(tvShow));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get TV show by external ID
router.get("/external/:id", async (req, res) => {
  try {
    const tvShow = await TVShow.findOne({ id: req.params.id });

    if (!tvShow) {
      return res.status(404).json({ message: "TV Show not found" });
    }

    res.json(formatTVShowResponse(tvShow));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get top rated TV shows
router.get("/top/rated", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const tvShows = await TVShow.find({})
      .sort({ vote_average: -1 })
      .limit(limit);

    const formattedTvShows = tvShows.map((show) => formatTVShowResponse(show));
    res.json(formattedTvShows);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get popular TV shows
router.get("/popular/list", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const tvShows = await Movie.find({ type: "series" })
      .sort({ popularity: -1 })
      .limit(limit);

    const formattedTvShows = tvShows.map((show) => formatTVShowResponse(show));
    res.json(formattedTvShows);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get TV shows by genre
router.get("/genre/:genre", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const genre = req.params.genre;

    const query = { 
      type: "series",
      genre_names: { $in: [genre] }
    };

    const total = await Movie.countDocuments(query);
    const tvShows = await Movie.find(query)
      .sort({ popularity: -1 })
      .skip(skip)
      .limit(limit);

    const formattedTvShows = tvShows.map((show) => formatTVShowResponse(show));

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalShows: total,
      genre,
      tvShows: formattedTvShows,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get TV shows by country
router.get("/country/:country", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const country = req.params.country;

    const query = { 
      type: "series",
      origin_country: { $in: [country] }
    };

    const total = await Movie.countDocuments(query);
    const tvShows = await Movie.find(query)
      .sort({ popularity: -1 })
      .skip(skip)
      .limit(limit);

    const formattedTvShows = tvShows.map((show) => formatTVShowResponse(show));

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalShows: total,
      country,
      tvShows: formattedTvShows,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get TV shows by first air date year
router.get("/year/:year", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const year = req.params.year;

    const query = { 
      type: "series",
      first_air_date: { $regex: `^${year}` }
    };

    const total = await Movie.countDocuments(query);
    const tvShows = await Movie.find(query)
      .sort({ popularity: -1 })
      .skip(skip)
      .limit(limit);

    const formattedTvShows = tvShows.map((show) => formatTVShowResponse(show));

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalShows: total,
      year,
      tvShows: formattedTvShows,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get currently airing TV shows
router.get("/airing/now", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const currentDate = new Date().toISOString().split('T')[0];

    const tvShows = await Movie.find({ 
      type: "series",
      first_air_date: { $lte: currentDate }
    })
      .sort({ popularity: -1 })
      .limit(limit);

    const formattedTvShows = tvShows.map((show) => formatTVShowResponse(show));
    res.json(formattedTvShows);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update a TV show
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const tvShow = await Movie.findOne({ _id: req.params.id, type: "series" });

    if (!tvShow) return res.status(404).json({ message: "TV Show not found" });

    if (tvShow.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Filter out fields that shouldn't be updated directly
    const { _id, createdBy, createdAt, updatedAt, type, ...updatedFields } = req.body;

    // Ensure type remains as series
    updatedFields.type = "series";

    Object.assign(tvShow, updatedFields);

    const updatedTvShow = await tvShow.save();
    res.json(formatApiResponse(updatedTvShow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete a TV show
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const tvShow = await Movie.findOne({ _id: req.params.id, type: "series" });

    if (!tvShow) {
      return res.status(404).json({ message: "TV Show not found" });
    }

    if (tvShow.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await tvShow.deleteOne();

    res.json({ message: "TV Show deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
