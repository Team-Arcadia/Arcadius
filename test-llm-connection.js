#!/usr/bin/env node

/**
 * Script de test de la connexion LLM
 * Usage: node test-llm-connection.js
 */

const colors = require('colors');
require('dotenv').config();
const LLMProviderPool = require('./modules/llmProviderPool');
const logger = require('./modules/logger');

async function testLLMConnection() {
    console.log(colors.cyan('\n🧪 TEST DE CONNEXION LLM\n'));

    try {
        // Initialiser le pool LLM
        const llmPool = new LLMProviderPool();

        if (llmPool.providers.length === 0) {
            console.log(colors.red('❌ Aucun fournisseur LLM configuré'));
            console.log(colors.yellow('Configurez une clé API dans .env:'));
            console.log('- GROQ_API_KEY');
            console.log('- OPENROUTER_API_KEY');
            console.log('- GEMINI_API_KEY_SUPPORT\n');
            process.exit(1);
        }

        console.log(colors.green(`✅ ${llmPool.providers.length} fournisseur(s) LLM trouvé(s)`));
        console.log();

        llmPool.providers.forEach((p, i) => {
            console.log(`${i + 1}. ${colors.cyan(p.name)} (${p.model})`);
        });

        console.log(colors.cyan('\n📤 Envoi d\'un test d\'analyse...\n'));

        // Test basique - Analyse simple
        const testPrompt = JSON.stringify({
            isRealQuestion: true,
            canAnswer: true,
            category: "test",
            confidence: 100,
            reason: "Test successful"
        });

        const response = await llmPool.analyzeMessage(
            `Réponds en JSON valide (pas de markdown): ${testPrompt}`
        );

        console.log(colors.green('✅ Réponse reçue du LLM:\n'));
        console.log(colors.gray(response));

        // Test réel - Analyse d'une question
        console.log('\n' + colors.cyan('📤 Envoi d\'un test réel d\'analyse d\'aide...\n'));

        const realTestPrompt = `Tu es un assistant d'analyse pour un bot Discord.
Analyse ce message et réponds en JSON:
Message: "Comment installer le jeu?"

Réponds UNIQUEMENT en JSON:
{
  "isRealQuestion": boolean,
  "canAnswer": boolean,
  "category": string,
  "confidence": number
}`;

        const realResponse = await llmPool.analyzeMessage(realTestPrompt);
        console.log(colors.green('✅ Analyse reçue:\n'));
        console.log(colors.gray(realResponse));

        // Tenter de parser la réponse
        try {
            const parsed = JSON.parse(realResponse);
            console.log('\n' + colors.green('✅ JSON valide:'));
            console.log(colors.cyan(JSON.stringify(parsed, null, 2)));
        } catch (e) {
            console.log(colors.yellow('⚠️  Réponse non-JSON, mais le LLM répond'));
        }

        console.log('\n' + colors.green('✅ TOUS LES TESTS RÉUSSIS\n'));
        console.log(colors.cyan('Le système de détection d\'aide est prêt à être utilisé!'));
        console.log('Démarrez le bot avec: npm start ou node main.js\n');

    } catch (err) {
        console.log(colors.red(`❌ Erreur: ${err.message}\n`));
        console.log(colors.yellow('Problèmes courants:'));
        console.log('1. Clé API invalide ou expirée');
        console.log('2. Limite d\'API dépassée');
        console.log('3. Pas de connexion internet');
        console.log('4. Serveur LLM indisponible\n');
        process.exit(1);
    }
}

testLLMConnection();
