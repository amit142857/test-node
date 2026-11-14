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
     * components:
     *   schemas:
     *     UserProfile:
     *       type: object
     *       properties:
     *         id:
     *           type: integer
     *           example: 24
     *         name:
     *           type: string
     *           example: "Dr. Sarah Jenkins"
     *         email:
     *           type: string
     *           example: "s.jenkins@eduflow.edu"
     *         role:
     *           type: string
     *           example: "admin"
     *         title:
     *           type: string
     *           example: "Senior Administrator / Mathematics Lead"
     *         designation:
     *           type: string
     *           example: "Senior Administrator / Mathematics Lead"
     *         avatar_url:
     *           type: string
     *           example: "https://lh3.googleusercontent.com/aida-public/AB6AXuBO90QanDyQrSXSiCVRLkiDRwul4cFwlzw2SLc5bD1_jtEaR94XYrpwf_IHHE-vJCYwTXb-x_sml4K_QXJIxUqinKnqkfLl5GFk0L2d1iZvz91WoNy9Ell_fl_dJOGot3_uV59VtP6jmjody6aZeKB1taJ-LZWwDPK-jv8DSgH8870TY5Y4HSaRvPwhN6AJTaO1NZF4uJ5QOy-zuzBXFlmNG86xfkA7oCNNXFu8pyddmEeumtKh21E7xGKL19Q5tdncXr_h3jD_clEn"
     *         avatar_thumbnail_url:
     *           type: string
     *           example: "https://lh3.googleusercontent.com/aida-public/AB6AXuArmOJeUsDHpsXv3sWKWvavgyX5h_cJel5jg_BnO7LJ2M7FE04D1yIDTp7TJU8pyEaeESD2v_jFg8BQjA5BhXP_xoTjThFrNnA-4dGIhhrU-A4ZHhpr3Cbv37INpPvx0dyu_gCKXnZevQu2yhd_TVI9hldr8AuT2rZzbRKFaGBN--60dwZIAY-DDuuitwZQnjRGLfj-4Dyten90RbQ5w1seG6CbEb_4zcBr-6Ji3-K5TkJXiSi0XTAxuba8iqs5guKqYvBBSiw6WOuq"
     *         is_verified:
     *           type: boolean
     *           example: true
     *         employee_id:
     *           type: string
     *           example: "EDU-8842"
     *         branch:
     *           type: string
     *           example: "North Wing"
     *         phone:
     *           type: string
     *           example: "+1 (555) 012-3456"
     *         subjects:
     *           type: array
     *           items:
     *             type: string
     *           example: ["Calculus III", "Linear Algebra"]
     *         activity_pulse:
     *           type: object
     *           properties:
     *             attendance_rate:
     *               type: string
     *               example: "98.4%"
     *             attendance_percentage:
     *               type: number
     *               example: 98.4
     *             last_login:
     *               type: string
     *               example: "14m ago"
     *             last_login_at:
     *               type: string
     *               format: date-time
     *         attendance_rate:
     *           type: string
     *           example: "98.4%"
     *         attendance_percentage:
     *           type: number
     *           example: 98.4
     *         last_login:
     *           type: string
     *           example: "14m ago"
     *         last_login_at:
     *           type: string
     *           format: date-time
     *         settings:
     *           type: object
     *           properties:
     *             theme:
     *               type: string
     *               enum: [light, dark]
     *               example: "light"
     *             language:
     *               type: string
     *               example: "English (United States)"
     *             notifications:
     *               type: object
     *               properties:
     *                 push: { type: boolean, example: true }
     *                 email: { type: boolean, example: true }
     *                 sms: { type: boolean, example: true }
     *                 summary: { type: string, example: "Push, Email, and SMS preferences" }
     *             security:
     *               type: object
     *               properties:
     *                 two_factor_enabled: { type: boolean, example: false }
     *                 recent_active_sessions: { type: integer, example: 1 }
     *                 summary: { type: string, example: "Manage 2FA and recent active sessions" }
     *             privacy:
     *               type: object
     *               properties:
     *                 summary: { type: string, example: "Review data permissions" }
     *         theme:
     *           type: string
     *           example: "light"
     *         language:
     *           type: string
     *           example: "English (United States)"
     *         created_at:
     *           type: string
     *           format: date-time
     *         updated_at:
     *           type: string
     *           format: date-time
     *
     * /me:
     *   get:
     *     summary: Get current user profile
     *     description: Returns the full EduFlow profile of the currently authenticated user based on their JWT token, matching the EduFlow Manager Profile & Settings screen.
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Current user's complete profile
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UserProfile'
     *       401:
     *         description: Missing, invalid, or blacklisted token
     *       404:
     *         description: User not found
     *   put:
     *     summary: Update current user profile
     *     description: Updates the profile information of the currently authenticated user (name, title, phone, branch, employee_id, subjects, theme, language, settings, etc.).
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 example: "Dr. Sarah Jenkins"
     *               title:
     *                 type: string
     *                 example: "Senior Administrator / Mathematics Lead"
     *               phone:
     *                 type: string
     *                 example: "+1 (555) 012-3456"
     *               employee_id:
     *                 type: string
     *                 example: "EDU-8842"
     *               branch:
     *                 type: string
     *                 example: "North Wing"
     *               subjects:
     *                 type: array
     *                 items:
     *                   type: string
     *                 example: ["Calculus III", "Linear Algebra"]
     *               theme:
     *                 type: string
     *                 enum: [light, dark]
     *                 example: "light"
     *               language:
     *                 type: string
     *                 example: "English (United States)"
     *     responses:
     *       200:
     *         description: Profile updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UserProfile'
     *       400:
     *         description: Validation error
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Server error
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

    router.put("/me", authenticate, async (req, res) => {
        try {
            const updatedProfile = await userService.updateUser(req.user.id, req.body);
            res.json(updatedProfile);
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ error: err.message || "Server error" });
        }
    });

    return router;
};