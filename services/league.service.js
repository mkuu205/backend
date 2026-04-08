const { pool } = require('../db');

async function getStandings() {
  const playersResult = await pool.query(
    `SELECT DISTINCT team_name
     FROM users
     WHERE role = 'player'`
  );

  const matchesResult = await pool.query(
    `SELECT home_team, away_team, home_score, away_score
     FROM matches
     WHERE status = 'completed'`
  );

  const table = {};
  for (const row of playersResult.rows) {
    table[row.team_name] = {
      team: row.team_name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0
    };
  }

  for (const match of matchesResult.rows) {
    const home = table[match.home_team];
    const away = table[match.away_team];
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goals_for += Number(match.home_score || 0);
    home.goals_against += Number(match.away_score || 0);
    away.goals_for += Number(match.away_score || 0);
    away.goals_against += Number(match.home_score || 0);

    if (match.home_score > match.away_score) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (match.home_score < match.away_score) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const standings = Object.values(table).map((entry) => ({
    ...entry,
    goal_difference: entry.goals_for - entry.goals_against
  }));

  standings.sort((a, b) => (
    b.points - a.points
    || b.goal_difference - a.goal_difference
    || b.goals_for - a.goals_for
    || a.team.localeCompare(b.team)
  ));

  return standings;
}

module.exports = {
  getStandings
};
