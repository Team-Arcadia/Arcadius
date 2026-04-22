// modules/arcadiusReadyHandler.js
const logger = require('./logger');
const CONFIG = require('./arcadiusConfig');
const { reloadKeywords } = require('./keywordHandler');

const arcadiusReadyHandler = (client, botState) => {
    client.once('ready', async () => {
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info(`✅ Bot connecté: ${client.user.tag} (ID: ${client.user.id})`);
        logger.info(`Pool CHAT    : ${botState.chatPool.getSize()} clés | Modèle: ${botState.chatModel}`);
        logger.info(`Pool MÉMOIRE : ${botState.memoryPool.getSize()} clés | Modèle: ${botState.memoryModel}`);
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Charger les mots-clés
        reloadKeywords();

        // Démarrer la tâche de rafraîchissement
        setInterval(() => {
            logger.info('🔄 Rafraîchissement des données JSON en arrière-plan...');
            botState.dataManager.refresh();
        }, CONFIG.REFRESH_INTERVAL);

        // Définir l'activité du bot
        client.user.setActivity(`Arcadius v${CONFIG.VERSION}`, { type: 'WATCHING' });
    });
};

module.exports = arcadiusReadyHandler;
