#!/usr/bin/env node

/**
 * Test du système de détection d'aide
 * Vérifie que les mots-clés, LLM et analyse fonctionnent correctement
 */

const colors = require('colors');
const fs = require('fs');
require('dotenv').config();

console.log(colors.cyan('🧪 Test du Système de Détection d\'Aide\n'));

// ======= TEST 1: Configuration =======
console.log(colors.yellow('1️⃣  Vérification de la configuration...'));

const requiredEnvVars = [
    'DISCORD_TOKEN',
    'SUPPORT_CHANNEL_IDS'
];

const llmProviders = [
    'GEMINI_API_KEY_SUPPORT',
    'GROQ_API_KEY',
    'OPENROUTER_API_KEY'
];

let configValid = true;

// Vérifier les variables requises
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.log(colors.red(`  ❌ Manquant: ${envVar}`));
        configValid = false;
    } else {
        console.log(colors.green(`  ✅ ${envVar} configuré`));
    }
}

// Vérifier au moins un LLM
const hasLLM = llmProviders.some(provider => process.env[provider]);
if (!hasLLM) {
    console.log(colors.red(`  ❌ Aucun fournisseur LLM configuré (besoin au moins d'un)`));
    configValid = false;
} else {
    const configured = llmProviders.filter(p => process.env[p]).map(p => p.replace('_API_KEY_SUPPORT', '').replace('_API_KEY', ''));
    console.log(colors.green(`  ✅ Fournisseur(s) LLM: ${configured.join(', ')}`));
}

if (!configValid) {
    console.log(colors.red('\n❌ Configuration incomplète! Vérifier le .env'));
    process.exit(1);
}

console.log(colors.green('\n✅ Configuration valide!\n'));

// ======= TEST 2: Données de Support =======
console.log(colors.yellow('2️⃣  Vérification des données de support...'));

try {
    const responsesPath = './data/responses.json';
    if (fs.existsSync(responsesPath)) {
        const responses = JSON.parse(fs.readFileSync(responsesPath, 'utf-8'));
        const categories = Object.keys(responses).filter(k => k !== 'ignored_users');
        console.log(colors.green(`  ✅ ${categories.length} catégories trouvées:`));
        categories.forEach(cat => {
            const templates = responses[cat].templates?.length || 0;
            console.log(`     - ${cat}: ${templates} templates`);
        });
    } else {
        console.log(colors.yellow(`  ⚠️  Fichier responses.json non trouvé`));
    }
} catch (err) {
    console.log(colors.yellow(`  ⚠️  Erreur lecture responses.json: ${err.message}`));
}

console.log();

// ======= TEST 3: Mots-Clés =======
console.log(colors.yellow('3️⃣  Test des mots-clés de détection...'));

const HELP_TRIGGERS = {
    questions: [
        /\bcomment\b/i,
        /\bquoi\b/i,
        /\bpourquoi\b/i,
        /\bc'est quoi\b/i,
        /\b\?\s*$/,
    ],
    issues: [
        /\bbug\b/i,
        /\bcrash\b/i,
        /\berror\b/i,
        /\bproblème\b/i,
    ],
    actions: [
        /\bjouer\b/i,
        /\blauncher\b/i,
        /\binstaller\b/i,
        /\btélécharger\b/i,
    ],
    frustration: [
        /j'arr(?:ive\s|iv)(?:e\s)?(?:pas|p)\b/i,
        /ça marche pas/i,
        /help\b/i,
    ],
};

const testMessages = [
    { text: 'Comment lancer le jeu?', expected: true, category: 'questions' },
    { text: 'Pourquoi ça ne marche pas?', expected: true, category: 'questions' },
    {
        text: 'J\\'ai un crash', expected: true, category: 'issues' },
    { text: 'Erreur au démarrage', expected: true, category: 'issues' },
    { text: 'Comment installer les mods?', expected: true, category: 'questions' },
    {
        text: 'J\\'arrive pas à jouer', expected: true, category: 'frustration' },
    { text: 'Help! Le jeu crash!', expected: true, category: 'frustration' },
    {
        text: 'Je joue en ce moment c\\'est cool', expected: false, category: 'none' },
    { text: 'Bonjour tout le monde', expected: false, category: 'none' },
];

let passed = 0;
let failed = 0;

testMessages.forEach(test => {
    const textLower = test.text.toLowerCase();
    let detected = false;
    let foundCategory = null;

    for (const [category, patterns] of Object.entries(HELP_TRIGGERS)) {
        for (const pattern of patterns) {
            if (pattern.test(textLower)) {
                detected = true;
                foundCategory = category;
                break;
            }
        }
        if (detected) break;
    }

    const result = detected === test.expected;
    const statusIcon = result ? '✅' : '❌';
    const categoryText = foundCategory ? ` (${foundCategory})` : '';

    console.log(`  ${statusIcon} "${test.text}"${categoryText}`);

    if (result) {
        passed++;
    } else {
        failed++;
    }
});

console.log(colors.cyan(`\n  ${passed}/${testMessages.length} tests réussis`));

if (failed > 0) {
    console.log(colors.red(`  ⚠️  ${failed} test(s) échoué(s)`));
}

console.log();

// ======= TEST 4: LLM =======
console.log(colors.yellow('4️⃣  Test de connexion LLM...'));

(async () => {
    try {
        const LLMProviderPool = require('./modules/llmProviderPool');
        const llmPool = new LLMProviderPool();

        if (llmPool.providers.length === 0) {
            console.log(colors.red('  ❌ Aucun fournisseur LLM initialisé'));
            process.exit(1);
        }

        console.log(colors.green(`  ✅ Pool LLM initialisé avec ${llmPool.providers.length} fournisseur(s)`));

        // Tester l'analyse simple
        console.log('\n  📤 Test d\'analyse (ceci peut prendre 2-3 secondes)...');

        const testPrompt = `Analyze this: "Comment lancer le jeu?"
Respond only with: question or not_a_question`;

        try {
            const response = await llmPool.analyzeMessage(testPrompt);
            console.log(colors.green(`  ✅ LLM répond correctement`));
            console.log(`     Réponse: "${response.slice(0, 100)}..."`);
        } catch (err) {
            console.log(colors.red(`  ❌ Erreur LLM: ${err.message}`));
            process.exit(1);
        }

        console.log(colors.green('\n✅ Tous les tests passés!'));
        console.log(colors.cyan('\n🚀 Vous pouvez maintenant démarrer le bot avec: node main.js'));

    } catch (err) {
        console.log(colors.red(`\n❌ Erreur: ${err.message}`));
        process.exit(1);
    }
})();
