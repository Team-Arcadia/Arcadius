// modules/dataManager.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const CONFIG = require('./arcadiusConfig');

class BotDataManager {
    constructor() {
        this.dataDir = CONFIG.DATA_DIR;
        this.data = {
            serverInfo: {},
            userReactions: {},
            mods: {},
            links: {},
            promptConfig: {},
            userMemory: {},
            formattedMods: '',
            formattedLinks: ''
        };
        this.ensureDataDirectory();
        this.refresh();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadJSON(filename) {
        const filePath = path.join(this.dataDir, filename);
        if (!fs.existsSync(filePath)) {
            logger.info(`📄 Fichier ${filename} inexistant, création automatique...`);
            this.saveJSON(filename, {});
            return {};
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (err) {
            logger.error(`Erreur de lecture ${filename}: ${err.message}`);
            return {};
        }
    }

    saveJSON(filename, data) {
        const filePath = path.join(this.dataDir, filename);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
        } catch (err) {
            logger.error(`Erreur d'écriture ${filename}: ${err.message}`);
        }
    }

    refresh() {
        logger.info('📂 Rafraîchissement des données du bot...');

        const serverInfo = this.loadJSON('server_info.json');
        const userReactions = this.loadJSON('user_reactions.json');
        const mods = this.loadJSON('mods.json');
        const links = this.loadJSON('links.json');
        const promptConfig = this.loadJSON('prompt_config.json');
        const userMemory = this.loadJSON('user_memory.json');

        // Format mods
        let formattedMods = '';
        if (mods?.general_mods?.length) {
            formattedMods = mods.general_mods
                .map(m => `- ${m.name} (v${m.version}) : ${m.description}`)
                .join('\n');
        }

        // Format links
        let formattedLinks = '';
        if (links?.links && typeof links.links === 'object') {
            formattedLinks = Object.entries(links.links)
                .map(([k, v]) => `- ${k.replace(/_/g, ' ').charAt(0).toUpperCase() + k.slice(1)} : ${v}`)
                .join('\n');
        }

        this.data = {
            serverInfo,
            userReactions,
            mods,
            links,
            promptConfig,
            userMemory,
            formattedMods,
            formattedLinks
        };
    }

    updateUserMemory(userId, username, notes) {
        this.data.userMemory[userId] = {
            username,
            notes,
            lastUpdate: new Date().toISOString()
        };
        this.saveJSON('user_memory.json', this.data.userMemory);
    }

    getUserMemory(userId) {
        return this.data.userMemory[userId] || { notes: 'Aucune info.' };
    }
}

module.exports = BotDataManager;
