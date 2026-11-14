const express = require("express");
const notificationService = require("../services/notificationService");
const { optionalAuthenticate, authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

module.exports = (broadcast = () => { }) => {

    /**
     * @swagger
     * components:
     *   schemas:
     *     NotificationAction:
     *       type: object
     *       properties:
     *         label:
     *           type: string
     *           example: "Review Report"
     *         icon:
     *           type: string
     *           example: "arrow_forward"
     *         type:
     *           type: string
     *           enum: [button, attachment, link]
     *           example: "button"
     *         variant:
     *           type: string
     *           example: "error"
     *         url:
     *           type: string
     *           example: "/reports/attendance/10-b"
     *     NotificationBadge:
     *       type: object
     *       properties:
     *         label:
     *           type: string
     *           example: "Verified"
     *         icon:
     *           type: string
     *           example: "verified"
     *         variant:
     *           type: string
     *           example: "tertiary"
     *     Notification:
     *       type: object
     *       properties:
     *         id:
     *           type: integer
     *           example: 1
     *         user_id:
     *           type: integer
     *           nullable: true
     *           example: null
     *         title:
     *           type: string
     *           example: "Critical Attendance Alert – North Campus"
     *         message:
     *           type: string
     *           example: "Student attendance dropped below 70% threshold for Class 10-B. Urgent dean intervention recommended."
     *         category:
     *           type: string
     *           enum: [academic, finance, attendance, alert]
     *           example: "attendance"
     *         tags:
     *           type: array
     *           items:
     *             type: string
     *           example: ["attendance", "alert"]
     *         priority:
     *           type: string
     *           enum: [critical, warning, info, normal]
     *           example: "critical"
     *         is_read:
     *           type: boolean
     *           example: false
     *         is_archived:
     *           type: boolean
     *           example: false
     *         icon:
     *           type: string
     *           example: "warning"
     *         source:
     *           type: string
     *           example: "North Campus"
     *         action:
     *           $ref: '#/components/schemas/NotificationAction'
     *         badge:
     *           $ref: '#/components/schemas/NotificationBadge'
     *         created_at:
     *           type: string
     *           format: date-time
     *           example: "2026-10-27T15:39:10.202Z"
     *         read_at:
     *           type: string
     *           format: date-time
     *           nullable: true
     *           example: null
     *         time_ago:
     *           type: string
     *           example: "12m ago"
     *         time_group:
     *           type: string
     *           enum: [today, yesterday, earlier, older]
     *           example: "today"
     */

    /**
     * @swagger
     * /notifications:
     *   get:
     *     summary: Fetch notifications
     *     description: Fetches notifications with optional category filtering (academic, finance, attendance, alert), read/unread status filtering, keyword search, pagination, and UI date grouping (Today, Yesterday, Earlier this week, Older).
     *     tags: [Notifications]
     *     parameters:
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *           enum: [all, academic, finance, attendance, alert]
     *           default: all
     *         description: Filter by notification category
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [all, read, unread]
     *           default: all
     *         description: Filter by read status
     *       - in: query
     *         name: priority
     *         schema:
     *           type: string
     *           enum: [critical, warning, info, normal]
     *         description: Filter by priority level
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *         description: Search keyword across title, message, and source
     *       - in: query
     *         name: group_by
     *         schema:
     *           type: string
     *           enum: [date, none]
     *           default: date
     *         description: Group notifications into chronological buckets matching the UI (Today, Yesterday, Earlier this week, Older)
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 50
     *         description: Number of notifications to return
     *       - in: query
     *         name: offset
     *         schema:
     *           type: integer
     *           default: 0
     *         description: Number of notifications to skip
     *     responses:
     *       200:
     *         description: List of notifications with metadata and date groups
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 meta:
     *                   type: object
     *                   properties:
     *                     total:
     *                       type: integer
     *                       example: 14
     *                     unread_count:
     *                       type: integer
     *                       example: 5
     *                     category_counts:
     *                       type: object
     *                       properties:
     *                         all: { type: integer, example: 14 }
     *                         academic: { type: integer, example: 4 }
     *                         finance: { type: integer, example: 4 }
     *                         attendance: { type: integer, example: 3 }
     *                         alert: { type: integer, example: 4 }
     *                     limit: { type: integer, example: 50 }
     *                     offset: { type: integer, example: 0 }
     *                     filtered_count: { type: integer, example: 14 }
     *                 groups:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       group: { type: string, example: "today" }
     *                       label: { type: string, example: "Today" }
     *                       count: { type: integer, example: 3 }
     *                       items:
     *                         type: array
     *                         items:
     *                           $ref: '#/components/schemas/Notification'
     *                 notifications:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Notification'
     *       400:
     *         description: Invalid query parameters
     *       500:
     *         description: Server error
     */
    router.get("/notifications", optionalAuthenticate, async (req, res) => {
        try {
            const { category, status, priority, search, limit, offset, group_by } = req.query;
            const userId = req.user ? req.user.id : null;

            const result = await notificationService.getNotifications({
                userId,
                category,
                status,
                priority,
                search,
                limit,
                offset,
                groupBy: group_by || "date"
            });

            res.json(result);
        } catch (err) {
            console.error("GET /notifications error:", err);
            res.status(err.status || 500).json({ error: err.message || "Server error" });
        }
    });

    /**
     * @swagger
     * /notifications/summary:
     *   get:
     *     summary: Get notification counts summary
     *     description: Returns total count, unread badge count, and counts per category for the filter tabs and inbox badge.
     *     tags: [Notifications]
     *     responses:
     *       200:
     *         description: Summary counters
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 total: { type: integer, example: 14 }
     *                 unread_count: { type: integer, example: 5 }
     *                 category_counts:
     *                   type: object
     *                   properties:
     *                     all: { type: integer, example: 14 }
     *                     academic: { type: integer, example: 4 }
     *                     finance: { type: integer, example: 4 }
     *                     attendance: { type: integer, example: 3 }
     *                     alert: { type: integer, example: 4 }
     */
    router.get("/notifications/summary", optionalAuthenticate, async (req, res) => {
        try {
            const userId = req.user ? req.user.id : null;
            const summary = await notificationService.getSummary({ userId });
            res.json(summary);
        } catch (err) {
            console.error("GET /notifications/summary error:", err);
            res.status(err.status || 500).json({ error: err.message || "Server error" });
        }
    });

    /**
     * @swagger
     * /notifications/{id}:
     *   get:
     *     summary: Get single notification
     *     description: Fetches full details of a specific notification by ID.
     *     tags: [Notifications]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The notification ID
     *     responses:
     *       200:
     *         description: Notification details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Notification'
     *       404:
     *         description: Notification not found
     */
    router.get("/notifications/:id", optionalAuthenticate, async (req, res) => {
        try {
            const userId = req.user ? req.user.id : null;
            const notification = await notificationService.getNotificationById(req.params.id, userId);
            res.json(notification);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message || "Server error" });
        }
    });

    /**
     * @swagger
     * /notifications/{id}/read:
     *   patch:
     *     summary: Mark a notification as read
     *     description: Marks a specific notification as read and sets read_at timestamp.
     *     tags: [Notifications]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The notification ID
     *     responses:
     *       200:
     *         description: Updated notification
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message: { type: string, example: "Notification marked as read" }
     *                 notification: { $ref: '#/components/schemas/Notification' }
     *       404:
     *         description: Notification not found
     */
    router.patch("/notifications/:id/read", optionalAuthenticate, async (req, res) => {
        try {
            const userId = req.user ? req.user.id : null;
            const notification = await notificationService.markAsRead(req.params.id, userId);
            broadcast({ type: "notification_read", notification_id: Number(req.params.id) });
            res.json({ message: "Notification marked as read", notification });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message || "Server error" });
        }
    });

    /**
     * @swagger
     * /notifications/read-all:
     *   patch:
     *     summary: Mark all notifications as read
     *     description: Sets is_read to true for all unread notifications.
     *     tags: [Notifications]
     *     responses:
     *       200:
     *         description: Successfully marked all as read
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message: { type: string, example: "All notifications marked as read" }
     *                 updated_count: { type: integer, example: 5 }
     */
    const handleMarkAllRead = async (req, res) => {
        try {
            const userId = req.user ? req.user.id : null;
            const result = await notificationService.markAllAsRead(userId);
            broadcast({ type: "notifications_all_read", updated_count: result.updated_count });
            res.json({ message: "All notifications marked as read", updated_count: result.updated_count });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message || "Server error" });
        }
    };

    router.patch("/notifications/read-all", optionalAuthenticate, handleMarkAllRead);
    router.post("/notifications/read-all", optionalAuthenticate, handleMarkAllRead);

    /**
     * @swagger
     * /notifications/{id}/archive:
     *   patch:
     *     summary: Archive a notification
     *     description: Sets is_archived to true for a notification.
     *     tags: [Notifications]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The notification ID
     *     responses:
     *       200:
     *         description: Notification archived
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message: { type: string, example: "Notification archived" }
     *                 notification: { $ref: '#/components/schemas/Notification' }
     *       404:
     *         description: Notification not found
     */
    router.patch("/notifications/:id/archive", optionalAuthenticate, async (req, res) => {
        try {
            const userId = req.user ? req.user.id : null;
            const notification = await notificationService.archiveNotification(req.params.id, userId);
            broadcast({ type: "notification_archived", notification_id: Number(req.params.id) });
            res.json({ message: "Notification archived", notification });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message || "Server error" });
        }
    });

    /**
     * @swagger
     * /notifications:
     *   post:
     *     summary: Create a notification
     *     description: Creates a new notification and broadcasts it in real-time to connected WebSocket clients.
     *     tags: [Notifications]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - title
     *               - message
     *               - category
     *             properties:
     *               title:
     *                 type: string
     *                 example: "Tuition Fee Received"
     *               message:
     *                 type: string
     *                 example: "$1,140.00 tuition payment confirmed for Sarah Johnson (Grade 4)."
     *               category:
     *                 type: string
     *                 enum: [academic, finance, attendance, alert]
     *                 example: "finance"
     *               tags:
     *                 type: array
     *                 items:
     *                   type: string
     *                 example: ["finance"]
     *               priority:
     *                 type: string
     *                 enum: [critical, warning, info, normal]
     *                 default: "normal"
     *                 example: "normal"
     *               icon:
     *                 type: string
     *                 default: "notifications"
     *                 example: "account_balance_wallet"
     *               source:
     *                 type: string
     *                 example: "Finance Hub"
     *               action:
     *                 $ref: '#/components/schemas/NotificationAction'
     *               badge:
     *                 $ref: '#/components/schemas/NotificationBadge'
     *     responses:
     *       201:
     *         description: Notification created successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message: { type: string, example: "Notification created successfully" }
     *                 notification: { $ref: '#/components/schemas/Notification' }
     *       400:
     *         description: Missing required fields or invalid category
     */
    router.post("/notifications", optionalAuthenticate, async (req, res) => {
        try {
            const data = {
                ...req.body,
                userId: req.body.user_id || (req.user ? req.user.id : null)
            };
            const notification = await notificationService.createNotification(data);
            broadcast({ type: "new_notification", notification });
            res.status(201).json({ message: "Notification created successfully", notification });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message || "Server error" });
        }
    });

    /**
     * @swagger
     * /notifications/{id}:
     *   delete:
     *     summary: Delete a notification
     *     description: Deletes a notification by its ID.
     *     tags: [Notifications]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The notification ID
     *     responses:
     *       200:
     *         description: Notification deleted successfully
     *       404:
     *         description: Notification not found
     */
    router.delete("/notifications/:id", optionalAuthenticate, async (req, res) => {
        try {
            const userId = req.user ? req.user.id : null;
            const deleted = await notificationService.deleteNotification(req.params.id, userId);
            broadcast({ type: "notification_deleted", notification_id: Number(req.params.id) });
            res.json({ message: "Notification deleted", notification: deleted });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message || "Server error" });
        }
    });

    return router;
};
