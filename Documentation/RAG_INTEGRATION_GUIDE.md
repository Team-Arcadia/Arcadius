/\*\*

- GUIDE D'INTÉGRATION RAG SYSTEM
-
- Ce fichier montre comment intégrer le système RAG dans main.js
  \*/

// ======== ÉTAPE 1: AJOUTER LES IMPORTS ========
// En haut de main.js, ajouter:

const RAGSystem = require('./modules/ragSystem');
const ImprovedHelpDetection = require('./modules/improvedHelpDetection');

// ======== ÉTAPE 2: MODIFIER initializeArcadius() ========
// Remplacer la fonction pour inclure RAG:

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

        // ===== NOUVEAU: Initialiser le système RAG =====
        const ragSystem = new RAGSystem(chatPool);
        // Note: ragSystem s'initialise complètement dans arcadiusReadyHandler
        logger.info('✅ RAGSystem créé (initialisation complète au démarrage)');

        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return {
            chatPool,
            memoryPool,
            chatModel,
            chatIdx,
            memoryModel,
            memoryIdx,
            dataManager,
            llmProviderPool,
            ragSystem  // ===== NOUVEAU =====
        };
    } catch (err) {
        logger.error(`Erreur fatale lors de l'initialisation d'Arcadius: ${err.message}`);
        process.exit(1);
    }

}

// ======== ÉTAPE 3: UTILISER RAG DANS helpDetectionHandler ========
// Dans le code principal (là où helpDetectionHandler est appelé), remplacer:
//
// helpDetectionHandler(arcadiusClient, arcadiusBotState.llmProviderPool);
//
// Par:
//
// const improvedDetector = new ImprovedHelpDetection(
// arcadiusBotState.llmProviderPool,
// arcadiusBotState.ragSystem
// );
// helpDetectionHandler(arcadiusClient, arcadiusBotState.llmProviderPool, improvedDetector);

// ======== ÉTAPE 4: MODIFIER helpDetectionHandler.js ========
// Voir le fichier Documentation/RAG_SYSTEM.md pour les modifications détaillées
// En résumé:
// 1. Accepter improvedDetector en paramètre
// 2. Remplacer l'analyse simple par: improvedDetector.analyzeQuestionWithRAG(message)
// 3. Enrichir le prompt avec: improvedDetector.getRAGContextForResponse(message)

// ======== EXEMPLE COMPLET DE CODE À INTÉGRER ========

// Dans la section de démarrage principal:
/\*
(async () => {
try {
// Initialiser Arcadius (inclut maintenant ragSystem)
arcadiusBotState = await initializeArcadius();

        // Configurer les handlers Arcadius
        readyHandler(arcadiusClient);
        arcadiusReadyHandler(arcadiusClient, arcadiusBotState);
        arcadiusMessageHandler(arcadiusClient, arcadiusBotState);

        // ===== NOUVEAU: Créer le détecteur amélioré =====
        const improvedDetector = new ImprovedHelpDetection(
            arcadiusBotState.llmProviderPool,
            arcadiusBotState.ragSystem
        );

        // Initialiser le handler de détection d'aide amélioré
        helpDetectionHandler(
            arcadiusClient,
            arcadiusBotState.llmProviderPool,
            improvedDetector  // ===== NOUVEAU =====
        );

        // Connecter les clients...
        const commandBotToken = process.env.DISCORD_TOKEN || process.env.TOKEN;
        if (!commandBotToken) {
            console.error(colors.red('❌ Impossible de trouver DISCORD_TOKEN ou TOKEN'));
            process.exit(1);
        }
        await commandClient.login(commandBotToken);

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
\*/

// ======== TESTS RAPIDES ========

// Pour tester le RAG après intégration:
async function testRAG(ragSystem) {
logger.info('🧪 Test RAG System...');

    const testQuestions = [
        'Comment installer les mods?',
        'J\'ai un bug, aidez-moi',
        'Quel est le statut du serveur?',
        'Comment voter?'
    ];

    for (const question of testQuestions) {
        try {
            const result = await ragSystem.canAnswerQuestion(question);
            logger.info(`Q: "${question}"`);
            logger.info(`   → canAnswer: ${result.canAnswer}, confidence: ${result.confidence}%`);
        } catch (err) {
            logger.error(`   → Erreur: ${err.message}`);
        }
    }

}

// Appeler dans arcadiusReadyHandler après init:
// if (process.env.DEBUG_RAG === 'true') {
// await testRAG(botState.ragSystem);
// }

module.exports = {};
