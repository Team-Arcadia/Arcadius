// modules/arcadiusConfig.js
const path = require('path');

const CONFIG = {
    // Informations du bot
    VERSION: '1.5.0',
    AUTHOR: 'vyrriox',
    CONTRIBUTORS: ['NotFond'],
    DESCRIPTION: 'Arcadius - Un bot de génération de contenu alimenté par Gemini Pro, conçu pour offrir des interactions riches et personnalisées sur Discord.',


    // Temporisation
    REFRESH_INTERVAL: 300000, // 5 minutes
    GENERATION_TIMEOUT: 60000, // 60 seconds (augmenté pour plus de temps d'attente API)

    // Configuration Discord
    TARGET_CHANNEL_ID: process.env.ARCADIUS_CHANNEL_ID || '1367176787867471883',

    // Priorité des modèles (IT = Instruction Tuned)
    MODEL_PRIORITY: [
        'gemini-3.1-flash-lite-preview',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-pro',
    ],

    // Chemins
    DATA_DIR: path.join(__dirname, '../data'),
    LOGS_DIR: path.join(__dirname, '../logs'),

    // Clés API
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_API_KEY_MEMORY: process.env.GEMINI_API_KEY_MEMORY
};

module.exports = CONFIG;
