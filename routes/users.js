const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");

const router = express.Router();
const ALLOWED_ROLES = ["student", "teacher", "staff"];

module.exports = (broadcast) => {

    /**
     * @swagger
     * /signup:
     *   post:
     *     tags:
     *       - Users
     *     summary: Register a new user
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
     *                 example: John Doe
     *               email:
     *                 type: string
     *                 example: john@example.com
     *               password:
     *                 type: string
     *                 example: secret123
     *               role:
     *                 type: string
     *                 enum: [student, teacher, staff]
     *                 example: student
     *     responses:
     *       201:
     *         description: User created successfully
     *       400:
     *         description: Email already exists, missing fields, or invalid role
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
     *     tags:
     *       - Users
     *     summary: Log in and receive a JWT token
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
     *       400:
     *         description: Missing fields
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
                message: "Login successful",
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role },
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    });

    /**
     * @swagger
     * /users:
     *   get:
     *     tags:
     *       - Users
     *     summary: Get all users
     *     responses:
     *       200:
     *         description: List of all users
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
     *     tags:
     *       - Users
     *     summary: Update a user by ID
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
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
     *                 enum: [student, teacher, staff]
     *                 example: teacher
     *     responses:
     *       200:
     *         description: User updated successfully
     *       400:
     *         description: Invalid role or no fields provided
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
     *     tags:
     *       - Users
     *     summary: Delete a user by ID
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: User deleted successfully
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */
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

    return router;
};