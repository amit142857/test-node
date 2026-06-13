const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Keep track of connected clients
wss.on("connection", (ws) => {
    console.log("New WebSocket client connected");
    ws.send(JSON.stringify({ type: "connected", message: "Welcome! You'll receive live signup updates." }));

    ws.on("close", () => console.log("Client disconnected"));
});

// Helper to broadcast to all connected clients
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Create users table if it doesn't exist
async function initDb() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(200) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'student',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student'
  `);

    console.log("Database ready");
}
initDb();

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "My First API",
            version: "1.0.1",
            description: "A simple API with user signup",
        },
    },
    apis: ["./index.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---- Routes ----

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
app.post("/signup", async (req, res) => {
    const { name, email, password, role } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: "Name, email, password and role are required" });
    }

    // Validate role
    const allowedRoles = ["student", "teacher", "staff"];
    if (!allowedRoles.includes(role)) {
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

        res.status(201).json({
            message: "User created successfully",
            user: newUser,
        });
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
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: List of all users
 */
app.get("/users", async (req, res) => {
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
app.put("/users/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;

    if (!name && !email && !role) {
        return res.status(400).json({ error: "Provide at least a name, email or role to update" });
    }

    // Validate role if provided
    const allowedRoles = ["student", "teacher", "staff"];
    if (role && !allowedRoles.includes(role)) {
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
app.delete("/users/:id", async (req, res) => {
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});