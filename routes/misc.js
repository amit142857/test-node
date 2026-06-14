const express = require("express");
const router = express.Router();

/**
 * @swagger
 * /hello:
 *   get:
 *     summary: Returns a greeting message
 *     responses:
 *       200:
 *         description: A greeting
 */
router.get("/hello", (req, res) => {
    res.json({ message: "Hello, World!" });
});

/**
 * @swagger
 * /greet/{name}:
 *   get:
 *     summary: Greet someone by name
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A personalized greeting
 */
router.get("/greet/:name", (req, res) => {
    res.json({ message: `Hello, ${req.params.name}!` });
});

// module.exports = router;