const { pool } = require('../db');
const { successResponse, errorResponse } = require('../utils/responses');
const cache = require('../services/cache.service');

const getCompetitionMode = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT mode, status FROM competitions ORDER BY id DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return successResponse(res, 'Competition mode retrieved', {
        mode: 'league',
        status: 'active'
      });
    }

    return successResponse(res, 'Competition mode retrieved', result.rows[0]);

  } catch (error) {
    console.error('Get competition mode error:', error);
    return errorResponse(res, 'Failed to get competition mode', 500);
  }
};

const setCompetitionMode = async (req, res) => {
  try {
    const { mode } = req.body;

    if (!['league', 'tournament'].includes(mode)) {
      return errorResponse(res, 'Invalid mode. Must be "league" or "tournament"', 400);
    }

    await pool.query(
      `INSERT INTO competitions (mode, status, created_at, updated_at) 
       VALUES ($1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [mode]
    );

    // Clear all caches
    cache.clear();

    return successResponse(res, 'Competition mode updated', { mode });

  } catch (error) {
    console.error('Set competition mode error:', error);
    return errorResponse(res, 'Failed to set competition mode', 500);
  }
};

const getStandings = async (req, res) => {
  try {
    const modeResult = await pool.query(
      'SELECT mode FROM competitions ORDER BY id DESC LIMIT 1'
    );
    const mode = modeResult.rows[0]?.mode || 'league';

    if (mode === 'league') {
      // Return league table
      const matchesResult = await pool.query(
        `SELECT home_team, away_team, home_score, away_score 
         FROM matches 
         WHERE status = 'completed'`
      );

      const teamsResult = await pool.query(
        `SELECT DISTINCT team_name FROM users WHERE role = 'player'`
      );

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

      const sortedTable = Object.values(table)
        .sort((a, b) => b.points - a.points || b.gd - a.gd);

      return successResponse(res, 'League standings retrieved', {
        mode: 'league',
        standings: sortedTable
      });

    } else {
      // Return active tournament
      const tournamentResult = await pool.query(
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
         )) as matches
         FROM tournaments t
         LEFT JOIN tournament_matches tm ON t.id = tm.tournament_id
         LEFT JOIN users p1 ON tm.player1_id = p1.id
         LEFT JOIN users p2 ON tm.player2_id = p2.id
         WHERE t.status = 'active'
         GROUP BY t.id
         ORDER BY t.created_at DESC
         LIMIT 1`
      );

      if (tournamentResult.rows.length === 0) {
        return successResponse(res, 'No active tournament', {
          mode: 'tournament',
          tournament: null
        });
      }

      return successResponse(res, 'Tournament bracket retrieved', {
        mode: 'tournament',
        tournament: tournamentResult.rows[0]
      });
    }

  } catch (error) {
    console.error('Get standings error:', error);
    return errorResponse(res, 'Failed to get standings', 500);
  }
};

module.exports = {
  getCompetitionMode,
  setCompetitionMode,
  getStandings
};
