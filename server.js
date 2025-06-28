const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const express = require("express");
const userRoutes = require("./routes/user");
const movieRoutes = require("./routes/movies");
const favoriteRoutes = require("./routes/favorites");
const reviewRoutes = require("./routes/reviews");


dotenv.config();

const app = express();
app.use(cors());
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

app.use("/api/favorites", favoriteRoutes);

app.use("/api/reviews", reviewRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
