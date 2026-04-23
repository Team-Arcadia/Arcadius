// main.js
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const colors = require('colors');
require('dotenv').config();

// Modules pour le bot de commandes
const readyHandler = require('./modules/readyHandler');
const commandHandler = require('./modules/commandsHandler');
const interactionHandler = require('./modules/InteractionHandler');

// Modules pour Arcadius
const logger = require('./modules/logger');
const CONFIG = require('./modules/arcadiusConfig');
const GeminiClientPool = require('./modules/geminiPool');
const BotDataManager = require('./modules/dataManager');
const { findBestModel } = require('./modules/generationService');
const arcadiusReadyHandler = require('./modules/arcadiusReadyHandler');
const arcadiusMessageHandler = require('./modules/arcadiusMessageHandler');
const { helpDetectionHandler } = require('./modules/helpDetectionHandler');
const LLMProviderPool = require('./modules/llmProviderPool');

// ======= VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT =======
// Accepter DISCORD_TOKEN ou TOKEN
if (!process.env.DISCORD_TOKEN && !process.env.TOKEN) {
    console.error(colors.red(`❌ Variable d'environnement manquante: DISCORD_TOKEN ou TOKEN`));
    process.exit(1);
}

// ======= INITIALISATION BOT COMMANDES =======
const commandClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ],
});

commandClient.commands = new Collection();

// Initialisation des handlers avec gestion des erreurs
try {
    console.log(colors.cyan('🔧 Initialisation des handlers Bot Commandes...'));
    readyHandler(commandClient);  // Géré par arcadiusClient pour les deux clients
    commandHandler(commandClient);
    interactionHandler(commandClient);
    console.log(colors.green('✅ Handlers Bot Commandes initialisés avec succès'));
} catch (error) {
    console.error(colors.red('❌ Erreur lors de l\'initialisation des handlers:'), error);
    process.exit(1);
}

// ======= INITIALISATION ARCADIUS BOT =======
const arcadiusClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// État pour Arcadius
let arcadiusBotState = {
    chatPool: null,
    memoryPool: null,
    chatModel: null,
    chatIdx: 0,
    memoryModel: null,
    memoryIdx: 0,
    dataManager: null
};

// ======= INITIALISATION ARCADIUS =======
async function initializeArcadius() {
    try {
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info(`🚀 Bot Arcadius v${CONFIG.VERSION} - Initialisation des pools...`);
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const chatPool = new GeminiClientPool('GEMINI_API_KEY');
        const memoryPool = new GeminiClientPool('GEMINI_API_KEY_MEMORY');

        let chatModel = null, chatIdx = 0;
        let memoryModel = null, memoryIdx = 0;

        try {
            ({ model: chatModel, idx: chatIdx } = await findBestModel(chatPool, 'CHAT'));
        } catch (err) {
            logger.error(`Erreur lors du scan du pool CHAT: ${err.message}`);
        }

        try {
            ({ model: memoryModel, idx: memoryIdx } = await findBestModel(memoryPool, 'MÉMOIRE', chatModel));
        } catch (err) {
            logger.error(`Erreur lors du scan du pool MÉMOIRE: ${err.message}`);
        }

        const dataManager = new BotDataManager();

        // Initialiser le pool LLM pour la détection d'aide
        const llmProviderPool = new LLMProviderPool();

        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return {
            chatPool,
            memoryPool,
            chatModel,
            chatIdx,
            memoryModel,
            memoryIdx,
            dataManager,
            llmProviderPool
        };
    } catch (err) {
        logger.error(`Erreur fatale lors de l'initialisation d'Arcadius: ${err.message}`);
        process.exit(1);
    }
}

// ======= GESTION GLOBALE DES ERREURS =======
process.on('uncaughtException', (error) => {
    console.error(colors.red('⚠️ Exception non capturée:'), error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(colors.red('⚠️ Promesse rejetée non traitée:'), reason);
});

// ======= DÉMARRAGE PRINCIPAL =======
(async () => {
    try {
        // Initialiser Arcadius
        arcadiusBotState = await initializeArcadius();

        // Configurer les handlers Arcadius
        readyHandler(arcadiusClient);  // Afficher le nombre de joueurs en ligne
        arcadiusReadyHandler(arcadiusClient, arcadiusBotState);
        arcadiusMessageHandler(arcadiusClient, arcadiusBotState);

        // Initialiser le handler de détection d'aide
        helpDetectionHandler(arcadiusClient, arcadiusBotState.llmProviderPool);

        // Connecter les deux clients
        console.log(colors.cyan('🚀 Connexion des bots en cours...'));

        // Connecter le bot de commandes
        const commandBotToken = process.env.DISCORD_TOKEN || process.env.TOKEN;
        if (!commandBotToken) {
            console.error(colors.red('❌ Impossible de trouver DISCORD_TOKEN ou TOKEN'));
            process.exit(1);
        }
        await commandClient.login(commandBotToken);

        // Connecter le bot Arcadius (utilise ARCADIUS_TOKEN, sinon le token du bot de commandes)
        const arcadiusToken = process.env.ARCADIUS_TOKEN || commandBotToken;
        await arcadiusClient.login(arcadiusToken);
        if (process.env.ARCADIUS_TOKEN) {
            console.log(colors.green('✅ Bots connectés avec succès (tokens séparés)'));
        } else {
            console.log(colors.green('✅ Bots connectés avec succès (token partagé)'));
        }
    } catch (error) {
        console.error(colors.red('❌ Erreur de connexion:'), error.message);
        process.exit(1);
    }
})();

module.exports = { commandClient, arcadiusClient };
