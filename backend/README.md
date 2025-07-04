# Curious Dashboard Backend API

A robust Express.js backend for the Curious Dashboard note-taking application, built with TypeScript and PostgreSQL.

## Features

- **Authentication**: JWT-based user authentication with secure password hashing
- **Notes Management**: Full CRUD operations with rich text support, search, and auto-save
- **Subjects**: Organize notes and assignments by subjects/courses
- **Assignments**: Track assignments and exams with due dates and status management
- **Full-text Search**: PostgreSQL-powered search across note content
- **Rate Limiting**: Protection against abuse with configurable limits
- **Data Validation**: Comprehensive request validation using Zod schemas
- **Error Handling**: Centralized error handling with detailed logging
- **Security**: Helmet, CORS, and input sanitization

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   PORT=3001
   NODE_ENV=development
   
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/curious_dashboard
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=curious_dashboard
   DB_USER=username
   DB_PASSWORD=password
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   
   # CORS
   FRONTEND_URL=http://localhost:5173
   ```

4. **Database Setup**
   ```bash
   # Create database
   createdb curious_dashboard
   
   # Run migrations
   npm run db:migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Notes
- `GET /api/notes` - List notes (paginated)
- `POST /api/notes` - Create note
- `GET /api/notes/:id` - Get specific note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `GET /api/notes/search?q=term` - Search notes
- `GET /api/notes/recent` - Get recent notes
- `POST /api/notes/:id/export` - Export note

### Subjects
- `GET /api/subjects` - List subjects
- `POST /api/subjects` - Create subject
- `GET /api/subjects/:id` - Get subject details
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject
- `GET /api/subjects/:id/notes` - Get subject's notes
- `GET /api/subjects/:id/assignments` - Get subject's assignments

### Assignments
- `GET /api/assignments` - List assignments (paginated)
- `POST /api/assignments` - Create assignment
- `GET /api/assignments/:id` - Get specific assignment
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment
- `GET /api/assignments/upcoming` - Get upcoming assignments
- `GET /api/assignments/overdue` - Get overdue assignments
- `PATCH /api/assignments/:id/status` - Update assignment status

### System
- `GET /api/health` - Health check
- `GET /` - API info

## Request/Response Format

### Authentication Required
All endpoints except `/auth/register`, `/auth/login`, `/health`, and `/` require authentication via Bearer token:

```bash
Authorization: Bearer <jwt_token>
```

### Response Format
All responses follow this structure:

```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error": string
}
```

### Example Requests

**Create Note:**
```bash
curl -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "My Note",
    "content": "<p>Note content with HTML</p>",
    "subjectId": "uuid-here"
  }'
```

**Search Notes:**
```bash
curl "http://localhost:3001/api/notes/search?q=algorithm&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

## Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: User accounts with authentication
- **subjects**: Course/subject organization
- **notes**: Rich text notes with full-text search
- **assignments**: Homework and exam tracking

Key features:
- UUID primary keys
- Foreign key constraints with cascading deletes
- Full-text search indexes on note content
- Automatic timestamp updates via triggers

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Run database migrations

### Project Structure
```
src/
├── config/          # Database and environment config
├── controllers/     # Request handlers
├── database/        # Migrations and schema
├── middleware/      # Authentication, validation, etc.
├── models/          # Database models
├── routes/          # API route definitions
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── server.ts        # Main application entry point
```

### Key Features

**Security:**
- JWT authentication with configurable expiration
- Password hashing with bcrypt
- Rate limiting (5 auth attempts/15min, 100 requests/15min)
- Helmet security headers
- Input validation and sanitization

**Performance:**
- Database indexes for common queries
- Full-text search with PostgreSQL
- Pagination for large datasets
- Connection pooling

**Error Handling:**
- Centralized error middleware
- Detailed logging in development
- Graceful error responses
- Database constraint handling

## Production Deployment

1. **Environment Variables**: Update `.env` with production values
2. **Database**: Set up PostgreSQL with proper user permissions
3. **SSL**: Configure SSL certificates for HTTPS
4. **Process Manager**: Use PM2 or similar for process management
5. **Monitoring**: Set up logging and monitoring services

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling for new endpoints
3. Include request validation using Zod schemas
4. Update this README for new features
5. Test endpoints manually or add automated tests

## License

MIT License - see LICENSE file for details