const { pool } = require('../db');

const SEARCH_WINDOWS = [100, 200, Number.MAX_SAFE_INTEGER];

function normalizePair(a, b) {
  return [a, b].sort().join(':');
}

async function getRecentOpponents(playerId, days = 14) {
  const { rows } = await pool.query(
    `SELECT player1_id, player2_id
     FROM recent_matchups
     WHERE (player1_id = $1 OR player2_id = $1)
       AND created_at >= NOW() - ($2 || ' days')::interval`,
    [playerId, String(days)]
  );
  const set = new Set();
  for (const row of rows) {
    set.add(normalizePair(row.player1_id, row.player2_id));
  }
  return set;
}

async function findMatchForPlayer(requestedPlayerId) {
  const targetQuery = await pool.query(
    `SELECT id, username, team_name, rating, last_seen
     FROM users
     WHERE id = $1 AND role = 'player'`,
    [requestedPlayerId]
  );
  if (!targetQuery.rows.length) {
    throw new Error('Player not found');
  }
  const target = targetQuery.rows[0];
  const recentSet = await getRecentOpponents(target.id);

  const candidatesQuery = await pool.query(
    `SELECT id, username, team_name, rating, last_seen
     FROM users
     WHERE role = 'player'
       AND id != $1
       AND last_seen >= NOW() - INTERVAL '30 days'
     ORDER BY ABS(rating - $2) ASC, last_seen DESC`,
    [target.id, target.rating]
  );

  for (const window of SEARCH_WINDOWS) {
    const candidate = candidatesQuery.rows.find((p) => {
      const diff = Math.abs(Number(p.rating) - Number(target.rating));
      if (window !== Number.MAX_SAFE_INTEGER && diff > window) return false;
      return !recentSet.has(normalizePair(target.id, p.id));
    });
    if (candidate) {
      return { target, opponent: candidate, searchWindow: window };
    }
  }

  return null;
}

module.exports = {
  findMatchForPlayer
};
