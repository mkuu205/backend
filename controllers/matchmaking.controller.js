const { pool } = require('../db');
const { successResponse, errorResponse } = require('../utils/responses');

const findMatch = async (req, res) => {
  try {
    const playerId = req.user.userId;

    // Get player's rating
    const playerResult = await pool.query(
      'SELECT * FROM player_ratings WHERE user_id = $1',
      [playerId]
    );

    if (playerResult.rows.length === 0) {
      return errorResponse(res, 'Player rating not found', 404);
    }

    const player = playerResult.rows[0];

    // Find opponents with increasing rating range
    let ratingRange = 100;
    let opponents = [];

    while (ratingRange <= 500 && opponents.length === 0) {
      opponents = await pool.query(
        `SELECT pr.user_id, pr.rating, u.username, u.logo_url, pr.last_seen
         FROM player_ratings pr
         JOIN users u ON pr.user_id = u.id
         WHERE pr.user_id != $1
         AND pr.rating BETWEEN $2 AND $3
         AND pr.last_seen > CURRENT_TIMESTAMP - INTERVAL '7 days'
         AND $1 != ALL(pr.last_opponent_ids[:3])
         ORDER BY ABS(pr.rating - $4) ASC
         LIMIT 1`,
        [playerId, player.rating - ratingRange, player.rating + ratingRange, player.rating]
      );

      ratingRange += 100;
    }

    if (opponents.rows.length === 0) {
      return successResponse(res, 'No suitable opponent found. Try again later.', {
        opponent: null
      });
    }

    return successResponse(res, 'Match found!', {
      opponent: opponents.rows[0]
    });

  } catch (error) {
    console.error('Find match error:', error);
    return errorResponse(res, 'Failed to find match', 500);
  }
};

const recordCasualMatch = async (req, res) => {
  try {
    const { opponent_id, player_score, opponent_score } = req.body;
    const playerId = req.user.userId;

    if (!opponent_id || player_score === undefined || opponent_score === undefined) {
      return errorResponse(res, 'opponent_id, player_score, and opponent_score are required', 400);
    }

    const playerWon = player_score > opponent_score;

    await pool.query('BEGIN');

    // Update player rating
    await updatePlayerRating(playerId, opponent_id, playerWon);
    await updatePlayerRating(opponent_id, playerId, !playerWon);

    await pool.query('COMMIT');

    return successResponse(res, 'Match result recorded', {
      player_won: playerWon
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Record casual match error:', error);
    return errorResponse(res, 'Failed to record match', 500);
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.user_id, pr.rating, pr.wins, pr.losses, pr.draws, pr.last_seen,
              u.username, u.logo_url, u.team_name
       FROM player_ratings pr
       JOIN users u ON pr.user_id = u.id
       WHERE u.role = 'player'
       ORDER BY pr.rating DESC
       LIMIT 50`
    );

    return successResponse(res, 'Leaderboard retrieved', {
      leaderboard: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    return errorResponse(res, 'Failed to get leaderboard', 500);
  }
};

// Helper: Update player rating (ELO)
async function updatePlayerRating(playerId, opponentId, won) {
  const playerResult = await pool.query(
    'SELECT * FROM player_ratings WHERE user_id = $1',
    [playerId]
  );

  const opponentResult = await pool.query(
    'SELECT rating FROM player_ratings WHERE user_id = $1',
    [opponentId]
  );

  if (playerResult.rows.length === 0 || opponentResult.rows.length === 0) {
    return;
  }

  const player = playerResult.rows[0];
  const opponent = opponentResult.rows[0];

  const K = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (opponent.rating - player.rating) / 400));
  const actualScore = won ? 1 : 0;
  const newRating = Math.round(player.rating + K * (actualScore - expectedScore));

  await pool.query(
    `UPDATE player_ratings 
     SET rating = $1, 
         wins = wins + CASE WHEN $2 THEN 1 ELSE 0 END,
         losses = losses + CASE WHEN $2 THEN 0 ELSE 1 END,
         last_seen = CURRENT_TIMESTAMP,
         last_opponent_ids = array_append(last_opponent_ids[:9], $3)
     WHERE user_id = $4`,
    [newRating, won, opponentId, playerId]
  );
}

module.exports = {
  findMatch,
  recordCasualMatch,
  getLeaderboard
};
