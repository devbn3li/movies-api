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

dotenv.config();

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}

const app = express();
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

app.use("/api/auth", authRoutes);

app.use("/api/user", userRoutes);

app.use("/api/movies", movieRoutes);

app.use("/api/movies-only", moviesOnlyRoutes);

app.use("/api/tvshows-only", tvShowsOnlyRoutes);

app.use("/api/tvshows", tvShowsRoutes);

app.use("/api/favorites", favoriteRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/upload", uploadRoutes);

app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.use("/api/admin", adminRoutes);

app.use("/api/filters", filtersRoutes);

app.use("/api/follow", followRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
