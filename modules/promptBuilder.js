// modules/promptBuilder.js
function buildPromptContext(message, dataManager) {
    const msgContent = message.content.toLowerCase();
    let contextData = '';

    // Détection des mods (injectés uniquement sur mots-clés car volumineux)
    const modKeywords = ['mod', 'mods', 'addon', 'plugin', 'ajout', 'pack', 'install'];
    if (modKeywords.some(k => msgContent.includes(k)) && dataManager.data.formattedMods) {
        contextData += `\n--- LISTE DES MODS (FICHIER EXTERNE) ---\n${dataManager.data.formattedMods}\n`;
    }

    // Liens officiels — TOUJOURS injectés pour éviter que l'IA invente des URLs
    if (dataManager.data.formattedLinks) {
        contextData += `\n--- LIENS OFFICIELS (UTILISE UNIQUEMENT CEUX-CI, N'INVENTE AUCUN LIEN) ---\n${dataManager.data.formattedLinks}\n`;
    }

    // Informations serveur
    let serverKB = '';
    const sInfo = dataManager.data.serverInfo;
    if (Object.keys(sInfo).length > 0) {
        serverKB += '--- INFOS OFFICIELLES (Utiliser strictement sur demande) ---\n';
        if (sInfo.general) {
            Object.entries(sInfo.general).forEach(([k, v]) => {
                serverKB += `- ${k.replace(/_/g, ' ').charAt(0).toUpperCase() + k.slice(1)}: ${v}\n`;
            });
        }
        if (sInfo.status) {
            serverKB += `- Statut: ${sInfo.status.summary || 'Inconnu'}\n`;
        }
    }

    // Instructions spécifiques à l'utilisateur
    let userInstr = '';
    const authorName = message.author.username.toLowerCase();
    const authorId = message.author.id;
    for (const [target, reaction] of Object.entries(dataManager.data.userReactions)) {
        if (target === authorId || target.toLowerCase() === authorName) {
            userInstr = `IMPORTANT: Tu parles avec ${message.author.username}. ${reaction}\n`;
            break;
        }
    }

    // Contexte mémoire
    const userId = message.author.id;
    const knownMemory = dataManager.getUserMemory(userId);
    let memoryContext = '';
    if (knownMemory.notes) {
        memoryContext = `--- IMPORTANT: CE QUE TU SAIS SUR CET UTILISATEUR ---\nNotes: ${knownMemory.notes}\n(Utilise ça pour adapter ton ton!)\n`;
    }

    return {
        contextData,
        serverKB,
        userInstr,
        memoryContext
    };
}

function buildFullPrompt(message, context, dataManager, replyCtx = '') {
    const promptConfig = dataManager.data.promptConfig;

    const identity = promptConfig.identity || 'Tu es Arcadius.';
    const directives = (promptConfig.directives || []).join('\n');
    const personality = (promptConfig.personality || []).join('\n');
    const format = (promptConfig.format || []).join('\n');

    const systemInstruction = `--- IDENTITÉ ---
${identity}

--- DIRECTIVES ABSOLUS ---
${directives}

${context.serverKB}
${context.contextData}

--- PERSONNALITÉ ---
${personality}
${context.userInstr}
${context.memoryContext}

--- FORMAT ---
${format}`;

    return `${systemInstruction}${replyCtx}\nUtilisateur: ${message.content}`;
}

module.exports = {
    buildPromptContext,
    buildFullPrompt
};
