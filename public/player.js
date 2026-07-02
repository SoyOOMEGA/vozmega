const socket = io({

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,

    query: {
        browserId: "PLAYER"
    }

});

// -------------------------
// LOGS DE CONEXIÓN
// -------------------------

socket.on("connect", () => {

    console.log("🟢 CONNECT:", socket.id);

});

socket.on("disconnect", (reason) => {

    console.log("🔴 DISCONNECT:", reason);

});

socket.io.on("reconnect_attempt", () => {

    console.log("🟡 Intentando reconectar...");

});

socket.io.on("reconnect", () => {

    console.log("🟢 RECONNECTED:", socket.id);

});

socket.io.on("reconnect_error", (err) => {

    console.error("❌ Error al reconectar:", err);

});

socket.io.on("error", (err) => {

    console.error("❌ Socket error:", err);

});

const overlay = document.getElementById("overlay");
const audioElement = document.getElementById("audio");

const progressFill = document.getElementById("progressFill");
const time = document.getElementById("time");

let animationFrame = null;

// =========================
// UI
// =========================

function showOverlay() {

    overlay.classList.remove("hidden");
    overlay.classList.remove("hide");
    overlay.classList.add("show");

}

function hideOverlay() {

    overlay.classList.remove("show");
    overlay.classList.add("hide");

    setTimeout(() => {

        overlay.classList.add("hidden");

    }, 250);

}

// =========================
// SOCKET
// =========================

socket.on("connect", () => {

    console.log("🎧 Player conectado");

});

socket.on("audio:play", (audio) => {

    if (!audio) return;

    showOverlay();

    const blob = new Blob(
        [new Uint8Array(audio.buffer)],
        {
            type: audio.mimeType
        }
    );

    const url = URL.createObjectURL(blob);

    audioElement.src = url;

    audioElement.load();

    audioElement.play()
        .then(() => {

            startProgress();

        })
        .catch(console.error);

});

socket.on("queue:update", () => {

    // reservado para futuras mejoras

});

// =========================
// PROGRESS
// =========================

function startProgress() {

    cancelAnimationFrame(animationFrame);

    function update() {

        if (!audioElement.duration) {

            animationFrame = requestAnimationFrame(update);
            return;

        }

        const percent =
            (audioElement.currentTime / audioElement.duration) * 100;

        progressFill.style.width = percent + "%";

        const remaining =
            Math.max(
                0,
                Math.ceil(audioElement.duration - audioElement.currentTime)
            );

        const minutes =
            Math.floor(remaining / 60);

        const seconds =
            String(remaining % 60).padStart(2, "0");

        time.textContent =
            `${minutes}:${seconds}`;

        if (!audioElement.paused) {

            animationFrame =
                requestAnimationFrame(update);

        }

    }

    update();

}

// =========================
// FIN
// =========================

audioElement.onended = () => {

    cancelAnimationFrame(animationFrame);

    progressFill.style.width = "0%";

    time.textContent = "0:00";

    URL.revokeObjectURL(audioElement.src);

    socket.emit("audio:finished");

    hideOverlay();

};