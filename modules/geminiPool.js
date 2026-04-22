// modules/geminiPool.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

class GeminiClientPool {
    constructor(envPrefix) {
        this.envPrefix = envPrefix;
        this.clients = [];
        this.currentIndex = 0;
        this.workingModel = null;
        this.loadClients();
    }

    loadClients() {
        const keysToLoad = [];

        // Essayer la clé principale d'abord
        const mainKey = process.env[this.envPrefix];
        if (mainKey) keysToLoad.push(mainKey);

        // Charger les clés numérotées (_2, _3, etc.)
        for (let i = 2; ; i++) {
            const key = process.env[`${this.envPrefix}_${i}`];
            if (!key) break;
            keysToLoad.push(key);
        }

        keysToLoad.forEach((key, idx) => {
            try {
                const client = new GoogleGenerativeAI(key);
                this.clients.push(client);
                const masked = key.length > 4 ? `...${key.slice(-4)}` : '****';
                logger.info(`✅ Clé chargée pour ${this.envPrefix} (${masked})`);
            } catch (err) {
                logger.error(`❌ Erreur lors de l'initialisation de la clé ${idx + 1}: ${err.message}`);
            }
        });
    }

    isEmpty() {
        return this.clients.length === 0;
    }

    getSize() {
        return this.clients.length;
    }

    getClient(index) {
        if (index >= 0 && index < this.clients.length) {
            return this.clients[index];
        }
        return null;
    }
}

module.exports = GeminiClientPool;
