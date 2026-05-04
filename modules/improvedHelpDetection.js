// modules/improvedHelpDetection.js
/**
 * Module d'amélioration de la détection d'aide avec RAG
 * Utilise le système RAG pour mieux identifier et répondre aux questions
 */

const logger = require('./logger');

class ImprovedHelpDetection {
    constructor(llmClient, ragSystem) {
        this.llmClient = llmClient;
        this.ragSystem = ragSystem;
    }

    /**
     * Analyse une question avec le contexte RAG
     */
    async analyzeWithRAG(message) {
        if (!this.ragSystem || !this.ragSystem.isReady) {
            logger.debug('RAG non disponible, analyse simple');
            return null;
        }

        try {
            // Vérifier si on peut répondre avec la base de connaissances
            const analysis = await this.ragSystem.canAnswerQuestion(message.content);

            logger.debug(`📚 Analyse RAG: canAnswer=${analysis.canAnswer}, confidence=${analysis.confidence}%`);

            return {
                ragCanAnswer: analysis.canAnswer,
                ragConfidence: analysis.confidence,
                ragSource: analysis.source,
                ragReason: analysis.reason
            };
        } catch (err) {
            logger.warn(`⚠️  Erreur lors de l'analyse RAG: ${err.message}`);
            return null;
        }
    }

    /**
     * Enrichit le prompt avec le contexte RAG
     */
    async enrichPromptWithRAG(message) {
        if (!this.ragSystem || !this.ragSystem.isReady) {
            return '';
        }

        try {
            const ragContext = await this.ragSystem.semanticSearch.searchAndFormat(
                message.content,
                3
            );
            return ragContext;
        } catch (err) {
            logger.warn(`⚠️  Erreur lors de l'enrichissement RAG: ${err.message}`);
            return '';
        }
    }

    /**
     * Analyse améliorée combinant LLM et RAG
     */
    async analyzeQuestionWithRAG(message, category = 'autre') {
        try {
            const isEnglish = message.content.length === 0 ||
                /[a-z]{3,}/.test(message.content) &&
                /\b(help|how|what|why|can|is|do|does|get|find|fix|solve|error|problem|bug|issue)\b/i.test(message.content);

            // Analyse RAG d'abord
            const ragAnalysis = await this.analyzeWithRAG(message);

            // Si le RAG dit qu'on peut répondre, on peut être plus confiant
            if (ragAnalysis && ragAnalysis.ragCanAnswer && ragAnalysis.ragConfidence > 50) {
                logger.info(`✅ RAG détecte une réponse disponible (${ragAnalysis.ragConfidence}%)`);
                return {
                    isRealQuestion: true,
                    canAnswer: true,
                    category: category,
                    confidence: Math.min(100, ragAnalysis.ragConfidence + 20),
                    reason: `Réponse trouvée dans la base: ${ragAnalysis.ragSource}`,
                    ragEnhanced: true
                };
            }

            // Sinon, si pas de LLM, utiliser juste le RAG
            if (!this.llmClient) {
                if (ragAnalysis && ragAnalysis.ragCanAnswer) {
                    return {
                        isRealQuestion: true,
                        canAnswer: true,
                        category: category,
                        confidence: 75,
                        reason: `Catégorie détectée + contexte RAG trouvé`,
                        ragEnhanced: true
                    };
                }

                return {
                    isRealQuestion: true,
                    canAnswer: false,
                    category: category,
                    confidence: 70,
                    reason: `Catégorie détectée (pas de RAG match)`,
                    ragEnhanced: false
                };
            }

            // Créer un prompt amélioré avec le contexte RAG
            const ragContext = ragAnalysis?.ragSource ?
                `\n[CONTEXTE DISPONIBLE] Source: ${ragAnalysis.ragSource}` :
                '';

            const prompt = isEnglish ?
                `Analyze this message and determine if it's a real help request. Knowledge base context available: ${ragAnalysis?.ragCanAnswer ? 'YES' : 'NO'}

"${message.content}"

Respond in JSON format (no markdown):
{
  "isRealQuestion": boolean,
  "canAnswer": boolean,
  "category": "bug" | "gameplay" | "installation" | "other",
  "confidence": number (0-100),
  "reason": "Brief explanation"
}

CRITICAL: Return ONLY the JSON object, nothing else.`
                :
                `Analyse ce message pour déterminer si c'est une vraie demande d'aide. Contexte disponible: ${ragAnalysis?.ragCanAnswer ? 'OUI' : 'NON'}

"${message.content}"

Réponds en JSON (pas de markdown):
{
  "isRealQuestion": boolean,
  "canAnswer": boolean,
  "category": "bug" | "gameplay" | "installation" | "autre",
  "confidence": number (0-100),
  "reason": "Explication courte"
}

CRITIQUE: Retourne UNIQUEMENT l'objet JSON, rien d'autre.`;

            const rawResponse = await this.llmClient.analyzeMessage(prompt);

            // Parser la réponse JSON
            let analysis;
            try {
                const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    analysis = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Pas de JSON trouvé');
                }
            } catch (parseErr) {
                logger.warn(`⚠️  Parse LLM échoué: ${parseErr.message}`);
                return {
                    isRealQuestion: true,
                    canAnswer: ragAnalysis?.ragCanAnswer ?? false,
                    category: category,
                    confidence: 65,
                    reason: `Catégorie + RAG (parse LLM fail)`,
                    ragEnhanced: true
                };
            }

            return {
                isRealQuestion: analysis.isRealQuestion ?? true,
                canAnswer: analysis.canAnswer ?? (ragAnalysis?.ragCanAnswer ?? false),
                category: analysis.category || category,
                confidence: Math.min(100, analysis.confidence || 50),
                reason: analysis.reason,
                ragEnhanced: true
            };
        } catch (err) {
            logger.error(`Erreur analyse améliorée: ${err.message}`);
            return {
                isRealQuestion: false,
                canAnswer: false,
                category: 'autre',
                confidence: 0,
                reason: `Erreur: ${err.message}`,
                ragEnhanced: false
            };
        }
    }

    /**
     * Obtient le contexte RAG pour une réponse
     */
    async getRAGContextForResponse(message) {
        if (!this.ragSystem || !this.ragSystem.isReady) {
            return '';
        }

        try {
            return await this.ragSystem.semanticSearch.searchAndFormat(
                message.content,
                3
            );
        } catch (err) {
            logger.warn(`⚠️  Erreur RAG context: ${err.message}`);
            return '';
        }
    }
}

module.exports = ImprovedHelpDetection;
