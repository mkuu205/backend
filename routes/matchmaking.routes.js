const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { findMatchForPlayer } = require('../services/matchmaking.service');
const { errorResponse } = require('../utils/responses');

router.get('/find-match', authenticateToken, async (req, res) => {
  try {
    const result = await findMatchForPlayer(req.user.id);
    if (!result) return res.json({ success: true, found: false });
    return res.json({ success: true, found: true, ...result });
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

module.exports = router;
