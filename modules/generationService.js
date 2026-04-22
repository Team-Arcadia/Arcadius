// modules/generationService.js
const logger = require('./logger');
const CONFIG = require('./arcadiusConfig');

/**
 * Nettoie une réponse en supprimant les blocs de réflexion/thinking et autres métadonnées
 */
function cleanResponse(text) {
    if (!text) return text;
    // Supprimer les blocs de réflexion et thinking en général
    let cleaned = text
        .replace(/<thinking>[\s\S]*?<\/thinking>\s*/gi, '')
        .replace(/<draft>[\s\S]*?<\/draft>\s*/gi, '')
        .replace(/<brainstorm>[\s\S]*?<\/brainstorm>\s*/gi, '')
        .replace(/<reflection>[\s\S]*?<\/reflection>\s*/gi, '')
        .replace(/<analysis>[\s\S]*?<\/analysis>\s*/gi, '')
        .replace(/<reasoning>[\s\S]*?<\/reasoning>\s*/gi, '')
        .replace(/<internal.*?>[\s\S]*?<\/internal.*?>\s*/gi, '');

    // Supprimer les balises orphelines
    cleaned = cleaned
        .replace(/<\/?thinking>/gi, '')
        .replace(/<\/?draft>/gi, '')
        .replace(/<\/?brainstorm>/gi, '')
        .replace(/<\/?reflection>/gi, '')
        .replace(/<\/?analysis>/gi, '')
        .replace(/<\/?reasoning>/gi, '')
        .trim();

    return cleaned;
}

async function generateWithFailover(
    pool,
    prompt,
    startIdx = 0,
    preferredModel = null,
    logPrefix = '[GENERAL]'
) {
    if (pool.isEmpty()) {
        return { text: null, newIdx: startIdx, newModel: null };
    }

    // Construire la liste des modèles : [Préféré] + [Priorité]
    const modelsToTry = [];
    if (preferredModel && !modelsToTry.includes(preferredModel)) {
        modelsToTry.push(preferredModel);
    }
    for (const model of CONFIG.MODEL_PRIORITY) {
        if (!modelsToTry.includes(model)) {
            modelsToTry.push(model);
        }
    }

    // Essayer tous les modèles et tous les clients
    for (const modelName of modelsToTry) {
        for (let offset = 0; offset < pool.getSize(); offset++) {
            const idx = (startIdx + offset) % pool.getSize();
            const client = pool.getClient(idx);

            if (!client) continue;

            logger.debug(`${logPrefix} 👉 Essai ${modelName} (Clé ${idx + 1}/${pool.getSize()})`);

            try {
                // Définir le délai d'attente pour la génération
                const promise = client.getGenerativeModel({ model: modelName }).generateContent(prompt);
                const response = await Promise.race([
                    promise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), CONFIG.GENERATION_TIMEOUT)
                    )
                ]);

                const rawText = response.response.text();
                const text = cleanResponse(rawText);
                if (text) {
                    logger.info(`${logPrefix} ✅ SUCCÈS: ${modelName} sur la clé ${idx + 1}`);
                    return { text, newIdx: idx, newModel: modelName };
                }
            } catch (err) {
                const errMsg = err.message || '';
                let shortErr = errMsg;

                if (errMsg.includes('429')) {
                    shortErr = '429 - Limite de débit dépassée';
                } else if (errMsg.includes('404')) {
                    shortErr = '404 - Modèle non trouvé';
                } else if (errMsg.includes('403')) {
                    shortErr = '403 - Accès refusé (clé API invalide?)';
                } else if (errMsg.includes('Timeout')) {
                    shortErr = '⏱️ Délai d\'attente dépassé';
                }

                logger.warn(`${logPrefix} ❌ Échec ${modelName} (Clé ${idx + 1}): ${shortErr}`);
            }
        }
    }

    logger.error(`${logPrefix} 🔴 ÉCHEC TOTAL: Toutes les options épuisées`);
    return { text: null, newIdx: startIdx, newModel: null };
}

async function findBestModel(pool, poolName = 'CHAT', preferredHint = null) {
    if (pool.isEmpty()) {
        logger.warn(`⚠️ [${poolName}] Aucune clé API configurée`);
        return { model: null, idx: 0 };
    }

    logger.info(`🔍 Scan du pool ${poolName}...`);

    // Test direct des modèles (listModels non disponible dans cette version du SDK)
    const availableModels = [];

    // Filtrer les modèles prioritaires
    const toCheck = CONFIG.MODEL_PRIORITY.filter(m => {
        if (!availableModels.length) return true;
        return availableModels.some(a => a.includes(m) || a.endsWith(`/${m}`));
    });

    if (!toCheck.length && availableModels.length) {
        logger.warn(`⚠️ [${poolName}] Aucun modèle prioritaire disponible`);
        const gemmaModels = availableModels.filter(m => m.includes('gemma'));
        if (gemmaModels.length) {
            logger.info(`   → Modèles Gemma disponibles: ${gemmaModels.join(', ')}`);
        }
        return { model: null, idx: 0 };
    }

    // Vérification au démarrage avec basculement
    const { text, newIdx, newModel } = await generateWithFailover(
        pool,
        'Vérification du démarrage',
        0,
        preferredHint,
        `[${poolName}]`
    );

    if (newModel) {
        logger.info(`🏆 [${poolName}] MEILLEUR: ${newModel} sur la clé ${newIdx + 1}`);
        return { model: newModel, idx: newIdx };
    }

    logger.warn(`⚠️ [${poolName}] Aucun modèle fonctionnel trouvé`);
    return { model: null, idx: 0 };
}

module.exports = {
    generateWithFailover,
    findBestModel
};
