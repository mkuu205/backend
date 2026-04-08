const { pool } = require('../db');
const { successResponse, errorResponse } = require('../utils/responses');
const cache = require('../services/cache.service');

const createTournament = async (req, res) => {
  try {
    const { name, max_players } = req.body;
    const adminId = req.user.userId;

    if (!name) {
      return errorResponse(res, 'Tournament name is required', 400);
    }

    const validMaxPlayers = [4, 8, 16];
    const maxPlayers = max_players || 8;
    
    if (!validMaxPlayers.includes(maxPlayers)) {
      return errorResponse(res, 'max_players must be 4, 8, or 16', 400);
    }

    // Check if there's already an active tournament
    const activeCheck = await pool.query(
      "SELECT id FROM tournaments WHERE status = 'active' LIMIT 1"
    );

    if (activeCheck.rows.length > 0) {
      return errorResponse(res, 'There is already an active tournament', 400);
    }

    const result = await pool.query(
      `INSERT INTO tournaments (name, max_players, created_by, status) 
       VALUES ($1, $2, $3, 'pending') 
       RETURNING *`,
      [name, maxPlayers, adminId]
    );

    return successResponse(res, 'Tournament created', {
      tournament: result.rows[0]
    }, 201);

  } catch (error) {
    console.error('Create tournament error:', error);
    return errorResponse(res, 'Failed to create tournament', 500);
  }
};

const generateBracket = async (req, res) => {
  try {
    const { tournamentId } = req.params;

    // Get tournament
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId]
    );

    if (tournamentResult.rows.length === 0) {
      return errorResponse(res, 'Tournament not found', 404);
    }

    const tournament = tournamentResult.rows[0];

    if (tournament.status !== 'pending') {
      return errorResponse(res, 'Tournament bracket already generated', 400);
    }

    // Get all players
    const playersResult = await pool.query(
      'SELECT id, username, logo_url FROM users WHERE role = $1 ORDER BY RANDOM() LIMIT $2',
      ['player', tournament.max_players]
    );

    if (playersResult.rows.length < 2) {
      return errorResponse(res, 'Not enough players. Minimum 2 required.', 400);
    }

    // Adjust to power of 2
    const playerCount = playersResult.rows.length;
    const adjustedCount = Math.pow(2, Math.floor(Math.log2(playerCount)));
    const players = playersResult.rows.slice(0, adjustedCount);

    // Generate bracket
    const matches = generateBracketStructure(players, tournamentId);

    // Insert all matches
    await pool.query('BEGIN');

    for (const match of matches) {
      await pool.query(
        `INSERT INTO tournament_matches 
         (tournament_id, round, match_number, player1_id, player2_id, status) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          match.tournament_id,
          match.round,
          match.match_number,
          match.player1_id,
          match.player2_id,
          match.status
        ]
      );
    }

    // Update tournament status
    await pool.query(
      "UPDATE tournaments SET status = 'active', current_round = 1 WHERE id = $1",
      [tournamentId]
    );

    await pool.query('COMMIT');

    // Clear caches
    cache.clear();

    return successResponse(res, 'Tournament bracket generated', {
      matches_count: matches.length,
      players_count: players.length
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Generate bracket error:', error);
    return errorResponse(res, 'Failed to generate bracket', 500);
  }
};

const getTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const result = await pool.query(
      `SELECT t.*, 
       json_agg(json_build_object(
         'id', tm.id,
         'round', tm.round,
         'match_number', tm.match_number,
         'player1_id', tm.player1_id,
         'player2_id', tm.player2_id,
         'winner_id', tm.winner_id,
         'player1_score', tm.player1_score,
         'player2_score', tm.player2_score,
         'status', tm.status,
         'player1_username', p1.username,
         'player1_logo', p1.logo_url,
         'player2_username', p2.username,
         'player2_logo', p2.logo_url
       ) ORDER BY tm.round, tm.match_number) as matches
       FROM tournaments t
       LEFT JOIN tournament_matches tm ON t.id = tm.tournament_id
       LEFT JOIN users p1 ON tm.player1_id = p1.id
       LEFT JOIN users p2 ON tm.player2_id = p2.id
       WHERE t.id = $1
       GROUP BY t.id`,
      [tournamentId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Tournament not found', 404);
    }

    return successResponse(res, 'Tournament retrieved', {
      tournament: result.rows[0]
    });

  } catch (error) {
    console.error('Get tournament error:', error);
    return errorResponse(res, 'Failed to get tournament', 500);
  }
};

const getAllTournaments = async (req, res) => {
  try {
    const { status } = req.query;

    let query = 'SELECT * FROM tournaments ORDER BY created_at DESC';
    const params = [];

    if (status) {
      query = 'SELECT * FROM tournaments WHERE status = $1 ORDER BY created_at DESC';
      params.push(status);
    }

    const result = await pool.query(query, params);

    return successResponse(res, 'Tournaments retrieved', {
      tournaments: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get tournaments error:', error);
    return errorResponse(res, 'Failed to get tournaments', 500);
  }
};

const submitMatchResult = async (req, res) => {
  try {
    const { tournamentId, matchId } = req.params;
    const { player1_score, player2_score } = req.body;

    if (player1_score === undefined || player2_score === undefined) {
      return errorResponse(res, 'Both scores are required', 400);
    }

    // Get match
    const matchResult = await pool.query(
      'SELECT * FROM tournament_matches WHERE id = $1 AND tournament_id = $2',
      [matchId, tournamentId]
    );

    if (matchResult.rows.length === 0) {
      return errorResponse(res, 'Match not found', 404);
    }

    const match = matchResult.rows[0];

    if (match.status === 'completed') {
      return errorResponse(res, 'Match result already submitted', 400);
    }

    // Determine winner
    let winnerId;
    if (player1_score > player2_score) {
      winnerId = match.player1_id;
    } else if (player2_score > player1_score) {
      winnerId = match.player2_id;
    } else {
      return errorResponse(res, 'Tournament matches cannot end in a draw. Use penalties.', 400);
    }

    // Get tournament info
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId]
    );
    const tournament = tournamentResult.rows[0];

    await pool.query('BEGIN');

    // Update match
    await pool.query(
      `UPDATE tournament_matches 
       SET player1_score = $1, player2_score = $2, winner_id = $3, status = 'completed' 
       WHERE id = $4`,
      [player1_score, player2_score, winnerId, matchId]
    );

    // Update player ratings
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
    await updatePlayerRating(winnerId, loserId, true);
    await updatePlayerRating(loserId, winnerId, false);

    // If not final, advance winner to next round
    const totalRounds = Math.log2(tournament.max_players);
    
    if (match.round < totalRounds) {
      // Find next round match
      const nextRoundMatchNumber = Math.ceil(match.match_number / 2);
      const playerSlot = match.match_number % 2 === 1 ? 'player1_id' : 'player2_id';

      await pool.query(
        `UPDATE tournament_matches 
         SET ${playerSlot} = $1 
         WHERE tournament_id = $2 AND round = $3 AND match_number = $4`,
        [winnerId, tournamentId, match.round + 1, nextRoundMatchNumber]
      );
    } else {
      // Final match - tournament completed
      await pool.query(
        "UPDATE tournaments SET status = 'completed' WHERE id = $1",
        [tournamentId]
      );
    }

    await pool.query('COMMIT');

    // Clear caches
    cache.clear();

    return successResponse(res, 'Match result submitted', {
      winner_id: winnerId
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Submit match result error:', error);
    return errorResponse(res, 'Failed to submit match result', 500);
  }
};

// Helper: Generate bracket structure
function generateBracketStructure(players, tournamentId) {
  const matches = [];
  const totalRounds = Math.log2(players.length);

  // Round 1
  for (let i = 0; i < players.length; i += 2) {
    matches.push({
      tournament_id: tournamentId,
      round: 1,
      match_number: i / 2 + 1,
      player1_id: players[i].id,
      player2_id: players[i + 1].id,
      status: 'pending'
    });
  }

  // Subsequent rounds (empty slots)
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = players.length / Math.pow(2, round);
    
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        tournament_id: tournamentId,
        round: round,
        match_number: i + 1,
        player1_id: null,
        player2_id: null,
        status: 'pending'
      });
    }
  }

  return matches;
}

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
         last_opponent_ids = array_append(last_opponent_ids, $3)
     WHERE user_id = $4`,
    [newRating, won, opponentId, playerId]
  );
}

module.exports = {
  createTournament,
  generateBracket,
  getTournament,
  getAllTournaments,
  submitMatchResult
};
