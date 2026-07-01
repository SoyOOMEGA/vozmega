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

        this.setupEvents();
    }

    setupEvents() {

        this.io.on("connection", (socket) => {

            const browserId = socket.handshake.query.browserId;

            if (!browserId) {
                socket.disconnect();
                return;
            }

            // conectar browser
            const browser = this.browserManager.connect(browserId, socket.id);

            console.log("🔌 Browser conectado:", browserId);

            socket.emit("init", {
                maxPending: this.config.get("maxPendingAudiosPerBrowser")
            });

            // -----------------------------
            // RECIBIR AUDIO
            // -----------------------------

            socket.on("audio:send", (data) => {

                console.log("📥 Audio recibido");

                if (!data || !data.buffer || !data.mimeType) {
                    return;
                }

                const browser = this.browserManager.get(browserId);

                if (!browser.canSendAudio()) {

                    socket.emit("audio:rejected", {
                        message: "Has alcanzado el límite de 3 mensajes pendientes."
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

                console.log("📦 Cola size:", this.queue.size());

                browser.addPendingAudio();

                this.tryPlayNext();
            });

            // -----------------------------
            // DESCONEXIÓN
            // -----------------------------

            socket.on("disconnect", () => {
                console.log("❌ Browser desconectado:", browserId);
                this.browserManager.disconnect(browserId);
            });

            // -----------------------------
            // AUDIO TERMINADO EN PLAYER
            // -----------------------------

            socket.on("audio:finished", () => {

                const audio = this.queue.dequeue();

                if (!audio) return;

                const browser = this.browserManager.get(audio.browserId);

                browser.removePendingAudio();

                console.log("✔ Audio terminado, siguiente...");

                this.tryPlayNext();
            });

        });
    }

    // -----------------------------
    // REPRODUCIR SIGUIENTE AUDIO
    // -----------------------------

    tryPlayNext() {

        const next = this.queue.peek();

        if (!next) return;

        console.log("▶ Enviando audio a player:", next.id);

        this.io.emit("audio:play", next);
    }

}

module.exports = SocketManager;