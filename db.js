const { Pool } = require('pg');

const defaultConnectionString = 'postgresql://neondb_owner@ep-red-thunder-ab4f9lay.eu-west-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || defaultConnectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('connect', () => console.log('✅ PostgreSQL connection established'));
pool.on('error', (err) => console.error('❌ Unexpected PostgreSQL error:', err));

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
