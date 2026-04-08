const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// Public routes
router.get('/upcoming', matchController.getUpcomingMatches);
router.get('/results', matchController.getResults);
router.get('/league-table', matchController.getLeagueTable);
router.get('/', matchController.getAllMatches);

// Admin routes
router.post('/', authenticateToken, requireAdmin, matchController.createMatch);
router.put('/:matchId/result', authenticateToken, requireAdmin, matchController.updateMatchResult);

module.exports = router;
