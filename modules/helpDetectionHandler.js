// modules/helpDetectionHandler.js
const logger = require('./logger');
const path = require('path');
const fs = require('fs');

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
        /\b\?\s*$/, // Message finissant par ?
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
 */
const detectCategory = (content) => {
    const contentLower = content.toLowerCase();

    // Chercher dans chaque catégorie
    for (const [category, data] of Object.entries(RESPONSES)) {
        if (!data.keywords || data.keywords.length === 0) continue;

        for (const keyword of data.keywords) {
            if (keywordMatchesContent(keyword, contentLower)) {
                return category;
            }
        }
    }

    return 'autre'; // Fallback
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
        const prompt = `Analyze this message to determine if it's a real help request:
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
 * Sélectionne une réponse aléatoire basée sur la catégorie
 */
const selectRandomResponse = (category) => {
    const categoryResponses = RESPONSES[category];
    if (!categoryResponses || !categoryResponses.templates || categoryResponses.templates.length === 0) {
        // Fallback si la catégorie n'existe pas
        const otherResponses = RESPONSES['autre'];
        if (otherResponses && otherResponses.templates && otherResponses.templates.length > 0) {
            return otherResponses.templates[Math.floor(Math.random() * otherResponses.templates.length)];
        }
        return "Je n'ai pas de réponse pour ca... Essaie de reformuler! 🤔";
    }

    return categoryResponses.templates[Math.floor(Math.random() * categoryResponses.templates.length)];
};

/**
 * Génère une réponse d'aide intelligente basée sur la catégorie et le message original
 */
const generateSupportResponse = async (message, analysis, llmClient) => {
    if (!analysis.isRealQuestion || !analysis.canAnswer) {
        return null; // Ignorer si ce n'est pas une vraie question ou qu'on ne peut pas répondre
    }

    try {
        // Option 1: Si LLM disponible, générer une réponse contextuelle
        if (llmClient) {
            const generatePrompt = `Tu es un assistant d'aide pour un serveur Minecraft Discord.
Le message de l'utilisateur est: "${message.content}"
Catégorie détectée: ${analysis.category}

Génère une réponse d'aide courte (3-5 lignes max) et pratique.
La réponse doit être:
- Directe et utile
- En français
- Sans mentionner que tu es une IA
- Sans formule de politesse excessive

CRITICAL INSTRUCTION:
Respond ONLY with the final answer text.
NO thinking blocks, NO drafts, NO brainstorm, NO internal monologue.
NO reasoning or analysis text before or after.
ONLY the help response message.`;

            logger.debug(`📤 Génération de réponse avec LLM...`);
            const aiResponse = await llmClient.analyzeMessage(generatePrompt);
            return aiResponse.trim();
        }

        // Option 2: Fallback sur les templates prédéfinis
        const response = normalizeTemplateText(selectRandomResponse(analysis.category));
        return response;
    } catch (err) {
        logger.error(`Erreur lors de la génération de réponse: ${err.message}`);
        // Fallback ultime
        return selectRandomResponse(analysis.category);
    }
};

/**
 * Initialise le handler de détection d'aide
 */
const helpDetectionHandler = (client, llmClient) => {
    if (client[HELP_HANDLER_BOUND_FLAG]) {
        logger.warn('⚠️  helpDetectionHandler déjà initialisé: double listener évité');
        return;
    }

    client[HELP_HANDLER_BOUND_FLAG] = true;

    // Canaux pour la détection (à configurer)
    const SUPPORT_CHANNELS = process.env.SUPPORT_CHANNEL_IDS?.split(',') || [];

    if (SUPPORT_CHANNELS.length === 0) {
        logger.warn('⚠️  Aucun canal de support configuré (SUPPORT_CHANNEL_IDS)');
        return;
    }

    client.on('messageCreate', async message => {
        try {
            if (processedMessageIds.has(message.id)) return;

            // Ignorer les messages du bot
            if (message.author.id === client.user.id) return;

            // Ignorer les utilisateurs spécifiés dans responses.json
            if (RESPONSES.ignored_users && RESPONSES.ignored_users.includes(message.author.username.toLowerCase())) {
                logger.debug(`Utilisateur ignoré: ${message.author.username}`);
                return;
            }

            // Vérifier si le message est dans un canal de support
            if (!SUPPORT_CHANNELS.includes(message.channelId)) return;

            // Ignorer les messages trop courts
            if (message.content.length < 10) return;

            // Détecter les mots-clés
            if (!detectHelpKeywords(message.content)) return;

            if (!acquireMessageLock(message.id)) {
                logger.debug(`⏭️ Message déjà pris en charge (lock): ${message.id}`);
                return;
            }

            rememberProcessedMessage(message.id);

            logger.info(`🔍 Détection d'aide potentielle: ${message.author.username} - ${message.content.slice(0, 50)}`);

            // Afficher le typing pour l'expérience UX
            await message.channel.sendTyping();

            // Analyser avec le LLM
            const analysis = await analyzeSupportRequest(message, llmClient);

            logger.debug(`📊 Analyse: ${JSON.stringify(analysis)}`);

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
