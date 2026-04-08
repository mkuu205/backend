const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const {
  createTournament,
  generateBracket,
  getTournament,
  saveTournamentResult
} = require('../services/tournament.service');
const { getCurrentCompetition } = require('../services/competition.service');
const { errorResponse } = require('../utils/responses');

router.post('/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const competition = await createTournament();
    return res.json({ success: true, competition });
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

router.post('/generate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bracket = await generateBracket();
    return res.json({ success: true, bracket });
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id) || (await getCurrentCompetition()).id;
    const matches = await getTournament(id);
    return res.json({ success: true, matches });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch tournament', 500);
  }
});

router.post('/match/result', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { matchId, winnerId, homeScore, awayScore } = req.body;
    const result = await saveTournamentResult(matchId, winnerId, homeScore, awayScore);
    return res.json({ success: true, ...result });
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

module.exports = router;
