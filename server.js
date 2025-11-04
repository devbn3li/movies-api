const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const movieRoutes = require("./routes/movies");
const moviesOnlyRoutes = require("./routes/movies-only");
const tvShowsOnlyRoutes = require("./routes/tvshows-only");
const tvShowsRoutes = require("./routes/tvshows");
const favoriteRoutes = require("./routes/favorites");
const reviewRoutes = require("./routes/reviews");
const uploadRoutes = require("./routes/upload");
const adminRoutes = require("./routes/admin");
const filtersRoutes = require("./routes/filters");
const followRoutes = require("./routes/follow");

dotenv.config();

// Ensure directories exist
const publicDir = path.join(__dirname, "public");
const uploadsDir = path.join(publicDir, "uploads");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log("✅ Created public directory");
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created public/uploads directory");
}

const app = express();

// ✅ Trust proxy (needed for Nginx real IP forwarding)
app.set("trust proxy", true);

// Middleware setup
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Root route
app.get("/", (req, res) => {
  res.send("🎬 Movies API is running...");
});

// 🔒 Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: {
    error: "Too many requests from this IP, please try again later.",
    message: "You have exceeded the maximum number of requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per IP
  message: {
    error: "Too many requests, please slow down.",
    message: "Too many requests. Please reduce the frequency of your requests.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts
  message: {
    error: "Too many authentication attempts, please try again later.",
    message: "Too many authentication attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🚦 Limit large 'limit' query parameter
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

// Apply global and route-specific rate limits
app.use("/api/", generalLimiter);
app.use("/api/movies", strictLimiter);
app.use("/api/movies-only", strictLimiter);
app.use("/api/tvshows", strictLimiter);
app.use("/api/tvshows-only", strictLimiter);
app.use("/api/filters", strictLimiter);
app.use("/api/auth", authLimiter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/movies-only", moviesOnlyRoutes);
app.use("/api/tvshows-only", tvShowsOnlyRoutes);
app.use("/api/tvshows", tvShowsRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/filters", filtersRoutes);
app.use("/api/follow", followRoutes);

// Static files
app.use(express.static(path.join(__dirname, "public")));

// 🌍 Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);

  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID format",
      error: "CAST_ERROR",
      path: err.path,
      value: err.value,
    });
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: "Validation Error",
      error: "VALIDATION_ERROR",
      details: errors,
    });
  }

  res.status(500).json({
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
