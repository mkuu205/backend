# 🚀 Quick Setup Guide

## Step 1: Install Dependencies

```bash
cd backend-main
npm install
```

## Step 2: Setup PostgreSQL Database

### Option A: Use Neon (Recommended - Free)

1. Go to [neon.tech](https://neon.tech)
2. Create a free account
3. Create a new project
4. Copy the connection string (looks like: `postgresql://user:password@host/dbname`)

### Option B: Local PostgreSQL

1. Install PostgreSQL
2. Create a database:
   ```sql
   CREATE DATABASE efootball_db;
   ```
3. Connection string: `postgresql://postgres:password@localhost:5432/efootball_db`

## Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
```

Required settings in `.env`:

```env
DATABASE_URL=postgresql://your-connection-string
JWT_SECRET=my-super-secret-key-12345
VAPID_PUBLIC_KEY=generate-this-key
VAPID_PRIVATE_KEY=generate-this-key
```

## Step 4: Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Copy the output to your `.env` file.

## Step 5: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

## Step 6: Test the Application

1. Open browser: `http://localhost:3000`
2. Register a new account at: `http://localhost:3000/register`
3. Login at: `http://localhost:3000/login`
4. Admin dashboard: `http://localhost:3000/admin`

### Default Admin Credentials:
- **Username:** admin
- **Password:** admin2025

## Step 7: Verify Everything Works

### ✅ Health Check
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "online",
  "message": "eFootball League 2026 API",
  "database": "PostgreSQL"
}
```

### ✅ Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "team": "Test Team",
    "password": "password123"
  }'
```

### ✅ Check Username
```bash
curl "http://localhost:3000/api/auth/check-username?username=test_user"
```

### ✅ Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test_user",
    "password": "password123"
  }'
```

## Troubleshooting

### Database Connection Error

```
❌ Failed to start server: connect ECONNREFUSED
```

**Solution:**
- Check your DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify network access (for cloud databases)

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm start
```

### Module Not Found

```
Error: Cannot find module 'pg'
```

**Solution:**
```bash
npm install
```

### JWT Token Errors

```
Error: jwtSecret must be set
```

**Solution:**
- Make sure JWT_SECRET is set in your `.env` file
- Restart the server after changing `.env`

## Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=your-production-db-url
JWT_SECRET=very-long-random-string
VAPID_PUBLIC_KEY=your-key
VAPID_PRIVATE_KEY=your-key
PORT=3000
```

### Start in Production Mode

```bash
npm start
```

### Using PM2 (Recommended)

```bash
npm install -g pm2
pm2 start server.js --name efootball-league
pm2 save
pm2 startup
```

## Next Steps

1. ✅ Add players and teams
2. ✅ Create match fixtures
3. ✅ Record match results
4. ✅ View league table
5. ✅ Send push notifications
6. ✅ Monitor payments

## Support

If you encounter any issues:
1. Check the console for error messages
2. Verify your `.env` configuration
3. Ensure PostgreSQL is accessible
4. Check the README.md for detailed documentation

---

**You're all set! 🎉**
