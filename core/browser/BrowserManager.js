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

        const browser = this.get(browserId);

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

        return [...this.browsers.values()]
            .filter(browser => browser.connected);

    }

}

module.exports = BrowserManager;