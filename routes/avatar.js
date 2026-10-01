const express = require("express");
const avatarService = require("../services/avatarService");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

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
router.post("/api/user/avatar", authenticate, upload.single("avatar"), async (req, res) => {
    try {
        const avatarUrl = await avatarService.uploadAvatar(req.user.id, req.file);
        res.json({ message: "Avatar updated successfully", avatar_url: avatarUrl });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || "Internal server error" });
    }
});

module.exports = router;
