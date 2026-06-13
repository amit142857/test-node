const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const http = require("http");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const { initDb } = require("./db/pool");
const setupWebSocket = require("./websocket");
const userRoutes = require("./routes/users");
const miscRoutes = require("./routes/misc");

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
        tags: [
            { name: "Users", description: "User management endpoints" },
        ],
    },
    apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/", miscRoutes);
app.use("/", userRoutes(broadcast));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});