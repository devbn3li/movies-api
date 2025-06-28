const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Movie = require("./models/Movie"); // تأكد إن المسار صح

dotenv.config();

const clearDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // حذف كل الأفلام
    const result = await Movie.deleteMany({});

    console.log(`🗑️ Deleted ${result.deletedCount} movies`);

    process.exit();
  } catch (err) {
    console.error("❌ Failed to clear database:", err);
    process.exit(1);
  }
};

clearDatabase();
