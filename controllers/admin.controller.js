const { pool } = require('../db');
const { successResponse, errorResponse } = require('../utils/responses');
const cache = require('../services/cache.service');

const getDashboard = async (req, res) => {
  try {
    // Check cache first
    const cached = cache.get('admin_dashboard');
    if (cached) {
      return successResponse(res, 'Dashboard data retrieved', cached);
    }

    // Get all data in parallel
    const [
      statsResult,
      playersResult,
      matchesResult,
      paymentsResult,
      modeResult
    ] = await Promise.all([
      pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'player') as total_players,
          (SELECT COUNT(*) FROM matches) as total_matches,
          (SELECT COUNT(*) FROM matches WHERE status = 'completed') as completed_matches,
          (SELECT COUNT(*) FROM payments WHERE status = 'completed') as completed_payments,
          (SELECT COUNT(*) FROM payments WHERE status = 'pending') as pending_payments
      `),
      pool.query(`
        SELECT id, username, email, team_name, logo_url, phone, role, created_at 
        FROM users 
        ORDER BY created_at DESC
      `),
      pool.query(`
        SELECT id, home_team, away_team, home_score, away_score, match_date, match_time, status 
        FROM matches 
        ORDER BY match_date DESC, match_time DESC
        LIMIT 50
      `),
      pool.query(`
        SELECT p.id, p.amount, p.status, p.transaction_code, p.payment_type, p.created_at,
               u.username, u.email
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 50
      `),
      pool.query('SELECT mode FROM competitions LIMIT 1')
    ]);

    const dashboard = {
      stats: statsResult.rows[0],
      players: playersResult.rows,
      matches: matchesResult.rows,
      payments: paymentsResult.rows,
      competition_mode: modeResult.rows[0]?.mode || 'league'
    };

    // Cache for 60 seconds
    cache.set('admin_dashboard', dashboard, 60000);

    return successResponse(res, 'Dashboard data retrieved', dashboard);

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return errorResponse(res, 'Failed to load dashboard', 500);
  }
};

const getPlayers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, team_name, logo_url, phone, role, created_at FROM users ORDER BY created_at DESC'
    );

    return successResponse(res, 'Players retrieved', {
      players: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get players error:', error);
    return errorResponse(res, 'Failed to load players', 500);
  }
};

const updatePlayerRole = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { role } = req.body;

    if (!['player', 'admin'].includes(role)) {
      return errorResponse(res, 'Invalid role. Must be player or admin', 400);
    }

    await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [role, playerId]
    );

    // Clear cache
    cache.del('admin_dashboard');

    return successResponse(res, 'Player role updated');

  } catch (error) {
    console.error('Update player role error:', error);
    return errorResponse(res, 'Failed to update player role', 500);
  }
};

const deletePlayer = async (req, res) => {
  try {
    const { playerId } = req.params;

    await pool.query('DELETE FROM users WHERE id = $1', [playerId]);

    // Clear cache
    cache.del('admin_dashboard');

    return successResponse(res, 'Player deleted');

  } catch (error) {
    console.error('Delete player error:', error);
    return errorResponse(res, 'Failed to delete player', 500);
  }
};

module.exports = {
  getDashboard,
  getAdminDashboard: getDashboard,
  getPlayers,
  updatePlayerRole,
  deletePlayer
};
