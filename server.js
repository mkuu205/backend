const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./scripts/init-db');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const matchRoutes = require('./routes/match.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const competitionRoutes = require('./routes/competition.routes');
const tournamentRoutes = require('./routes/tournament.routes');
const matchmakingRoutes = require('./routes/matchmaking.routes');
const authController = require('./controllers/auth.controller');
const matchController = require('./controllers/match.controller');
const adminController = require('./controllers/admin.controller');
const notificationService = require('./services/notification.service');
const { authenticateToken, requireAdmin } = require('./middleware/auth.middleware');
const { getCurrentCompetition, setCompetitionMode } = require('./services/competition.service');
const { getStandings } = require('./services/league.service');
const { saveTournamentResult } = require('./services/tournament.service');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================
const corsOptions = {
  origin: [
    'https://tournament.kishtech.co.ke',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// ==================== STATIC FILES ====================
// Serve frontend from separate frontend folder
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// ==================== SERVICE WORKER ====================
app.get('/sw.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(frontendPath, 'sw.js'));
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    message: 'eFootball League 2026 API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    database: 'PostgreSQL'
  });
});

// ==================== API ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/competition', competitionRoutes);
app.use('/api/tournament', tournamentRoutes);
app.use('/api', matchmakingRoutes);

// Required top-level compatibility endpoints
app.get('/api/check-username', authController.checkUsername);
app.get('/api/upcoming-matches', matchController.getUpcomingMatches);
app.get('/api/admin-dashboard', authenticateToken, requireAdmin, adminController.getDashboard);
app.post('/api/set-mode', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const mode = await setCompetitionMode(req.body.mode);
    res.json({ success: true, ...mode });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
app.get('/api/mode', async (req, res) => {
  const mode = await getCurrentCompetition();
  res.json(mode);
});
app.get('/api/standings', async (req, res) => {
  const standings = await getStandings();
  res.json({ table: standings });
});
app.post('/api/match/result', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { matchId, winnerId, homeScore, awayScore } = req.body;
    const result = await saveTournamentResult(matchId, winnerId, homeScore, awayScore);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
app.post('/api/save-subscription', notificationService.saveSubscription);
app.post('/api/send-notification', authenticateToken, requireAdmin, notificationService.sendNotification);
app.use('/api/matchmaking', matchmakingRoutes);

// ==================== FRONTEND ROUTES ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(frontendPath, 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin.html'));
});

// ==================== 404 HANDLER ====================
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// ==================== START SERVER ====================
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 eFootball League 2026 Backend`);
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: PostgreSQL\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
