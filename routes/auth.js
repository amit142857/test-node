const express = require("express");
const authService = require("../services/authService");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

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
        try {
            const user = await authService.signup(req.body);
            broadcast({ type: "new_signup", user });
            res.status(201).json({ message: "User created successfully", user });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ error: err.message || "Server error" });
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
        try {
            const token = await authService.login(req.body);
            res.json({ token });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ error: err.message || "Server error" });
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
    router.post("/logout", authenticate, async (req, res) => {
        try {
            await authService.logout(req.token);
            res.json({ message: "Logged out successfully" });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ error: err.message || "Server error" });
        }
    });

    return router;
};
