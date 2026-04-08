const { pool } = require('../db');
const { successResponse, errorResponse } = require('../utils/responses');
const cache = require('../services/cache.service');

const getUpcomingMatches = async (req, res) => {
  try {
    // Get current competition mode
    const modeResult = await pool.query('SELECT mode FROM competitions LIMIT 1');
    const mode = modeResult.rows[0]?.mode || 'league';

    if (mode === 'league') {
      // Check cache first
      const cached = cache.get('upcoming_matches');
      if (cached) {
        return successResponse(res, 'Upcoming matches retrieved', cached);
      }

      const result = await pool.query(
        `SELECT id, home_team, away_team, match_date, match_time, venue, status 
         FROM matches 
         WHERE match_date >= CURRENT_DATE 
         AND status = 'scheduled'
         ORDER BY match_date ASC, match_time ASC
         LIMIT 10`
      );

      const matches = result.rows;

      // Cache for 30 seconds
      cache.set('upcoming_matches', { matches }, 30000);

      return successResponse(res, 'Upcoming matches retrieved', { matches });
    } else {
      // Tournament mode - return pending tournament matches
      const tournamentResult = await pool.query(
        `SELECT tm.id, tm.round, tm.match_number, tm.status,
                p1.username as player1_username, p1.logo_url as player1_logo,
                p2.username as player2_username, p2.logo_url as player2_logo,
                t.name as tournament_name
         FROM tournament_matches tm
         LEFT JOIN users p1 ON tm.player1_id = p1.id
         LEFT JOIN users p2 ON tm.player2_id = p2.id
         LEFT JOIN tournaments t ON tm.tournament_id = t.id
         WHERE tm.tournament_id = (
           SELECT id FROM tournaments WHERE status = 'active' LIMIT 1
         )
         AND tm.status = 'pending'
         AND tm.player1_id IS NOT NULL
         AND tm.player2_id IS NOT NULL
         ORDER BY tm.round ASC, tm.match_number ASC
         LIMIT 10`
      );

      return successResponse(res, 'Tournament matches retrieved', { 
        matches: tournamentResult.rows,
        mode: 'tournament'
      });
    }
  } catch (error) {
    console.error('Get upcoming matches error:', error);
    return errorResponse(res, 'Failed to load upcoming matches', 500);
  }
};

const getAllMatches = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, home_team, away_team, home_score, away_score, match_date, match_time, venue, status 
       FROM matches 
       ORDER BY match_date DESC, match_time DESC
       LIMIT 100`
    );

    return successResponse(res, 'Matches retrieved', {
      matches: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get matches error:', error);
    return errorResponse(res, 'Failed to load matches', 500);
  }
};

const getResults = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, home_team, away_team, home_score, away_score, match_date, match_time, venue 
       FROM matches 
       WHERE status = 'completed'
       ORDER BY match_date DESC, match_time DESC
       LIMIT 50`
    );

    return successResponse(res, 'Results retrieved', {
      results: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get results error:', error);
    return errorResponse(res, 'Failed to load results', 500);
  }
};

const createMatch = async (req, res) => {
  try {
    const { home_team, away_team, match_date, match_time, venue } = req.body;

    if (!home_team || !away_team || !match_date) {
      return errorResponse(res, 'Home team, away team, and match date are required', 400);
    }

    const result = await pool.query(
      `INSERT INTO matches (home_team, away_team, match_date, match_time, venue, status) 
       VALUES ($1, $2, $3, $4, $5, 'scheduled') 
       RETURNING *`,
      [home_team, away_team, match_date, match_time || '14:00', venue || 'TBD']
    );

    // Clear cache
    cache.del('upcoming_matches');
    cache.del('admin_dashboard');

    return successResponse(res, 'Match created', { match: result.rows[0] }, 201);

  } catch (error) {
    console.error('Create match error:', error);
    return errorResponse(res, 'Failed to create match', 500);
  }
};

const updateMatchResult = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { home_score, away_score } = req.body;

    if (home_score === undefined || away_score === undefined) {
      return errorResponse(res, 'Home score and away score are required', 400);
    }

    const result = await pool.query(
      `UPDATE matches 
       SET home_score = $1, away_score = $2, status = 'completed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [home_score, away_score, matchId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Match not found', 404);
    }

    // Clear cache
    cache.del('upcoming_matches');
    cache.del('admin_dashboard');
    cache.del('league_table');

    return successResponse(res, 'Match result updated', { match: result.rows[0] });

  } catch (error) {
    console.error('Update match result error:', error);
    return errorResponse(res, 'Failed to update match result', 500);
  }
};

const getLeagueTable = async (req, res) => {
  try {
    // Check cache first
    const cached = cache.get('league_table');
    if (cached) {
      return successResponse(res, 'League table retrieved', cached);
    }

    // Get all completed matches
    const matchesResult = await pool.query(
      `SELECT home_team, away_team, home_score, away_score 
       FROM matches 
       WHERE status = 'completed'`
    );

    // Get all unique teams
    const teamsResult = await pool.query(
      `SELECT DISTINCT team_name FROM users WHERE role = 'player'`
    );

    // Initialize table
    const table = {};
    teamsResult.rows.forEach(team => {
      table[team.team_name] = {
        team: team.team_name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0
      };
    });

    // Calculate stats
    matchesResult.rows.forEach(match => {
      const home = table[match.home_team];
      const away = table[match.away_team];

      if (!home || !away) return;

      home.played++;
      away.played++;
      home.gf += match.home_score;
      home.ga += match.away_score;
      away.gf += match.away_score;
      away.ga += match.home_score;

      if (match.home_score > match.away_score) {
        home.won++;
        away.lost++;
        home.points += 3;
      } else if (match.home_score < match.away_score) {
        away.won++;
        home.lost++;
        away.points += 3;
      } else {
        home.drawn++;
        away.drawn++;
        home.points += 1;
        away.points += 1;
      }

      home.gd = home.gf - home.ga;
      away.gd = away.gf - away.ga;
    });

    // Convert to array and sort
    const sortedTable = Object.values(table)
      .sort((a, b) => b.points - a.points || b.gd - a.gd);

    const responseData = { table: sortedTable };

    // Cache for 60 seconds
    cache.set('league_table', responseData, 60000);

    return successResponse(res, 'League table retrieved', responseData);

  } catch (error) {
    console.error('Get league table error:', error);
    return errorResponse(res, 'Failed to calculate league table', 500);
  }
};

module.exports = {
  getUpcomingMatches,
  getAllMatches,
  getResults,
  createMatch,
  updateMatchResult,
  getLeagueTable
};
