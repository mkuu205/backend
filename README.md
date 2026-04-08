# eFootball League 2026 - Production Backend

A production-grade football league management system built with Node.js, Express, and PostgreSQL.

## Features

- ✅ **User Authentication** - JWT-based auth with bcrypt password hashing
- ✅ **Username System** - Live availability checking, validation
- ✅ **Team Management** - Custom team names with auto-generated logos (DiceBear)
- ✅ **Match Management** - Fixtures, results, upcoming matches with caching
- ✅ **Admin Dashboard** - Single endpoint for all data, optimized performance
- ✅ **Push Notifications** - Web push with service worker
- ✅ **Toast Notifications** - Modern UI notifications
- ✅ **Performance** - Connection pooling, caching, database indexes
- ✅ **Security** - JWT auth, input validation, parameterized queries

## Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL database (Neon or any PostgreSQL provider)

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
DATABASE_URL=postgresql://username:password@hostname:5432/efootball_db
JWT_SECRET=your-secret-key-here
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
PORT=3000
NODE_ENV=development
```

### 3. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Copy the keys to your `.env` file.

### 4. Initialize Database

The database schema is automatically created on first run. Tables and indexes will be set up automatically.

### 5. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will start at `http://localhost:3000`

## Default Admin Account

- **Username:** admin
- **Password:** admin2025

**Change this immediately in production!**

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/check-username?username=` - Check username availability
- `POST /api/auth/change-password` - Change password (requires auth)

### Matches
- `GET /api/matches/upcoming` - Get upcoming matches (cached)
- `GET /api/matches/results` - Get match results
- `GET /api/matches/league-table` - Get league standings (cached)
- `POST /api/matches` - Create fixture (admin only)
- `PUT /api/matches/:id/result` - Update result (admin only)

### Admin
- `GET /api/admin/dashboard` - Get all dashboard data (single request, cached)
- `GET /api/admin/players` - Get all players
- `PUT /api/admin/players/:id/role` - Update player role
- `DELETE /api/admin/players/:id` - Delete player

### Notifications
- `POST /api/notifications/subscribe` - Subscribe to push notifications
- `POST /api/notifications/send` - Send notification (admin only)

### Payments
- `POST /api/payments` - Create payment
- `GET /api/payments/my-payments` - Get user payments
- `PUT /api/payments/:id/status` - Update payment status (admin only)

## Project Structure

```
backend-main/
├── controllers/        # Request handlers
│   ├── auth.controller.js
│   ├── admin.controller.js
│   ├── match.controller.js
│   └── payment.controller.js
├── routes/            # API routes
│   ├── auth.routes.js
│   ├── admin.routes.js
│   ├── match.routes.js
│   ├── payment.routes.js
│   └── notification.routes.js
├── middleware/        # Custom middleware
│   ├── auth.middleware.js
│   └── validation.middleware.js
├── services/          # Business logic
│   ├── cache.service.js
│   ├── notification.service.js
│   └── logo.service.js
├── utils/             # Helper functions
│   ├── validators.js
│   └── responses.js
├── scripts/           # Database scripts
│   └── init-db.js
├── public/            # Frontend files
│   ├── css/
│   │   └── toast.css
│   ├── js/
│   │   ├── toast.js
│   │   ├── admin.js
│   │   └── notifications.js
│   ├── register.html
│   ├── login.html
│   └── sw.js
├── db.js              # Database connection
├── server.js          # Main entry point
└── package.json
```

## Database Schema

### Users
- id, username (UNIQUE), email (UNIQUE), password_hash, team_name, logo_url, phone, role, created_at

### Matches
- id, home_team, away_team, home_score, away_score, match_date, match_time, venue, status, created_at

### Payments
- id, user_id (FK), amount, status, transaction_code, payment_type, description, created_at

### Push Subscriptions
- id, endpoint (UNIQUE), keys (JSONB), created_at

### Notifications
- id, title, body, url, sent_at

## Performance Optimizations

- **Connection Pooling** - PostgreSQL connection pool (max 20 connections)
- **Caching** - In-memory cache with TTL:
  - Upcoming matches: 30 seconds
  - Admin dashboard: 60 seconds
  - League table: 60 seconds
- **Database Indexes** - Optimized queries on email, username, match_date, user_id
- **Single Admin Endpoint** - All dashboard data in one request

## Security Features

- JWT authentication with token verification
- Bcrypt password hashing (10 salt rounds)
- Input validation on all endpoints
- Parameterized SQL queries (SQL injection prevention)
- Protected admin routes
- CORS configuration

## Frontend Features

- **Toast Notifications** - Modern, animated notifications
- **Live Username Check** - Debounced availability checking
- **Auto-generated Logos** - DiceBear API for team logos
- **Responsive Design** - Mobile-friendly UI
- **Service Worker** - Push notification support

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | Secret key for JWT tokens | Yes |
| VAPID_PUBLIC_KEY | Web push public key | Yes |
| VAPID_PRIVATE_KEY | Web push private key | Yes |
| PORT | Server port | No (default: 3000) |
| NODE_ENV | Environment | No (default: development) |

## Database Architecture

The system uses **PostgreSQL** with the `pg` library for all database operations:

- Direct PostgreSQL queries (no ORMs)
- Connection pooling for performance
- Parameterized queries for security
- SSL enabled for Neon database compatibility

### Schema Highlights:

- `users` - User accounts with bcrypt password hashing
- `matches` - League matches and results
- `tournaments` - Tournament metadata
- `tournament_matches` - Tournament bracket matches
- `player_ratings` - ELO rating system
- `competitions` - Current competition mode (league/tournament)

## License

MIT

## Author

Brasho Kish

---

**Need Help?** Check the documentation or create an issue.
