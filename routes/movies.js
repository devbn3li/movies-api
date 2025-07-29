const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const TVShow = require("../models/TVShow");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  validateMovieData,
  transformExternalData,
  formatApiResponse,
  getContentFilter,
} = require("../utils/helpers");
const User = require("../models/User");

// Get all movies and TV shows combined
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const movieQuery = {};
    const tvQuery = {};

    // Apply user settings if user is authenticated
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user && user.settings) {
          const contentFilter = getContentFilter(user.settings);
          Object.assign(movieQuery, contentFilter);
          Object.assign(tvQuery, contentFilter);
        } else {
          // Default to no adult content if no settings
          movieQuery.adult = { $ne: true };
          tvQuery.adult = { $ne: true };
        }
      } catch (tokenError) {
        // Invalid token, apply default filter (no adult content)
        movieQuery.adult = { $ne: true };
        tvQuery.adult = { $ne: true };
      }
    } else {
      // No authentication, apply default filter (no adult content)
      movieQuery.adult = { $ne: true };
      tvQuery.adult = { $ne: true };
    }

    // Content type filter
    if (req.query.type) {
      if (req.query.type === 'movie') {
        // Only movies
        tvQuery._id = null; // Exclude TV shows
      } else if (req.query.type === 'tv') {
        // Only TV shows
        movieQuery._id = null; // Exclude movies
      }
    }

    if (req.query.language) {
      movieQuery.language = req.query.language;
      tvQuery.language = req.query.language;
    }

    if (req.query.original_language) {
      movieQuery.original_language = req.query.original_language;
      tvQuery.original_language = req.query.original_language;
    }

    if (req.query.genre) {
      movieQuery.genre_names = { $in: [req.query.genre] };
      tvQuery.genre_names = { $in: [req.query.genre] };
    }

    // Year filter - handle both release_date and first_air_date
    if (req.query.year) {
      movieQuery.release_date = { $regex: `^${req.query.year}` };
      tvQuery.first_air_date = { $regex: `^${req.query.year}` };
    }

    // Rating filters
    if (req.query.min_rating) {
      const minRating = parseFloat(req.query.min_rating);
      movieQuery.vote_average = { ...movieQuery.vote_average, $gte: minRating };
      tvQuery.vote_average = { ...tvQuery.vote_average, $gte: minRating };
    }

    if (req.query.max_rating) {
      const maxRating = parseFloat(req.query.max_rating);
      movieQuery.vote_average = { ...movieQuery.vote_average, $lte: maxRating };
      tvQuery.vote_average = { ...tvQuery.vote_average, $lte: maxRating };
    }

    // Popularity filter
    if (req.query.min_popularity) {
      const minPop = parseFloat(req.query.min_popularity);
      movieQuery.popularity = { ...movieQuery.popularity, $gte: minPop };
      tvQuery.popularity = { ...tvQuery.popularity, $gte: minPop };
    }

    // Allow admin override for adult content filter
    if (req.query.adult !== undefined) {
      movieQuery.adult = req.query.adult === "true";
      tvQuery.adult = req.query.adult === "true";
    }

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      movieQuery.$or = [
        { title: searchRegex },
        { original_title: searchRegex },
        { overview: searchRegex },
      ];
      tvQuery.$or = [
        { name: searchRegex },
        { original_name: searchRegex },
        { overview: searchRegex },
      ];
    }

    // Sort options
    let sortOption = { popularity: -1 }; // Default sort
    if (req.query.sort_by) {
      switch (req.query.sort_by) {
        case "rating":
        case "vote_average":
          sortOption = { vote_average: req.query.order === "asc" ? 1 : -1 };
          break;
        case "popularity":
          sortOption = { popularity: req.query.order === "asc" ? 1 : -1 };
          break;
        case "release_date":
          // For combined results, we'll handle this differently
          sortOption = { release_date: req.query.order === "asc" ? 1 : -1, first_air_date: req.query.order === "asc" ? 1 : -1 };
          break;
        case "title":
          sortOption = { title: req.query.order === "asc" ? 1 : -1, name: req.query.order === "asc" ? 1 : -1 };
          break;
      }
    }

    // Get movies and TV shows
    const [movieTotal, tvTotal] = await Promise.all([
      movieQuery._id === null ? 0 : Movie.countDocuments(movieQuery),
      tvQuery._id === null ? 0 : TVShow.countDocuments(tvQuery)
    ]);

    const total = movieTotal + tvTotal;

    // Fetch both movies and TV shows
    const [movies, tvShows] = await Promise.all([
      movieQuery._id === null ? [] : Movie.find(movieQuery)
        .populate('createdBy', 'name email')
        .sort(sortOption)
        .limit(limit * 2), // Get more to ensure we have enough after combining
      tvQuery._id === null ? [] : TVShow.find(tvQuery)
        .populate('createdBy', 'name email')
        .sort(sortOption)
        .limit(limit * 2)
    ]);

    // Combine and format results
    const combinedResults = [];

    // Add movies with type indicator
    movies.forEach(movie => {
      const formattedMovie = formatApiResponse(movie);
      formattedMovie.contentType = 'movie';
      formattedMovie.releaseDate = movie.release_date;
      combinedResults.push(formattedMovie);
    });

    // Add TV shows with type indicator
    tvShows.forEach(show => {
      const formattedShow = formatApiResponse(show);
      formattedShow.contentType = 'tv';
      formattedShow.releaseDate = show.first_air_date;
      // Ensure consistent naming
      if (show.name && !formattedShow.title) {
        formattedShow.title = show.name;
      }
      combinedResults.push(formattedShow);
    });

    // Sort combined results
    if (req.query.sort_by === "release_date") {
      combinedResults.sort((a, b) => {
        const dateA = new Date(a.releaseDate || 0);
        const dateB = new Date(b.releaseDate || 0);
        return req.query.order === "asc" ? dateA - dateB : dateB - dateA;
      });
    } else if (req.query.sort_by === "title") {
      combinedResults.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return req.query.order === "asc" ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
      });
    } else if (req.query.sort_by === "vote_average") {
      combinedResults.sort((a, b) => {
        return req.query.order === "asc" ? a.vote_average - b.vote_average : b.vote_average - a.vote_average;
      });
    } else {
      // Default: sort by popularity
      combinedResults.sort((a, b) => {
        return req.query.order === "asc" ? a.popularity - b.popularity : b.popularity - a.popularity;
      });
    }

    // Apply pagination to combined results
    const paginatedResults = combinedResults.slice(skip, skip + limit);

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalMovies: movieTotal,
      totalTVShows: tvTotal,
      totalContent: total,
      content: paginatedResults,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new movie
router.post("/", protect, admin, async (req, res) => {
  try {
    const { type } = req.body;

    // Validate the type
    if (!type || !["movie", "series"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Invalid type. Must be 'movie' or 'series'" });
    }

    // Validate the data
    const validation = validateMovieData(req.body, type);
    if (!validation.isValid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    // Check if movie/series with this external ID already exists
    const existing = await Movie.findOne({ id: req.body.id });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Movie/Series with this ID already exists" });
    }

    // Transform and prepare the data
    const movieData = transformExternalData(req.body, type);

    // Add legacy fields if provided
    if (req.body.language) movieData.language = req.body.language;
    if (req.body.cast) movieData.cast = req.body.cast;
    if (req.body.length) movieData.length = req.body.length;

    movieData.createdBy = req.user._id;

    const movie = new Movie(movieData);
    await movie.save();

    res.status(201).json(formatApiResponse(movie));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get movie by ID
router.get("/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).populate('createdBy', 'name email');

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(formatApiResponse(movie));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get movie by external ID
router.get("/external/:id", async (req, res) => {
  try {
    const movie = await Movie.findOne({ id: req.params.id });

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(formatApiResponse(movie));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get top rated movies/series
router.get("/top/rated", async (req, res) => {
  try {
    const type = req.query.type;
    const limit = parseInt(req.query.limit) || 10;

    const query = {};
    if (type) {
      query.type = type;
    }

    const movies = await Movie.find(query)
      .sort({ vote_average: -1 })
      .limit(limit);

    const formattedMovies = movies.map((movie) => formatApiResponse(movie));
    res.json(formattedMovies);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get popular movies/series
router.get("/popular/list", async (req, res) => {
  try {
    const type = req.query.type;
    const limit = parseInt(req.query.limit) || 10;

    const query = {};
    if (type) {
      query.type = type;
    }

    const movies = await Movie.find(query)
      .sort({ popularity: -1 })
      .limit(limit);

    const formattedMovies = movies.map((movie) => formatApiResponse(movie));
    res.json(formattedMovies);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update a movie
router.put("/:id", protect, admin, async (req, res) => {
  try {
    console.log("Updating movie:", req.body);
    const movie = await Movie.findById(req.params.id).populate('createdBy', 'name email');

    if (!movie) return res.status(404).json({ message: "Movie not found" });

    // Any admin can update any movie
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Filter out fields that shouldn't be updated directly
    const { _id, createdBy, createdAt, updatedAt, ...updatedFields } = req.body;

    // Validate type-specific fields if type is being changed
    if (updatedFields.type && updatedFields.type !== movie.type) {
      const validation = validateMovieData(updatedFields, updatedFields.type);
      if (!validation.isValid) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.errors,
        });
      }
    }

    // Update the fields
    Object.assign(movie, updatedFields);

    const updatedMovie = await movie.save();
    res.json(formatApiResponse(updatedMovie));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete a movie
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).populate('createdBy', 'name email');

    if (!movie) {
      console.log("Movie not found");
      return res.status(404).json({ message: "Movie not found" });
    }

    // Any admin can delete any movie
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    await movie.deleteOne();

    res.json({ message: "Movie deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
