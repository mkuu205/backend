const { pool } = require('../db');
const { getCurrentCompetition } = require('./competition.service');

const ROUND_ORDER = ['quarterfinal', 'semifinal', 'final'];

function pairPlayers(players) {
  const pairs = [];
  for (let i = 0; i < players.length; i += 2) {
    if (players[i + 1]) pairs.push([players[i], players[i + 1]]);
  }
  return pairs;
}

async function createTournament() {
  const competition = await getCurrentCompetition();
  return competition;
}

async function generateBracket() {
  const competition = await getCurrentCompetition();
  const { rows: players } = await pool.query(
    `SELECT id, username, team_name, rating
     FROM users
     WHERE role = 'player'
     ORDER BY rating DESC, created_at ASC
     LIMIT 8`
  );

  if (players.length < 2) {
    throw new Error('At least 2 players are required');
  }

  await pool.query('DELETE FROM matches WHERE competition_id = $1 AND round IS NOT NULL', [competition.id]);

  const quarterPairs = pairPlayers(players);
  const created = [];

  for (const [p1, p2] of quarterPairs) {
    const { rows } = await pool.query(
      `INSERT INTO matches
      (home_team, away_team, status, match_date, competition_id, player1_id, player2_id, round, venue)
      VALUES ($1, $2, 'scheduled', CURRENT_DATE, $3, $4, $5, 'quarterfinal', 'Online Arena')
      RETURNING *`,
      [p1.team_name, p2.team_name, competition.id, p1.id, p2.id]
    );
    created.push(rows[0]);
  }

  return {
    competition_id: competition.id,
    round: 'quarterfinal',
    matches: created
  };
}

async function buildNextRound(competitionId, round) {
  const { rows } = await pool.query(
    `SELECT winner_id
     FROM matches
     WHERE competition_id = $1 AND round = $2 AND winner_id IS NOT NULL
     ORDER BY created_at ASC`,
    [competitionId, round]
  );

  const winnerIds = rows.map((r) => r.winner_id);
  if (winnerIds.length < 2) return [];

  const nextRound = round === 'quarterfinal' ? 'semifinal' : 'final';
  const paired = pairPlayers(winnerIds);
  const created = [];

  for (const [p1Id, p2Id] of paired) {
    const userRows = await pool.query(
      `SELECT id, team_name FROM users WHERE id = ANY($1::uuid[])`,
      [[p1Id, p2Id]]
    );
    const p1 = userRows.rows.find((r) => r.id === p1Id);
    const p2 = userRows.rows.find((r) => r.id === p2Id);
    if (!p1 || !p2) continue;

    const inserted = await pool.query(
      `INSERT INTO matches
      (home_team, away_team, status, match_date, competition_id, player1_id, player2_id, round, venue)
      VALUES ($1, $2, 'scheduled', CURRENT_DATE, $3, $4, $5, $6, 'Online Arena')
      RETURNING *`,
      [p1.team_name, p2.team_name, competitionId, p1Id, p2Id, nextRound]
    );
    created.push(inserted.rows[0]);
  }

  return created;
}

async function saveTournamentResult(matchId, winnerId, homeScore, awayScore) {
  const updated = await pool.query(
    `UPDATE matches
     SET winner_id = $1,
         home_score = $2,
         away_score = $3,
         status = 'completed',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [winnerId, homeScore, awayScore, matchId]
  );

  if (!updated.rows.length) {
    throw new Error('Match not found');
  }

  const match = updated.rows[0];
  if (!ROUND_ORDER.includes(match.round)) return { match, generated: [] };

  const generated = await buildNextRound(match.competition_id, match.round);
  return { match, generated };
}

async function getTournament(competitionId) {
  const result = await pool.query(
    `SELECT m.*, 
      p1.username AS player1_username,
      p2.username AS player2_username,
      w.username AS winner_username
     FROM matches m
     LEFT JOIN users p1 ON p1.id = m.player1_id
     LEFT JOIN users p2 ON p2.id = m.player2_id
     LEFT JOIN users w ON w.id = m.winner_id
     WHERE m.competition_id = $1 AND m.round IS NOT NULL
     ORDER BY m.created_at ASC`,
    [competitionId]
  );
  return result.rows;
}

module.exports = {
  createTournament,
  generateBracket,
  getTournament,
  saveTournamentResult
};
