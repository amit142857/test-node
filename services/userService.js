const userRepository = require("../repositories/userRepository");

/**
 * Get all users.
 */
const getAllUsers = async () => {
    return await userRepository.findAll();
};

/**
 * Get a single user by ID.
 */
const getUserById = async (id) => {
    const user = await userRepository.findById(id);
    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }
    return user;
};

/**
 * Update a user by ID.
 * Validates that at least one field is provided and role is valid.
 */
const updateUser = async (id, { name, email, role }) => {
    if (!name && !email && !role) {
        const error = new Error("Provide at least a name, email or role to update");
        error.status = 400;
        throw error;
    }

    if (role && !userRepository.ALLOWED_ROLES.includes(role)) {
        const error = new Error(`Role must be one of: ${userRepository.ALLOWED_ROLES.join(", ")}`);
        error.status = 400;
        throw error;
    }

    try {
        const user = await userRepository.updateById(id, { name, email, role });
        if (!user) {
            const error = new Error("User not found");
            error.status = 404;
            throw error;
        }
        return user;
    } catch (err) {
        if (err.code === "23505") {
            const error = new Error("Email already in use");
            error.status = 400;
            throw error;
        }
        throw err;
    }
};

/**
 * Delete a user by ID.
 */
const deleteUser = async (id) => {
    const user = await userRepository.deleteById(id);
    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }
    return user;
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser };
