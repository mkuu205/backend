const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { getCurrentCompetition, setCompetitionMode } = require('../services/competition.service');
const { getStandings } = require('../services/league.service');
const { errorResponse } = require('../utils/responses');

router.get('/mode', async (req, res) => {
  try {
    const mode = await getCurrentCompetition();
    return res.json(mode);
  } catch (error) {
    return errorResponse(res, 'Failed to get competition mode', 500);
  }
});

router.get('/standings', async (req, res) => {
  try {
    const table = await getStandings();
    return res.json({ table });
  } catch (error) {
    return errorResponse(res, 'Failed to get standings', 500);
  }
});

router.post('/mode', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const mode = await setCompetitionMode(req.body.mode);
    return res.json({ success: true, ...mode });
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

module.exports = router;
