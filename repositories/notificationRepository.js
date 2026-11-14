const { pool } = require("../db/pool");

const ALLOWED_CATEGORIES = ["academic", "finance", "attendance", "alert"];
const ALLOWED_PRIORITIES = ["critical", "warning", "info", "normal"];

/**
 * Create notifications table and indexes if not exists
 */
const initTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            tags TEXT[] DEFAULT '{}',
            priority VARCHAR(20) NOT NULL DEFAULT 'normal',
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            is_archived BOOLEAN NOT NULL DEFAULT FALSE,
            icon VARCHAR(50) NOT NULL DEFAULT 'notifications',
            source VARCHAR(100),
            action JSONB DEFAULT NULL,
            badge JSONB DEFAULT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user_category ON notifications(user_id, category);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_archived ON notifications(is_archived);
    `);
};

/**
 * Seed initial notifications matching EduFlow Manager mock data
 */
const seedInitialData = async () => {
    const countRes = await pool.query("SELECT COUNT(*)::INT AS total FROM notifications");
    if (countRes.rows[0].total > 0) {
        return; // Already seeded
    }

    console.log("Seeding initial notifications...");

    const seedQueries = [
        // Today - 12m ago: Critical attendance alert
        {
            title: "Critical Attendance Alert – North Campus",
            message: "Student attendance dropped below 70% threshold for Class 10-B. Urgent dean intervention recommended.",
            category: "attendance",
            tags: ["attendance", "alert"],
            priority: "critical",
            is_read: false,
            icon: "warning",
            source: "North Campus",
            action: { label: "Review Report", icon: "arrow_forward", type: "button", variant: "error", url: "/reports/attendance/10-b" },
            badge: null,
            created_at_offset: "INTERVAL '12 minutes'"
        },
        // Today - 1h ago: Tuition fee received
        {
            title: "Tuition Fee Received",
            message: "$1,140.00 tuition payment confirmed for Sarah Johnson (Grade 4). Invoice #EDU-8820.",
            category: "finance",
            tags: ["finance"],
            priority: "normal",
            is_read: false,
            icon: "account_balance_wallet",
            source: "Finance Hub",
            action: { label: "View Receipt", icon: "receipt_long", type: "button", variant: "secondary", url: "/finance/receipts/EDU-8820" },
            badge: null,
            created_at_offset: "INTERVAL '1 hour'"
        },
        // Today - 3h ago: Curriculum schedule updated
        {
            title: "Curriculum Schedule Updated",
            message: "Prof. Marcus Vance posted revisions to Mathematics Term 2 syllabus and mock exam schedules.",
            category: "academic",
            tags: ["academic"],
            priority: "normal",
            is_read: false,
            icon: "auto_stories",
            source: "Academics",
            action: { label: "syllabus_revised.pdf", icon: "attachment", type: "attachment", url: "/documents/syllabus_revised.pdf" },
            badge: null,
            created_at_offset: "INTERVAL '3 hours'"
        },
        // Yesterday - 8:42 AM: Biometric Geo-Check-in Validated
        {
            title: "Biometric Geo-Check-in Validated",
            message: "Your daily check-in was registered within 150m perimeter of Westfield Horizon Campus.",
            category: "attendance",
            tags: ["attendance"],
            priority: "normal",
            is_read: false,
            icon: "pin_drop",
            source: "Attendance System",
            action: null,
            badge: { label: "Verified", icon: "verified", variant: "tertiary" },
            created_at_sql: "(CURRENT_DATE - INTERVAL '1 day') + TIME '08:42:00'"
        },
        // Yesterday - 3:15 PM: Petty cash request approved
        {
            title: "Petty Cash Request Approved",
            message: "Emergency plumbing repair voucher ($450.00) signed off by Super Admin. Funds released to maintenance custody.",
            category: "finance",
            tags: ["finance"],
            priority: "normal",
            is_read: false,
            icon: "check_circle",
            source: "Finance",
            action: null,
            badge: { label: "Disbursed", variant: "neutral" },
            created_at_sql: "(CURRENT_DATE - INTERVAL '1 day') + TIME '15:15:00'"
        },
        // Earlier this week - 3 days ago: Maintenance notice (read)
        {
            title: "System Maintenance Notice",
            message: "Scheduled maintenance this Sunday at 02:00 UTC. Mobile portals will experience 15m downtime for database synchronization.",
            category: "alert",
            tags: ["alert"],
            priority: "normal",
            is_read: true,
            icon: "build_circle",
            source: "System Admin",
            action: null,
            badge: { label: "Planned", variant: "secondary" },
            created_at_offset: "INTERVAL '3 days'"
        },
        // Additional 8 notifications to match "All (14)" total from UI
        {
            title: "Mid-Term Examination Timetable Finalized",
            message: "Exam schedule for Grades 9 through 12 has been published on the faculty portal.",
            category: "academic",
            tags: ["academic"],
            priority: "normal",
            is_read: true,
            icon: "event_note",
            source: "Exam Controller",
            action: { label: "View Timetable", icon: "open_in_new", type: "button", variant: "secondary", url: "/exams/timetable" },
            badge: null,
            created_at_offset: "INTERVAL '4 days'"
        },
        {
            title: "Campus Shuttle Route 3 Rescheduled",
            message: "Morning pickup timing adjusted by 10 minutes due to city road maintenance works.",
            category: "attendance",
            tags: ["attendance"],
            priority: "normal",
            is_read: true,
            icon: "directions_bus",
            source: "Transport Desk",
            action: null,
            badge: { label: "Active", variant: "neutral" },
            created_at_offset: "INTERVAL '4 days 2 hours'"
        },
        {
            title: "Department Budget Disbursement Confirmed",
            message: "Quarterly STEM lab budget allocation of $8,500.00 transferred successfully.",
            category: "finance",
            tags: ["finance"],
            priority: "normal",
            is_read: true,
            icon: "account_balance",
            source: "Finance Hub",
            action: null,
            badge: { label: "Settled", variant: "tertiary" },
            created_at_offset: "INTERVAL '5 days'"
        },
        {
            title: "Campus Security & Firewall Update",
            message: "Network core upgrade completed. Campus Wi-Fi certificate re-authentication required.",
            category: "alert",
            tags: ["alert"],
            priority: "warning",
            is_read: true,
            icon: "security",
            source: "IT Operations",
            action: null,
            badge: { label: "Resolved", variant: "neutral" },
            created_at_offset: "INTERVAL '5 days 6 hours'"
        },
        {
            title: "Faculty Development Workshop Registrations Open",
            message: "Modern Pedagogical Tools workshop scheduled for next Friday. Early sign-ups open.",
            category: "academic",
            tags: ["academic"],
            priority: "normal",
            is_read: true,
            icon: "school",
            source: "Academics",
            action: null,
            badge: null,
            created_at_offset: "INTERVAL '6 days'"
        },
        {
            title: "Library Book Overdue Reminders Dispatched",
            message: "Automated return reminders sent to 42 students for overdue reference catalog items.",
            category: "academic",
            tags: ["academic"],
            priority: "info",
            is_read: true,
            icon: "local_library",
            source: "Central Library",
            action: null,
            badge: null,
            created_at_offset: "INTERVAL '8 days'"
        },
        {
            title: "Annual Sports Equipment Procurement Approved",
            message: "Voucher #EQ-2024-91 signed off by athletics coordinator. Supplier dispatched gear.",
            category: "finance",
            tags: ["finance"],
            priority: "normal",
            is_read: true,
            icon: "sports_basketball",
            source: "Athletics Dept",
            action: null,
            badge: { label: "Delivered", variant: "tertiary" },
            created_at_offset: "INTERVAL '11 days'"
        },
        {
            title: "Quarterly Disaster Preparedness Drill Announced",
            message: "Mandatory campus evacuation drill scheduled for first Monday of upcoming month.",
            category: "alert",
            tags: ["alert"],
            priority: "info",
            is_read: true,
            icon: "crisis_alert",
            source: "Safety Council",
            action: null,
            badge: { label: "Scheduled", variant: "secondary" },
            created_at_offset: "INTERVAL '14 days'"
        }
    ];

    for (const item of seedQueries) {
        const timeExpression = item.created_at_sql 
            ? item.created_at_sql 
            : `NOW() - ${item.created_at_offset}`;

        await pool.query(`
            INSERT INTO notifications (
                title, message, category, tags, priority, is_read, icon, source, action, badge, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ${timeExpression}
            )
        `, [
            item.title,
            item.message,
            item.category,
            item.tags,
            item.priority,
            item.is_read,
            item.icon,
            item.source,
            item.action ? JSON.stringify(item.action) : null,
            item.badge ? JSON.stringify(item.badge) : null
        ]);
    }

    console.log("Seeded 14 notifications successfully.");
};

/**
 * Find notifications with filtering, pagination, and search
 */
const findAll = async ({
    userId = null,
    category = null,
    status = null,
    priority = null,
    isArchived = false,
    search = null,
    limit = 50,
    offset = 0
} = {}) => {
    const conditions = [];
    const values = [];
    let count = 1;

    if (userId) {
        conditions.push(`(user_id = $${count} OR user_id IS NULL)`);
        values.push(userId);
        count++;
    }

    if (typeof isArchived === "boolean") {
        conditions.push(`is_archived = $${count}`);
        values.push(isArchived);
        count++;
    }

    if (category && category !== "all") {
        conditions.push(`(category = $${count} OR $${count} = ANY(tags))`);
        values.push(category);
        count++;
    }

    if (status === "unread") {
        conditions.push(`is_read = FALSE`);
    } else if (status === "read") {
        conditions.push(`is_read = TRUE`);
    }

    if (priority) {
        conditions.push(`priority = $${count}`);
        values.push(priority);
        count++;
    }

    if (search) {
        conditions.push(`(title ILIKE $${count} OR message ILIKE $${count} OR source ILIKE $${count})`);
        values.push(`%${search}%`);
        count++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
        SELECT 
            id,
            user_id,
            title,
            message,
            category,
            tags,
            priority,
            is_read,
            is_archived,
            icon,
            source,
            action,
            badge,
            created_at,
            read_at
        FROM notifications
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${count} OFFSET $${count + 1}
    `;

    values.push(limit, offset);
    const result = await pool.query(query, values);
    return result.rows;
};

/**
 * Get notification summary counters (totals, unread, and category counts)
 */
const getSummaryCounts = async ({ userId = null, isArchived = false } = {}) => {
    const conditions = [`is_archived = $1`];
    const values = [isArchived];
    let count = 2;

    if (userId) {
        conditions.push(`(user_id = $${count} OR user_id IS NULL)`);
        values.push(userId);
        count++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const query = `
        SELECT
            COUNT(*)::INT AS total,
            COUNT(*) FILTER (WHERE is_read = FALSE)::INT AS unread_count,
            COUNT(*) FILTER (WHERE category = 'academic' OR 'academic' = ANY(tags))::INT AS academic,
            COUNT(*) FILTER (WHERE category = 'finance' OR 'finance' = ANY(tags))::INT AS finance,
            COUNT(*) FILTER (WHERE category = 'attendance' OR 'attendance' = ANY(tags))::INT AS attendance,
            COUNT(*) FILTER (WHERE category = 'alert' OR 'alert' = ANY(tags))::INT AS alert
        FROM notifications
        ${whereClause}
    `;

    const result = await pool.query(query, values);
    const row = result.rows[0] || {};
    return {
        total: row.total || 0,
        unread_count: row.unread_count || 0,
        category_counts: {
            all: row.total || 0,
            academic: row.academic || 0,
            finance: row.finance || 0,
            attendance: row.attendance || 0,
            alert: row.alert || 0
        }
    };
};

/**
 * Find single notification by ID
 */
const findById = async (id, userId = null) => {
    let query = "SELECT * FROM notifications WHERE id = $1";
    const values = [id];
    if (userId) {
        query += " AND (user_id = $2 OR user_id IS NULL)";
        values.push(userId);
    }
    const result = await pool.query(query, values);
    return result.rows[0] || null;
};

/**
 * Mark a single notification as read
 */
const markAsRead = async (id, userId = null) => {
    let query = `
        UPDATE notifications
        SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE id = $1
    `;
    const values = [id];
    if (userId) {
        query += " AND (user_id = $2 OR user_id IS NULL)";
        values.push(userId);
    }
    query += " RETURNING *";
    const result = await pool.query(query, values);
    return result.rows[0] || null;
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId = null) => {
    let query = `
        UPDATE notifications
        SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE is_read = FALSE
    `;
    const values = [];
    if (userId) {
        query += " AND (user_id = $1 OR user_id IS NULL)";
        values.push(userId);
    }
    query += " RETURNING id";
    const result = await pool.query(query, values);
    return { updated_count: result.rowCount };
};

/**
 * Archive a notification
 */
const archive = async (id, userId = null) => {
    let query = `
        UPDATE notifications
        SET is_archived = TRUE
        WHERE id = $1
    `;
    const values = [id];
    if (userId) {
        query += " AND (user_id = $2 OR user_id IS NULL)";
        values.push(userId);
    }
    query += " RETURNING *";
    const result = await pool.query(query, values);
    return result.rows[0] || null;
};

/**
 * Create a new notification
 */
const create = async ({
    userId = null,
    title,
    message,
    category,
    tags = [],
    priority = "normal",
    icon = "notifications",
    source = null,
    action = null,
    badge = null
}) => {
    const result = await pool.query(
        `INSERT INTO notifications (
            user_id, title, message, category, tags, priority, icon, source, action, badge
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
            userId,
            title,
            message,
            category,
            tags,
            priority,
            icon,
            source,
            action ? JSON.stringify(action) : null,
            badge ? JSON.stringify(badge) : null
        ]
    );
    return result.rows[0];
};

/**
 * Delete a notification by ID
 */
const deleteById = async (id, userId = null) => {
    let query = "DELETE FROM notifications WHERE id = $1";
    const values = [id];
    if (userId) {
        query += " AND (user_id = $2 OR user_id IS NULL)";
        values.push(userId);
    }
    query += " RETURNING id, title";
    const result = await pool.query(query, values);
    return result.rows[0] || null;
};

module.exports = {
    ALLOWED_CATEGORIES,
    ALLOWED_PRIORITIES,
    initTable,
    seedInitialData,
    findAll,
    getSummaryCounts,
    findById,
    markAsRead,
    markAllAsRead,
    archive,
    create,
    deleteById
};
