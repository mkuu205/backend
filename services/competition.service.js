const { pool } = require('../db');

async function getCurrentCompetition() {
  const { rows } = await pool.query(
    'SELECT id, mode FROM competitions ORDER BY id DESC LIMIT 1'
  );
  return rows[0] || { id: 1, mode: 'league' };
}

async function setCompetitionMode(mode) {
  const normalized = String(mode || '').toLowerCase();
  if (!['league', 'tournament'].includes(normalized)) {
    throw new Error('Mode must be league or tournament');
  }

  const { rows } = await pool.query(
    'INSERT INTO competitions (mode) VALUES ($1) RETURNING id, mode, created_at',
    [normalized]
  );
  return rows[0];
}

module.exports = {
  getCurrentCompetition,
  setCompetitionMode
};
