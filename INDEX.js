#!/usr/bin/env node

/**
 * SYSTÈME DE DÉTECTION D'AIDE - INDEX ET CARTOGRAPHIE
 * 
 * Ce fichier énumère tous les composants du système
 * et où les trouver dans le projet.
 */

const fs = require('fs');
const path = require('path');

// Version du système
const VERSION = '1.0.0';

// Structure complète du système
const SYSTEM_MAP = {
    name: '🤖 Système de Détection d\'Aide Automatique pour Bot Arcadius',
    version: VERSION,
    description: 'Détecte et répond automatiquement aux demandes d\'aide via LLM',

    directories: {
        root: '.',
        modules: './modules',
        docs: './docs',
        data: './data',
        scripts: './'
    },

    files: {
        core: [
            {
                path: 'modules/helpDetectionHandler.js',
                lines: 358,
                description: 'Module principal - Détection et orchestration',
                exports: [
                    'helpDetectionHandler(client, llmClient)',
                    'detectHelpKeywords(content)',
                    'HELP_TRIGGERS'
                ],
                key_functions: [
                    'detectHelpKeywords() - Détection par regex',
                    'analyzeSupportRequest() - Analyse LLM',
                    'generateSupportResponse() - Génération réponse',
                    'helpDetectionHandler() - Initialisation listener'
                ]
            },
            {
                path: 'modules/llmProviderPool.js',
                lines: 230,
                description: 'Pool de fournisseurs LLM avec failover',
                exports: [
                    'class LLMProviderPool',
                    'async analyzeMessage(prompt, retries)'
                ],
                key_functions: [
                    'initProviders() - Charge les providers',
                    'callGroq() - API Groq',
                    'callOpenRouter() - API OpenRouter',
                    'callGemini() - API Gemini'
                ]
            }
        ],

        documentation: [
            {
                path: 'HELP_DETECTION_README.md',
                audience: 'Tous',
                content: [
                    '- Vue d\'ensemble',
                    '- Démarrage rapide',
                    '- Fonctionnement',
                    '- Exemples',
                    '- Configuration avancée'
                ]
            },
            {
                path: 'INSTALLATION_GUIDE.md',
                audience: 'Débutants',
                content: [
                    '- Prérequis',
                    '- Configuration .env',
                    '- Obtention clés API',
                    '- Vérification et test',
                    '- Troubleshooting'
                ]
            },
            {
                path: 'docs/HELP_DETECTION_GUIDE.md',
                audience: 'Intermédiaires',
                content: [
                    '- Vue d\'ensemble détaillée',
                    '- Mots-clés détectés',
                    '- Configuration',
                    '- Obtention de clés API',
                    '- Améliorations possibles'
                ]
            },
            {
                path: 'docs/HELP_DETECTION_TECHNICAL.md',
                audience: 'Avancés',
                content: [
                    '- Architecture complète',
                    '- Flux d\'exécution',
                    '- Patterns regex',
                    '- Performance',
                    '- Intégration avec Arcadius'
                ]
            },
            {
                path: 'docs/ADVANCED_USE_CASES.md',
                audience: 'Développeurs',
                content: [
                    '- Base de connaissances (FAQs)',
                    '- Système de feedback',
                    '- Escalade vers modos',
                    '- Analytics',
                    '- Rate limiting',
                    '- Support multilingue',
                    '- Cache de réponses',
                    '- Webhooks'
                ]
            },
            {
                path: 'SYSTEM_SUMMARY.md',
                audience: 'Tous',
                content: [
                    '- Résumé des changements',
                    '- Fichiers créés/modifiés',
                    '- Fonctionnalités',
                    '- Prochaines étapes'
                ]
            }
        ],

        configuration: [
            {
                path: '.env.example',
                description: 'Template de configuration',
                required_vars: [
                    'DISCORD_TOKEN',
                    'SUPPORT_CHANNEL_IDS'
                ],
                llm_vars: [
                    'GROQ_API_KEY (recommandé)',
                    'OPENROUTER_API_KEY',
                    'GEMINI_API_KEY_SUPPORT'
                ]
            }
        ],

        scripts: [
            {
                path: 'check-help-detection-setup.js',
                usage: 'node check-help-detection-setup.js',
                purpose: 'Vérifier la configuration',
                checks: [
                    'Fichiers créés',
                    'Variables d\'environnement',
                    'Fournisseurs LLM',
                    'Dépendances',
                    'Structure du projet'
                ]
            },
            {
                path: 'test-llm-connection.js',
                usage: 'node test-llm-connection.js',
                purpose: 'Tester la connexion LLM',
                tests: [
                    'Connexion aux providers',
                    'Validation des clés API',
                    'Réponse du LLM',
                    'Parsing JSON'
                ]
            }
        ],

        modified: [
            {
                path: 'main.js',
                changes: [
                    '+ Import helpDetectionHandler',
                    '+ Import LLMProviderPool',
                    '+ Initialisation llmProviderPool',
                    '+ Appel helpDetectionHandler()',
                    '+ Return llmProviderPool dans state'
                ]
            }
        ]
    },

    quick_links: {
        'Démarrer rapidement (5 min)': 'INSTALLATION_GUIDE.md',
        'Comprendre le système': 'HELP_DETECTION_README.md',
        'Configuration complète': 'docs/HELP_DETECTION_GUIDE.md',
        'Architecture technique': 'docs/HELP_DETECTION_TECHNICAL.md',
        'Cas d\'usage avancés': 'docs/ADVANCED_USE_CASES.md',
        'Résumé des changements': 'SYSTEM_SUMMARY.md'
    },

    providers: {
        groq: {
            name: 'Groq',
            url: 'https://console.groq.com/',
            key_prefix: 'gsk_',
            free_tier: 'Illimité',
            rate_limit: '13K tokens/sec',
            recommended: true,
            environment_var: 'GROQ_API_KEY'
        },
        openrouter: {
            name: 'OpenRouter',
            url: 'https://openrouter.ai/',
            key_prefix: 'sk-or-',
            free_tier: '~$3 crédit',
            rate_limit: 'Variables',
            recommended: false,
            environment_var: 'OPENROUTER_API_KEY'
        },
        gemini: {
            name: 'Gemini',
            url: 'https://ai.google.dev/',
            key_prefix: 'AIzaSy_',
            free_tier: '60 req/min',
            rate_limit: '60 req/min',
            recommended: false,
            environment_var: 'GEMINI_API_KEY_SUPPORT'
        }
    },

    keywords: {
        detection: {
            questions: ['comment', 'pourquoi', 'quoi', 'c\'est quoi', '?'],
            issues: ['bug', 'crash', 'error', 'problème', 'ne marche pas'],
            actions: ['jouer', 'launcher', 'installer', 'télécharger'],
            frustration: ['j\'arrive pas', 'help', 'aide', 'je comprends pas']
        }
    },

    stats: {
        lines_of_code: '2000+',
        files_created: 11,
        files_modified: 1,
        modules: 2,
        test_scripts: 2,
        guides: 5,
        regex_patterns: '25+',
        llm_providers: 3
    },

    requirements: {
        node_version: '18.0.0+',
        npm_packages: [
            'discord.js@^14.25.1',
            'dotenv@^17.3.1',
            '@google/generative-ai@^0.24.1',
            'colors@^1.4.0'
        ],
        no_new_packages: true,
        description: 'Aucune nouvelle dépendance requise - utilise les APIs natives'
    }
};

// ======= AFFICHAGE COLORÉ =======

function print_header() {
    console.log('\n' + '═'.repeat(70));
    console.log('  ' + SYSTEM_MAP.name);
    console.log('  Version: ' + SYSTEM_MAP.version);
    console.log('═'.repeat(70) + '\n');
}

function print_section(title) {
    console.log('\n' + '━'.repeat(70));
    console.log('  ' + title);
    console.log('━'.repeat(70));
}

function print_file(file, index) {
    console.log(`\n  [${index}] ${file.path}`);
    console.log(`      ${file.description || file.purpose}`);
    if (file.lines) console.log(`      📏 ${file.lines} lignes`);
    if (file.usage) console.log(`      ▶️  ${file.usage}`);
}

function print_link(name, path) {
    console.log(`  📄 ${name}`);
    console.log(`     → ${path}\n`);
}

// ======= AFFICHAGE PRINCIPAL =======

console.clear();
print_header();

// Core Files
print_section('📂 MODULES PRINCIPAUX (Core)');
SYSTEM_MAP.files.core.forEach((file, i) => {
    print_file(file, i + 1);
    console.log('      Exports: ' + file.exports.join(', '));
});

// Scripts
print_section('🧪 SCRIPTS DE VÉRIFICATION');
SYSTEM_MAP.files.scripts.forEach((file, i) => {
    print_file(file, i + 1);
});

// Documentation
print_section('📚 DOCUMENTATION GUIDE');
console.log('\n  Commencer par (les plus courts d\'abord):');
Object.entries(SYSTEM_MAP.quick_links).forEach(([name, path], i) => {
    console.log(`  ${i + 1}. ${name}`);
    console.log(`     → ${path}`);
});

// Providers
print_section('🔑 FOURNISSEURS LLM SUPPORTÉS');
Object.entries(SYSTEM_MAP.providers).forEach(([key, provider], i) => {
    console.log(`\n  [${i + 1}] ${provider.name}${provider.recommended ? ' ⭐ RECOMMANDÉ' : ''}`);
    console.log(`      Site: ${provider.url}`);
    console.log(`      Gratuit: ${provider.free_tier}`);
    console.log(`      Vitesse: ${provider.rate_limit}`);
    console.log(`      Variable: ${provider.environment_var}`);
});

// Mots-clés
print_section('🔍 MOTS-CLÉS DE DÉTECTION');
Object.entries(SYSTEM_MAP.keywords.detection).forEach(([category, keywords]) => {
    console.log(`\n  📌 ${category.toUpperCase()}`);
    console.log(`     ${keywords.join(', ')}`);
});

// Statistiques
print_section('📊 STATISTIQUES');
Object.entries(SYSTEM_MAP.stats).forEach(([key, value]) => {
    const label = key.replace(/_/g, ' ').toUpperCase();
    console.log(`  ${label}: ${value}`);
});

// Prochaines étapes
print_section('🚀 PROCHAINES ÉTAPES');
console.log(`
  1. Lire le guide d'installation:
     → INSTALLATION_GUIDE.md

  2. Vérifier la configuration:
     → node check-help-detection-setup.js

  3. Tester la connexion LLM:
     → node test-llm-connection.js

  4. Démarrer le bot:
     → node main.js

  5. Envoyer un message test:
     → "Comment lancer le jeu?"
`);

// FAQ rapide
print_section('❓ QUESTIONS RAPIDES');
console.log(`
  Q: Par où commencer?
  R: Lire INSTALLATION_GUIDE.md

  Q: Une clé API coûte cher?
  R: Non! Groq, OpenRouter et Gemini sont gratuits

  Q: Quels mots-clés sont détectés?
  R: "comment", "bug", "j'arrive pas", et 20+ autres

  Q: Ça interfère avec mon bot?
  R: Non, c'est un module indépendant

  Q: Je peux modifier les réponses?
  R: Oui, voir ADVANCED_USE_CASES.md

  Q: Est-ce en production ready?
  R: Oui! Tous les erreurs sont gérées.
`);

console.log('\n' + '═'.repeat(70));
console.log('  Bon courage! Pour toute question: consultez la documentation');
console.log('═'.repeat(70) + '\n');

module.exports = SYSTEM_MAP;
