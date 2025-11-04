const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const express = require("express");
const userRoutes = require("./routes/user");
const movieRoutes = require("./routes/movies");
const moviesOnlyRoutes = require("./routes/movies-only");
const tvShowsOnlyRoutes = require("./routes/tvshows-only");
const tvShowsRoutes = require("./routes/tvshows");
const favoriteRoutes = require("./routes/favorites");
const reviewRoutes = require("./routes/reviews");
const path = require("path");
const uploadRoutes = require("./routes/upload");
const adminRoutes = require("./routes/admin");
const filtersRoutes = require("./routes/filters");
const followRoutes = require("./routes/follow");
const morgan = require("morgan");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

dotenv.config();

const publicDir = path.join(__dirname, "public");
const uploadsDir = path.join(publicDir, "uploads");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log("Created public directory");
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created public/uploads directory");
}

const app = express();

// Rate Limiting - Protection against DoS attacks
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 requests per IP
  message: {
    error: "Too many requests from this IP, please try again later.",
    message:
      "You have exceeded the maximum number of requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for endpoints that fetch large amounts of data
const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Maximum 20 requests per IP
  message: {
    error: "Too many requests, please slow down.",
    message: "Too many requests. Please reduce the frequency of your requests.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for Authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 attempts
  message: {
    error: "Too many authentication attempts, please try again later.",
    message: "Too many authentication attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Movies API is running...");
});

// Middleware to limit the maximum value of the limit parameter
app.use((req, res, next) => {
  if (req.query.limit) {
    const limit = parseInt(req.query.limit);
    if (limit > 100) {
      return res.status(400).json({
        error: "Invalid limit parameter",
        message: "The maximum allowed limit is 100 items per request",
        maxLimit: 100,
      });
    }
  }
  next();
});

// Apply Rate Limiting to all API routes
app.use("/api/", generalLimiter);

// Apply strict Rate Limiting to sensitive endpoints
app.use("/api/movies", strictLimiter);
app.use("/api/movies-only", strictLimiter);
app.use("/api/tvshows", strictLimiter);
app.use("/api/tvshows-only", strictLimiter);
app.use("/api/filters", strictLimiter);

// Apply Rate Limiting to Authentication
app.use("/api/auth", authLimiter);

// Routes
app.use("/api/auth", authRoutes);

app.use("/api/user", userRoutes);

app.use("/api/movies", movieRoutes);

app.use("/api/movies-only", moviesOnlyRoutes);

app.use("/api/tvshows-only", tvShowsOnlyRoutes);

app.use("/api/tvshows", tvShowsRoutes);

app.use("/api/favorites", favoriteRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/upload", uploadRoutes);

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/admin", adminRoutes);

app.use("/api/filters", filtersRoutes);

app.use("/api/follow", followRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID format",
      error: "CAST_ERROR",
      path: err.path,
      value: err.value,
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: "Validation Error",
      error: "VALIDATION_ERROR",
      details: errors,
    });
  }

  // Default error response
  res.status(500).json({
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
