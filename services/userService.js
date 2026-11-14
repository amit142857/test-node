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
    // Specifically, for admin, hr, finance, and parent, subjects is NOT included.
    if (ROLES_WITH_SUBJECTS.includes(user.role)) {
        formatted.subjects = (profile.subjects && profile.subjects.length > 0)
            ? profile.subjects
            : (roleConfig.subjects && roleConfig.subjects.length > 0 ? roleConfig.subjects : ["Calculus III", "Linear Algebra"]);
    }

    return formatted;
}

/**
 * Get all users.
 */
const getAllUsers = async () => {
    return await userRepository.findAll();
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
    getUserById,
    updateUser,
    deleteUser,
    formatUserProfile,
    formatRelativeTime
};
