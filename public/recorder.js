

// ID único del navegador
const browserId = localStorage.getItem("browserId")
    || crypto.randomUUID();

localStorage.setItem("browserId", browserId);

const socket = io({
    query: {
        browserId: browserId
    }
});

// UI
const recordBtn = document.getElementById("recordBtn");
const status = document.getElementById("status");
const actions = document.getElementById("actions");
const playBtn = document.getElementById("listenBtn");
const sendBtn = document.getElementById("sendBtn");
const cancelBtn = document.getElementById("deleteBtn");
const countdown = document.getElementById("countdown");

let mediaRecorder;
let audioChunks = [];
let audioBlob;
let audioUrl;
let recordingTimeout;
let countdownInterval;
let secondsLeft = 30;

// ---------------------
// INIT SOCKET
// ---------------------

socket.io.opts.query = {
    browserId
};

// ---------------------
// GRABACIÓN
// ---------------------

recordBtn.onclick = async () => {

    if (!mediaRecorder || mediaRecorder.state === "inactive") {

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        mediaRecorder = new MediaRecorder(stream);

        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {

    audioBlob = new Blob(audioChunks, {
        type: "audio/webm"
    });

    audioUrl = URL.createObjectURL(audioBlob);

    updateUI("preview");

};

        mediaRecorder.start();

startCountdown();

updateUI("recording");

// Detener automáticamente a los 30 segundos
recordingTimeout = setTimeout(() => {

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
stopCountdown();
    }

}, 30000);
        recordBtn.innerText = "⏹";

    } else {

    clearTimeout(recordingTimeout);

    stopCountdown();   // <-- detener inmediatamente el contador

    mediaRecorder.stop();

}

};

// ---------------------
// ESCUCHAR AUDIO
// ---------------------

playBtn.onclick = () => {

    const audio = new Audio(audioUrl);
    audio.play();

};

// ---------------------
// ENVIAR AUDIO
// ---------------------

sendBtn.onclick = async () => {

    const arrayBuffer = await audioBlob.arrayBuffer();

    socket.emit("audio:send", {
        id: crypto.randomUUID(),
        mimeType: audioBlob.type,
        buffer: arrayBuffer
    });

    updateUI("idle");
    actions.classList.add("hidden");

};

// ---------------------
// CANCELAR
// ---------------------

cancelBtn.onclick = () => {

stopCountdown();
    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
    }

    audioChunks = [];
    audioBlob = null;
    audioUrl = null;

    actions.classList.add("hidden");

    updateUI("idle");

    recordBtn.innerText = "🎤";

};

function startCountdown(){

    clearInterval(countdownInterval);

    secondsLeft = 30;

    countdown.classList.remove("hidden");

    countdown.textContent = "00:30";

    countdownInterval = setInterval(()=>{

        secondsLeft--;

        const sec = String(secondsLeft).padStart(2,"0");

        countdown.textContent = `00:${sec}`;

        if(secondsLeft <= 0){

            clearInterval(countdownInterval);

        }

    },1000);

}

function stopCountdown(){

    clearInterval(countdownInterval);

    countdown.classList.add("hidden");

    countdown.textContent = "00:30";

}

function updateUI(state){

    switch(state){

        case "idle":

            status.innerText = "Pulsa para comenzar a grabar";
            recordBtn.innerText = "🎤";
            actions.classList.add("hidden");
            break;

        case "recording":

            status.innerText = "🔴 Grabando...";
            recordBtn.innerText = "⏹";
            actions.classList.add("hidden");
            break;

        case "preview":

            status.innerText = "Audio listo para enviar";
            recordBtn.innerText = "🎤";
            actions.classList.remove("hidden");
            break;

    }

}