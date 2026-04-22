// modules/arcadiusMessageHandler.js
const logger = require('./logger');
const CONFIG = require('./arcadiusConfig');
const { generateWithFailover } = require('./generationService');
const { buildPromptContext, buildFullPrompt } = require('./promptBuilder');
const { updateUserMemory } = require('./memoryService');
const { loadKeywords, getKeywordResponse } = require('./keywordHandler');

const SUPPORT_CHANNELS = (process.env.SUPPORT_CHANNEL_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

const arcadiusMessageHandler = (client, botState) => {
    // Charger les mots-clés au démarrage
    loadKeywords();

    client.on('messageCreate', async message => {
        try {
            // Ignorer les messages du bot lui-même
            if (message.author.id === client.user.id) return;

            // Filtre : Canal spécifique uniquement
            if (message.channelId !== CONFIG.TARGET_CHANNEL_ID) return;

            // Charger les réponses pour vérifier les utilisateurs ignorés
            let ignoredUsers = [];
            try {
                const fs = require('fs');
                const path = require('path');
                const responsesPath = path.join(__dirname, '../data/responses.json');
                const responsesData = JSON.parse(fs.readFileSync(responsesPath, 'utf-8'));
                if (responsesData.ignored_users) {
                    ignoredUsers = responsesData.ignored_users;
                }
            } catch (err) {
                logger.warn(`⚠️  Impossible de charger les utilisateurs ignorés: ${err.message}`);
            }

            // Dans les canaux support, le module helpDetectionHandler gère déjà la réponse.
            const isSupportChannel = SUPPORT_CHANNELS.includes(message.channelId);

            // 🔧 FIX: Ignorer complètement les canaux support pour éviter les doublons
            if (isSupportChannel) return;

            // Vérifier les mots-clés en premier UNIQUEMENT si l'utilisateur n'est pas ignoré
            const authorName = message.author.username.toLowerCase();
            const authorId = message.author.id;
            const isIgnored = ignoredUsers.some(u => u.toLowerCase() === authorName || u === authorId);

            if (!isIgnored && !isSupportChannel) {
                const keywordResponse = getKeywordResponse(message.content, message.channelId);
                if (keywordResponse) {
                    try {
                        await message.reply({ content: keywordResponse });
                        logger.info(`✅ Réponse par mot-clé envoyée`);
                    } catch (err) {
                        logger.error(`Erreur lors de l'envoi de la réponse par mot-clé: ${err.message}`);
                    }
                    return;
                }
            } else {
                logger.debug(`Mots-clés ignorés pour: ${message.author.username}`);
            }

            // Filtre : Ignorer les messages qui ne mentionnent pas le bot
            if (message.mentions.has(client.user.id) === false) return;

            logger.info(`📨 Message de ${message.author.username}: ${message.content.slice(0, 50)}...`);

            // Construire le contexte
            const context = buildPromptContext(message, botState.dataManager);

            // Récupérer le contexte de réponse si le message est une réponse
            let replyCtx = '';
            if (message.reference) {
                try {
                    const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
                    replyCtx = `\n(En réponse à: "${repliedTo.content.slice(0, 100)}")`;
                } catch (err) {
                    logger.debug('Impossible de récupérer le message en réponse');
                }
            }

            // Construire le prompt final
            const fullPrompt = buildFullPrompt(message, context, botState.dataManager, replyCtx);

            // Afficher l'indicateur de saisie et générer la réponse
            await message.channel.sendTyping();

            const { text: responseText, newIdx, newModel } = await generateWithFailover(
                botState.chatPool,
                fullPrompt,
                botState.chatIdx,
                botState.chatModel,
                '[CHAT]'
            );

            if (responseText) {
                botState.chatIdx = newIdx;
                if (newModel) botState.chatModel = newModel;

                try {
                    // Découper les longs messages si nécessaire (limite Discord : 2000 caractères)
                    const chunks = responseText.match(/[\s\S]{1,2000}/g) || [responseText];
                    for (const chunk of chunks) {
                        await message.reply({ content: chunk });
                    }
                    logger.info('✅ Réponse envoyée');
                } catch (err) {
                    logger.error(`Erreur lors de l'envoi de la réponse: ${err.message}`);
                }
            } else {
                try {
                    await message.reply('Je suis en pause café ☕');
                } catch (err) {
                    logger.error(`Impossible d'envoyer le message d'erreur: ${err.message}`);
                }
                logger.error('🔴 [CHAT] ÉCHEC: Impossible de générer une réponse');
            }

            // Mettre à jour la mémoire utilisateur de manière asynchrone (non-bloquant)
            setTimeout(
                () =>
                    updateUserMemory(
                        botState.memoryPool,
                        botState.memoryIdx,
                        botState.memoryModel,
                        botState.dataManager,
                        message.author.id,
                        message.author.username,
                        message.content
                    ),
                100
            );
        } catch (err) {
            logger.error(`Erreur lors du traitement du message: ${err.message}`);
        }
    });

    // Gestionnaire d'erreurs
    client.on('error', err => {
        logger.error(`Erreur du client Discord: ${err.message}`);
    });
};

module.exports = arcadiusMessageHandler;
