const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");
const TVShow = require("../models/TVShow");

// Get all available filters
router.get("/", async (req, res) => {
  try {
    const filters = {
      years: [],
      genres: [],
      languages: [],
      originalLanguages: [],
      ratings: {
        min: 0,
        max: 10,
        popular: [7, 8, 9]
      },
      popularity: {
        ranges: [
          { label: "Low", min: 0, max: 100 },
          { label: "Medium", min: 100, max: 500 },
          { label: "High", min: 500, max: 1000 },
          { label: "Very High", min: 1000, max: null }
        ]
      },
      contentTypes: [
        { value: "movie", label: "Movies", count: 0 },
        { value: "tv", label: "TV Shows", count: 0 }
      ]
    };

    // Get years from movies
    const movieYears = await Movie.aggregate([
      {
        $match: {
          release_date: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $project: {
          year: { 
            $year: { 
              $dateFromString: { 
                dateString: "$release_date",
                onError: null
              } 
            } 
          }
        }
      },
      {
        $match: {
          year: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$year"
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    // Get years from TV shows
    const tvYears = await TVShow.aggregate([
      {
        $match: {
          first_air_date: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $project: {
          year: { 
            $year: { 
              $dateFromString: { 
                dateString: "$first_air_date",
                onError: null
              } 
            } 
          }
        }
      },
      {
        $match: {
          year: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$year"
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    // Combine and deduplicate years
    const allYears = [...new Set([
      ...movieYears.map(item => item._id),
      ...tvYears.map(item => item._id)
    ])].sort((a, b) => b - a);

    filters.years = allYears.filter(year => year && year > 1900 && year <= new Date().getFullYear() + 5);

    // Get genres from movies
    const movieGenres = await Movie.aggregate([
      {
        $match: {
          genre_names: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: "$genre_names"
      },
      {
        $group: {
          _id: "$genre_names",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get genres from TV shows
    const tvGenres = await TVShow.aggregate([
      {
        $match: {
          genre_names: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: "$genre_names"
      },
      {
        $group: {
          _id: "$genre_names",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Combine genres and their counts
    const genreMap = new Map();
    
    movieGenres.forEach(genre => {
      genreMap.set(genre._id, (genreMap.get(genre._id) || 0) + genre.count);
    });
    
    tvGenres.forEach(genre => {
      genreMap.set(genre._id, (genreMap.get(genre._id) || 0) + genre.count);
    });

    filters.genres = Array.from(genreMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Get languages
    const movieLanguages = await Movie.distinct("original_language");
    const tvLanguages = await TVShow.distinct("original_language");
    const allLanguages = [...new Set([...movieLanguages, ...tvLanguages])].filter(Boolean);

    // Language mapping
    const languageNames = {
      'en': 'English (إنجليزي)',
      'ar': 'Arabic (عربي)',
      'fr': 'French (فرنسي)',
      'de': 'German (ألماني)',
      'es': 'Spanish (إسباني)',
      'it': 'Italian (إيطالي)',
      'ja': 'Japanese (ياباني)',
      'ko': 'Korean (كوري)',
      'zh': 'Chinese (صيني)',
      'hi': 'Hindi (هندي)',
      'tr': 'Turkish (تركي)',
      'ru': 'Russian (روسي)',
      'pt': 'Portuguese (برتغالي)',
      'nl': 'Dutch (هولندي)',
      'sv': 'Swedish (سويدي)',
      'no': 'Norwegian (نرويجي)',
      'da': 'Danish (دنماركي)',
      'fi': 'Finnish (فنلندي)',
      'pl': 'Polish (بولندي)',
      'th': 'Thai (تايلاندي)'
    };

    filters.languages = allLanguages.map(code => ({
      code,
      name: languageNames[code] || code.toUpperCase()
    })).sort((a, b) => a.name.localeCompare(b.name));

    filters.originalLanguages = filters.languages; // Same as languages for now

    // Get content counts
    const movieCount = await Movie.countDocuments();
    const tvCount = await TVShow.countDocuments();

    filters.contentTypes[0].count = movieCount;
    filters.contentTypes[1].count = tvCount;

    // Get rating statistics
    const ratingStats = await Movie.aggregate([
      {
        $match: {
          vote_average: { $exists: true, $gte: 0 }
        }
      },
      {
        $group: {
          _id: null,
          minRating: { $min: "$vote_average" },
          maxRating: { $max: "$vote_average" },
          avgRating: { $avg: "$vote_average" }
        }
      }
    ]);

    const tvRatingStats = await TVShow.aggregate([
      {
        $match: {
          vote_average: { $exists: true, $gte: 0 }
        }
      },
      {
        $group: {
          _id: null,
          minRating: { $min: "$vote_average" },
          maxRating: { $max: "$vote_average" },
          avgRating: { $avg: "$vote_average" }
        }
      }
    ]);

    if (ratingStats.length > 0 || tvRatingStats.length > 0) {
      const allRatings = [...ratingStats, ...tvRatingStats];
      filters.ratings.min = Math.min(...allRatings.map(r => r.minRating));
      filters.ratings.max = Math.max(...allRatings.map(r => r.maxRating));
      filters.ratings.average = allRatings.reduce((sum, r) => sum + r.avgRating, 0) / allRatings.length;
    }

    // Get latest releases
    const latestMovies = await Movie.find({
      release_date: { $exists: true, $ne: null, $ne: "" }
    })
    .sort({ release_date: -1 })
    .limit(10)
    .select('title release_date poster_url vote_average');

    const latestTVShows = await TVShow.find({
      first_air_date: { $exists: true, $ne: null, $ne: "" }
    })
    .sort({ first_air_date: -1 })
    .limit(10)
    .select('name first_air_date poster_url vote_average');

    filters.latestReleases = {
      movies: latestMovies.map(movie => ({
        id: movie._id,
        title: movie.title,
        releaseDate: movie.release_date,
        posterUrl: movie.poster_url,
        rating: movie.vote_average,
        type: 'movie'
      })),
      tvShows: latestTVShows.map(show => ({
        id: show._id,
        title: show.name,
        releaseDate: show.first_air_date,
        posterUrl: show.poster_url,
        rating: show.vote_average,
        type: 'tv'
      }))
    };

    // Sort suggestions
    filters.sortOptions = [
      { value: 'popularity', label: 'Popularity', direction: 'desc' },
      { value: 'vote_average', label: 'Rating', direction: 'desc' },
      { value: 'release_date', label: 'Release Date', direction: 'desc' },
      { value: 'title', label: 'Title A-Z', direction: 'asc' },
      { value: 'vote_count', label: 'Vote Count', direction: 'desc' }
    ];

    // Popular ranges for quick filtering
    filters.quickFilters = {
      highRated: {
        label: "High Rated",
        filter: { vote_average: { $gte: 7.5 } }
      },
      popular: {
        label: "Popular",
        filter: { popularity: { $gte: 500 } }
      },
      recent: {
        label: "Recent",
        filter: {
          $or: [
            { release_date: { $gte: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0] } },
            { first_air_date: { $gte: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0] } }
          ]
        }
      },
      trending: {
        label: "Trending",
        filter: { 
          popularity: { $gte: 1000 },
          vote_average: { $gte: 6.0 }
        }
      }
    };

    res.json({
      success: true,
      filters,
      meta: {
        totalMovies: movieCount,
        totalTVShows: tvCount,
        totalContent: movieCount + tvCount,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching available filters",
      error: error.message 
    });
  }
});

// Get filter statistics for a specific filter type
router.get("/stats/:filterType", async (req, res) => {
  try {
    const { filterType } = req.params;
    let stats = {};

    switch (filterType) {
      case 'years':
        const yearStats = await Movie.aggregate([
          {
            $match: {
              release_date: { $exists: true, $ne: null, $ne: "" }
            }
          },
          {
            $project: {
              year: { 
                $year: { 
                  $dateFromString: { 
                    dateString: "$release_date",
                    onError: null
                  } 
                } 
              }
            }
          },
          {
            $match: {
              year: { $ne: null }
            }
          },
          {
            $group: {
              _id: "$year",
              count: { $sum: 1 }
            }
          },
          {
            $sort: { _id: -1 }
          }
        ]);
        
        stats = yearStats.map(item => ({
          year: item._id,
          count: item.count
        }));
        break;

      case 'genres':
        const genreStats = await Movie.aggregate([
          {
            $match: {
              genre_names: { $exists: true, $ne: [] }
            }
          },
          {
            $unwind: "$genre_names"
          },
          {
            $group: {
              _id: "$genre_names",
              count: { $sum: 1 },
              avgRating: { $avg: "$vote_average" },
              avgPopularity: { $avg: "$popularity" }
            }
          },
          {
            $sort: { count: -1 }
          }
        ]);

        stats = genreStats.map(item => ({
          genre: item._id,
          count: item.count,
          avgRating: Math.round(item.avgRating * 10) / 10,
          avgPopularity: Math.round(item.avgPopularity)
        }));
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Unsupported filter type"
        });
    }

    res.json({
      success: true,
      filterType,
      stats
    });

  } catch (error) {
    console.error('Error fetching filter stats:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching filter statistics",
      error: error.message
    });
  }
});

module.exports = router;
