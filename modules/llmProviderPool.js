// modules/llmProviderPool.js
const logger = require('./logger');

/**
 * Pool de fournisseurs LLM pour l'analyse de messages d'aide
 * Supporte: Gemini (Google)
 */

class LLMProviderPool {
    constructor() {
        this.providers = [];
        this.currentIndex = 0;
        this.callTimeout = 60000; // 60 secondes de timeout pour les appels API
        this.initProviders();
    }

    initProviders() {
        if (process.env.GEMINI_API_KEY_SUPPORT) {
            // Modèles Gemini organisés par priorité (RPM)
            const models = [
                { name: 'Gemini 3.1 Flash Lite Preview', model: 'gemini-3.1-flash-lite-preview', rpm: 15 },
                { name: 'Gemini 2.5 Flash Lite', model: 'gemini-2.5-flash-lite', rpm: 10 },
                { name: 'Gemini 2.5 Flash', model: 'gemini-2.5-flash', rpm: 5 },
                { name: 'Gemini 3 Flash Preview', model: 'gemini-3-flash-preview', rpm: 5 },
                { name: 'Gemma 4 26B (fallback)', model: 'gemma-4-26b-a4b-it', rpm: 0, fallback: true },
                { name: 'Gemma 4 31B (fallback)', model: 'gemma-4-31b-it', rpm: 0, fallback: true }
            ];

            models.forEach(m => {
                this.providers.push({
                    name: m.name,
                    type: 'gemini',
                    apiKey: process.env.GEMINI_API_KEY_SUPPORT,
                    model: m.model,
                    rpm: m.rpm,
                    fallback: m.fallback || false
                });
            });
        }

        if (this.providers.length === 0) {
            logger.warn('⚠️  Aucun fournisseur LLM configuré pour la détection d\'aide');
        } else {
            logger.info(`✅ Pool LLM initialisé avec ${this.providers.length} fournisseur(s): ${this.providers.map(p => `${p.name} (${p.rpm} RPM)`).join(', ')}`);
        }
    }

    /**
     * Analyse un message en utilisant le pool de LLM
     */
    async analyzeMessage(prompt, retries = 2) {
        if (this.providers.length === 0) {
            throw new Error('Aucun fournisseur LLM disponible');
        }

        let lastError = null;

        for (let attempt = 0; attempt < Math.min(retries, this.providers.length); attempt++) {
            const providerIndex = (this.currentIndex + attempt) % this.providers.length;
            const provider = this.providers[providerIndex];

            try {
                logger.debug(`📤 Envoi à ${provider.name}...`);
                const response = await this.callProvider(provider, prompt);
                this.currentIndex = (providerIndex + 1) % this.providers.length;
                return response;
            } catch (err) {
                lastError = err;
                logger.warn(`⚠️  ${provider.name} a échoué: ${err.message}`);
            }
        }

        throw new Error(`Tous les fournisseurs LLM ont échoué. Dernier erreur: ${lastError?.message}`);
    }

    /**
     * Appelle un fournisseur LLM spécifique
     */
    async callProvider(provider, prompt) {
        // Gemini est l'unique provider
        return await this.callGemini(provider, prompt);
    }

    /**
     * Nettoie une réponse en supprimant les blocs de réflexion/thinking et autres métadonnées
     */
    cleanResponse(text) {
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

    /**
     * Appel Gemini API
     */
    async callGemini(provider, prompt) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(provider.apiKey);
        const model = genAI.getGenerativeModel({ model: provider.model });

        const promise = model.generateContent(prompt);
        const result = await Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout - délai dépassé')), this.callTimeout)
            )
        ]);

        // Nettoyer la réponse en supprimant les blocs de réflexion
        const rawResponse = result.response.text();
        return this.cleanResponse(rawResponse);
    }
}

module.exports = LLMProviderPool;
