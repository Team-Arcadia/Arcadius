// modules/memoryService.js
const logger = require('./logger');
const { generateWithFailover } = require('./generationService');

async function updateUserMemory(memoryPool, memoryIdx, memoryModel, dataManager, userId, username, message) {
    try {
        const currentMem = dataManager.getUserMemory(userId);

        if (memoryPool.isEmpty()) {
            logger.warn('Pool mémoire vide - mise à jour ignorée');
            return;
        }

        const analysisPrompt = `Tu es un analyseur psychologique. Voici un message de l'utilisateur '${username}':
Message: "${message}"

Profil actuel: ${currentMem.notes || 'Aucune info.'}

TÂCHE: Mets à jour le profil de cet utilisateur en 1 phrase courte.
- Note s'il est amical, agressif, troll, poli, etc.
- Note ses préférences s'ils sont mentionnés (aime PvP, déteste le lag, etc.).
- Si rien de nouveau, garde l'ancien profil.
RÉPONDS UNIQUEMENT avec la nouvelle note.`;

        const { text, newIdx, newModel } = await generateWithFailover(
            memoryPool,
            analysisPrompt,
            memoryIdx,
            memoryModel,
            '[MÉMOIRE]'
        );

        if (!text) {
            logger.error('🔴 [MÉMOIRE] ÉCHEC: Impossible de mettre à jour le profil utilisateur');
            return;
        }

        const newNotes = text.trim();
        memoryPool.currentIndex = newIdx;
        if (newModel) memoryPool.workingModel = newModel;

        if (newNotes && newNotes !== currentMem.notes) {
            dataManager.updateUserMemory(userId, username, newNotes);
            logger.info(`🧠 Mémoire mise à jour pour ${username}: ${newNotes}`);
        }
    } catch (err) {
        logger.warn(`Mise à jour mémoire impossible pour ${username}: ${err.message}`);
    }
}

module.exports = {
    updateUserMemory
};
