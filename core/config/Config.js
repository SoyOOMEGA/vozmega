const fs = require("fs");
const path = require("path");

class Config {

    constructor() {

        this.config = {};

        this.load();

    }

    load() {

        try {

            const configPath = path.join(__dirname, "../../config.json");

            const file = fs.readFileSync(configPath, "utf8");

            this.config = JSON.parse(file);

            console.log("✔ Configuración cargada.");

        }
        catch (error) {

            console.error("");

            console.error("==================================");
            console.error(" No se pudo leer config.json");
            console.error("==================================");
            console.error("");

            console.error(error);

            process.exit(1);

        }

    }

    get(key) {

        return this.config[key];

    }

    getAll() {

        return this.config;

    }

}

module.exports = new Config();