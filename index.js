require("dotenv").config();
console.log("DATABASE_URL is:", process.env.DATABASE_URL);

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const http = require("http");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const { initDb } = require("./db/pool");
const setupWebSocket = require("./websocket");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const avatarRoutes = require("./routes/avatar");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
app.use(express.json());

const server = http.createServer(app);
const { broadcast } = setupWebSocket(server);

initDb();

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "My First API",
            version: "1.0.1",
            description: "A simple API with user signup, login and roles",
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                User: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        name: { type: "string", example: "John Doe" },
                        email: { type: "string", example: "john@example.com" },
                        role: { type: "string", example: "student" },
                        created_at: { type: "string", format: "date-time" },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        tags: [
            { name: "Auth", description: "Authentication endpoints" },
            { name: "Users", description: "User management endpoints" },
        ],
    },
    apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/", authRoutes(broadcast));
app.use("/", userRoutes());
app.use("/", avatarRoutes);

// Centralized error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
