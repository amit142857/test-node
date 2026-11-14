const { pool } = require("../db/pool");
const bcrypt = require("bcrypt");

const ROLE_DEFAULTS = {
    admin: {
        title: "Senior Administrator",
        employee_prefix: "EDU",
        has_subjects: false,
        subjects: []
    },
    teacher: {
        title: "Senior Teacher / Mathematics Lead",
        employee_prefix: "TCH",
        has_subjects: true,
        subjects: ["Calculus III", "Linear Algebra"]
    },
    student: {
        title: "Grade 12 Student",
        employee_prefix: "STU",
        has_subjects: true,
        subjects: ["Calculus III", "Linear Algebra"]
    },
    parent: {
        title: "Guardian / Parent",
        employee_prefix: "PAR",
        has_subjects: false,
        subjects: []
    },
    hr: {
        title: "Human Resources Lead",
        employee_prefix: "HR",
        has_subjects: false,
        subjects: []
    },
    finance: {
        title: "Finance Controller",
        employee_prefix: "FIN",
        has_subjects: false,
        subjects: []
    }
};

const DEFAULT_PROFILE = {
    title: "Senior Administrator",
    avatar_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBO90QanDyQrSXSiCVRLkiDRwul4cFwlzw2SLc5bD1_jtEaR94XYrpwf_IHHE-vJCYwTXb-x_sml4K_QXJIxUqinKnqkfLl5GFk0L2d1iZvz91WoNy9Ell_fl_dJOGot3_uV59VtP6jmjody6aZeKB1taJ-LZWwDPK-jv8DSgH8870TY5Y4HSaRvPwhN6AJTaO1NZF4uJ5QOy-zuzBXFlmNG86xfkA7oCNNXFu8pyddmEeumtKh21E7xGKL19Q5tdncXr_h3jD_clEn",
    avatar_thumbnail_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuArmOJeUsDHpsXv3sWKWvavgyX5h_cJel5jg_BnO7LJ2M7FE04D1yIDTp7TJU8pyEaeESD2v_jFg8BQjA5BhXP_xoTjThFrNnA-4dGIhhrU-A4ZHhpr3Cbv37INpPvx0dyu_gCKXnZevQu2yhd_TVI9hldr8AuT2rZzbRKFaGBN--60dwZIAY-DDuuitwZQnjRGLfj-4Dyten90RbQ5w1seG6CbEb_4zcBr-6Ji3-K5TkJXiSi0XTAxuba8iqs5guKqYvBBSiw6WOuq",
    is_verified: true,
    employee_id: "EDU-8842",
    branch: "North Wing",
    phone: "+1 (555) 012-3456",
    attendance_rate: 98.4,
    theme: "light",
    language: "English (United States)",
    notifications_enabled: { push: true, email: true, sms: true },
    two_factor_enabled: false
};

/**
 * Initialize profiles table and indexes
 */
const initTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) DEFAULT 'Senior Administrator',
            avatar_url TEXT DEFAULT 'https://lh3.googleusercontent.com/aida-public/AB6AXuBO90QanDyQrSXSiCVRLkiDRwul4cFwlzw2SLc5bD1_jtEaR94XYrpwf_IHHE-vJCYwTXb-x_sml4K_QXJIxUqinKnqkfLl5GFk0L2d1iZvz91WoNy9Ell_fl_dJOGot3_uV59VtP6jmjody6aZeKB1taJ-LZWwDPK-jv8DSgH8870TY5Y4HSaRvPwhN6AJTaO1NZF4uJ5QOy-zuzBXFlmNG86xfkA7oCNNXFu8pyddmEeumtKh21E7xGKL19Q5tdncXr_h3jD_clEn',
            avatar_thumbnail_url TEXT DEFAULT 'https://lh3.googleusercontent.com/aida-public/AB6AXuArmOJeUsDHpsXv3sWKWvavgyX5h_cJel5jg_BnO7LJ2M7FE04D1yIDTp7TJU8pyEaeESD2v_jFg8BQjA5BhXP_xoTjThFrNnA-4dGIhhrU-A4ZHhpr3Cbv37INpPvx0dyu_gCKXnZevQu2yhd_TVI9hldr8AuT2rZzbRKFaGBN--60dwZIAY-DDuuitwZQnjRGLfj-4Dyten90RbQ5w1seG6CbEb_4zcBr-6Ji3-K5TkJXiSi0XTAxuba8iqs5guKqYvBBSiw6WOuq',
            is_verified BOOLEAN DEFAULT TRUE,
            employee_id VARCHAR(50) DEFAULT 'EDU-8842',
            branch VARCHAR(100) DEFAULT 'North Wing',
            phone VARCHAR(50) DEFAULT '+1 (555) 012-3456',
            subjects TEXT[] DEFAULT '{}',
            attendance_rate NUMERIC(5,2) DEFAULT 98.4,
            last_login TIMESTAMP WITH TIME ZONE DEFAULT (NOW() - INTERVAL '14 minutes'),
            theme VARCHAR(20) DEFAULT 'light',
            language VARCHAR(100) DEFAULT 'English (United States)',
            notifications_enabled JSONB DEFAULT '{"push": true, "email": true, "sms": true}'::JSONB,
            two_factor_enabled BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
    `);
};

/**
 * Seed initial profile data for Dr. Sarah Jenkins and existing users
 */
const seedInitialData = async () => {
    // 1. Ensure Dr. Sarah Jenkins exists in users
    let sarahRes = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        ["s.jenkins@eduflow.edu"]
    );

    let sarahId;
    if (sarahRes.rows.length === 0) {
        const hashedPassword = await bcrypt.hash("secret123", 10);
        const insertRes = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id",
            ["Dr. Sarah Jenkins", "s.jenkins@eduflow.edu", hashedPassword, "admin"]
        );
        sarahId = insertRes.rows[0].id;
        console.log(`Seeded user Dr. Sarah Jenkins with id: ${sarahId}`);
    } else {
        sarahId = sarahRes.rows[0].id;
    }

    // 2. Seed profile for Dr. Sarah Jenkins (Admin role: subjects empty)
    await pool.query(`
        INSERT INTO profiles (
            id, user_id, title, avatar_url, avatar_thumbnail_url, is_verified,
            employee_id, branch, phone, subjects, attendance_rate, last_login,
            theme, language, notifications_enabled, two_factor_enabled
        ) VALUES (
            $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '14 minutes', $11, $12, $13, $14
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            avatar_url = EXCLUDED.avatar_url,
            avatar_thumbnail_url = EXCLUDED.avatar_thumbnail_url,
            is_verified = EXCLUDED.is_verified,
            employee_id = EXCLUDED.employee_id,
            branch = EXCLUDED.branch,
            phone = EXCLUDED.phone,
            subjects = EXCLUDED.subjects,
            attendance_rate = EXCLUDED.attendance_rate,
            theme = EXCLUDED.theme,
            language = EXCLUDED.language,
            notifications_enabled = EXCLUDED.notifications_enabled,
            two_factor_enabled = EXCLUDED.two_factor_enabled
    `, [
        sarahId,
        "Senior Administrator",
        DEFAULT_PROFILE.avatar_url,
        DEFAULT_PROFILE.avatar_thumbnail_url,
        DEFAULT_PROFILE.is_verified,
        "EDU-8842",
        DEFAULT_PROFILE.branch,
        DEFAULT_PROFILE.phone,
        [],
        DEFAULT_PROFILE.attendance_rate,
        DEFAULT_PROFILE.theme,
        DEFAULT_PROFILE.language,
        JSON.stringify(DEFAULT_PROFILE.notifications_enabled),
        DEFAULT_PROFILE.two_factor_enabled
    ]);

    // 3. Ensure all existing users have profile rows according to their role
    const allUsers = await pool.query("SELECT id, name, email, role FROM users");
    for (const u of allUsers.rows) {
        if (u.id !== sarahId) {
            await createDefaultProfile(u.id, u);
        }
    }
};

/**
 * Find profile by user ID
 */
const findByUserId = async (userId) => {
    const result = await pool.query(
        "SELECT * FROM profiles WHERE id = $1 OR user_id = $1",
        [userId]
    );
    return result.rows[0] || null;
};

/**
 * Create or sync default profile for a user based on their defined role
 */
const createDefaultProfile = async (userId, user = {}) => {
    const roleConfig = ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS.admin;
    const isDrSarah = user.email === "s.jenkins@eduflow.edu" || user.name === "Dr. Sarah Jenkins";

    const title = roleConfig.title;
    const employeeId = isDrSarah
        ? "EDU-8842"
        : `${roleConfig.employee_prefix}-${8800 + (Number(userId) % 1000)}`;

    const subjects = roleConfig.has_subjects ? roleConfig.subjects : [];

    const result = await pool.query(`
        INSERT INTO profiles (
            id, user_id, title, avatar_url, avatar_thumbnail_url, is_verified,
            employee_id, branch, phone, subjects, attendance_rate, last_login,
            theme, language, notifications_enabled, two_factor_enabled
        ) VALUES (
            $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '14 minutes', $11, $12, $13, $14
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            employee_id = EXCLUDED.employee_id,
            subjects = EXCLUDED.subjects,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `, [
        userId,
        title,
        DEFAULT_PROFILE.avatar_url,
        DEFAULT_PROFILE.avatar_thumbnail_url,
        true,
        employeeId,
        DEFAULT_PROFILE.branch,
        DEFAULT_PROFILE.phone,
        subjects,
        DEFAULT_PROFILE.attendance_rate,
        DEFAULT_PROFILE.theme,
        DEFAULT_PROFILE.language,
        JSON.stringify(DEFAULT_PROFILE.notifications_enabled),
        DEFAULT_PROFILE.two_factor_enabled
    ]);

    return result.rows[0];
};

/**
 * Update the avatar URL for a user profile (upsert)
 */
const updateAvatarUrl = async (userId, avatarUrl) => {
    const result = await pool.query(`
        INSERT INTO profiles (id, user_id, avatar_url, avatar_thumbnail_url, updated_at)
        VALUES ($1, $1, $2, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
            avatar_url = EXCLUDED.avatar_url,
            avatar_thumbnail_url = EXCLUDED.avatar_thumbnail_url,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `, [userId, avatarUrl]);
    return result.rows[0];
};

/**
 * Update user profile fields
 */
const updateProfile = async (userId, data) => {
    const allowedFields = [
        "title",
        "avatar_url",
        "avatar_thumbnail_url",
        "is_verified",
        "employee_id",
        "branch",
        "phone",
        "subjects",
        "attendance_rate",
        "theme",
        "language",
        "notifications_enabled",
        "two_factor_enabled"
    ];

    const fields = [];
    const values = [];
    let count = 1;

    for (const key of allowedFields) {
        if (data[key] !== undefined) {
            if (key === "notifications_enabled" && typeof data[key] === "object") {
                fields.push(`${key} = $${count++}`);
                values.push(JSON.stringify(data[key]));
            } else {
                fields.push(`${key} = $${count++}`);
                values.push(data[key]);
            }
        }
    }

    if (fields.length === 0) {
        return await findByUserId(userId);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(userId);

    const result = await pool.query(
        `UPDATE profiles SET ${fields.join(", ")} WHERE id = $${count} RETURNING *`,
        values
    );

    if (result.rows.length === 0) {
        return await createDefaultProfile(userId, data);
    }

    return result.rows[0];
};

/**
 * Update last login timestamp for user profile
 */
const updateLastLogin = async (userId) => {
    await pool.query(
        "UPDATE profiles SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 OR user_id = $1",
        [userId]
    );
};

module.exports = {
    ROLE_DEFAULTS,
    DEFAULT_PROFILE,
    initTable,
    seedInitialData,
    findByUserId,
    createDefaultProfile,
    updateAvatarUrl,
    updateProfile,
    updateLastLogin
};
