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

        this.playerSocket = null;
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

            // Registrar PLAYER
            if (browserId === "PLAYER") {

                this.playerSocket = socket;

                console.log("🎧 Player registrado");

                // Si había audios esperando, intentar reproducir
                this.tryPlayNext();
            }

            socket.emit("init", {
                maxPending: this.config.get("maxPendingAudiosPerBrowser")
            });

            // --------------------------------
            // AUDIO RECIBIDO
            // --------------------------------

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

            // --------------------------------
            // AUDIO TERMINADO
            // --------------------------------

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

                console.log("✔ Audio terminado");

                this.currentAudio = null;
                this.isPlaying = false;

                this.broadcastQueue();

                this.tryPlayNext();

            });

            // --------------------------------
            // DESCONECTADO
            // --------------------------------

            socket.on("disconnect", () => {

                console.log("❌ Browser desconectado:", browserId);

                this.browserManager.disconnect(browserId);

                if (browserId === "PLAYER") {

                    console.log("⚠ PLAYER desconectado");

                    this.playerSocket = null;
                    this.isPlaying = false;

                    clearTimeout(this.playTimeout);

                }

            });

        });

    }

    // --------------------------------
    // ENVIAR SIGUIENTE AUDIO
    // --------------------------------

    tryPlayNext() {

        if (this.isPlaying)
            return;

        if (!this.playerSocket)
            return;

        const next = this.queue.peek();

        if (!next)
            return;

        this.currentAudio = next;
        this.isPlaying = true;

        console.log("▶ Enviando audio:", next.id);

        this.playerSocket.emit("audio:play", next);

        // Seguridad: si el player nunca responde
        clearTimeout(this.playTimeout);

        this.playTimeout = setTimeout(() => {

            console.log("⏰ Timeout del player. Saltando audio.");

            if (this.queue.size() > 0)
                this.queue.dequeue();

            const browser = this.browserManager.get(next.browserId);

            if (browser)
                browser.removePendingAudio();

            this.currentAudio = null;
            this.isPlaying = false;

            this.broadcastQueue();

            this.tryPlayNext();

        }, 40000);

    }

    // --------------------------------
    // ACTUALIZAR COLA
    // --------------------------------

    broadcastQueue() {

        this.io.emit("queue:update", {

            size: this.queue.size()

        });

    }

}

module.exports = SocketManager;