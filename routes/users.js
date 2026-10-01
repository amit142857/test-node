const express = require("express");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");

const router = express.Router();
const ALLOWED_ROLES = ["admin", "student", "teacher", "parent", "hr", "finance"];

module.exports = () => {

    /**
     * @swagger
     * /users:
     *   get:
     *     summary: Get all users
     *     description: Returns a list of all registered users ordered by creation date.
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of users
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 users:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/User'
     *       500:
     *         description: Server error
     */
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

    /**
     * @swagger
     * /users/{id}:
     *   put:
     *     summary: Update a user
     *     description: Updates a user's name, email, or role by their ID.
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The user ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 example: Jane Doe
     *               email:
     *                 type: string
     *                 example: jane@example.com
     *               role:
     *                 type: string
     *                 enum: [admin, student, teacher, parent, hr, finance]
     *                 example: teacher
     *     responses:
     *       200:
     *         description: User updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: User updated
     *                 user:
     *                   $ref: '#/components/schemas/User'
     *       400:
     *         description: Validation error or email already in use
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */
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

    /**
     * @swagger
     * /users/{id}:
     *   delete:
     *     summary: Delete a user
     *     description: Permanently deletes a user by their ID. Only users with the **admin** role are authorized to perform this action.
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The user ID
     *     responses:
     *       200:
     *         description: User deleted successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: User deleted
     *                 user:
     *                   $ref: '#/components/schemas/User'
     *       401:
     *         description: Missing or invalid token
     *       403:
     *         description: Only admin users can delete users
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */
    router.delete("/users/:id", async (req, res) => {
        // Authenticate via JWT
        const authHeader = req.headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid token" });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        // Only admins can delete users
        if (decoded.role !== "admin") {
            return res.status(403).json({ error: "Only admin can delete a user" });
        }

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
     * /me:
     *   get:
     *     summary: Get current user profile
     *     description: Returns the profile of the currently authenticated user based on their JWT token.
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Current user's profile
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: integer
     *                   example: 1
     *                 name:
     *                   type: string
     *                   example: John Doe
     *                 email:
     *                   type: string
     *                   example: john@example.com
     *                 role:
     *                   type: string
     *                   example: student
     *       401:
     *         description: Missing, invalid, or blacklisted token
     *       404:
     *         description: User not found
     */
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