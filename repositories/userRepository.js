const { pool } = require("../db/pool");

const ALLOWED_ROLES = ["admin", "student", "teacher", "parent", "hr", "finance"];

/**
 * Create a new user in the database.
 */
const create = async (name, email, hashedPassword, role) => {
    const result = await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
        [name, email, hashedPassword, role]
    );
    return result.rows[0];
};

/**
 * Find a user by email (includes password for auth).
 */
const findByEmail = async (email) => {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0] || null;
};

/**
 * Find a user by ID (safe fields only).
 */
const findById = async (id) => {
    const result = await pool.query(
        "SELECT id, name, email, role FROM users WHERE id = $1",
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Get all users ordered by creation date.
 */
const findAll = async () => {
    const result = await pool.query(
        "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );
    return result.rows;
};

/**
 * Update a user by ID. Only updates provided fields.
 */
const updateById = async (id, { name, email, role }) => {
    const fields = [];
    const values = [];
    let count = 1;

    if (name) { fields.push(`name = $${count++}`); values.push(name); }
    if (email) { fields.push(`email = $${count++}`); values.push(email); }
    if (role) { fields.push(`role = $${count++}`); values.push(role); }
    values.push(id);

    const result = await pool.query(
        `UPDATE users SET ${fields.join(", ")} WHERE id = $${count} RETURNING id, name, email, role, created_at`,
        values
    );
    return result.rows[0] || null;
};

/**
 * Delete a user by ID.
 */
const deleteById = async (id) => {
    const result = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING id, name, email",
        [id]
    );
    return result.rows[0] || null;
};

module.exports = {
    ALLOWED_ROLES,
    create,
    findByEmail,
    findById,
    findAll,
    updateById,
    deleteById,
};
