# Movies API

## Description

A RESTful API server built with Node.js for managing movies data.

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository

```bash
git clone [https://github.com/devbn3li/movies-api]
cd movies-api
```

2. Install dependencies

```bash
npm install
```

## Environment Setup

1. Create a `.env` file in the root directory
2. Add required environment variables:

``` plain
PORT=5000
DATABASE_URL=mongodb://localhost:27017/moviesdb
JWT_SECRET=super_secret_key
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

The server will start running at `http://localhost:5000`
