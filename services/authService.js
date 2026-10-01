const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");
const tokenRepository = require("../repositories/tokenRepository");

/**
 * Register a new user.
 * Validates role, hashes password, creates user in DB.
 * Returns the newly created user (without password).
 */
const signup = async ({ name, email, password, role }) => {
    if (!name || !email || !password || !role) {
        const error = new Error("Name, email, password and role are required");
        error.status = 400;
        throw error;
    }

    if (!userRepository.ALLOWED_ROLES.includes(role)) {
        const error = new Error(`Role must be one of: ${userRepository.ALLOWED_ROLES.join(", ")}`);
        error.status = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await userRepository.create(name, email, hashedPassword, role);
        return user;
    } catch (err) {
        if (err.code === "23505") {
            const error = new Error("Email already registered");
            error.status = 400;
            throw error;
        }
        throw err;
    }
};

/**
 * Authenticate a user with email and password.
 * Returns a JWT token on success.
 */
const login = async ({ email, password }) => {
    if (!email || !password) {
        const error = new Error("Email and password are required");
        error.status = 400;
        throw error;
    }

    const user = await userRepository.findByEmail(email);

    if (!user) {
        const error = new Error("Invalid email or password");
        error.status = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        const error = new Error("Invalid email or password");
        error.status = 401;
        throw error;
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    return token;
};

/**
 * Logout by blacklisting the current token.
 * Also cleans up expired blacklisted tokens.
 */
const logout = async (token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const expiresAt = new Date(decoded.exp * 1000);

    await tokenRepository.blacklist(token, expiresAt);
    await tokenRepository.cleanupExpired();
};

module.exports = { signup, login, logout };
