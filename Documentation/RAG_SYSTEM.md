# 🧠 Système RAG (Retrieval Augmented Generation)

## Vue d'ensemble

Le système RAG améliore la capacité du bot Arcadius à répondre aux questions en créant une base de connaissances searchable à partir de vos données existantes.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Message utilisateur                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         KnowledgeBase (indexe documents)                    │
│  • data/*.json (FAQ, réponses, mods, etc.)                  │
│  • Documentation/*.md (guides, wikis)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│     SemanticSearch (recherche avec embeddings)              │
│  • Calcule similarité cosinus                               │
│  • Caching intelligent                                      │
│  • Fallback mots-clés                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         RAGSystem (orchestration)                           │
│  • Enrichissement du prompt                                 │
│  • Analyse de répondabilité                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│    Réponse améliorée avec contexte pertinent                │
└─────────────────────────────────────────────────────────────┘
```

## Modules créés

### 1. **knowledgeBase.js**

Indexe tous les documents disponibles:

- `responses.json` → Réponses thématisées
- `keywords.json` → Mots-clés avec liens
- `mods.json` → Informations mods
- `server_info.json` → Infos serveur
- `Documentation/*.md` → Guides et wikis

**Utilisation**:

```javascript
const kb = require("./knowledgeBase");
await kb.initialize();
const stats = kb.getStats(); // { totalDocuments: 45, ... }
const docs = kb.getAllDocuments();
const keywords = kb.searchByKeywords("bug crash");
```

### 2. **semanticSearch.js**

Recherche sémantique avec embeddings Gemini:

- Calcul d'embeddings via API Gemini
- Similarité cosinus entre vecteurs
- Cache intelligent (100 max)
- Fallback mots-clés automatique

**Utilisation**:

```javascript
const SemanticSearch = require("./semanticSearch");
const search = new SemanticSearch(geminiPool);

const results = await search.search("comment installer les mods", 3);
// [{ id, title, content, source, similarity }, ...]

const context = await search.searchAndFormat("problème connexion", 3);
// Formatted string prêt à injecter dans un prompt
```

### 3. **ragSystem.js**

Orchestration du système RAG:

- Initialisation asynchrone
- Enrichissement de prompts
- Analyse de répondabilité

**Utilisation**:

```javascript
const RAGSystem = require("./ragSystem");
const rag = new RAGSystem(geminiPool);
await rag.initialize();

// Enrichir un prompt
const enrichedPrompt = await rag.enrichPrompt(message, originalPrompt);

// Vérifier si on peut répondre
const canAnswer = await rag.canAnswerQuestion("J'ai un bug");
// { canAnswer: true, confidence: 75, source: 'data/responses.json', ... }
```

### 4. **improvedHelpDetection.js**

Détection d'aide améliorée combinant LLM + RAG:

- Analyse RAG en priorité
- Enrichissement LLM avec contexte
- Confiance augmentée si RAG trouve quelque chose

**Utilisation**:

```javascript
const ImprovedHelpDetection = require("./improvedHelpDetection");
const detector = new ImprovedHelpDetection(llmClient, ragSystem);

const analysis = await detector.analyzeQuestionWithRAG(message);
// {
//   isRealQuestion: true,
//   canAnswer: true,
//   confidence: 85,
//   reason: 'Réponse trouvée dans la base',
//   ragEnhanced: true
// }

// Obtenir le contexte RAG pour enrichir la réponse
const ragContext = await detector.getRAGContextForResponse(message);
```

## Intégration dans le bot existant

### Étape 1: Initialiser RAG au démarrage

Fichier: `arcadiusReadyHandler.js` ✅ (déjà modifié)

```javascript
if (botState.ragSystem) {
  await botState.ragSystem.initialize();
  const ragStats = botState.ragSystem.getStats();
  logger.info(`✅ RAG système prêt avec ${ragStats.knowledgeBase.totalDocuments} documents`);
}
```

### Étape 2: Utiliser RAG dans helpDetectionHandler

À faire dans `helpDetectionHandler.js`:

```javascript
// Importer le module
const ImprovedHelpDetection = require("./improvedHelpDetection");

// Dans la fonction d'initialisation du handler
const improvedDetector = new ImprovedHelpDetection(llmClient, botState.ragSystem);

// Puis remplacer la détection simple par:
const analysis = await improvedDetector.analyzeQuestionWithRAG(message, category);
```

### Étape 3: Enrichir les prompts avec RAG

À faire dans `promptBuilder.js` ✅ (déjà modifié pour accepter `ragContext`)

```javascript
const ragContext = await ragSystem.semanticSearch.searchAndFormat(message.content, 3);
const fullPrompt = buildFullPrompt(message, context, dataManager, replyCtx, ragContext);
```

## Exemple de flux complet

```
Utilisateur: "Comment installer les mods?"
       │
       ▼
    ┌─── Indexation
    │    └─ Knowledge Base trouve 15 documents sur "installation mods"
    │
    ▼
    ├─ SemanticSearch retourne top 3 results pertinents
    │  ├─ [1] HELP_DETECTION_README.md (similarity: 0.92)
    │  ├─ [2] responses.json - launcher category (similarity: 0.85)
    │  └─ [3] INSTALLATION_GUIDE.md (similarity: 0.78)
    │
    ▼
    └─ Prompt enrichi envoyé à Gemini:
       {CONTEXTE: Documentation installer}
       {MESSAGE: "Comment installer les mods?"}

       ▼
       Réponse: "Voici les étapes..."
```

## Performances et optimisations

### Caching

- **Embeddings**: Cache LRU (100 max) pour éviter recalculs
- **Knowledge Base**: Chargée une seule fois au démarrage
- **Recherche**: Fallback automatique si embeddings indisponibles

### Limitations actuelles

- ⚠️ API Gemini Embedding n'est pas gratuite (env. $0.02 per 1M tokens)
- 🐌 Première recherche peut être lente (calcul embedding)
- 📊 Max 3 documents injectés par défaut (tuner selon besoin)

### Recommandations

1. **Cache les embeddings** fréquents (déjà fait)
2. **Limitez topK à 3** sauf cas exceptionnels
3. **Monitorer les coûts** Gemini
4. **Vérifier les résultats** RAG via logs

## Configuration

Fichier: `arcadiusConfig.js` (ajouter si besoin):

```javascript
RAG_CONFIG = {
  ENABLED: true,
  TOP_K: 3,
  SIMILARITY_THRESHOLD: 0.3,
  CACHE_SIZE: 100,
  REFRESH_INTERVAL: 3600000, // 1h
};
```

## Monitoring

### Logs disponibles

```bash
✅ RAG système prêt avec 45 documents indexés
📚 Analyse RAG: canAnswer=true, confidence=75%
👀 Recherche sémantique: 3 résultats trouvés
🧠 Enrichissement RAG: contexte injecté
```

### Stats du système

```javascript
const stats = ragSystem.getStats();
// {
//   ragReady: true,
//   knowledgeBase: { totalDocuments: 45, byType: {...} },
//   cache: { cacheSize: 12, maxCacheSize: 100 }
// }
```

## Troubleshooting

### RAG ne répond pas

```bash
❌ "Système RAG initialisé mais non prêt"
→ Vérifier que la KB s'est bien chargée
→ Vérifier les fichiers data/*.json et Documentation/*.md
```

### Embeddings échouent

```bash
⚠️  "Erreur lors du calcul d'embedding"
→ Fallback mots-clés automatique activé
→ Vérifier clé API Gemini
```

### Résultats non pertinents

```bash
📚 "Analyse RAG: canAnswer=false, confidence=20%"
→ Augmenter TOP_K (de 3 à 5)
→ Réduire SIMILARITY_THRESHOLD (de 0.3 à 0.2)
→ Vérifier la qualité des documents indexés
```

## Prochaines étapes

- [ ] Fine-tuner les seuils de confiance
- [ ] Ajouter plus de documents à la KB
- [ ] Implémenter re-ranking LLM
- [ ] Ajouter cache persistant (Redis)
- [ ] Monitorer coûts API Gemini
- [ ] UI dashboard pour stats RAG

---

**Créé**: Mai 2026
**Version**: 1.0
**Responsable**: Système d'IA Arcadius
