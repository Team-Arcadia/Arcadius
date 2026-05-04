#!/usr/bin/env node

/**
 * Test RAG System - Script de validation
 * 
 * Permet de tester les modules RAG indépendamment
 * sans intégration dans main.js
 * 
 * Usage: node test-rag-system.js
 */

const path = require('path');

// Charger les modules de base
const logger = require('./modules/logger');
const GeminiClientPool = require('./modules/geminiPool');
const knowledgeBase = require('./modules/knowledgeBase');
const SemanticSearch = require('./modules/semanticSearch');
const RAGSystem = require('./modules/ragSystem');
const ImprovedHelpDetection = require('./modules/improvedHelpDetection');

// Configuration de test
const TEST_CONFIG = {
    verbose: process.env.VERBOSE === 'true',
    skipEmbeddings: process.env.SKIP_EMBEDDINGS === 'true',
    maxQuestions: parseInt(process.env.MAX_QUESTIONS) || 5
};

// Test questions
const TEST_QUESTIONS = [
    "Comment installer les mods?",
    "J'ai un bug, le serveur crash",
    "Quel est le statut du serveur?",
    "Comment voter?",
    "Où je peux trouver la FAQ?"
];

/**
 * Test 1: Knowledge Base
 */
async function testKnowledgeBase() {
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📚 TEST 1: Knowledge Base');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        await knowledgeBase.initialize();

        const stats = knowledgeBase.getStats();
        logger.info(`✅ KB initialisée avec ${stats.totalDocuments} documents`);
        logger.info(`   - Markdown: ${stats.byType.markdown}`);
        logger.info(`   - Réponses: ${stats.byType.response}`);
        logger.info(`   - Mots-clés: ${stats.byType.keyword}`);
        logger.info(`   - Mods: ${stats.byType.mods}`);
        logger.info(`   - Serveur: ${stats.byType.server}`);

        if (TEST_CONFIG.verbose) {
            const docs = knowledgeBase.getAllDocuments();
            logger.info('\n   Premiers documents indexés:');
            docs.slice(0, 3).forEach(doc => {
                logger.info(`   - ${doc.title} (${doc.source})`);
            });
        }

        return true;
    } catch (err) {
        logger.error(`❌ Erreur KB: ${err.message}`);
        return false;
    }
}

/**
 * Test 2: Semantic Search (avec mots-clés fallback)
 */
async function testSemanticSearch() {
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🔍 TEST 2: Semantic Search');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Test 2a: Keyword search (pas besoin d'API)
        logger.info('\n2a. Recherche par mots-clés:');
        const results = knowledgeBase.searchByKeywords('installation mods');

        if (results.length > 0) {
            logger.info(`✅ ${results.length} résultats trouvés:`);
            results.forEach((doc, idx) => {
                logger.info(`   [${idx + 1}] ${doc.title}`);
                logger.info(`       Source: ${doc.source}`);
            });
        } else {
            logger.warn('⚠️  Aucun résultat trouvé');
        }

        if (TEST_CONFIG.skipEmbeddings) {
            logger.info('\n✅ Test 2b (embeddings) skippé (SKIP_EMBEDDINGS=true)');
            return true;
        }

        // Test 2b: Semantic search (nécessite API Gemini)
        logger.info('\n2b. Recherche sémantique (nécessite API):');
        const geminiPool = new GeminiClientPool('GEMINI_API_KEY');

        if (geminiPool.isEmpty()) {
            logger.warn('⚠️  Pas de clé API Gemini - test 2b skippé');
            return true;
        }

        const semanticSearch = new SemanticSearch(geminiPool);
        const semanticResults = await semanticSearch.search('comment installer', 2);

        if (semanticResults.length > 0) {
            logger.info(`✅ ${semanticResults.length} résultats sémantiques:`);
            semanticResults.forEach((doc, idx) => {
                logger.info(`   [${idx + 1}] ${doc.title}`);
                logger.info(`       Similarité: ${(doc.similarity * 100).toFixed(1)}%`);
            });
        }

        return true;
    } catch (err) {
        logger.warn(`⚠️  Erreur search: ${err.message}`);
        return false;
    }
}

/**
 * Test 3: RAG System
 */
async function testRAGSystem() {
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🧠 TEST 3: RAG System');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        const geminiPool = new GeminiClientPool('GEMINI_API_KEY');
        const rag = new RAGSystem(geminiPool);

        // Init
        await rag.initialize();
        const stats = rag.getStats();

        logger.info(`✅ RAG initialisé`);
        logger.info(`   - Documents: ${stats.knowledgeBase.totalDocuments}`);
        logger.info(`   - Cache: ${stats.cache.cacheSize}/${stats.cache.maxCacheSize}`);

        // Test canAnswerQuestion
        logger.info('\n   Vérification répondabilité des questions:');

        for (let i = 0; i < Math.min(3, TEST_QUESTIONS.length); i++) {
            const question = TEST_QUESTIONS[i];
            const analysis = await rag.canAnswerQuestion(question);

            const emoji = analysis.canAnswer ? '✅' : '⚠️';
            logger.info(`   ${emoji} "${question}"`);
            logger.info(`       Confiance: ${analysis.confidence}%, Source: ${analysis.source || 'N/A'}`);
        }

        return true;
    } catch (err) {
        logger.warn(`⚠️  Erreur RAG: ${err.message}`);
        return false;
    }
}

/**
 * Test 4: Improved Help Detection
 */
async function testImprovedHelpDetection() {
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🎯 TEST 4: Improved Help Detection');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        const geminiPool = new GeminiClientPool('GEMINI_API_KEY');
        const rag = new RAGSystem(geminiPool);
        const improvedDetector = new ImprovedHelpDetection(null, rag);

        await rag.initialize();

        logger.info('✅ Detector initialisé');
        logger.info('\n   Analyse RAG pour questions test:');

        // Simuler des messages Discord
        for (let i = 0; i < Math.min(TEST_CONFIG.maxQuestions, TEST_QUESTIONS.length); i++) {
            const messageContent = TEST_QUESTIONS[i];
            const mockMessage = { content: messageContent };

            const analysis = await improvedDetector.analyzeWithRAG(mockMessage);

            if (analysis) {
                logger.info(`\n   Q: "${messageContent}"`);
                logger.info(`   RAG peut répondre: ${analysis.ragCanAnswer}`);
                logger.info(`   Confiance: ${analysis.ragConfidence}%`);
                if (analysis.ragSource) {
                    logger.info(`   Source: ${analysis.ragSource}`);
                }
            }
        }

        return true;
    } catch (err) {
        logger.warn(`⚠️  Erreur detection: ${err.message}`);
        return false;
    }
}

/**
 * Test 5: Performances
 */
async function testPerformances() {
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('⚡ TEST 5: Performances');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        const t1 = Date.now();
        const results = knowledgeBase.searchByKeywords('mods installation');
        const t2 = Date.now();

        const searchTime = t2 - t1;
        logger.info(`✅ Temps de recherche: ${searchTime}ms`);
        logger.info(`   Résultats trouvés: ${results.length}`);

        if (searchTime < 10) {
            logger.info(`   Performance: 🟢 Excellent (<10ms)`);
        } else if (searchTime < 100) {
            logger.info(`   Performance: 🟡 Bon (<100ms)`);
        } else {
            logger.info(`   Performance: 🔴 À optimiser (>${searchTime}ms)`);
        }

        return true;
    } catch (err) {
        logger.error(`❌ Erreur perf: ${err.message}`);
        return false;
    }
}

/**
 * Résumé final
 */
async function runAllTests() {
    logger.info('\n');
    logger.info('╔════════════════════════════════════════════════════════╗');
    logger.info('║  🧪 RAG SYSTEM - VALIDATION COMPLÈTE                  ║');
    logger.info('╚════════════════════════════════════════════════════════╝');

    const results = {
        'Knowledge Base': await testKnowledgeBase(),
        'Semantic Search': await testSemanticSearch(),
        'RAG System': await testRAGSystem(),
        'Improved Detection': await testImprovedHelpDetection(),
        'Performances': await testPerformances()
    };

    // Résumé
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📊 RÉSUMÉ DES TESTS');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let passed = 0;
    let total = 0;

    for (const [test, result] of Object.entries(results)) {
        const emoji = result ? '✅' : '⚠️';
        logger.info(`${emoji} ${test}`);
        if (result) passed++;
        total++;
    }

    logger.info(`\nRésultat: ${passed}/${total} tests réussis`);

    if (passed === total) {
        logger.info('✨ Tous les tests sont passés! Prêt pour l\'intégration.');
    } else {
        logger.warn('⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.');
    }

    logger.info('\n💡 Prochaines étapes:');
    logger.info('1. Lire: Documentation/RAG_INTEGRATION_GUIDE.md');
    logger.info('2. Modifier: main.js');
    logger.info('3. Relancer: npm start');

    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Lancer les tests
if (require.main === module) {
    runAllTests().catch(err => {
        logger.error('Erreur fatale:', err);
        process.exit(1);
    });
}

module.exports = { runAllTests, TEST_CONFIG };
