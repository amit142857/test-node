const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");

/**
 * Middleware: Authenticate the user via JWT.
 * Populates req.user with { id, email, role }.
 * Also rejects blacklisted (logged-out) tokens.
 */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Reject tokens that have been blacklisted (logged out)
        const blacklisted = await pool.query(
            "SELECT 1 FROM token_blacklist WHERE token = $1",
            [token]
        );
        if (blacklisted.rows.length > 0) {
            return res.status(401).json({ error: "Token has been invalidated. Please log in again." });
        }

        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        req.token = token;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

/**
 * Middleware factory: Restrict access to specific roles.
 * Usage: authorize("admin") or authorize("admin", "hr")
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: `Only ${allowedRoles.join(", ")} can perform this action` });
        }
        next();
    };
};

module.exports = { authenticate, authorize };
