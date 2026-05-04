// modules/knowledgeBase.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class KnowledgeBase {
    constructor() {
        this.documents = [];
        this.isInitialized = false;
    }

    /**
     * Indexe les documents depuis les fichiers JSON et Markdown
     */
    async initialize() {
        try {
            const dataDir = path.join(__dirname, '../data');
            const docDir = path.join(__dirname, '../Documentation');

            // Charger les données JSON (FAQ, réponses, etc.)
            this.loadJSONDocuments(dataDir);

            // Charger les documents Markdown
            this.loadMarkdownDocuments(docDir);

            logger.info(`✅ Base de connaissances initialisée avec ${this.documents.length} documents`);
            this.isInitialized = true;
        } catch (err) {
            logger.error(`❌ Erreur lors de l'initialisation de la base: ${err.message}`);
        }
    }

    /**
     * Charge les données depuis les fichiers JSON
     */
    loadJSONDocuments(dataDir) {
        const filesToLoad = [
            { file: 'responses.json', category: 'Réponses' },
            { file: 'keywords.json', category: 'Mots-clés' },
            { file: 'links.json', category: 'Liens' },
            { file: 'mods.json', category: 'Mods' },
            { file: 'server_info.json', category: 'Serveur' },
            { file: 'prompt_config.json', category: 'Configuration' }
        ];

        filesToLoad.forEach(({ file, category }) => {
            try {
                const filePath = path.join(dataDir, file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const data = JSON.parse(content);

                    // Créer des documents chunks
                    this.createChunksFromJSON(data, file, category);
                }
            } catch (err) {
                logger.warn(`⚠️ Impossible de charger ${file}: ${err.message}`);
            }
        });
    }

    /**
     * Charge les documents Markdown
     */
    loadMarkdownDocuments(docDir) {
        try {
            if (!fs.existsSync(docDir)) return;

            const files = fs.readdirSync(docDir).filter(f => f.endsWith('.md'));

            files.forEach(file => {
                try {
                    const filePath = path.join(docDir, file);
                    const content = fs.readFileSync(filePath, 'utf-8');

                    // Diviser en sections par titre (###, ##, #)
                    this.createChunksFromMarkdown(content, file);
                } catch (err) {
                    logger.warn(`⚠️ Impossible de charger ${file}: ${err.message}`);
                }
            });
        } catch (err) {
            logger.warn(`⚠️ Erreur lors du chargement des docs: ${err.message}`);
        }
    }

    /**
     * Crée des chunks sémantiquement cohérents depuis un Markdown
     */
    createChunksFromMarkdown(content, filename) {
        // Diviser par sections principales (##)
        const sections = content.split(/\n## /);

        sections.forEach((section, idx) => {
            if (section.trim().length < 50) return; // Ignorer les sections trop courtes

            // Récupérer le titre
            let title = filename;
            let text = section;

            if (idx > 0) {
                title = `${filename} - ${section.split('\n')[0]}`;
                text = section.substring(section.indexOf('\n') + 1);
            }

            this.documents.push({
                id: `md_${filename}_${idx}`,
                title,
                content: text.trim(),
                source: `Documentation/${filename}`,
                type: 'markdown',
                length: text.length
            });
        });
    }

    /**
     * Crée des chunks depuis les données JSON
     */
    createChunksFromJSON(data, filename, category) {
        // Stratégie différente selon le type de fichier
        if (filename === 'responses.json') {
            Object.entries(data).forEach(([key, value]) => {
                if (value.templates && Array.isArray(value.templates)) {
                    const templates = value.templates.join('\n');
                    this.documents.push({
                        id: `json_${key}`,
                        title: `Réponse pour: ${key}`,
                        content: templates,
                        source: `data/${filename}`,
                        type: 'response',
                        category: key,
                        length: templates.length
                    });
                }
            });
        } else if (filename === 'keywords.json' && data.keywords) {
            // Grouper les keywords par thème
            const grouped = {};
            data.keywords.forEach(kw => {
                if (kw.word) {
                    const key = kw.word[0];
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(kw.response);
                }
            });

            Object.entries(grouped).forEach(([word, responses]) => {
                this.documents.push({
                    id: `kw_${word}`,
                    title: `Mot-clé: ${word}`,
                    content: responses.join('\n'),
                    source: `data/${filename}`,
                    type: 'keyword',
                    keywords: [word],
                    length: responses.join('\n').length
                });
            });
        } else if (filename === 'mods.json') {
            // Créer des chunks par mod ou catégorie
            JSON.stringify(data).split('","').slice(0, 10).forEach((chunk, idx) => {
                this.documents.push({
                    id: `mods_${idx}`,
                    title: 'Informations Mods',
                    content: chunk.substring(0, 500),
                    source: `data/${filename}`,
                    type: 'mods',
                    length: chunk.length
                });
            });
        } else if (filename === 'server_info.json') {
            // Créer un chunk avec les infos serveur
            const serverInfo = JSON.stringify(data, null, 2);
            this.documents.push({
                id: 'server_info',
                title: 'Informations Serveur',
                content: serverInfo,
                source: `data/${filename}`,
                type: 'server',
                length: serverInfo.length
            });
        }
    }

    /**
     * Recherche simple par mots-clés (fallback si embeddings pas disponibles)
     */
    searchByKeywords(query) {
        const queryWords = query.toLowerCase().split(/\s+/);
        const scored = this.documents.map(doc => {
            const docText = `${doc.title} ${doc.content}`.toLowerCase();
            const score = queryWords.filter(word => docText.includes(word)).length;
            return { ...doc, score };
        });

        return scored
            .filter(doc => doc.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }

    /**
     * Obtient la base complète (pour debug/export)
     */
    getAllDocuments() {
        return this.documents;
    }

    /**
     * Obtient les stats de la base
     */
    getStats() {
        return {
            totalDocuments: this.documents.length,
            byType: {
                markdown: this.documents.filter(d => d.type === 'markdown').length,
                response: this.documents.filter(d => d.type === 'response').length,
                keyword: this.documents.filter(d => d.type === 'keyword').length,
                mods: this.documents.filter(d => d.type === 'mods').length,
                server: this.documents.filter(d => d.type === 'server').length
            }
        };
    }
}

module.exports = new KnowledgeBase();
