const notificationRepository = require("../repositories/notificationRepository");

/**
 * Format timestamp into human-readable relative string matching the UI
 * e.g., "12m ago", "1h ago", "Yesterday, 8:42 AM", "3 days ago"
 */
function formatRelativeTime(date) {
    const now = new Date();
    const created = new Date(date);
    const diffMs = Math.max(0, now - created);
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60 && diffHours < 1) {
        return `${Math.max(1, diffMins)}m ago`;
    }
    if (isSameDay(now, created)) {
        return `${diffHours}h ago`;
    }
    if (isYesterday(now, created)) {
        const timeStr = created.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
        return `Yesterday, ${timeStr}`;
    }
    if (diffDays <= 6) {
        return `${diffDays} days ago`;
    }
    return created.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    });
}

function isSameDay(d1, d2) {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

function isYesterday(now, d) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return isSameDay(yesterday, d);
}

/**
 * Group notifications into UI timeframe sections:
 * - 'today' ("Today")
 * - 'yesterday' ("Yesterday")
 * - 'earlier' ("Earlier this week")
 * - 'older' ("Older")
 */
function determineTimeGroup(date) {
    const now = new Date();
    const created = new Date(date);

    if (isSameDay(now, created)) {
        return "today";
    }
    if (isYesterday(now, created)) {
        return "yesterday";
    }
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
        return "earlier";
    }
    return "older";
}

/**
 * Fetch notifications with filtering, summary statistics, and date grouping
 */
const getNotifications = async ({
    userId = null,
    category = null,
    status = null,
    priority = null,
    isArchived = false,
    search = null,
    limit = 50,
    offset = 0,
    groupBy = "date"
} = {}) => {
    // Validate category if supplied
    if (category && category !== "all" && !notificationRepository.ALLOWED_CATEGORIES.includes(category)) {
        const error = new Error(`Category must be one of: all, ${notificationRepository.ALLOWED_CATEGORIES.join(", ")}`);
        error.status = 400;
        throw error;
    }

    // Validate status if supplied
    if (status && !["all", "read", "unread"].includes(status)) {
        const error = new Error("Status must be one of: all, read, unread");
        error.status = 400;
        throw error;
    }

    // Fetch items and summary counts
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

    const [rawNotifications, summary] = await Promise.all([
        notificationRepository.findAll({
            userId,
            category: category === "all" ? null : category,
            status: status === "all" ? null : status,
            priority,
            isArchived,
            search,
            limit: parsedLimit,
            offset: parsedOffset
        }),
        notificationRepository.getSummaryCounts({ userId, isArchived })
    ]);

    // Enhance each notification with relative time and grouping bucket
    const notifications = rawNotifications.map((item) => {
        const timeAgo = formatRelativeTime(item.created_at);
        const timeGroup = determineTimeGroup(item.created_at);
        return {
            ...item,
            time_ago: timeAgo,
            time_group: timeGroup
        };
    });

    const response = {
        meta: {
            total: summary.total,
            unread_count: summary.unread_count,
            category_counts: summary.category_counts,
            limit: parsedLimit,
            offset: parsedOffset,
            filtered_count: notifications.length
        },
        notifications
    };

    // If grouping is requested, organize items into UI sections
    if (groupBy === "date") {
        const groupLabels = {
            today: "Today",
            yesterday: "Yesterday",
            earlier: "Earlier this week",
            older: "Older"
        };

        const groupedMap = {
            today: [],
            yesterday: [],
            earlier: [],
            older: []
        };

        for (const item of notifications) {
            if (groupedMap[item.time_group]) {
                groupedMap[item.time_group].push(item);
            } else {
                groupedMap.older.push(item);
            }
        }

        response.groups = Object.keys(groupedMap)
            .filter((key) => groupedMap[key].length > 0)
            .map((key) => ({
                group: key,
                label: groupLabels[key],
                count: groupedMap[key].length,
                items: groupedMap[key]
            }));
    }

    return response;
};

/**
 * Get notification summary counters (totals, unread, and category counts)
 */
const getSummary = async ({ userId = null, isArchived = false } = {}) => {
    return await notificationRepository.getSummaryCounts({ userId, isArchived });
};

/**
 * Get a single notification by ID
 */
const getNotificationById = async (id, userId = null) => {
    const notification = await notificationRepository.findById(id, userId);
    if (!notification) {
        const error = new Error("Notification not found");
        error.status = 404;
        throw error;
    }

    return {
        ...notification,
        time_ago: formatRelativeTime(notification.created_at),
        time_group: determineTimeGroup(notification.created_at)
    };
};

/**
 * Mark a single notification as read
 */
const markAsRead = async (id, userId = null) => {
    const notification = await notificationRepository.markAsRead(id, userId);
    if (!notification) {
        const error = new Error("Notification not found");
        error.status = 404;
        throw error;
    }
    return {
        ...notification,
        time_ago: formatRelativeTime(notification.created_at),
        time_group: determineTimeGroup(notification.created_at)
    };
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId = null) => {
    return await notificationRepository.markAllAsRead(userId);
};

/**
 * Archive a notification
 */
const archiveNotification = async (id, userId = null) => {
    const notification = await notificationRepository.archive(id, userId);
    if (!notification) {
        const error = new Error("Notification not found");
        error.status = 404;
        throw error;
    }
    return notification;
};

/**
 * Create a new notification
 */
const createNotification = async (data) => {
    const { title, message, category } = data;
    if (!title || !message || !category) {
        const error = new Error("title, message, and category are required");
        error.status = 400;
        throw error;
    }

    if (!notificationRepository.ALLOWED_CATEGORIES.includes(category)) {
        const error = new Error(`Category must be one of: ${notificationRepository.ALLOWED_CATEGORIES.join(", ")}`);
        error.status = 400;
        throw error;
    }

    const created = await notificationRepository.create(data);
    return {
        ...created,
        time_ago: formatRelativeTime(created.created_at),
        time_group: determineTimeGroup(created.created_at)
    };
};

/**
 * Delete a notification
 */
const deleteNotification = async (id, userId = null) => {
    const deleted = await notificationRepository.deleteById(id, userId);
    if (!deleted) {
        const error = new Error("Notification not found");
        error.status = 404;
        throw error;
    }
    return deleted;
};

module.exports = {
    getNotifications,
    getSummary,
    getNotificationById,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    createNotification,
    deleteNotification
};
