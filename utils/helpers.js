/**
 * Utility functions for the Movies API
 */

/**
 * Validate movie data based on type
 * @param {Object} data - Movie/Series data
 * @param {string} type - 'movie' or 'series'
 * @returns {Object} - Validation result
 */
const validateMovieData = (data, type) => {
  const errors = [];

  // Common required fields
  if (!data.id) errors.push("External ID is required");
  if (!data.original_language) errors.push("Original language is required");
  if (!data.overview) errors.push("Overview is required");

  if (type === "movie") {
    if (!data.title) errors.push("Title is required for movies");
    if (!data.original_title)
      errors.push("Original title is required for movies");
    if (!data.release_date) errors.push("Release date is required for movies");
  } else if (type === "series") {
    if (!data.name) errors.push("Name is required for series");
    if (!data.original_name)
      errors.push("Original name is required for series");
    if (!data.first_air_date)
      errors.push("First air date is required for series");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Transform external API data to internal schema
 * @param {Object} externalData - Data from external API (TMDB)
 * @param {string} type - 'movie' or 'series'
 * @returns {Object} - Transformed data
 */
const transformExternalData = (externalData, type) => {
  const baseData = {
    adult: externalData.adult || false,
    id: externalData.id,
    original_language: externalData.original_language,
    overview: externalData.overview,
    popularity: externalData.popularity || 0,
    video: externalData.video || false,
    vote_average: externalData.vote_average || 0,
    vote_count: externalData.vote_count || 0,
    genre_names: externalData.genre_names || [],
    poster_url: externalData.poster_url || "",
    backdrop_url: externalData.backdrop_url || "",
    type: type,
  };

  if (type === "movie") {
    return {
      ...baseData,
      title: externalData.title,
      original_title: externalData.original_title,
      release_date: externalData.release_date,
    };
  } else if (type === "series") {
    return {
      ...baseData,
      name: externalData.name,
      original_name: externalData.original_name,
      first_air_date: externalData.first_air_date,
      origin_country: externalData.origin_country || [],
    };
  }

  return baseData;
};

/**
 * Get display title for movie/series
 * @param {Object} item - Movie or series object
 * @returns {string} - Display title
 */
const getDisplayTitle = (item) => {
  if (item.type === "movie") {
    return item.title || item.original_title;
  } else if (item.type === "series") {
    return item.name || item.original_name;
  }
  return "Unknown";
};

/**
 * Get display date for movie/series
 * @param {Object} item - Movie or series object
 * @returns {string} - Display date
 */
const getDisplayDate = (item) => {
  if (item.type === "movie") {
    return item.release_date;
  } else if (item.type === "series") {
    return item.first_air_date;
  }
  return null;
};

/**
 * Format movie/series data for API response
 * @param {Object} item - Movie or series object
 * @returns {Object} - Formatted data
 */
const formatApiResponse = (item) => {
  const formatted = {
    _id: item._id,
    id: item.id,
    type: item.type,
    title: getDisplayTitle(item),
    overview: item.overview,
    poster_url: item.poster_url,
    backdrop_url: item.backdrop_url,
    genre_names: item.genre_names,
    vote_average: item.vote_average,
    vote_count: item.vote_count,
    popularity: item.popularity,
    adult: item.adult,
    original_language: item.original_language,
    averageRating: item.averageRating,
    reviews: item.reviews,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };

  if (item.type === "movie") {
    formatted.original_title = item.original_title;
    formatted.release_date = item.release_date;
  } else if (item.type === "series") {
    formatted.original_name = item.original_name;
    formatted.first_air_date = item.first_air_date;
    formatted.origin_country = item.origin_country;
  }

  return formatted;
};

module.exports = {
  validateMovieData,
  transformExternalData,
  getDisplayTitle,
  getDisplayDate,
  formatApiResponse,
};
