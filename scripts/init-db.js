const { pool } = require('../db');

async function initializeDatabase() {
  console.log('Initializing database schema...');

  try {
    await pool.query('BEGIN');
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username VARCHAR(15) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        team_name VARCHAR(30) NOT NULL,
        logo_url TEXT,
        phone VARCHAR(20),
        rating INTEGER DEFAULT 1000 NOT NULL,
        wins INTEGER DEFAULT 0 NOT NULL,
        losses INTEGER DEFAULT 0 NOT NULL,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        role VARCHAR(20) DEFAULT 'player',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 1000 NOT NULL,
      ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        home_team VARCHAR(100) NOT NULL,
        away_team VARCHAR(100) NOT NULL,
        home_score INTEGER,
        away_score INTEGER,
        match_date DATE NOT NULL,
        match_time TIME DEFAULT '14:00',
        venue VARCHAR(100) DEFAULT 'TBD',
        status VARCHAR(20) DEFAULT 'scheduled',
        competition_id INTEGER,
        player1_id UUID REFERENCES users(id) ON DELETE SET NULL,
        player2_id UUID REFERENCES users(id) ON DELETE SET NULL,
        winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        round VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      ALTER TABLE matches
      ADD COLUMN IF NOT EXISTS competition_id INTEGER,
      ADD COLUMN IF NOT EXISTS player1_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS player2_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS round VARCHAR(50)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        transaction_code VARCHAR(100),
        payment_type VARCHAR(50) DEFAULT 'tournament_entry',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        keys JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        url TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS competitions (
        id SERIAL PRIMARY KEY,
        mode TEXT DEFAULT 'league' CHECK (mode IN ('league', 'tournament')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recent_matchups (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        player1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        player2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_players_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_players_rating ON users(rating);
      CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
      CREATE INDEX IF NOT EXISTS idx_matches_competition ON matches(competition_id);
      CREATE INDEX IF NOT EXISTS idx_recent_matchups_players ON recent_matchups(player1_id, player2_id);
    `);

    const modeResult = await pool.query('SELECT id FROM competitions LIMIT 1');
    if (!modeResult.rows.length) {
      await pool.query(`INSERT INTO competitions (mode) VALUES ('league')`);
    }

    await pool.query('COMMIT');
    await insertDefaultAdmin();
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

async function insertDefaultAdmin() {
  const bcrypt = require('bcrypt');
  const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);

  if (!rows.length) {
    const hashedPassword = await bcrypt.hash('admin2025', 10);
    await pool.query(
      `INSERT INTO users (username, email, password_hash, team_name, role, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'admin',
        'admin@kishtech.co.ke',
        hashedPassword,
        'Admin',
        'admin',
        'https://api.dicebear.com/7.x/initials/svg?seed=Admin'
      ]
    );
  }
}

module.exports = { initializeDatabase };
