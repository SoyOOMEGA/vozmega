const { Server } = require("socket.io");

class SocketManager {

    constructor(httpServer, config, queue, browserManager) {

        this.io = new Server(httpServer, {
            cors: {
                origin: "*"
            }
        });

        this.config = config;
        this.queue = queue;
        this.browserManager = browserManager;

        this.playerSocketId = null;
        this.isPlaying = false;
        this.currentAudio = null;
        this.playTimeout = null;

        this.setupEvents();
    }

    setupEvents() {

        this.io.on("connection", (socket) => {

            const browserId = socket.handshake.query.browserId;

            if (!browserId) {
                socket.disconnect(true);
                return;
            }

            this.browserManager.connect(browserId, socket.id);

            console.log(
                `🔌 Browser conectado: ${browserId} | socket=${socket.id}`
            );

            // -----------------------------
            // PLAYER
            // -----------------------------

            if (browserId === "PLAYER") { // Dar unos segundos para que Socket.IO se reconecte solo setTimeout(() => { if (this.playerSocketId === socket.id) { this.playerSocketId = null; this.isPlaying = false; clearTimeout(this.playTimeout); console.log("⚠ Player desconectado definitivamente"); } }, 5000);

            socket.emit("init", {
                maxPending: this.config.get("maxPendingAudiosPerBrowser")
            });

            // -----------------------------
            // RECIBIR AUDIO
            // -----------------------------

            socket.on("audio:send", (data) => {

                console.log(
                    `📥 Audio recibido | browser=${browserId} | id=${data?.id}`
                );

                if (!data || !data.buffer || !data.mimeType)
                    return;

                const browser = this.browserManager.get(browserId);

                if (!browser)
                    return;

                if (!browser.canSendAudio()) {

                    socket.emit("audio:rejected", {
                        message: "Has alcanzado el límite de mensajes pendientes."
                    });

                    return;
                }

                const audio = {

                    id: data.id,
                    browserId,
                    mimeType: data.mimeType,
                    buffer: data.buffer,
                    createdAt: Date.now()

                };

                this.queue.enqueue(audio);

                browser.addPendingAudio();

                console.log(
                    `📦 Cola size: ${this.queue.size()}`
                );

                this.broadcastQueue();

                this.tryPlayNext();

            });

            // -----------------------------
            // AUDIO TERMINADO
            // -----------------------------

            socket.on("audio:finished", () => {

                console.log(
                    `📥 audio:finished | socket=${socket.id}`
                );

                if (!this.currentAudio) {

                    console.log("⚠ No existe currentAudio");

                    return;

                }

                clearTimeout(this.playTimeout);

                const audio = this.queue.dequeue();

                if (audio) {

                    const browser = this.browserManager.get(audio.browserId);

                    if (browser)
                        browser.removePendingAudio();

                }

                this.currentAudio = null;
                this.isPlaying = false;

                console.log(
                    `✔ Audio terminado | cola restante=${this.queue.size()}`
                );

                this.broadcastQueue();

                this.tryPlayNext();

            });

            // -----------------------------
            // DESCONECTADO
            // -----------------------------

            socket.on("disconnect", (reason) => {

                console.log(
                    `❌ Browser desconectado: ${browserId} | socket=${socket.id} | reason=${reason}`
                );

                this.browserManager.disconnect(browserId);

                if (browserId === "PLAYER") {

                    this.playerSocketId = null;

                    this.isPlaying = false;

                    clearTimeout(this.playTimeout);

                    console.log("⚠ Player desconectado");

                }

            });

        });

    }

    // -----------------------------
    // SIGUIENTE AUDIO
    // -----------------------------

    tryPlayNext() {

        console.log(
            `🔎 tryPlayNext | playing=${this.isPlaying} | player=${this.playerSocketId} | cola=${this.queue.size()}`
        );

        if (this.isPlaying) {

            console.log("⏸ Ya hay un audio reproduciéndose");

            return;

        }

        if (!this.playerSocketId) {

            console.log("⏸ No hay PLAYER conectado");

            return;

        }

        const next = this.queue.peek();

        if (!next) {

            console.log("📭 Cola vacía");

            return;

        }

        this.currentAudio = next;
        this.isPlaying = true;

        console.log(
            `▶ Enviando audio ${next.id} -> socket ${this.playerSocketId}`
        );

        this.io.to(this.playerSocketId).emit("audio:play", next);

        clearTimeout(this.playTimeout);

        this.playTimeout = setTimeout(() => {

            console.log(
                `⏰ Timeout del audio ${next.id}`
            );

            const audio = this.queue.dequeue();

            if (audio) {

                const browser = this.browserManager.get(audio.browserId);

                if (browser)
                    browser.removePendingAudio();

            }

            this.currentAudio = null;
            this.isPlaying = false;

            this.broadcastQueue();

            this.tryPlayNext();

        }, 40000);

    }

    // -----------------------------
    // COLA
    // -----------------------------

    broadcastQueue() {

        console.log(
            `📢 queue:update -> ${this.queue.size()}`
        );

        this.io.emit("queue:update", {
            size: this.queue.size()
        });

    }

}

module.exports = SocketManager;