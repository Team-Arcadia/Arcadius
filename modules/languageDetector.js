// modules/languageDetector.js

/**
 * Detects the language of a given text (French or English)
 * Uses word frequency and patterns analysis
 */

// Common French words and patterns
const FRENCH_WORDS = {
    le: 1, la: 1, les: 1, de: 1, du: 1, des: 1, et: 1, ou: 1, mais: 1,
    un: 1, une: 1, des: 1, mon: 1, ma: 1, mes: 1, ton: 1, ta: 1, tes: 1,
    son: 1, sa: 1, ses: 1, notre: 1, nos: 1, votre: 1, vos: 1, leur: 1, leurs: 1,
    je: 1, tu: 1, il: 1, elle: 1, nous: 1, vous: 1, ils: 1, elles: 1,
    suis: 1, es: 1, est: 1, sommes: 1, êtes: 1, sont: 1,
    ai: 1, as: 1, avons: 1, avez: 1, ont: 1,
    vais: 1, vas: 1, va: 1, allons: 1, allez: 1, vont: 1,
    pour: 1, par: 1, avec: 1, sans: 1, sur: 1, sous: 1, dans: 1, entre: 1,
    qui: 1, que: 1, quel: 1, quelle: 1, où: 1, comment: 1, pourquoi: 1, quand: 1,
    bonjour: 1, salut: 1, allo: 1, oui: 1, non: 1, merci: 1,
    comment: 1, ça: 1, ç: 1, à: 1,
    bien: 1, mal: 1, bon: 1, mauvais: 1, aller: 1, venir: 1, faire: 1, dire: 1,
    avoir: 1, être: 1, pouvoir: 1, vouloir: 1, devoir: 1, savoir: 1
};

// Common English words and patterns
const ENGLISH_WORDS = {
    the: 1, a: 1, an: 1, and: 1, or: 1, but: 1, not: 1, no: 1,
    my: 1, your: 1, his: 1, her: 1, its: 1, our: 1, their: 1,
    i: 1, you: 1, he: 1, she: 1, it: 1, we: 1, they: 1,
    am: 1, is: 1, are: 1, was: 1, were: 1, been: 1, being: 1,
    have: 1, has: 1, had: 1,
    do: 1, does: 1, did: 1,
    will: 1, would: 1, could: 1, should: 1, may: 1, might: 1, must: 1, can: 1,
    for: 1, in: 1, on: 1, at: 1, to: 1, from: 1, by: 1, with: 1, about: 1,
    what: 1, which: 1, who: 1, whom: 1, when: 1, where: 1, why: 1, how: 1,
    hello: 1, hi: 1, hey: 1, yes: 1, ok: 1, okay: 1, thanks: 1, please: 1,
    good: 1, bad: 1, nice: 1, great: 1, awesome: 1, cool: 1, help: 1,
    want: 1, need: 1, like: 1, know: 1, think: 1, get: 1, go: 1, come: 1, make: 1,
    don: 1, doesn: 1, dont: 1, can: 1, cant: 1, won: 1, won: 1, isn: 1, isn: 1,
    im: 1, hes: 1, shes: 1, its: 1, were: 1, were: 1
};

// French accents and special patterns
const FRENCH_PATTERNS = [
    /\bç\b/,           // cedilla
    /\bqu[a-z]{2,}/,   // Common French words starting with "qu" (at least 3 chars total)
    /[aeiou]u[a-z]{1,}/, // French "ou" patterns (not end of word like "you")
    /\ble\s/,          // Article "le" with space
    /\bla\s/,          // Article "la" with space
    /\bde\s/,          // Preposition "de" with space
    /\bdu\s/,          // Article "du" with space
    /\bl'[a-z]/,       // "l'" prefix
    /\bd'[a-z]/,       // "d'" prefix
    /\bqu'[a-z]/,      // "qu'" prefix
    /[àâäéèêëïîôöùûüœæ]/,  // French accented characters (ONLY accents, no plain vowels)
];

// English patterns
const ENGLISH_PATTERNS = [
    /\bth[e|a|i|at|is|ey]/,  // Common "th" words
    /\b[a-z]ing\b/,          // "-ing" ending
    /\b[a-z]ed\b/,           // "-ed" ending (past tense)
    /\b[a-z]ly\b/,           // "-ly" adverbs
    /[a-z]'[a-z]/,           // Contractions: don't, can't, I'm, you're, etc.
    /\bis\b/i,               // "is" verb
    /\bare\b/i,              // "are" verb
    /\bhow\b/i,              // "how" question word
];

/**
 * Detects language from text content
 * @param {string} text - The text to analyze
 * @returns {string} - 'fr' for French, 'en' for English, 'unknown' if inconclusive
 */
function detectLanguage(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return 'unknown';
    }

    const normalized = text.toLowerCase().trim();
    const words = normalized.split(/\s+/).filter(word => word.length > 0);

    // Count language indicators
    let frenchScore = 0;
    let englishScore = 0;

    // Score based on common words
    words.forEach(word => {
        // Remove punctuation for comparison
        const cleanWord = word.replace(/[^\w]/g, '');

        if (FRENCH_WORDS[cleanWord]) {
            frenchScore += 2;
        } else if (ENGLISH_WORDS[cleanWord]) {
            englishScore += 2;
        }
    });

    // Score based on patterns
    FRENCH_PATTERNS.forEach(pattern => {
        const matches = normalized.match(pattern);
        if (matches) {
            frenchScore += matches.length * 1.5;
        }
    });

    ENGLISH_PATTERNS.forEach(pattern => {
        const matches = normalized.match(pattern);
        if (matches) {
            englishScore += matches.length * 1.5;
        }
    });

    // French accent characters are strong indicators
    if (/[àâäéèêëïîôöùûüœæçÀÂÄÉÈÊËÏÎÔÖÙÛÜŒÆÇ]/.test(normalized)) {
        frenchScore += 10;
    }

    // Determine language based on scores
    const threshold = 2; // Minimum score difference to make a determination (lowered for better sensitivity)

    if (frenchScore > englishScore + threshold) {
        return 'fr';
    } else if (englishScore > frenchScore + threshold) {
        return 'en';
    }

    // If no clear winner, return 'unknown' (will default to French for safety)
    return 'unknown';
}

/**
 * Gets the language instruction for the bot prompt
 * @param {string} detectedLanguage - The detected language ('fr', 'en', or 'unknown')
 * @returns {string} - The language instruction for the prompt
 */
function getLanguageInstruction(detectedLanguage) {
    if (detectedLanguage === 'en') {
        return 'You MUST respond in English, using the same language as the user.';
    } else if (detectedLanguage === 'fr') {
        return 'Tu DOIS répondre en français, en utilisant la même langue que l\'utilisateur.';
    } else {
        // Default to French if unable to detect
        return 'Tu DOIS répondre en français, en utilisant la même langue que l\'utilisateur.';
    }
}

/**
 * Gets the format instruction based on language
 * @param {string} detectedLanguage - The detected language ('fr', 'en', or 'unknown')
 * @returns {array} - Format instructions appropriate for the detected language
 */
function getFormatInstructions(detectedLanguage) {
    const language = detectedLanguage === 'en' ? 'en' : 'fr';

    if (language === 'en') {
        return [
            "- English only.",
            "- Concise.",
            "- Raw links (https://...) only.",
            "- NEVER make up a link. Use ONLY the links provided in the context."
        ];
    } else {
        return [
            "- Français uniquement.",
            "- Concis.",
            "- Liens en BRUT (https://...) uniquement.",
            "- NE JAMAIS inventer de lien. Utiliser UNIQUEMENT les liens fournis dans le contexte."
        ];
    }
}

module.exports = {
    detectLanguage,
    getLanguageInstruction,
    getFormatInstructions
};
