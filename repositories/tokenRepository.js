const { pool } = require("../db/pool");

/**
 * Add a token to the blacklist.
 */
const blacklist = async (token, expiresAt) => {
    await pool.query(
        "INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING",
        [token, expiresAt]
    );
};

/**
 * Check if a token is blacklisted.
 */
const isBlacklisted = async (token) => {
    const result = await pool.query(
        "SELECT 1 FROM token_blacklist WHERE token = $1",
        [token]
    );
    return result.rows.length > 0;
};

/**
 * Remove expired tokens from the blacklist.
 */
const cleanupExpired = async () => {
    await pool.query("DELETE FROM token_blacklist WHERE expires_at < NOW()");
};

module.exports = { blacklist, isBlacklisted, cleanupExpired };
