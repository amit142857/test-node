const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
app.use(express.json());

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "My First API",
            version: "1.0.0",
            description: "A simple API built with Node.js and Express",
        },
    },
    apis: ["./index.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /hello:
 *   get:
 *     summary: Returns a greeting message
 *     responses:
 *       200:
 *         description: A greeting
 */
app.get("/hello", (req, res) => {
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
app.get("/greet/:name", (req, res) => {
    res.json({ message: `Hello, ${req.params.name}!` });
});

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
    console.log("Swagger UI at http://localhost:3000/api-docs");
});