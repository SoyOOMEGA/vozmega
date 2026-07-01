class Browser {

    constructor(id, maxPendingAudios) {

        this.id = id;

        this.maxPendingAudios = maxPendingAudios;

        this.pendingAudios = 0;

        this.connected = true;

        this.socketId = null;

        this.lastSeen = new Date();

    }

    canSendAudio() {

        return this.pendingAudios < this.maxPendingAudios;

    }

    addPendingAudio() {

        this.pendingAudios++;

    }

    removePendingAudio() {

        if (this.pendingAudios > 0)
            this.pendingAudios--;

    }

    setSocket(socketId) {

        this.socketId = socketId;

        this.connected = true;

        this.touch();

    }

    disconnect() {

        this.connected = false;

        this.socketId = null;

        this.touch();

    }

    touch() {

        this.lastSeen = new Date();

    }

}

module.exports = Browser;