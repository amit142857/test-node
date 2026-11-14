const { pool } = require("../db/pool");

const ALLOWED_ROLES = ["admin", "student", "teacher", "parent", "hr", "finance"];

/**
 * Create a new user in the database.
 */
const create = async (name, email, hashedPassword, role) => {
    const result = await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
        [name, email, hashedPassword, role]
    );
    return result.rows[0];
};

/**
 * Find a user by email (includes password for auth).
 */
const findByEmail = async (email) => {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0] || null;
};

/**
 * Find a user by ID (safe fields only).
 */
const findById = async (id) => {
    const result = await pool.query(
        "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Get summary and partition statistics for institutional users
 */
const getUsersSummary = async () => {
    const totalRes = await pool.query("SELECT COUNT(*)::INT AS total FROM users");
    const total = totalRes.rows[0].total;

    const roleCountsRes = await pool.query(`
        SELECT role, COUNT(*)::INT AS count
        FROM users
        GROUP BY role
    `);

    const roleCounts = {
        all: total,
        admin: 0,
        teacher: 0,
        student: 0,
        parent: 0,
        hr: 0,
        finance: 0
    };

    for (const row of roleCountsRes.rows) {
        if (roleCounts.hasOwnProperty(row.role)) {
            roleCounts[row.role] = row.count;
        }
    }

    const rolePartitions = roleCountsRes.rows.length;
    const admins = roleCounts.admin || 0;
    const departmental = total - admins;

    return {
        total_registered: total,
        active_users: total,
        role_partitions: rolePartitions,
        access_level: "Super Admin access level",
        campus_records_text: `${total} Total records enrolled across all campus branches`,
        footprint: {
            admins,
            departmental,
            text: `${admins} Admins • ${departmental} Departmental`
        },
        role_counts: roleCounts,
        filter_pills: [
            { role: "all", label: "All", count: total },
            { role: "admin", label: "Admin", count: roleCounts.admin },
            { role: "teacher", label: "Teacher", count: roleCounts.teacher },
            { role: "student", label: "Student", count: roleCounts.student },
            { role: "parent", label: "Parent", count: roleCounts.parent },
            { role: "hr", label: "HR", count: roleCounts.hr },
            { role: "finance", label: "Finance", count: roleCounts.finance }
        ]
    };
};

/**
 * Get all users with comprehensive search, role filters, date range, and sorting.
 */
const findAll = async ({
    search = null,
    role = null,
    sortBy = "newest",
    order = "desc",
    date = null,
    dateFrom = null,
    dateTo = null,
    limit = null,
    offset = 0
} = {}) => {
    let query = `
        SELECT 
            u.id, 
            u.name, 
            u.email, 
            u.role, 
            u.created_at,
            TO_CHAR(u.created_at, 'Mon DD, YYYY, HH24:MI UTC') AS created_at_formatted,
            p.title,
            p.avatar_url,
            p.avatar_thumbnail_url,
            p.is_verified,
            p.employee_id,
            p.branch,
            p.phone
        FROM users u
        LEFT JOIN profiles p ON u.id = p.id
    `;
    const conditions = [];
    const values = [];
    let count = 1;

    // Search by name, email, role, title, employee_id, or numeric ID
    if (search && search.trim()) {
        const raw = search.trim();
        const cleanId = raw.replace(/^#/, "").trim();
        const isNumeric = /^\d+$/.test(cleanId);
        const term = `%${raw}%`;

        if (isNumeric) {
            conditions.push(`(
                u.name ILIKE $${count} OR 
                u.email ILIKE $${count} OR 
                u.role ILIKE $${count} OR 
                p.employee_id ILIKE $${count} OR 
                p.title ILIKE $${count} OR 
                u.id = $${count + 1}
            )`);
            values.push(term, parseInt(cleanId, 10));
            count += 2;
        } else {
            conditions.push(`(
                u.name ILIKE $${count} OR 
                u.email ILIKE $${count} OR 
                u.role ILIKE $${count} OR 
                p.employee_id ILIKE $${count} OR 
                p.title ILIKE $${count}
            )`);
            values.push(term);
            count++;
        }
    }

    // Role filter (all, admin, teacher, student, parent, hr, finance)
    if (role && role !== "all") {
        conditions.push(`u.role = $${count}`);
        values.push(role.toLowerCase());
        count++;
    }

    // Date filters
    if (date) {
        conditions.push(`DATE(u.created_at) = $${count}`);
        values.push(date);
        count++;
    }
    if (dateFrom) {
        conditions.push(`DATE(u.created_at) >= $${count}`);
        values.push(dateFrom);
        count++;
    }
    if (dateTo) {
        conditions.push(`DATE(u.created_at) <= $${count}`);
        values.push(dateTo);
        count++;
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Sorting logic (Newest First, Oldest First, Name, Role, etc.)
    let orderBySql = "u.created_at DESC";
    const sortLower = (sortBy || "newest").toLowerCase();
    if (sortLower === "newest") {
        orderBySql = "u.created_at DESC";
    } else if (sortLower === "oldest") {
        orderBySql = "u.created_at ASC";
    } else if (sortLower === "name_asc" || (sortLower === "name" && order === "asc")) {
        orderBySql = "u.name ASC";
    } else if (sortLower === "name_desc" || (sortLower === "name" && order === "desc")) {
        orderBySql = "u.name DESC";
    } else if (sortLower === "role") {
        orderBySql = `u.role ${order === "desc" ? "DESC" : "ASC"}, u.created_at DESC`;
    } else if (sortLower === "id_asc") {
        orderBySql = "u.id ASC";
    } else if (sortLower === "id_desc") {
        orderBySql = "u.id DESC";
    }

    query += ` ORDER BY ${orderBySql}`;

    if (limit) {
        query += ` LIMIT $${count++}`;
        values.push(limit);
    }
    if (offset && offset > 0) {
        query += ` OFFSET $${count++}`;
        values.push(offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
};

/**
 * Update a user by ID. Only updates provided fields.
 */
const updateById = async (id, { name, email, role }) => {
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
    return result.rows[0] || null;
};

/**
 * Delete a user by ID.
 */
const deleteById = async (id) => {
    const result = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING id, name, email",
        [id]
    );
    return result.rows[0] || null;
};

module.exports = {
    ALLOWED_ROLES,
    create,
    findByEmail,
    findById,
    findAll,
    getUsersSummary,
    updateById,
    deleteById,
};
