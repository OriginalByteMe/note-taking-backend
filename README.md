# Note-Taking Backend API

A RESTful API backend application for note-taking with versioning, concurrency control, and full-text search capabilities.

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)

## Features

- User authentication and authorization
- Note CRUD operations with versioning
- Concurrency control to prevent conflicts
- Full-text search capabilities
- Redis caching for improved performance
- Containerized with Docker

## Technologies

- Node.js and Express.js
- MySQL with Sequelize ORM
- Redis for caching
- JWT for authentication
- Docker and Docker Compose

## Getting Started

### Prerequisites

Before running this application, you need to have the following installed on your machine:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd note-taking-backend
```

### Configuration

The application uses environment variables for configuration. These are already set in the `docker-compose.yaml` file, but you can customize them if needed.

Key environment variables:

- `PORT`: The port on which the API server will run (default: 3000)
- `DB_HOST`: MySQL database host (default: mysql)
- `DB_USER`: MySQL user (default: user)
- `DB_PASSWORD`: MySQL password (default: password)
- `DB_NAME`: MySQL database name (default: notesdb)
- `REDIS_HOST`: Redis host (default: redis)
- `REDIS_PORT`: Redis port (default: 6379)
- `JWT_SECRET`: Secret for signing JWT tokens (set this for production use)
- `TOKEN_EXPIRY`: Expiry time for JWT tokens (default: 24h)

## Running the Application

### Using Docker (Recommended)

To start the application using Docker Compose:

```bash
docker-compose up
```

This will start the following services:
- MySQL database
- Redis cache
- Node.js API server

The API will be available at `http://localhost:3000`.

You can check the health of the application by visiting `http://localhost:3000/health`.

To run the application in detached mode:

```bash
docker-compose up -d
```

To stop the application:

```bash
docker-compose down
```

To rebuild the application after making changes:

```bash
docker-compose up --build
```

### Running Without Docker

If you prefer to run the application outside of Docker, follow these steps:

#### Prerequisites

1. **Node.js** - Version 20 or higher
2. **MySQL** - Version 8.0 or higher
3. **Redis** - Version 6.0 or higher

#### Database Setup

1. **MySQL Setup**:
   - Install MySQL if not already installed
   - Create a new database:
   ```sql
   CREATE DATABASE notesdb_dev;
   ```
   - Create a user with appropriate permissions (optional):
   ```sql
   CREATE USER 'notes_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON notesdb_dev.* TO 'notes_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Redis Setup**:
   - Install Redis if not already installed
   - Start the Redis server:
   ```bash
   redis-server
   ```

#### Application Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone <repository-url>
   cd note-taking-backend
   npm install
   ```

2. Create a `.env` file based on the `.env.example` and update it with your database credentials.

3. Run database migrations:
   ```bash
   npx sequelize-cli db:migrate
   ```

4. Start the application:
   ```bash
   npm start
   ```

   For development with auto-restart on code changes:
   ```bash
   npm run dev
   ```

5. The API will be available at `http://localhost:3000`

### Running Tests

The application uses SQLite in-memory database for testing, which makes it easier to run tests without setting up a separate test database.

#### Running Tests with Docker

```bash
docker-compose run server npm test
```

#### Running Tests Locally

```bash
npm test
```

Run tests with coverage report:

```bash
npm run test:coverage
```

Run specific test files:

```bash
npm test -- -t "user service"
```

## API Documentation

The API provides the following endpoints:

### User Management

- **Register a new user**
  - `POST /users/register`
  - Requires: username, email, password
  - Returns: user data and authentication token

- **Login**
  - `POST /users/login`
  - Requires: email, password
  - Returns: authentication token

- **Get all users** (admin functionality)
  - `GET /users`
  - Requires: Authentication
  - Returns: List of all users

- **Get user by ID**
  - `GET /users/:id`
  - Requires: Authentication
  - Returns: User data

- **Update user**
  - `PUT /users/:id`
  - Requires: Authentication, user data to update
  - Returns: Updated user data

- **Delete user**
  - `DELETE /users/:id`
  - Requires: Authentication
  - Returns: Confirmation of deletion

### Notes Management

- **Create a new note**
  - `POST /notes`
  - Requires: Authentication, title, content
  - Returns: Created note data

- **Get all notes**
  - `GET /notes`
  - Requires: Authentication
  - Returns: All notes for the authenticated user

- **Get a specific note**
  - `GET /notes/:id`
  - Requires: Authentication
  - Returns: Note data

- **Update a note**
  - `PUT /notes/:id`
  - Requires: Authentication, updated title and/or content
  - Returns: Updated note data

- **Delete a note permanently**
  - `DELETE /notes/:id`
  - Requires: Authentication
  - Returns: Confirmation of deletion

- **Soft delete a note**
  - `PUT /notes/:id/soft-delete`
  - Requires: Authentication, optional version parameter
  - Returns: Confirmation of soft deletion

### Note Versioning

- **Get all versions of a note**
  - `GET /notes/:id/versions`
  - Requires: Authentication
  - Returns: List of all versions of the note

- **Revert to a previous version**
  - `POST /notes/:id/revert/:version`
  - Requires: Authentication
  - Returns: Note reverted to specified version

- **Resolve a version conflict**
  - `POST /notes/:id/resolve-conflict`
  - Requires: Authentication, conflict resolution data
  - Returns: Resolved note data

### Search

- **Search notes by keywords**
  - `GET /notes/search?q=keyword`
  - Requires: Authentication, search query parameter
  - Returns: Notes matching the search criteria

### System

- **Health check**
  - `GET /health`
  - Returns: Health status of all services (MySQL and Redis)
  - Status codes: 200 (healthy), 503 (service unavailable)
