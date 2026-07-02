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

            console.log("🔌 Browser conectado:", browserId);

            // -----------------------------
            // PLAYER
            // -----------------------------

            if (browserId === "PLAYER") {

                this.playerSocketId = socket.id;

                console.log("🎧 Player registrado:", socket.id);

                // Si había cola pendiente la continúa
                setTimeout(() => {
                    this.tryPlayNext();
                }, 300);

            }

            socket.emit("init", {
                maxPending: this.config.get("maxPendingAudiosPerBrowser")
            });

            // -----------------------------
            // RECIBIR AUDIO
            // -----------------------------

            socket.on("audio:send", (data) => {

                console.log("📥 Audio recibido");

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

                console.log("📦 Cola size:", this.queue.size());

                this.broadcastQueue();

                this.tryPlayNext();

            });

            // -----------------------------
            // AUDIO TERMINADO
            // -----------------------------

            socket.on("audio:finished", () => {

                if (!this.currentAudio)
                    return;

                clearTimeout(this.playTimeout);

                const audio = this.queue.dequeue();

                if (audio) {

                    const browser = this.browserManager.get(audio.browserId);

                    if (browser)
                        browser.removePendingAudio();

                }

                this.currentAudio = null;
                this.isPlaying = false;

                console.log("✔ Audio terminado");

                this.broadcastQueue();

                this.tryPlayNext();

            });

            // -----------------------------
            // DESCONECTADO
            // -----------------------------

            socket.on("disconnect", (reason) => {

                console.log("❌ Browser desconectado:", browserId, "-", reason);

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

        if (this.isPlaying)
            return;

        if (!this.playerSocketId) {

            console.log("⏸ No hay PLAYER conectado");

            return;

        }

        const next = this.queue.peek();

        if (!next)
            return;

        this.currentAudio = next;
        this.isPlaying = true;

        console.log("▶ Enviando audio:", next.id);

        this.io.to(this.playerSocketId).emit("audio:play", next);

        clearTimeout(this.playTimeout);

        this.playTimeout = setTimeout(() => {

            console.log("⏰ Timeout del player");

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

        this.io.emit("queue:update", {

            size: this.queue.size()

        });

    }

}

module.exports = SocketManager;