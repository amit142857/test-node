const userRepository = require("../repositories/userRepository");
const profileRepository = require("../repositories/profileRepository");

/**
 * Roles that teach or enroll in academic subjects
 * Admin, HR, Finance, and Parent roles do not have subjects.
 */
const ROLES_WITH_SUBJECTS = ["teacher", "student"];

/**
 * Format timestamp into human-readable relative string matching the UI
 * e.g., "14m ago", "2h ago", "Yesterday, 8:42 AM", "3 days ago"
 */
function formatRelativeTime(date) {
    if (!date) return "14m ago";
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
    if (now.toDateString() === created.toDateString()) {
        return `${diffHours}h ago`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === created.toDateString()) {
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

/**
 * Format date in standard UTC format matching Institutional Users cards:
 * e.g. "Nov 13, 2026, 06:36 UTC", "Oct 22, 2026, 06:16 UTC"
 */
function formatCardDate(d) {
    if (!d) return null;
    const date = new Date(d);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getUTCMonth()];
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return `${month} ${day}, ${year}, ${hours}:${minutes} UTC`;
}

/**
 * Determine role badge (e.g. "Super Admin & Faculty Lead", "Finance & Billing")
 */
function getRoleBadge(user) {
    if (user.id === 24 || user.email === "s.jenkins@eduflow.edu") {
        return {
            label: "Super Admin & Faculty Lead",
            icon: "shield_person",
            variant: "primary"
        };
    }
    const badges = {
        admin: { label: "Super Admin & Operations", icon: "admin_panel_settings", variant: "primary" },
        finance: { label: "Finance & Billing", icon: "account_balance_wallet", variant: "secondary" },
        teacher: { label: "Faculty & Academics", icon: "school", variant: "secondary" },
        student: { label: "Student & Learner", icon: "person", variant: "tertiary" },
        hr: { label: "HR & Staff Operations", icon: "badge", variant: "secondary" },
        parent: { label: "Guardian & Family", icon: "family_restroom", variant: "neutral" }
    };
    return badges[user.role] || { label: user.title || user.role, icon: "person", variant: "primary" };
}

/**
 * Determine status badge (e.g. "Active • Primary Lead", "Audited • High Privilege")
 */
function getStatusBadge(user) {
    if (user.id === 24 || user.email === "s.jenkins@eduflow.edu") {
        return {
            label: "Active • Primary Lead",
            status: "active",
            variant: "info"
        };
    }
    const badges = {
        admin: { label: "Active • System Admin", status: "active", variant: "info" },
        finance: { label: "Audited • High Privilege", status: "audited", variant: "warning" },
        teacher: { label: "Active • Academic Lead", status: "active", variant: "info" },
        student: { label: "Enrolled • Regular", status: "enrolled", variant: "success" },
        hr: { label: "Audited • Staff Lead", status: "audited", variant: "warning" },
        parent: { label: "Linked • Verified Guardian", status: "verified", variant: "neutral" }
    };
    return badges[user.role] || { label: "Active", status: "active", variant: "info" };
}

/**
 * User card actions matching UI (e.g. security lock, view eye, audit receipt, edit pen)
 */
function getUserActions(user) {
    if (user.role === "admin") {
        return [
            { type: "security", icon: "lock", label: "Security & Permissions" },
            { type: "view", icon: "visibility", label: "View Profile" }
        ];
    }
    if (user.role === "finance" || user.role === "hr") {
        return [
            { type: "audit", icon: "receipt_long", label: "Audit Logs" },
            { type: "edit", icon: "edit", label: "Edit Record" }
        ];
    }
    return [
        { type: "view", icon: "visibility", label: "View Profile" },
        { type: "edit", icon: "edit", label: "Edit Record" }
    ];
}

/**
 * Format user record for Institutional Users card list
 */
function formatUserCard(user) {
    const roleBadge = getRoleBadge(user);
    const statusBadge = getStatusBadge(user);
    const createdFormatted = user.created_at_formatted || formatCardDate(user.created_at);

    return {
        id: user.id,
        display_id: `#${user.id}`,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title || roleBadge.label,
        avatar_url: user.avatar_url || profileRepository.DEFAULT_PROFILE.avatar_url,
        avatar_thumbnail_url: user.avatar_thumbnail_url || profileRepository.DEFAULT_PROFILE.avatar_thumbnail_url,
        is_verified: user.is_verified ?? true,
        employee_id: user.employee_id || `EDU-${8800 + (Number(user.id) % 1000)}`,
        branch: user.branch || "North Wing",
        phone: user.phone || "+1 (555) 012-3456",
        role_badge: roleBadge,
        status_badge: statusBadge,
        created_at: user.created_at,
        created_at_formatted: createdFormatted,
        actions: getUserActions(user)
    };
}

/**
 * Format combined user and profile records into the complete EduFlow profile response
 * tailored to the user's defined role.
 */
function formatUserProfile(user, profile = {}) {
    const roleConfig = profileRepository.ROLE_DEFAULTS[user.role] || profileRepository.ROLE_DEFAULTS.admin;

    const attendanceRateNum = profile.attendance_rate != null ? Number(profile.attendance_rate) : 98.4;
    const attendanceRateStr = `${attendanceRateNum}%`;
    const lastLoginFormatted = profile.last_login ? formatRelativeTime(profile.last_login) : "14m ago";

    const title = profile.title || roleConfig.title;
    const employeeId = profile.employee_id || (user.id ? `${roleConfig.employee_prefix}-${8800 + (Number(user.id) % 1000)}` : "EDU-8842");
    const branch = profile.branch || "North Wing";
    const phone = profile.phone || "+1 (555) 012-3456";
    const theme = profile.theme || "light";
    const language = profile.language || "English (United States)";

    const notifications = {
        push: profile.notifications_enabled?.push ?? true,
        email: profile.notifications_enabled?.email ?? true,
        sms: profile.notifications_enabled?.sms ?? true,
        summary: "Push, Email, and SMS preferences"
    };

    const security = {
        two_factor_enabled: profile.two_factor_enabled ?? false,
        recent_active_sessions: 1,
        summary: "Manage 2FA and recent active sessions"
    };

    const privacy = {
        summary: "Review data permissions"
    };

    const formatted = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title,
        designation: title,
        avatar_url: profile.avatar_url || profileRepository.DEFAULT_PROFILE.avatar_url,
        avatar_thumbnail_url: profile.avatar_thumbnail_url || profileRepository.DEFAULT_PROFILE.avatar_thumbnail_url,
        is_verified: profile.is_verified ?? true,
        employee_id: employeeId,
        branch,
        phone,
        activity_pulse: {
            attendance_rate: attendanceRateStr,
            attendance_percentage: attendanceRateNum,
            last_login: lastLoginFormatted,
            last_login_at: profile.last_login || null
        },
        attendance_rate: attendanceRateStr,
        attendance_percentage: attendanceRateNum,
        last_login: lastLoginFormatted,
        last_login_at: profile.last_login || null,
        settings: {
            theme,
            language,
            notifications,
            security,
            privacy
        },
        theme,
        language,
        created_at: user.created_at || profile.created_at || null,
        updated_at: profile.updated_at || null
    };

    // Include subjects ONLY for academic roles that teach or enroll in courses (teacher, student).
    if (ROLES_WITH_SUBJECTS.includes(user.role)) {
        formatted.subjects = (profile.subjects && profile.subjects.length > 0)
            ? profile.subjects
            : (roleConfig.subjects && roleConfig.subjects.length > 0 ? roleConfig.subjects : ["Calculus III", "Linear Algebra"]);
    }

    return formatted;
}

/**
 * Get summary statistics for Institutional Users view
 */
const getUsersSummary = async () => {
    return await userRepository.getUsersSummary();
};

/**
 * Get all users with comprehensive search, role filters, sorting, and UI metadata.
 */
const getAllUsers = async (query = {}) => {
    const search = query.search || query.q || null;
    const role = (query.role || "all").toLowerCase();
    const sortBy = query.sort_by || query.sort || "newest";
    const order = query.order || (sortBy === "oldest" ? "asc" : "desc");
    const date = query.date || null;
    const dateFrom = query.date_from || query.from || null;
    const dateTo = query.date_to || query.to || null;
    const limit = query.limit ? parseInt(query.limit, 10) : null;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    // Fetch summary statistics
    const summary = await userRepository.getUsersSummary();

    // Mark active filter pill
    summary.filter_pills = summary.filter_pills.map(pill => ({
        ...pill,
        active: pill.role === role
    }));

    // Fetch filtered user records
    const rawUsers = await userRepository.findAll({
        search,
        role,
        sortBy,
        order,
        date,
        dateFrom,
        dateTo,
        limit,
        offset
    });

    const users = rawUsers.map(formatUserCard);

    return {
        summary,
        current_filter: {
            search: search || null,
            role,
            sort_by: sortBy,
            order
        },
        total: summary.total_registered,
        filtered_count: users.length,
        users
    };
};

/**
 * Get current user with full profile details.
 */
const getUserById = async (id) => {
    const user = await userRepository.findById(id);
    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    let profile = await profileRepository.findByUserId(id);
    if (!profile) {
        profile = await profileRepository.createDefaultProfile(id, user);
    }

    return formatUserProfile(user, profile);
};

/**
 * Update user and/or profile fields by ID.
 */
const updateUser = async (id, updateData) => {
    const {
        name,
        email,
        role,
        title,
        avatar_url,
        avatar_thumbnail_url,
        is_verified,
        employee_id,
        branch,
        phone,
        subjects,
        attendance_rate,
        theme,
        language,
        notifications_enabled,
        two_factor_enabled,
        settings
    } = updateData;

    const userFields = {};
    if (name !== undefined) userFields.name = name;
    if (email !== undefined) userFields.email = email;
    if (role !== undefined) userFields.role = role;

    const profileFields = {};
    if (title !== undefined) profileFields.title = title;
    if (avatar_url !== undefined) profileFields.avatar_url = avatar_url;
    if (avatar_thumbnail_url !== undefined) profileFields.avatar_thumbnail_url = avatar_thumbnail_url;
    if (is_verified !== undefined) profileFields.is_verified = is_verified;
    if (employee_id !== undefined) profileFields.employee_id = employee_id;
    if (branch !== undefined) profileFields.branch = branch;
    if (phone !== undefined) profileFields.phone = phone;
    if (subjects !== undefined) profileFields.subjects = subjects;
    if (attendance_rate !== undefined) profileFields.attendance_rate = attendance_rate;
    if (theme !== undefined || settings?.theme !== undefined) {
        profileFields.theme = theme || settings?.theme;
    }
    if (language !== undefined || settings?.language !== undefined) {
        profileFields.language = language || settings?.language;
    }
    if (notifications_enabled !== undefined || settings?.notifications !== undefined) {
        profileFields.notifications_enabled = notifications_enabled || settings?.notifications;
    }
    if (two_factor_enabled !== undefined || settings?.security?.two_factor_enabled !== undefined) {
        profileFields.two_factor_enabled = two_factor_enabled !== undefined
            ? two_factor_enabled
            : settings?.security?.two_factor_enabled;
    }

    const hasUserFields = Object.keys(userFields).length > 0;
    const hasProfileFields = Object.keys(profileFields).length > 0;

    if (!hasUserFields && !hasProfileFields) {
        const error = new Error("Provide at least one user or profile field to update");
        error.status = 400;
        throw error;
    }

    if (role && !userRepository.ALLOWED_ROLES.includes(role)) {
        const error = new Error(`Role must be one of: ${userRepository.ALLOWED_ROLES.join(", ")}`);
        error.status = 400;
        throw error;
    }

    let user;
    if (hasUserFields) {
        try {
            user = await userRepository.updateById(id, userFields);
            if (!user) {
                const error = new Error("User not found");
                error.status = 404;
                throw error;
            }
        } catch (err) {
            if (err.code === "23505") {
                const error = new Error("Email already in use");
                error.status = 400;
                throw error;
            }
            throw err;
        }
    } else {
        user = await userRepository.findById(id);
        if (!user) {
            const error = new Error("User not found");
            error.status = 404;
            throw error;
        }
    }

    // Do not persist subjects for non-academic roles (admin, hr, finance, parent)
    if (!ROLES_WITH_SUBJECTS.includes(user.role)) {
        delete profileFields.subjects;
    }

    let profile;
    if (hasProfileFields) {
        profile = await profileRepository.updateProfile(id, profileFields);
    } else {
        profile = await profileRepository.findByUserId(id);
        if (!profile) {
            profile = await profileRepository.createDefaultProfile(id, user);
        }
    }

    return formatUserProfile(user, profile);
};

/**
 * Delete a user by ID.
 */
const deleteUser = async (id) => {
    const user = await userRepository.deleteById(id);
    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }
    return user;
};

module.exports = {
    ROLES_WITH_SUBJECTS,
    getAllUsers,
    getUsersSummary,
    getUserById,
    updateUser,
    deleteUser,
    formatUserProfile,
    formatUserCard,
    formatCardDate,
    formatRelativeTime
};
