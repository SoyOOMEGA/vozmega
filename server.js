const express = require("express");
const http = require("http");
const path = require("path");

const Config = require("./core/config/Config");
const Queue = require("./core/queue/Queue");
const BrowserManager = require("./core/browser/BrowserManager");
const SocketManager = require("./core/socket/SocketManager");

// -------------------------
// APP + HTTP SERVER
// -------------------------

const app = express();
const server = http.createServer(app);

// -------------------------
// CONFIG + CORE INSTANCES
// -------------------------

const config = Config;

const queue = new Queue();

const browserManager = new BrowserManager(
    config.get("maxPendingAudiosPerBrowser")
);

// -------------------------
// SOCKET LAYER
// -------------------------

new SocketManager(
    server,
    config,
    queue,
    browserManager
);

console.log("🧠 Socket.IO activo en server");

// -------------------------
// FRONTEND STATIC FILES
// -------------------------

app.use(express.static(path.join(__dirname, "public")));

// Player explícito para OBS
app.get("/player", (req, res) => {
    res.sendFile(path.join(__dirname, "public/player.html"));
});

// -------------------------
// START SERVER
// -------------------------

const PORT = process.env.PORT || config.get("serverPort");

server.listen(PORT, () => {

    console.log("");
    console.log("====================================");
    console.log(" 🎤 Voice Alerts iniciado");
    console.log(` 🌐 Puerto: ${PORT}`);
    console.log("====================================");
    console.log("");

});