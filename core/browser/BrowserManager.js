const Browser = require("./Browser");

class BrowserManager {

    constructor(maxPendingAudios) {
        this.maxPendingAudios = maxPendingAudios;
        this.browsers = new Map();
    }

    get(browserId) {
        if (!this.browsers.has(browserId)) {
            const browser = new Browser(
                browserId,
                this.maxPendingAudios
            );

            this.browsers.set(browserId, browser);
        }

        return this.browsers.get(browserId);
    }

    connect(browserId, socketId) {
        const browser = this.get(browserId);
        browser.setSocket(socketId);
        return browser;
    }

    disconnect(browserId) {
        // 🔧 FIX: no usar get() para evitar crear browsers fantasmas
        const browser = this.browsers.get(browserId);
        if (!browser) return;

        browser.disconnect();
    }

    canSendAudio(browserId) {
        return this.get(browserId).canSendAudio();
    }

    addPendingAudio(browserId) {
        this.get(browserId).addPendingAudio();
    }

    removePendingAudio(browserId) {
        this.get(browserId).removePendingAudio();
    }

    getPendingAudios(browserId) {
        return this.get(browserId).pendingAudios;
    }

    getConnectedBrowsers() {
        // 🔧 FIX: solo contar browsers realmente válidos
        return [...this.browsers.values()]
            .filter(browser =>
                browser.connected && browser.socketId
            );
    }
}

module.exports = BrowserManager;