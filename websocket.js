const WebSocket = require("ws");

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on("connection", (ws) => {
        console.log("New WebSocket client connected");
        ws.send(JSON.stringify({ type: "connected", message: "Welcome! You'll receive live signup updates." }));

        ws.on("close", () => console.log("Client disconnected"));
    });

    function broadcast(data) {
        const message = JSON.stringify(data);
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    return { broadcast };
}

module.exports = setupWebSocket;