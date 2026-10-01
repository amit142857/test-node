const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");

const router = express.Router();
const ALLOWED_ROLES = ["admin", "student", "teacher", "parent", "hr", "finance"];

module.exports = (broadcast) => {

    /**
     * @swagger
     * /signup:
     *   post:
     *     summary: Register a new user
     *     description: Creates a new user account with name, email, password and role.
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - email
     *               - password
     *               - role
     *             properties:
     *               name:
     *                 type: string
     *                 description: Full name of the user
     *                 example: John Doe
     *               email:
     *                 type: string
     *                 format: email
     *                 description: Email address (must be unique)
     *                 example: john@example.com
     *               password:
     *                 type: string
     *                 description: Account password
     *                 example: secret123
     *               role:
     *                 type: string
     *                 description: "User role. Must be one of: admin, student, teacher, parent, hr, finance"
     *                 enum:
     *                   - admin
     *                   - student
     *                   - teacher
     *                   - parent
     *                   - hr
     *                   - finance
     *                 example: student
     *     responses:
     *       201:
     *         description: User created successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: User created successfully
     *                 user:
     *                   $ref: '#/components/schemas/User'
     *       400:
     *         description: Validation error or email already registered
     *       500:
     *         description: Server error
     */
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

    /**
     * @swagger
     * /login:
     *   post:
     *     summary: Login a user
     *     description: Authenticates a user with email and password, returns a JWT token.
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *             properties:
     *               email:
     *                 type: string
     *                 example: john@example.com
     *               password:
     *                 type: string
     *                 example: secret123
     *     responses:
     *       200:
     *         description: Login successful, returns JWT token
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 token:
     *                   type: string
     *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     *       400:
     *         description: Missing email or password
     *       401:
     *         description: Invalid email or password
     *       500:
     *         description: Server error
     */
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

    /**
     * @swagger
     * /logout:
     *   post:
     *     summary: Logout the current user
     *     description: Invalidates the current JWT by adding it to a server-side blacklist. The token will be rejected on all subsequent requests even if it has not yet expired.
     *     tags: [Auth]
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

    return router;
};
