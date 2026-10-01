const { pool } = require("../db/pool");

/**
 * Update the avatar URL for a user profile.
 */
const updateAvatarUrl = async (userId, avatarUrl) => {
    await pool.query(
        "UPDATE profiles SET avatar_url = $1 WHERE id = $2",
        [avatarUrl, userId]
    );
};

module.exports = { updateAvatarUrl };
