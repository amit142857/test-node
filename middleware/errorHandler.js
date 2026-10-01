const multer = require("multer");

/**
 * Centralized error handler middleware.
 * Catches multer errors and unhandled errors, returns clean JSON responses.
 */
const errorHandler = (err, req, res, next) => {
    // Multer file size error
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File too large. Maximum size is 2MB." });
        }
        return res.status(400).json({ error: err.message });
    }

    // Multer file filter error
    if (err.message === "Only JPEG, PNG and WebP images are allowed") {
        return res.status(400).json({ error: err.message });
    }

    // Generic server error
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
};

module.exports = { errorHandler };
