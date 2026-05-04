// modules/helpDetectionHandler.js
const logger = require('./logger');
const path = require('path');
const fs = require('fs');
const { getKeywordResponse } = require('./keywordHandler');
const { detectLanguage, getLanguageInstruction } = require('./languageDetector');

const HELP_HANDLER_BOUND_FLAG = Symbol('helpDetectionHandlerBound');
const processedMessageIds = new Set();
const MESSAGE_LOCKS_DIR = path.join(__dirname, '../logs/help-message-locks');

const acquireMessageLock = (messageId) => {
    try {
        fs.mkdirSync(MESSAGE_LOCKS_DIR, { recursive: true });
        const lockPath = path.join(MESSAGE_LOCKS_DIR, `${messageId}.lock`);

        // 'wx' garantit une création atomique: si le fichier existe déjà, on skip.
        fs.writeFileSync(lockPath, String(Date.now()), { flag: 'wx' });

        // Nettoyage automatique du lock après 2 minutes.
        setTimeout(() => {
            try {
                fs.unlinkSync(lockPath);
            } catch {
                // Ignore: le lock peut déjà avoir été supprimé.
            }
        }, 120000);

        return true;
    } catch (err) {
        if (err && err.code === 'EEXIST') return false;

        logger.warn(`⚠️  Impossible de créer le lock anti-doublon: ${err.message}`);
        return true;
    }
};

const rememberProcessedMessage = (messageId) => {
    processedMessageIds.add(messageId);

    // Evite de garder des IDs indéfiniment en mémoire.
    setTimeout(() => {
        processedMessageIds.delete(messageId);
    }, 120000);
};

const normalizeTemplateText = (text) =>
    String(text || '')
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');

/**
 * Charge les réponses personnalisables depuis le fichier JSON
 */
let RESPONSES = {};
try {
    const responsesPath = path.join(__dirname, '../data/responses.json');
    RESPONSES = JSON.parse(fs.readFileSync(responsesPath, 'utf-8'));
    logger.info(`✅ ${Object.keys(RESPONSES).length} catégories de réponses chargées`);
} catch (err) {
    logger.warn(`⚠️  Impossible de charger les réponses: ${err.message}`);
    RESPONSES = {}; // Fallback vide
}

/**
 * Liste des mots-clés qui déclenchent la détection d'aide
 * Format : regex patterns pour une meilleure flexibilité
 */
const HELP_TRIGGERS = {
    questions: [
        /\bcomment\b/i,           // Comment faire...
        /\bquoi\b/i,              // Quoi faire
        /\bpourquoi\b/i,          // Pourquoi
        /\bc'est quoi\b/i,        // C'est quoi
        /\bwat\b/i,               // Wat?
        /\?\s*$/,                 // Message finissant par ?
    ],
    issues: [
        /\bbug\b/i,               // Bug
        /\bcrash\b/i,             // Crash
        /\berror\b/i,             // Error
        /\b(ne fonctionne|ne marche|pas|pas d'affichage)\b/i,  // Ça ne fonctionne pas
        /\bproblème\b/i,          // Problème
        /\bsoucis\b/i,            // Souci
        /\bglitch\b/i,            // Glitch
        /\blag\b/i,               // Lag
        /\berp\b/i,               // ERP (erreur de contexte - problème)
    ],
    actions: [
        /\bjouer\b/i,             // Jouer
        /\blauncher\b/i,          // Launcher
        /\binstaller\b/i,         // Installer
        /\btélécharger\b/i,       // Télécharger
        /\bcommencer\b/i,         // Commencer
        /\bdémarrer\b/i,          // Démarrer
    ],
    frustration: [
        /j'arr(?:ive\s|iv)(?:e\s)?(?:pas|p)\b/i,  // J'arrive pas
        /ça marche pas/i,         // Ça marche pas
        /ça n[uo]l/i,             // Ça nul / c'est nul
        /help\b/i,                // Help!
        /aide\b/i,                // Aide moi
        /svp\b/, // S'il vous plaît
        /please\b/i,              // Please
        /c'est impossible\b/i,    // C'est impossible
        /je comprends pas\b/i,    // Je comprends pas
    ],
};

/**
 * Échappe une chaîne pour une utilisation sûre dans une RegExp.
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Match intelligent des keywords:
 * - Mots simples: match uniquement en mot entier (évite "con" dans "connexion")
 * - Expressions multi-mots: match par inclusion de la phrase
 */
const keywordMatchesContent = (keyword, contentLower) => {
    const normalizedKeyword = String(keyword || '').trim().toLowerCase();
    if (!normalizedKeyword) return false;

    const isSingleWord = !/\s/.test(normalizedKeyword);
    if (!isSingleWord) {
        return contentLower.includes(normalizedKeyword);
    }

    const escaped = escapeRegex(normalizedKeyword);
    const wholeWordRegex = new RegExp(`(^|[^a-z0-9à-öø-ÿ])${escaped}([^a-z0-9à-öø-ÿ]|$)`, 'iu');
    return wholeWordRegex.test(contentLower);
};

/**
 * Détecte la catégorie d'un message basée sur les keywords
 * Priorité: les keywords les plus longs/spécifiques d'abord
 */
const detectCategory = (content) => {
    const contentLower = content.toLowerCase();

    // Créer une liste de keywords avec leur catégorie et longueur
    const allKeywords = [];
    for (const [category, data] of Object.entries(RESPONSES)) {
        if (!data.keywords || data.keywords.length === 0) continue;

        for (const keyword of data.keywords) {
            allKeywords.push({ keyword, category, length: keyword.length });
        }
    }

    // Trier par longueur décroissante (plus spécifiques d'abord)
    allKeywords.sort((a, b) => b.length - a.length);

    // Tester dans l'ordre de spécificité
    for (const { keyword, category } of allKeywords) {
        if (keywordMatchesContent(keyword, contentLower)) {
            return category;
        }
    }

    return 'autre'; // Fallback
};

/**
 * Vérifie si un message est une vraie QUESTION (uniquement)
 * Ignore les problèmes, frustrations, actions générales
 */
const isQuestion = (content) => {
    const contentLower = content.toLowerCase();

    // Vérifier contre les patterns de questions uniquement
    const questionPatterns = HELP_TRIGGERS.questions;
    for (const pattern of questionPatterns) {
        if (pattern.test(contentLower)) {
            return true;
        }
    }

    return false;
};

/**
 * Vérifie si un message contient des mots-clés d'aide
 */
const detectHelpKeywords = (content) => {
    // Vérifier si on trouve une catégorie (autre que 'autre')
    const category = detectCategory(content);
    return category !== 'autre';
};

/**
 * Analyse un message de support avec l'IA pour confirmer si c'est vraiment une question
 */
const analyzeSupportRequest = async (message, llmClient) => {
    try {
        const category = detectCategory(message.content);
        const detectedLanguage = detectLanguage(message.content);
        const isEnglish = detectedLanguage === 'en';

        // Si pas de LLM configuré, utiliser la détection de catégorie
        if (!llmClient) {
            logger.debug('⚠️  Pas de LLM configuré, utilisation simple de la catégorie');
            return {
                isRealQuestion: true,
                canAnswer: true,
                category: category,
                confidence: 80,
                reason: `Catégorie détectée (sans vérification IA): ${category}`
            };
        }

        // Créer un prompt intelligent pour l'analyse
        const prompt = isEnglish ?
            `Analyze this message to determine if it's a real help request:
"${message.content}"

Respond in JSON format (no markdown, just raw JSON):
{
  "isRealQuestion": boolean,
  "canAnswer": boolean,
  "category": "bug" | "gameplay" | "installation" | "other",
  "confidence": number (0-100),
  "reason": "Brief explanation"
}

Guidelines:
- isRealQuestion: Is this actually asking for help? (not just conversation)
- canAnswer: Can this be answered with general advice? (not too vague or personal)
- category: Classify the question type
- confidence: How confident are you? (0-100)

CRITICAL: Return ONLY the JSON object, nothing else. 
NO thinking blocks, NO drafts, NO reasoning, NO internal monologue, NO explanations.
Just the raw JSON response.`
            :
            `Analyze this message to determine if it's a real help request:
"${message.content}"

Respond in JSON format (no markdown, just raw JSON):
{
  "isRealQuestion": boolean,
  "canAnswer": boolean,
  "category": "bug" | "gameplay" | "installation" | "autre",
  "confidence": number (0-100),
  "reason": "Brief explanation"
}

Guidelines:
- isRealQuestion: Is this actually asking for help? (not just conversation)
- canAnswer: Can this be answered with general advice? (not too vague or personal)
- category: Classify the question type
- confidence: How confident are you? (0-100)

CRITICAL: Return ONLY the JSON object, nothing else. 
NO thinking blocks, NO drafts, NO reasoning, NO internal monologue, NO explanations.
Just the raw JSON response.`;

        logger.debug(`📤 Envoi de l'analyse LLM...`);
        const rawResponse = await llmClient.analyzeMessage(prompt);

        // Parser la réponse JSON
        let analysis;
        try {
            // Extraire le JSON de la réponse (au cas où il y aurait du texte avant/après)
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Pas de JSON trouvé dans la réponse');
            }
        } catch (parseErr) {
            logger.warn(`⚠️  Impossible de parser la réponse LLM: ${parseErr.message}`);
            // Fallback sur la détection simple
            return {
                isRealQuestion: true,
                canAnswer: true,
                category: category,
                confidence: 70,
                reason: `Catégorie détectée (parse fail): ${category}`
            };
        }

        return {
            isRealQuestion: analysis.isRealQuestion ?? true,
            canAnswer: analysis.canAnswer ?? true,
            category: analysis.category || category,
            confidence: Math.min(100, analysis.confidence || 50),
            reason: analysis.reason || `Catégorie: ${category}`
        };
    } catch (err) {
        logger.error(`Erreur lors de l'analyse: ${err.message}`);
        return {
            isRealQuestion: false,
            canAnswer: false,
            category: 'autre',
            confidence: 0,
            reason: `Erreur: ${err.message}`
        };
    }
};

/**
 * Sélectionne une réponse aléatoire basée sur la catégorie et la langue
 * @param {string} category - La catégorie de réponse
 * @param {string} language - La langue détectée ('en', 'fr', ou 'unknown')
 * @returns {string} - La réponse sélectionnée aléatoirement
 */
const selectRandomResponse = (category, language = 'fr') => {
    const categoryResponses = RESPONSES[category];
    if (!categoryResponses || !categoryResponses.templates || categoryResponses.templates.length === 0) {
        // Fallback si la catégorie n'existe pas
        const otherResponses = RESPONSES['autre'];
        if (otherResponses && otherResponses.templates && otherResponses.templates.length > 0) {
            const templates = otherResponses.templates;
            return templates[Math.floor(Math.random() * templates.length)];
        }
        return "Je n'ai pas de réponse pour ca... Essaie de reformuler! 🤔";
    }

    const templates = categoryResponses.templates;

    // Si la langue est l'anglais, sélectionner parmi les templates anglais
    if (language === 'en') {
        // Les templates anglais sont généralement dans la deuxième moitié de la liste
        const midpoint = Math.ceil(templates.length / 2);

        // Vérifier si nous avons des templates anglais (longueur pair = nombre pair de paires)
        if (templates.length >= 2) {
            // Prendre les templates de la deuxième moitié (templates anglais)
            const englishTemplates = templates.slice(midpoint);

            // Double vérification: s'assurer que c'est vraiment du contenu anglais
            // Les templates anglais devraient avoir certains patterns
            const validEnglish = englishTemplates.filter(t => {
                // Pattern pour vérifier que c'est de l'anglais
                return /\b(here|is|are|your|you|the|check|visit|find)\b/.test(t);
            });

            if (validEnglish.length > 0) {
                return validEnglish[Math.floor(Math.random() * validEnglish.length)];
            }
        }

        // Si pas de templates anglais clairs, retourner un template aléatoire
        // (fallback: le LLM aurait dû générer une réponse de toute façon)
        return templates[Math.floor(Math.random() * templates.length)];
    }

    // Pour le français, prendre la première moitié des templates
    const midpoint = Math.ceil(templates.length / 2);
    const frenchTemplates = templates.slice(0, midpoint);

    if (frenchTemplates.length > 0) {
        return frenchTemplates[Math.floor(Math.random() * frenchTemplates.length)];
    }

    // Fallback final
    return templates[Math.floor(Math.random() * templates.length)];
};

/**
 * Génère une réponse d'aide intelligente basée sur la catégorie et le message original
 */
const generateSupportResponse = async (message, analysis, llmClient) => {
    if (!analysis.isRealQuestion || !analysis.canAnswer) {
        return null; // Ignorer si ce n'est pas une vraie question ou qu'on ne peut pas répondre
    }

    try {
        // Détecter la langue de l'utilisateur
        const detectedLanguage = detectLanguage(message.content);
        const isEnglish = detectedLanguage === 'en';

        // Option 1: Préférer les templates prédéfinis (plus précis et fiables)
        const response = normalizeTemplateText(selectRandomResponse(analysis.category, detectedLanguage));
        if (response && response !== "Je n'ai pas de réponse pour ca... Essaie de reformuler! 🤔") {
            return response;
        }

        // Option 2: Si pas de templates disponibles, générer une réponse contextuelle avec LLM
        if (llmClient) {
            const languageInstruction = getLanguageInstruction(detectedLanguage);
            const generatePrompt = isEnglish ?
                `You are a help assistant for a Minecraft Discord server.
The user's message is: "${message.content}"
Detected category: ${analysis.category}

Generate a short (3-5 lines max) and practical help response.
The response must be:
- Direct and useful
- In English
- Without mentioning you are an AI
- Without excessive politeness

${languageInstruction}

CRITICAL INSTRUCTION:
Respond ONLY with the final answer text.
NO thinking blocks, NO drafts, NO brainstorm, NO internal monologue.
NO reasoning or analysis text before or after.
ONLY the help response message.`
                :
                `Tu es un assistant d'aide pour un serveur Minecraft Discord.
Le message de l'utilisateur est: "${message.content}"
Catégorie détectée: ${analysis.category}

Génère une réponse d'aide courte (3-5 lignes max) et pratique.
La réponse doit être:
- Directe et utile
- En français
- Sans mentionner que tu es une IA
- Sans formule de politesse excessive

${languageInstruction}

CRITICAL INSTRUCTION:
Respond ONLY with the final answer text.
NO thinking blocks, NO drafts, NO brainstorm, NO internal monologue.
NO reasoning or analysis text before or after.
ONLY the help response message.`;

            logger.debug(`📤 Génération de réponse avec LLM (Langue: ${isEnglish ? 'EN' : 'FR'})...`);
            const aiResponse = await llmClient.analyzeMessage(generatePrompt);
            return aiResponse.trim();
        }

        // Fallback ultime
        return response;
    } catch (err) {
        logger.error(`Erreur lors de la génération de réponse: ${err.message}`);
        // Fallback ultime
        return selectRandomResponse(analysis.category, 'fr');
    }
};

/**
 * Configure le handler de détection d'aide sur un client Discord
 */
const helpDetectionHandler = (client, llmClient) => {
    // Éviter d'ajouter le listener plusieurs fois
    if (client[HELP_HANDLER_BOUND_FLAG]) {
        logger.debug('⚠️  Handler d\'aide déjà bindé sur ce client');
        return;
    }
    client[HELP_HANDLER_BOUND_FLAG] = true;

    const SUPPORT_CHANNELS = process.env.SUPPORT_CHANNEL_IDS?.split(',').map(ch => ch.trim()) || [];

    client.on('messageCreate', async (message) => {
        try {
            // Ignorer les messages des bots
            if (message.author.bot) return;

            // Vérifier si c'est dans un canal de support
            if (!SUPPORT_CHANNELS.includes(message.channelId)) return;

            // Anti-doublon: check si on a déjà traité ce message
            if (processedMessageIds.has(message.id)) {
                logger.debug(`⏭️  Message déjà traité: ${message.id}`);
                return;
            }

            // ✅ CRITÈRE PRINCIPAL: C'est une QUESTION (uniquement)
            // Ignorer complètement si ce n'est pas une question
            if (!isQuestion(message.content)) {
                logger.debug(`ℹ️  Message non pertinent (pas une question): "${message.content.slice(0, 40)}"`);
                return;
            }

            // Acquérir le lock pour ce message
            if (!acquireMessageLock(message.id)) {
                logger.debug(`🔒 Message en cours de traitement: ${message.id}`);
                return;
            }

            rememberProcessedMessage(message.id);

            // 🔑 VÉRIFIER LES KEYWORDS D'ABORD (priorité haute)
            const keywordResponse = getKeywordResponse(message.content, message.channelId);
            if (keywordResponse) {
                try {
                    // Détecter la langue une seule fois
                    const detectedLanguage = detectLanguage(message.content);
                    const isEnglish = detectedLanguage === 'en';

                    // Détecter la catégorie et adapter la réponse
                    let finalResponse = keywordResponse;

                    if (keywordResponse.startsWith('http')) {
                        // C'est une URL, on cherche la catégorie de réponse appropriée
                        const category = detectCategory(message.content);
                        if (category && category !== 'autre' && RESPONSES[category]?.templates) {
                            const templates = RESPONSES[category].templates;
                            if (isEnglish) {
                                const midpoint = Math.ceil(templates.length / 2);
                                const englishTemplates = templates.slice(midpoint);
                                const validEnglish = englishTemplates.filter(t => /\b(here|is|are|your|you|the|check|visit|find)\b/.test(t));
                                if (validEnglish.length > 0) {
                                    finalResponse = validEnglish[Math.floor(Math.random() * validEnglish.length)];
                                }
                            } else {
                                const midpoint = Math.ceil(templates.length / 2);
                                const frenchTemplates = templates.slice(0, midpoint);
                                if (frenchTemplates.length > 0) {
                                    finalResponse = frenchTemplates[Math.floor(Math.random() * frenchTemplates.length)];
                                }
                            }
                        } else if (keywordResponse.includes('serverpack')) {
                            // Réponse spéciale pour serverpack
                            finalResponse = isEnglish
                                ? "Here's the link to download the server pack: https://www.arcadia-echoes-of-power.fr/serverpack 📦"
                                : "Voici le lien pour télécharger le server pack : https://www.arcadia-echoes-of-power.fr/serverpack 📦";
                        }
                    }

                    await message.reply({
                        content: finalResponse.slice(0, 2000),
                        allowedMentions: { repliedUser: true }
                    });
                    logger.info(`✅ Réponse par mot-clé envoyée (langue: ${detectedLanguage})`);
                    return;
                } catch (err) {
                    logger.error(`Erreur lors de l'envoi de la réponse par mot-clé: ${err.message}`);
                    return;
                }
            }

            // Déterminer si c'est un message d'aide
            const analysis = await analyzeSupportRequest(message, llmClient);

            // Si c'est une vraie question ET qu'on peut y répondre
            if (analysis.isRealQuestion && analysis.canAnswer) {
                const response = await generateSupportResponse(message, analysis, llmClient);

                if (response) {
                    try {
                        // Limiter à 2000 caractères (limite Discord)
                        const truncatedResponse = response.slice(0, 2000);
                        await message.reply({
                            content: truncatedResponse,
                            allowedMentions: { repliedUser: true }
                        });
                        logger.info(`✅ Réponse d'aide envoyée (confiance: ${analysis.confidence}%)`);
                    } catch (err) {
                        logger.error(`Erreur lors de l'envoi de la réponse: ${err.message}`);
                    }
                }
            } else if (analysis.isRealQuestion && !analysis.canAnswer) {
                logger.info(`ℹ️  Question détectée mais trop générique/complexe à répondre automatiquement`);
                // Optionnel : ajouter une réaction ou un message pour signaler qu'on a vu la question
                try {
                    await message.react('👀');
                } catch (err) {
                    logger.debug(`Impossible d'ajouter une réaction: ${err.message}`);
                }
            }
        } catch (err) {
            logger.error(`Erreur dans helpDetectionHandler: ${err.message}`);
        }
    });


    logger.info(`✅ Handler de détection d'aide initialisé pour ${SUPPORT_CHANNELS.length} canal(aux)`);
};

module.exports = {
    helpDetectionHandler,
    detectHelpKeywords,
    HELP_TRIGGERS
};
