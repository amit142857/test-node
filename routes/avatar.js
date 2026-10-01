const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const { pool } = require("../db/pool");

const router = express.Router();

// Supabase client (service role for storage operations)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Multer config: memory storage, 2MB limit, images only
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG and WebP images are allowed"), false);
        }
    },
});

/**
 * @swagger
 * /api/user/avatar:
 *   post:
 *     summary: Upload user avatar
 *     description: Uploads a profile picture to Supabase Storage and updates the user's profile record. Accepts JPEG, PNG, or WebP images up to 2MB.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: "Profile image file (JPEG, PNG, or WebP, max 2MB)"
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Avatar updated successfully
 *                 avatar_url:
 *                   type: string
 *                   example: https://owstvdrbbhqgdecbzoup.supabase.co/storage/v1/object/public/avatars/1/avatar.png
 *       400:
 *         description: Missing or invalid file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: Missing or invalid token
 *       500:
 *         description: Server or Supabase error
 */
router.post("/api/user/avatar", (req, res, next) => {
    // Authenticate via JWT before processing upload
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}, upload.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded. Please provide an image." });
        }

        const userId = req.user.id;
        const extension = req.file.mimetype.split("/")[1]; // jpeg, png, webp
        const filePath = `${userId}/avatar.${extension}`;

        // Upload to Supabase Storage (upsert replaces any existing avatar)
        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, req.file.buffer, {
                upsert: true,
                contentType: req.file.mimetype,
            });

        if (uploadError) {
            console.error("Supabase upload error:", uploadError);
            return res.status(500).json({ error: "Failed to upload avatar to storage" });
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Update the profiles table
        await pool.query(
            "UPDATE profiles SET avatar_url = $1 WHERE id = $2",
            [publicUrl, userId]
        );

        res.json({
            message: "Avatar updated successfully",
            avatar_url: publicUrl,
        });
    } catch (err) {
        console.error("Avatar upload error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Handle multer errors (file too large, invalid type)
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File too large. Maximum size is 2MB." });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err.message === "Only JPEG, PNG and WebP images are allowed") {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

module.exports = router;
