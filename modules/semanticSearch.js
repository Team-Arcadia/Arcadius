// modules/semanticSearch.js
const logger = require('./logger');
const knowledgeBase = require('./knowledgeBase');

class SemanticSearch {
    constructor(geminiPool) {
        this.geminiPool = geminiPool;
        this.embedCache = new Map();
        this.maxCacheSize = 100;
    }

    /**
     * Obtient l'embedding d'un texte via Gemini
     */
    async getEmbedding(text) {
        // Vérifier le cache
        const cached = this.embedCache.get(text);
        if (cached) return cached;

        try {
            // Utiliser Gemini Embedding API
            const client = this.geminiPool.getClient(0);
            if (!client) {
                logger.debug('Pas de client Gemini disponible pour embeddings');
                return null;
            }

            const model = client.getGenerativeModel({ model: 'embedding-001' });
            const result = await model.embedContent(text);

            const embedding = result.embedding.values;

            // Limiter la taille du cache
            if (this.embedCache.size >= this.maxCacheSize) {
                const firstKey = this.embedCache.keys().next().value;
                this.embedCache.delete(firstKey);
            }

            this.embedCache.set(text, embedding);
            return embedding;
        } catch (err) {
            logger.warn(`⚠️ Erreur lors du calcul d'embedding: ${err.message}`);
            return null;
        }
    }

    /**
     * Calcule la similarité cosinus entre deux embeddings
     */
    cosineSimilarity(vec1, vec2) {
        if (!vec1 || !vec2) return 0;

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < Math.min(vec1.length, vec2.length); i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        if (norm1 === 0 || norm2 === 0) return 0;
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    /**
     * Recherche sémantique dans la base de connaissances
     */
    async search(query, topK = 3) {
        try {
            // Essayer recherche sémantique d'abord
            const embedding = await this.getEmbedding(query);

            if (embedding) {
                return await this.semanticSearch(embedding, topK);
            } else {
                // Fallback vers recherche par mots-clés
                logger.debug('Fallback vers recherche par mots-clés');
                return knowledgeBase.searchByKeywords(query);
            }
        } catch (err) {
            logger.warn(`⚠️ Erreur lors de la recherche: ${err.message}`);
            // Fallback final
            return knowledgeBase.searchByKeywords(query);
        }
    }

    /**
     * Recherche sémantique avec embeddings
     */
    async semanticSearch(queryEmbedding, topK = 3) {
        const results = [];
        const documents = knowledgeBase.getAllDocuments();

        for (const doc of documents) {
            try {
                const docEmbedding = await this.getEmbedding(doc.content.substring(0, 500));
                const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);

                if (similarity > 0.3) { // Seuil minimum
                    results.push({
                        ...doc,
                        similarity
                    });
                }
            } catch (err) {
                logger.debug(`Erreur embedding pour doc ${doc.id}: ${err.message}`);
            }
        }

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }

    /**
     * Formate les résultats de recherche en contexte utilisable
     */
    formatResultsAsContext(results) {
        if (!results || results.length === 0) {
            return '';
        }

        let context = '\n--- CONTEXTE DE LA BASE DE CONNAISSANCES ---\n';
        results.forEach((doc, idx) => {
            context += `\n[${idx + 1}] ${doc.title} (source: ${doc.source})\n`;
            context += `${doc.content.substring(0, 300)}${doc.content.length > 300 ? '...' : ''}\n`;
        });
        context += '\n--- FIN DU CONTEXTE ---\n';

        return context;
    }

    /**
     * Effectue une recherche et retourne le contexte formaté
     */
    async searchAndFormat(query, topK = 3) {
        try {
            const results = await this.search(query, topK);
            return this.formatResultsAsContext(results);
        } catch (err) {
            logger.warn(`⚠️ Erreur lors de la recherche formatée: ${err.message}`);
            return '';
        }
    }

    /**
     * Vide le cache des embeddings
     */
    clearCache() {
        this.embedCache.clear();
        logger.debug('✅ Cache d\'embeddings vidé');
    }

    /**
     * Obtient les stats du cache
     */
    getCacheStats() {
        return {
            cacheSize: this.embedCache.size,
            maxCacheSize: this.maxCacheSize
        };
    }
}

module.exports = SemanticSearch;
