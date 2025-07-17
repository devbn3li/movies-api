/**
 * Test script to validate the new movie schema
 */

const mongoose = require("mongoose");
const Movie = require("./models/Movie");
const { validateMovieData, transformExternalData } = require("./utils/helpers");

// Test data examples
const movieExample = {
  adult: false,
  id: 574475,
  original_language: "en",
  original_title: "Final Destination Bloodlines",
  overview:
    "Plagued by a violent recurring nightmare, college student Stefanie heads home to track down the one person who might be able to break the cycle and save her family from the grisly demise that inevitably awaits them all.",
  popularity: 617.5712,
  release_date: "2025-05-14",
  title: "Final Destination Bloodlines",
  video: false,
  vote_average: 7.179,
  vote_count: 1379,
  genre_names: ["Horror", "Mystery"],
  poster_url: "https://image.tmdb.org/t/p/w500/6WxhEvFsauuACfv8HyoVX6mZKFj.jpg",
  backdrop_url:
    "https://image.tmdb.org/t/p/w500/uIpJPDNFoeX0TVml9smPrs9KUVx.jpg",
};

const seriesExample = {
  adult: false,
  id: 93405,
  origin_country: ["KR"],
  original_language: "ko",
  original_name: "오징어 게임",
  overview:
    "Hundreds of cash-strapped players accept a strange invitation to compete in children's games. Inside, a tempting prize awaits — with deadly high stakes.",
  popularity: 1965.0727,
  first_air_date: "2021-09-17",
  name: "Squid Game",
  vote_average: 7.9,
  vote_count: 16055,
  genre_names: ["Action & Adventure", "Mystery", "Drama"],
  poster_url: "https://image.tmdb.org/t/p/w500/1QdXdRYfktUSONkl1oD5gc6Be0s.jpg",
  backdrop_url:
    "https://image.tmdb.org/t/p/w500/oaGvjB0DvdhXhOAuADfHb261ZHa.jpg",
};

async function testSchema() {
  try {
    // Test movie validation
    console.log("Testing movie validation...");
    const movieValidation = validateMovieData(movieExample, "movie");
    console.log("Movie validation result:", movieValidation);

    // Test series validation
    console.log("\nTesting series validation...");
    const seriesValidation = validateMovieData(seriesExample, "series");
    console.log("Series validation result:", seriesValidation);

    // Test data transformation
    console.log("\nTesting data transformation...");
    const transformedMovie = transformExternalData(movieExample, "movie");
    console.log(
      "Transformed movie:",
      JSON.stringify(transformedMovie, null, 2)
    );

    const transformedSeries = transformExternalData(seriesExample, "series");
    console.log(
      "Transformed series:",
      JSON.stringify(transformedSeries, null, 2)
    );

    console.log("\nAll tests completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSchema();
}

module.exports = { testSchema };
