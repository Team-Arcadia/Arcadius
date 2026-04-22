#!/usr/bin/env node

/**
 * Script de vérification de la configuration du système de détection d'aide
 * Usage: node check-help-detection-setup.js
 */

const fs = require('fs');
const path = require('path');
const colors = require('colors');

const checks = [];

/**
 * Fonction utilitaire pour les vérifications
 */
function check(name, condition, errorMsg = '') {
    if (condition) {
        console.log(colors.green(`✅ ${name}`));
        checks.push({ name, status: 'pass' });
    } else {
        console.log(colors.red(`❌ ${name}`));
        if (errorMsg) console.log(colors.gray(`   ${errorMsg}`));
        checks.push({ name, status: 'fail', error: errorMsg });
    }
}

console.log(colors.cyan('\n🔍 Vérification de la configuration du système de détection d\'aide...\n'));

// ======= VÉRIFICATION 1: Fichiers créés =======
console.log(colors.cyan('1️⃣  FICHIERS CRÉÉS'));
check(
    'helpDetectionHandler.js existe',
    fs.existsSync(path.join(__dirname, 'modules/helpDetectionHandler.js')),
    'Run: node modules/helpDetectionHandler.js'
);
check(
    'llmProviderPool.js existe',
    fs.existsSync(path.join(__dirname, 'modules/llmProviderPool.js')),
    'Run: node modules/llmProviderPool.js'
);
check(
    'Documentation HELP_DETECTION_GUIDE.md existe',
    fs.existsSync(path.join(__dirname, 'docs/HELP_DETECTION_GUIDE.md')),
    'Le guide de configuration est disponible'
);

// ======= VÉRIFICATION 2: Variables d'environnement =======
console.log(colors.cyan('\n2️⃣  VARIABLES D\'ENVIRONNEMENT'));

const envFile = path.join(__dirname, '.env');
const envExists = fs.existsSync(envFile);
check('.env existe', envExists, 'Copier .env.example vers .env et compléter');

if (envExists) {
    require('dotenv').config();

    check('DISCORD_TOKEN configuré', !!process.env.DISCORD_TOKEN || !!process.env.TOKEN, 'DISCORD_TOKEN ou TOKEN est requis');

    const supportChannels = process.env.SUPPORT_CHANNEL_IDS;
    check(
        'SUPPORT_CHANNEL_IDS configuré',
        !!supportChannels,
        'Ajouter: SUPPORT_CHANNEL_IDS=channel_id1,channel_id2'
    );

    if (supportChannels) {
        const channels = supportChannels.split(',').map(c => c.trim());
        check(
            `SUPPORT_CHANNEL_IDS valide (${channels.length} canal${channels.length > 1 ? 'aux' : ''}`,
            channels.length > 0 && channels.every(c => /^\d+$/.test(c)),
            'Les IDs de canaux doivent être des nombres séparés par des virgules'
        );
    }
}

// ======= VÉRIFICATION 3: Fournisseurs LLM =======
console.log(colors.cyan('\n3️⃣  FOURNISSEURS LLM'));

if (envExists) {
    require('dotenv').config();

    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY_SUPPORT;

    check(
        'Au moins UN fournisseur LLM configuré',
        hasGroq || hasOpenRouter || hasGemini,
        'Configurer GROQ_API_KEY (recommandé) ou OPENROUTER_API_KEY ou GEMINI_API_KEY_SUPPORT'
    );

    if (hasGroq) {
        check('Groq API Key configurée', hasGroq && process.env.GROQ_API_KEY.length > 10);
    }
    if (hasOpenRouter) {
        check('OpenRouter API Key configurée', hasOpenRouter && process.env.OPENROUTER_API_KEY.length > 10);
    }
    if (hasGemini) {
        check('Gemini Support API Key configurée', hasGemini && process.env.GEMINI_API_KEY_SUPPORT.length > 10);
    }

    if (!hasGroq && !hasOpenRouter && !hasGemini) {
        console.log(colors.yellow('⚠️  Aucun fournisseur LLM configuré!'));
        console.log(colors.yellow('   Options:'));
        console.log(colors.yellow('   1. Groq (rapide, gratuit, recommandé) → https://console.groq.com/'));
        console.log(colors.yellow('   2. OpenRouter (gratuit) → https://openrouter.ai/'));
        console.log(colors.yellow('   3. Gemini (clé supplémentaire) → https://ai.google.dev/'));
    }
}

// ======= VÉRIFICATION 4: Dépendances =======
console.log(colors.cyan('\n4️⃣  DÉPENDANCES'));

const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const deps = packageJson.dependencies;

check('discord.js installé', !!deps['discord.js']);
check('dotenv installé', !!deps['dotenv']);
check('@google/generative-ai installé', !!deps['@google/generative-ai']);
check('colors installé', !!deps['colors']);

// Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
check(`Node.js v${majorVersion}+ (fetch natif disponible)`, majorVersion >= 18, 'Node.js v18+ requis pour fetch natif');

// ======= VÉRIFICATION 5: Structure du projet =======
console.log(colors.cyan('\n5️⃣  STRUCTURE DU PROJET'));

check('main.js existe et exporte helpDetectionHandler', 
    fs.existsSync(path.join(__dirname, 'main.js')) &&
    fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8').includes('helpDetectionHandler'),
    'helpDetectionHandler doit être importé et initialisé dans main.js'
);

check('arcadiusConfig.js existe',
    fs.existsSync(path.join(__dirname, 'modules/arcadiusConfig.js')),
    'Configuration d\'Arcadius'
);

check('arcadiusMessageHandler.js existe',
    fs.existsSync(path.join(__dirname, 'modules/arcadiusMessageHandler.js')),
    'Handler des messages d\'Arcadius'
);

// ======= RÉSUMÉ =======
console.log(colors.cyan('\n📊 RÉSUMÉ'));

const passed = checks.filter(c => c.status === 'pass').length;
const total = checks.length;
const passRate = ((passed / total) * 100).toFixed(0);

console.log(colors.cyan(`${passed}/${total} vérifications réussies (${passRate}%)\n`));

if (passed === total) {
    console.log(colors.green('✅ Tout est configuré! Vous pouvez démarrer le bot.\n'));
    console.log(colors.cyan('Prochaines étapes:'));
    console.log('1. Configurer les IDs de canaux Discord dans .env');
    console.log('2. Tester en envoyant un message contenant "comment" ou "bug" etc.');
    console.log('3. Vérifier les logs du bot pour voir la détection en action\n');
} else {
    console.log(colors.yellow('⚠️  Certaines vérifications ont échoué. Consultez les détails ci-dessus.\n'));
    console.log(colors.cyan('Pour corriger:'));
    checks.filter(c => c.status === 'fail').forEach(c => {
        console.log(`- ${c.name}${c.error ? ': ' + c.error : ''}`);
    });
    console.log();
    process.exit(1);
}

// ======= TESTS OPTIONNELS =======
console.log(colors.cyan('🧪 TESTS OPTIONNELS\n'));

if (envExists && (process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY)) {
    console.log(colors.cyan('Voulez-vous tester la connexion LLM? (optionnel)'));
    console.log('Run: node test-llm-connection.js\n');
}
