const express = require("express");
const userService = require("../services/userService");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

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
            const users = await userService.getAllUsers();
            res.json({ users });
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
        try {
            const user = await userService.updateUser(req.params.id, req.body);
            res.json({ message: "User updated", user });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ error: err.message || "Server error" });
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
    router.delete("/users/:id", authenticate, authorize("admin"), async (req, res) => {
        try {
            const user = await userService.deleteUser(req.params.id);
            res.json({ message: "User deleted", user });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ error: err.message || "Server error" });
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
    router.get("/me", authenticate, async (req, res) => {
        try {
            const user = await userService.getUserById(req.user.id);
            res.json(user);
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ error: err.message || "Server error" });
        }
    });

    return router;
};