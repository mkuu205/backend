# ✅ Testing Checklist

Use this checklist to verify all features are working correctly.

---

## 🔧 Pre-Testing Setup

- [ ] PostgreSQL database is running
- [ ] `.env` file is configured with correct DATABASE_URL
- [ ] VAPID keys are generated and added to `.env`
- [ ] JWT_SECRET is set in `.env`
- [ ] Dependencies installed: `npm install`
- [ ] Server started: `npm run dev`
- [ ] Server running at `http://localhost:3000`

---

## 1️⃣ Health Check

- [ ] Visit `http://localhost:3000/api/health`
- [ ] Response shows `"status": "online"`
- [ ] Response shows `"database": "PostgreSQL"`

**Expected Response:**
```json
{
  "status": "online",
  "message": "eFootball League 2026 API",
  "database": "PostgreSQL"
}
```

---

## 2️⃣ User Registration

### Form Validation
- [ ] Visit `http://localhost:3000/register`
- [ ] Page loads with modern gradient design
- [ ] Logo preview shows default image
- [ ] Toast notification system is loaded

### Username Validation
- [ ] Type username "test" (less than 3 chars) - No status shown
- [ ] Type username "ab" - Shows error (too short)
- [ ] Type username "ABC" - Shows error (uppercase)
- [ ] Type username "test_user" - Shows ✅ or ❌
- [ ] Type username with spaces - Shows error
- [ ] Type username with special chars - Shows error

### Live Username Check
- [ ] Type available username - Shows ✅ Available
- [ ] Type taken username - Shows ❌ Taken
- [ ] Check is debounced (doesn't fire on every keystroke)

### Team Name & Logo
- [ ] Type team name "Barcelona"
- [ ] Logo preview updates to show Barcelona initials
- [ ] Type different team name - Logo updates
- [ ] Team name less than 2 chars - Logo stays default

### Form Submission
- [ ] Leave required fields empty - Shows validation error
- [ ] Password less than 6 chars - Shows error
- [ ] Passwords don't match - Shows error
- [ ] Fill all fields correctly - Submits successfully
- [ ] Success toast appears
- [ ] Redirects to login page after 1.5 seconds

### Backend Validation
- [ ] Duplicate username - Returns error
- [ ] Duplicate email - Returns error
- [ ] Invalid username format - Returns error
- [ ] Valid registration - Creates user with hashed password

---

## 3️⃣ User Login

### Form Testing
- [ ] Visit `http://localhost:3000/login`
- [ ] Page loads with matching design
- [ ] Leave fields empty - Shows error
- [ ] Wrong credentials - Shows error toast
- [ ] Correct credentials - Shows success toast
- [ ] Redirects based on role (admin → /admin, player → /)

### JWT Token
- [ ] After login, check localStorage
- [ ] Token is stored in `localStorage.token`
- [ ] User data is stored in `localStorage.user`
- [ ] Token is valid JWT format

---

## 4️⃣ Index Page (Home)

### Upcoming Matches
- [ ] Visit `http://localhost:3000`
- [ ] Loading spinner shows initially
- [ ] If no matches: Shows "No Upcoming Matches" message
- [ ] If matches exist: Displays match cards correctly
- [ ] Match cards show: home team, away team, date, status
- [ ] Error handling works (disconnect network to test)

### Recent Results
- [ ] Loading spinner shows initially
- [ ] If no results: Shows "No Results Yet" message
- [ ] If results exist: Displays with scores
- [ ] Shows last 5 results

---

## 5️⃣ Admin Dashboard

### Access Control
- [ ] Visit `http://localhost:3000/admin` without login
- [ ] Redirects to login page
- [ ] Login as regular user
- [ ] Try to access /admin - Redirects to home
- [ ] Login as admin - Access granted

### Dashboard Loading
- [ ] Shows loading spinner
- [ ] Makes SINGLE API call to `/api/admin/dashboard`
- [ ] Success toast appears
- [ ] All sections render correctly

### Stats Cards
- [ ] Total Players count shows
- [ ] Total Matches count shows
- [ ] Completed Payments count shows
- [ ] Pending Payments count shows

### Players Section
- [ ] Player list displays
- [ ] Shows username, email, logo, role badge
- [ ] Empty state shows if no players

### Matches Section
- [ ] Match list displays
- [ ] Shows teams, date, status badge
- [ ] Empty state shows if no matches

### Payments Section
- [ ] Payment list displays
- [ ] Shows username, amount, status badge
- [ ] Empty state shows if no payments

### Refresh Button
- [ ] Click refresh button
- [ ] Loading spinner shows
- [ ] Data refreshes
- [ ] Success toast appears

### Logout Button
- [ ] Click logout
- [ ] Clears localStorage
- [ ] Redirects to login page

---

## 6️⃣ API Endpoints Testing

### Authentication Endpoints

**POST /api/auth/register**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new_player",
    "email": "new@example.com",
    "team": "New Team",
    "password": "password123"
  }'
```
- [ ] Returns success with token
- [ ] User created in database

**POST /api/auth/login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "new_player",
    "password": "password123"
  }'
```
- [ ] Returns success with token
- [ ] Wrong password returns error

**GET /api/auth/check-username?username=test**
- [ ] Returns `{"available": true}` for new username
- [ ] Returns `{"available": false}` for existing username

### Match Endpoints

**GET /api/matches/upcoming**
- [ ] Returns upcoming matches (match_date >= today)
- [ ] Ordered by date ascending
- [ ] Limited to 10 results
- [ ] Cached (second request is faster)

**GET /api/matches/results**
- [ ] Returns completed matches
- [ ] Ordered by date descending

**GET /api/matches/league-table**
- [ ] Returns calculated standings
- [ ] Sorted by points, then goal difference
- [ ] Cached

### Admin Endpoints (Requires JWT)

**GET /api/admin/dashboard**
- [ ] Returns all data in one response
- [ ] Includes stats, players, matches, payments
- [ ] Cached (60 seconds)
- [ ] Requires admin role

---

## 7️⃣ Toast Notifications

### Types
- [ ] Success toast (green) - Shows ✓ icon
- [ ] Error toast (red) - Shows ✕ icon
- [ ] Info toast (blue) - Shows ℹ icon

### Behavior
- [ ] Auto-dismisses after set duration
- [ ] Click to dismiss manually
- [ ] Smooth slide-in animation
- [ ] Smooth fade-out animation
- [ ] Multiple toasts stack correctly
- [ ] Mobile responsive

---

## 8️⃣ Performance

### Caching
- [ ] First request to `/api/matches/upcoming` - Normal speed
- [ ] Second request - Instant (from cache)
- [ ] Wait 30 seconds - Cache expires
- [ ] Admin dashboard cached for 60 seconds

### Database
- [ ] Connection pool established
- [ ] Queries use parameterized inputs
- [ ] Indexes created (check database)

---

## 9️⃣ Security

### Password Hashing
- [ ] Check database - passwords are hashed (not plain text)
- [ ] Hash starts with `$2b$10$` (bcrypt format)

### JWT Protection
- [ ] Access protected route without token - Returns 401
- [ ] Access with invalid token - Returns 403
- [ ] Access with expired token - Returns 401

### Input Validation
- [ ] SQL injection attempt in username - Rejected
- [ ] XSS attempt in team name - Sanitized
- [ ] Missing required fields - Returns validation error

---

## 🔟 Push Notifications

### Service Worker
- [ ] Service worker registered (check DevTools > Application)
- [ ] Service worker active
- [ ] No errors in console

### Subscription
- [ ] Notification permission requested
- [ ] If granted, subscription sent to backend
- [ ] Subscription saved in database

### Sending Notifications (Admin)
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test",
    "url": "/"
  }'
```
- [ ] Notification appears in browser
- [ ] Click notification opens URL
- [ ] Works even when tab is closed

---

## 1️⃣1️⃣ Error Handling

### Database Errors
- [ ] Disconnect database - Shows error message
- [ ] Reconnect - Recovers gracefully

### Network Errors
- [ ] Disconnect internet - Shows user-friendly error
- [ ] Reconnect - Works again

### Invalid Data
- [ ] Send malformed JSON - Returns 400
- [ ] Send missing fields - Returns validation error
- [ ] Send invalid types - Returns error

---

## 1️⃣2️⃣ Mobile Responsiveness

### Registration Page
- [ ] Works on mobile (320px width)
- [ ] Form fields are readable
- [ ] Buttons are tappable
- [ ] Logo preview scales correctly

### Login Page
- [ ] Mobile-friendly layout
- [ ] Inputs accessible

### Admin Dashboard
- [ ] Stats grid responsive
- [ ] Cards stack on mobile
- [ ] Text readable

### Index Page
- [ ] Match cards responsive
- [ ] Mobile layout works

---

## Final Checklist

- [ ] All features working
- [ ] No console errors
- [ ] No network errors
- [ ] Database queries optimized
- [ ] Cache working correctly
- [ ] Toast notifications showing
- [ ] Authentication secure
- [ ] Admin dashboard fast
- [ ] Upcoming matches displaying
- [ ] Mobile responsive

---

## 🎉 If All Tests Pass

**Your system is production-ready!**

Next steps:
1. Deploy to production server
2. Setup PostgreSQL in production
3. Configure environment variables
4. Use PM2 or similar process manager
5. Setup monitoring and logging
6. Enable HTTPS
7. Regular backups

---

**Happy Testing! 🚀**
