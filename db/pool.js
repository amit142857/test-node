const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

async function initDb() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(200) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'student',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student'
  `);

    // Table to track invalidated (logged-out) tokens
    await pool.query(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    console.log("Database ready");
}

module.exports = { pool, initDb };