// modules/keywordHandler.js
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

let keywordConfig = null;

/**
 * Charge la configuration des mots-clés depuis le fichier JSON
 */
const loadKeywords = () => {
    try {
        const keywordFile = path.join(__dirname, '../data/keywords.json');
        const rawConfig = fs.readFileSync(keywordFile, 'utf-8');
        keywordConfig = JSON.parse(rawConfig);
        logger.info(`✅ ${keywordConfig.keywords.length} mots-clés chargés`);
        return keywordConfig;
    } catch (err) {
        logger.error(`Erreur lors du chargement des mots-clés: ${err.message}`);
        return { enabled: false, keywords: [] };
    }
};

/**
 * Vérifie si un canal est dans la liste des canaux exclus
 * @param {string} channelId - L'ID du canal
 * @returns {boolean} - true si le canal est exclu
 */
const isChannelExcluded = (channelId) => {
    if (!keywordConfig) return false;
    const excludedChannels = keywordConfig.excludedChannels || [];
    return excludedChannels.includes(channelId);
};

/**
 * Vérifie si un message contient un mot-clé et retourne la réponse
 * @param {string} message - Le contenu du message
 * @param {string} channelId - L'ID du canal Discord
 * @returns {string|null} - La réponse associée au mot-clé, ou null
 */
const getKeywordResponse = (message, channelId) => {
    if (!keywordConfig || !keywordConfig.enabled) return null;

    // Vérifier si le canal est exclu
    if (isChannelExcluded(channelId)) {
        return null;
    }

    const messageToCheck = keywordConfig.caseSensitive ? message : message.toLowerCase();

    for (const keyword of keywordConfig.keywords) {
        if (!keyword.enabled) continue;

        // Gérer à la fois les chaînes simples et les tableaux de mots
        const words = Array.isArray(keyword.word) ? keyword.word : [keyword.word];

        for (const word of words) {
            const wordToMatch = keywordConfig.caseSensitive ? word : word.toLowerCase();

            // Vérifier si le mot-clé est dans le message (mot entier ou au début)
            if (
                messageToCheck.includes(wordToMatch) ||
                messageToCheck.startsWith(wordToMatch) ||
                messageToCheck.endsWith(wordToMatch)
            ) {
                return keyword.response;
            }
        }
    }

    return null;
};

/**
 * Recharge les mots-clés depuis le fichier
 */
const reloadKeywords = () => {
    loadKeywords();
};

module.exports = {
    loadKeywords,
    getKeywordResponse,
    isChannelExcluded,
    reloadKeywords
};
