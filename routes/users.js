const express = require("express");
const userService = require("../services/userService");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

module.exports = () => {

    /**
     * @swagger
     * /users:
     *   get:
     *     summary: Get and search all institutional users (Admin only)
     *     description: Returns institutional users with support for multi-field search (name, email, ID, role, title), role filter tabs, sorting (Newest First, Oldest First, Name), date range, and role partition summary statistics.
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *         description: Search query matching user name, email, numeric ID (#24), employee ID (EDU-8842), role, or title
     *         example: "Sarah"
     *       - in: query
     *         name: role
     *         schema:
     *           type: string
     *           enum: [all, admin, student, teacher, parent, hr, finance]
     *         description: Filter users by role pill / tab
     *         example: "admin"
     *       - in: query
     *         name: sort_by
     *         schema:
     *           type: string
     *           enum: [newest, oldest, name_asc, name_desc, role, id_asc, id_desc]
     *         description: "Sort order (default: newest)"
     *         example: "newest"
     *       - in: query
     *         name: date
     *         schema:
     *           type: string
     *           format: date
     *         description: Filter users created on a specific date (YYYY-MM-DD)
     *       - in: query
     *         name: date_from
     *         schema:
     *           type: string
     *           format: date
     *         description: Filter users created on or after date (YYYY-MM-DD)
     *       - in: query
     *         name: date_to
     *         schema:
     *           type: string
     *           format: date
     *         description: Filter users created on or before date (YYYY-MM-DD)
     *     responses:
     *       200:
     *         description: Institutional users list with partition summary and filter pills
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 summary:
     *                   type: object
     *                   properties:
     *                     total_registered: { type: integer, example: 7 }
     *                     active_users: { type: integer, example: 7 }
     *                     role_partitions: { type: integer, example: 6 }
     *                     footprint:
     *                       type: object
     *                       properties:
     *                         admins: { type: integer, example: 2 }
     *                         departmental: { type: integer, example: 5 }
     *                         text: { type: string, example: "2 Admins • 5 Departmental" }
     *                     role_counts:
     *                       type: object
     *                       properties:
     *                         all: { type: integer, example: 7 }
     *                         admin: { type: integer, example: 2 }
     *                         teacher: { type: integer, example: 1 }
     *                         student: { type: integer, example: 1 }
     *                         parent: { type: integer, example: 1 }
     *                         hr: { type: integer, example: 1 }
     *                         finance: { type: integer, example: 1 }
     *                     filter_pills:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           role: { type: string, example: "admin" }
     *                           label: { type: string, example: "Admin" }
     *                           count: { type: integer, example: 2 }
     *                           active: { type: boolean, example: true }
     *                 current_filter:
     *                   type: object
     *                 total:
     *                   type: integer
     *                   example: 7
     *                 filtered_count:
     *                   type: integer
     *                   example: 2
     *                 users:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       id: { type: integer, example: 24 }
     *                       display_id: { type: string, example: "#24" }
     *                       name: { type: string, example: "Dr. Sarah Jenkins" }
     *                       email: { type: string, example: "s.jenkins@eduflow.edu" }
     *                       role: { type: string, example: "admin" }
     *                       title: { type: string, example: "Senior Administrator" }
     *                       role_badge:
     *                         type: object
     *                         properties:
     *                           label: { type: string, example: "Super Admin & Faculty Lead" }
     *                           icon: { type: string, example: "shield_person" }
     *                       status_badge:
     *                         type: object
     *                         properties:
     *                           label: { type: string, example: "Active • Primary Lead" }
     *                           status: { type: string, example: "active" }
     *                       created_at: { type: string, format: "date-time" }
     *                       created_at_formatted: { type: string, example: "Nov 13, 2026, 06:36 UTC" }
     *       401:
     *         description: Authentication required or invalid token
     *       403:
     *         description: Forbidden - Only admin users can view and search users
     *       500:
     *         description: Server error
     */
    router.get("/users", authenticate, authorize("admin"), async (req, res) => {
        try {
            const data = await userService.getAllUsers(req.query);
            res.json(data);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    });

    /**
     * @swagger
     * /users/summary:
     *   get:
     *     summary: Get institutional users summary and role partition metrics (Admin only)
     *     description: Returns aggregated metrics including total registered users, active role footprint, discrete role partitions, and role filter pill counters.
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Summary metrics
     *       401:
     *         description: Authentication required
     *       403:
     *         description: Admin only
     */
    router.get("/users/summary", authenticate, authorize("admin"), async (req, res) => {
        try {
            const summary = await userService.getUsersSummary();
            res.json({ summary });
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
     *           example: "Senior Administrator"
     *         designation:
     *           type: string
     *           example: "Senior Administrator"
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
     *           description: "List of academic subjects. Present for academic roles (teacher, student); omitted for administrative roles (admin, hr, finance, parent)."
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