# Movies API

## Description

A RESTful API server built with Node.js for managing movies and series data. The API supports both movies and TV series with comprehensive metadata from external sources like TMDB.

## Features

- **Movies and Series Management**: Support for both movies and TV series
- **External API Integration**: Compatible with TMDB API data structure
- **User Authentication**: JWT-based authentication system
- **Reviews and Ratings**: User reviews and ratings system
- **Favorites**: User favorites management
- **Admin Panel**: Admin-only functions for content management
- **Search and Filtering**: Advanced search and filtering capabilities
- **Data Migration**: Tools for migrating old data to new schema

## New Schema Structure

### Common Fields (Movies & Series)

```json
{
  "adult": boolean,
  "id": number, // External ID (TMDB)
  "original_language": string,
  "overview": string,
  "popularity": number,
  "video": boolean,
  "vote_average": number,
  "vote_count": number,
  "genre_names": [string],
  "poster_url": string,
  "backdrop_url": string,
  "type": "movie" | "series"
}
```

### Movie-Specific Fields

```json
{
  "original_title": string,
  "title": string,
  "release_date": string
}
```

### Series-Specific Fields

```json
{
  "origin_country": [string],
  "original_name": string,
  "name": string,
  "first_air_date": string
}
```

## API Endpoints

### Movies/Series

- `GET /api/movies` - Get all movies/series with pagination and filters
- `POST /api/movies` - Create new movie/series (Admin only)
- `GET /api/movies/:id` - Get movie/series by MongoDB ID
- `GET /api/movies/external/:id` - Get movie/series by external ID
- `PUT /api/movies/:id` - Update movie/series (Admin only)
- `DELETE /api/movies/:id` - Delete movie/series (Admin only)
- `GET /api/movies/top/rated` - Get top rated movies/series
- `GET /api/movies/popular/list` - Get popular movies/series

### Query Parameters for GET /api/movies

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `type` - Filter by type: 'movie' or 'series'
- `language` - Filter by language
- `original_language` - Filter by original language
- `genre` - Filter by genre
- `adult` - Filter adult content: 'true' or 'false'
- `search` - Search in title, name, overview

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Reviews

- `POST /api/reviews/:movieId` - Add review
- `GET /api/reviews/:movieId` - Get reviews for movie/series
- `PUT /api/reviews/:movieId` - Update review
- `DELETE /api/reviews/:movieId` - Delete review

### Favorites

- `POST /api/favorites/:movieId` - Add to favorites
- `GET /api/favorites` - Get user favorites
- `DELETE /api/favorites/:movieId` - Remove from favorites

### Admin

- `GET /api/admin/stats` - Get system statistics
- `POST /api/admin/migrate` - Migrate old data to new schema

### User Profile

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### File Upload

- `POST /api/upload` - Upload image file

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository

```bash
git clone https://github.com/devbn3li/movies-api
cd movies-api
```

2. Install dependencies

```bash
npm install
```

## Environment Setup

1. Create a `.env` file in the root directory
2. Add required environment variables:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/moviesdb
JWT_SECRET=your_super_secret_key_here
```

## Running the Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Test the schema:

```bash
node test-schema.js
```

The server will start running at `http://localhost:5000`

## Data Migration

If you have existing data in the old schema, you can use the migration endpoint:

```bash
POST /api/admin/migrate
Authorization: Bearer <admin_token>
```

This will:

- Add missing required fields with default values
- Map old field names to new field names
- Preserve existing data while making it compatible with the new schema

## Usage Examples

### Creating a Movie

```bash
POST /api/movies
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "adult": false,
  "id": 574475,
  "original_language": "en",
  "original_title": "Final Destination Bloodlines",
  "title": "Final Destination Bloodlines",
  "overview": "Plagued by a violent recurring nightmare...",
  "popularity": 617.5712,
  "release_date": "2025-05-14",
  "video": false,
  "vote_average": 7.179,
  "vote_count": 1379,
  "genre_names": ["Horror", "Mystery"],
  "poster_url": "https://image.tmdb.org/t/p/w500/6WxhEvFsauuACfv8HyoVX6mZKFj.jpg",
  "backdrop_url": "https://image.tmdb.org/t/p/w500/uIpJPDNFoeX0TVml9smPrs9KUVx.jpg",
  "type": "movie"
}
```

### Creating a Series

```bash
POST /api/movies
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "adult": false,
  "id": 93405,
  "origin_country": ["KR"],
  "original_language": "ko",
  "original_name": "오징어 게임",
  "name": "Squid Game",
  "overview": "Hundreds of cash-strapped players accept a strange invitation...",
  "popularity": 1965.0727,
  "first_air_date": "2021-09-17",
  "vote_average": 7.9,
  "vote_count": 16055,
  "genre_names": ["Action & Adventure", "Mystery", "Drama"],
  "poster_url": "https://image.tmdb.org/t/p/w500/1QdXdRYfktUSONkl1oD5gc6Be0s.jpg",
  "backdrop_url": "https://image.tmdb.org/t/p/w500/oaGvjB0DvdhXhOAuADfHb261ZHa.jpg",
  "type": "series"
}
```

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "data": {...},
  "message": "Success message"
}
```

### Error Response

```json
{
  "message": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

### Paginated Response

```json
{
  "page": 1,
  "totalPages": 10,
  "totalMovies": 100,
  "movies": [...]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
