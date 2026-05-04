// modules/ragSystem.js
/**
 * RAG System (Retrieval Augmented Generation)
 * Récupère du contexte pertinent pour améliorer les réponses du bot
 */

const logger = require('./logger');
const SemanticSearch = require('./semanticSearch');
const knowledgeBase = require('./knowledgeBase');

class RAGSystem {
    constructor(geminiPool) {
        this.semanticSearch = new SemanticSearch(geminiPool);
        this.isReady = false;
    }

    /**
     * Initialise le système RAG
     */
    async initialize() {
        try {
            // Initialiser la base de connaissances
            await knowledgeBase.initialize();

            const stats = knowledgeBase.getStats();
            logger.info(`✅ Système RAG initialisé`);
            logger.info(`   - Documents indexés: ${stats.totalDocuments}`);
            logger.info(`   - Markdown: ${stats.byType.markdown}, Réponses: ${stats.byType.response}, Mots-clés: ${stats.byType.keyword}`);

            this.isReady = true;
        } catch (err) {
            logger.error(`❌ Erreur lors de l'init du RAG: ${err.message}`);
            this.isReady = false;
        }
    }

    /**
     * Enrichit un prompt avec du contexte pertinent
     */
    async enrichPrompt(message, originalPrompt) {
        if (!this.isReady) {
            return originalPrompt;
        }

        try {
            // Rechercher du contexte pertinent
            const context = await this.semanticSearch.searchAndFormat(
                message.content,
                3 // top 3 résultats
            );

            // Injecter le contexte avant le message utilisateur
            if (context) {
                return originalPrompt.replace(
                    `Utilisateur: ${message.content}`,
                    `${context}\nUtilisateur: ${message.content}`
                );
            }

            return originalPrompt;
        } catch (err) {
            logger.warn(`⚠️ Erreur lors de l'enrichissement du prompt: ${err.message}`);
            return originalPrompt;
        }
    }

    /**
     * Analyse si une question peut être répondue avec la base de connaissances
     */
    async canAnswerQuestion(question) {
        try {
            const results = await this.semanticSearch.search(question, 1);

            if (!results || results.length === 0) {
                return { canAnswer: false, confidence: 0, reason: 'Aucun contexte pertinent trouvé' };
            }

            const topResult = results[0];
            const similarity = topResult.similarity || 0;

            // Seuil de confiance pour considérer qu'on peut répondre
            const canAnswer = similarity > 0.4;

            return {
                canAnswer,
                confidence: Math.round(similarity * 100),
                source: topResult.source,
                relevantContent: topResult.content.substring(0, 200)
            };
        } catch (err) {
            logger.warn(`⚠️ Erreur lors de l'analyse: ${err.message}`);
            return { canAnswer: false, confidence: 0, reason: err.message };
        }
    }

    /**
     * Génère un contexte pour une catégorie spécifique
     */
    async getContextForCategory(category) {
        try {
            const docs = knowledgeBase.getAllDocuments()
                .filter(d => d.category === category || d.type === category);

            if (docs.length === 0) return '';

            return this.semanticSearch.formatResultsAsContext(docs.slice(0, 3));
        } catch (err) {
            logger.warn(`⚠️ Erreur lors de la récupération du contexte: ${err.message}`);
            return '';
        }
    }

    /**
     * Obtient les stats du système
     */
    getStats() {
        return {
            ragReady: this.isReady,
            knowledgeBase: knowledgeBase.getStats(),
            cache: this.semanticSearch.getCacheStats()
        };
    }

    /**
     * Vide les caches
     */
    clearCaches() {
        this.semanticSearch.clearCache();
        logger.info('✅ Caches RAG vidés');
    }
}

module.exports = RAGSystem;
