const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");

const router = express.Router();
const ALLOWED_ROLES = ["admin", "student", "teacher", "parent", "hr", "finance"];

module.exports = (broadcast) => {

    router.post("/signup", async (req, res) => {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: "Name, email, password and role are required" });
        }

        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ error: "Role must be one of: student, teacher, staff" });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await pool.query(
                "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
                [name, email, hashedPassword, role]
            );

            const newUser = result.rows[0];
            broadcast({ type: "new_signup", user: newUser });

            res.status(201).json({ message: "User created successfully", user: newUser });
        } catch (err) {
            if (err.code === "23505") {
                return res.status(400).json({ error: "Email already registered" });
            }
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    });

    router.post("/login", async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        try {
            const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

            if (result.rows.length === 0) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            const user = result.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.json({
                token
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    });

    router.get("/users", async (req, res) => {
        try {
            const result = await pool.query(
                "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
            );
            res.json({ users: result.rows });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    });

    router.put("/users/:id", async (req, res) => {
        const { id } = req.params;
        const { name, email, role } = req.body;

        if (!name && !email && !role) {
            return res.status(400).json({ error: "Provide at least a name, email or role to update" });
        }

        if (role && !ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ error: "Role must be one of: student, teacher, staff" });
        }

        try {
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

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json({ message: "User updated", user: result.rows[0] });
        } catch (err) {
            if (err.code === "23505") {
                return res.status(400).json({ error: "Email already in use" });
            }
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    });

    router.delete("/users/:id", async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.query(
                "DELETE FROM users WHERE id = $1 RETURNING id, name, email",
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json({ message: "User deleted", user: result.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    });

    /**
     * @swagger
     * /logout:
     *   post:
     *     summary: Logout the current user
     *     description: Invalidates the current JWT by adding it to a server-side blacklist. The token will be rejected on all subsequent requests even if it has not yet expired.
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Successfully logged out
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Logged out successfully
     *       401:
     *         description: Missing, invalid, or already-expired token
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *       500:
     *         description: Server error
     */
    router.post("/logout", async (req, res) => {
        const authHeader = req.headers["authorization"];

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid token" });
        }

        const token = authHeader.split(" ")[1];

        try {
            // Verify the token is legitimate before blacklisting
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Store the token in the blacklist until its natural expiry
            const expiresAt = new Date(decoded.exp * 1000);
            await pool.query(
                "INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING",
                [token, expiresAt]
            );

            // Cleanup: remove already-expired blacklisted tokens to keep the table lean
            await pool.query("DELETE FROM token_blacklist WHERE expires_at < NOW()");

            res.json({ message: "Logged out successfully" });
        } catch (err) {
            if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
                return res.status(401).json({ error: "Invalid or expired token" });
            }
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    });

    router.get("/me", async (req, res) => {
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

            const result = await pool.query(
                "SELECT id, name, email, role FROM users WHERE id = $1",
                [decoded.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            return res.status(401).json({ error: "Invalid or expired token" });
        }
    });

    return router;
};