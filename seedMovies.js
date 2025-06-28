const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Movie = require("./models/Movie");

dotenv.config();

const seedMovies = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    const movies = [
      {
        title: "Interstellar",
        description: "A team travels through a wormhole in space.",
        type: "movie",
        language: "English",
        posterUrl: "https://image.url",
        genre: ["Sci-Fi", "Adventure"],
        releaseDate: new Date("2014-11-07"),
      },
      {
        title: "Breaking Bad",
        description: "A chemistry teacher turns into a drug lord.",
        type: "series",
        language: "English",
        posterUrl: "https://image.url",
        genre: ["Crime", "Drama"],
        releaseDate: new Date("2008-01-20"),
      },
      {
        title: "الفيل الأزرق",
        description: "طبيب نفسي يكتشف أسرار خطيرة.",
        type: "movie",
        language: "Arabic",
        posterUrl: "https://image.url",
        genre: ["Mystery", "Thriller"],
        releaseDate: new Date("2014-07-25"),
      },
      {
        title: "The Office",
        description: "Mockumentary about office workers.",
        type: "series",
        language: "English",
        posterUrl: "https://image.url",
        genre: ["Comedy"],
        releaseDate: new Date("2005-03-24"),
      },
      {
        title: "Attack on Titan",
        description: "Humans fight titans in a walled city.",
        type: "series",
        language: "Japanese",
        posterUrl: "https://image.url",
        genre: ["Anime", "Action"],
        releaseDate: new Date("2013-04-07"),
      },
    ];

    await Movie.insertMany(movies);

    console.log("Movies added successfully ✅");
    process.exit();
  } catch (err) {
    console.error("❌ Failed to seed movies:", err);
    process.exit(1);
  }
};

seedMovies();
