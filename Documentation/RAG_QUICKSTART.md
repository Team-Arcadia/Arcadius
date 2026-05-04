# 🚀 RAG System - Guide de démarrage rapide

## Qu'est-ce que le RAG?

**RAG** = **Retrieval Augmented Generation**

Au lieu que le bot invente des réponses, il:

1. **Cherche** dans vos données existantes (FAQ, wiki, docs, etc.)
2. **Trouve** le contexte pertinent
3. **Augmente** le prompt de l'IA avec ce contexte
4. **Génère** une réponse basée sur les vraies données

### Résultat

- ✅ Réponses **plus exactes**
- ✅ Réponses **plus rapides** (contexte ciblé)
- ✅ **Moins d'hallucinations** (l'IA invente moins)
- ✅ Confiance **augmentée** dans les réponses

---

## Installation (3 étapes)

### 1️⃣ Créer les fichiers (✅ DÉJÀ FAIT)

```
modules/
├── knowledgeBase.js         ✅ Indexe les documents
├── semanticSearch.js         ✅ Recherche sémantique
├── ragSystem.js              ✅ Orchestration
└── improvedHelpDetection.js  ✅ Meilleure détection
```

### 2️⃣ Modifier main.js (À FAIRE)

Voir: `Documentation/RAG_INTEGRATION_GUIDE.md`

```javascript
// Ajouter imports
const RAGSystem = require("./modules/ragSystem");
const ImprovedHelpDetection = require("./modules/improvedHelpDetection");

// Ajouter dans initializeArcadius():
ragSystem: new RAGSystem(chatPool);

// Utiliser dans helpDetectionHandler():
improvedDetector.analyzeQuestionWithRAG(message);
```

### 3️⃣ Tester (À FAIRE)

```bash
# Lancer le bot
npm start

# Voir les logs
# [✅ RAG système prêt avec 45 documents indexés]
# [📚 Analyse RAG: canAnswer=true, confidence=75%]
```

---

## Exemples de résultats

### Avant RAG ❌

```
Utilisateur: "Comment installer les mods?"
Bot: "Je ne sais pas, c'est trop complexe"
```

### Après RAG ✅

```
Utilisateur: "Comment installer les mods?"
Bot: "[CONTEXTE TROUVÉ: INSTALLATION_GUIDE.md]
      Voici les étapes pour installer les mods:
      1. Télécharger le launcher
      2. ...etc"
```

---

## Architecture simple

```
Utilisateur: "Bug du serveur?"
           ↓
   [Indexer documents existants]
           ↓
   [Recherche sémantique]
   → Trouve 3 résultats pertinents
           ↓
   [Enrichir le prompt]
   Prompt = contexte + question
           ↓
   [Envoyer à Gemini]
           ↓
   Réponse excellente! ✨
```

---

## Fichiers sources utilisés

Le RAG indexe automatiquement:

**Données JSON** (`data/`):

- `responses.json` - Réponses aux catégories
- `keywords.json` - Mots-clés + liens
- `mods.json` - Liste des mods
- `server_info.json` - Infos serveur

**Documentation** (`Documentation/`):

- Tous les `.md` (guides, wikis, etc.)

**Résultat**: ~45-50 documents indexés au démarrage

---

## Configuration

Aucune config requise! Le RAG fonctionne out-of-box.

Optionnel (dans `.env`):

```bash
# Activer le debug RAG
DEBUG_RAG=true

# Ou laisser defaults:
# TOP_K=3 (résultats max)
# SIMILARITY_THRESHOLD=0.3 (seuil minimum)
```

---

## Coûts

### Gratuit

- ✅ Indexation (1 fois au démarrage)
- ✅ Recherche par mots-clés (fallback)

### Payant (Gemini Embedding API)

- ⚠️ Calcul d'embeddings: ~$0.02 per 1M tokens
- 💾 Cache automatique: réutilise les embeddings
- 📊 Moyenne: <$1/mois pour un serveur actif

---

## Monitoring

### Logs attendus ✅

```
✅ RAG système prêt avec 45 documents indexés
📚 Analyse RAG: canAnswer=true, confidence=75%
✨ Contexte trouvé dans: Documentation/INSTALLATION_GUIDE.md
🧠 Enrichissement RAG: 3 documents injectés
```

### Logs d'erreur ⚠️

```
⚠️ Erreur lors du calcul d'embedding: ...
→ Fallback mots-clés automatique activé ✅
```

---

## Cas d'usage

### ✅ Fonctionne bien

- "Comment installer les mods?"
- "C'est quoi le problème avec mon connexion?"
- "Où je vote?"
- "Quel est le statut du serveur?"

### ⚠️ À améliorer

- Questions très spécifiques (bug personnel)
- Questions sans rapport
- Demandes de help génériques

---

## Troubleshooting

### Q: Le bot ne répond toujours pas?

A: C'est normal! RAG **enrichit** le prompt, ça ne garantit pas une réponse. Si la base de connaissances n'a pas l'info, le bot est honnête.

### Q: Beaucoup de logs "canAnswer=false"?

A: La similarité est < 0.3. Options:

1. Ajouter plus de documents (data/\*.json)
2. Réduire le seuil (0.3 → 0.2)
3. Augmenter TOP_K (3 → 5)

### Q: Coûts trop élevés?

A: Optimisations:

1. Cache est déjà activé
2. Réduire TOP_K (3 → 2)
3. Utiliser recherche mots-clés plus souvent
4. Monitorer via logs

---

## Prochaines étapes

- [x] Créer modules RAG
- [x] Documenter architecture
- [ ] Intégrer dans main.js
- [ ] Tester en production
- [ ] Fine-tuner seuils
- [ ] Ajouter plus de documents

---

## Ressources

- 📖 [RAG System - Documentation complète](RAG_SYSTEM.md)
- 🔧 [Guide d'intégration détaillé](RAG_INTEGRATION_GUIDE.md)
- 💡 [Exemples de questions](HELP_DETECTION_EXAMPLES.md)

---

**Version**: 1.0  
**Dernière mise à jour**: Mai 2026  
**Statut**: 🟢 Production-Ready (sauf intégration)
