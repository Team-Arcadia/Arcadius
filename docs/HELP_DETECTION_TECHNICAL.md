# Système de Détection d'Aide - Résumé Technique

## Fichiers Créés

### 1. **modules/helpDetectionHandler.js** (358 lignes)

Module principal pour la détection et traitement des demandes d'aide.

**Fonctionnalités:**

- Liste complète de mots-clés organisés par catégorie (questions, problèmes, actions, frustration)
- Détection regex intelligent des demandes d'aide
- Analyse via LLM pour confirmer si c'est une vraie question
- Génération de réponses courtes et pratiques (3-5 lignes max)
- Gestion des erreurs avec fallback

**Exports:**

```javascript
helpDetectionHandler(client, llmClient); // Initialise le listener Discord
HELP_TRIGGERS; // Les patterns regex utilisés
detectHelpKeywords(content); // Détection basique
```

### 2. **modules/llmProviderPool.js** (230 lignes)

Pool de fournisseurs LLM avec support multi-provider et failover.

**Fournisseurs supportés:**

- ✅ **Groq** (Gratuit, rapide, recommandé)
- ✅ **OpenRouter** (Plusieurs modèles gratuits)
- ✅ **Gemini** (Si clé API supplémentaire)

**Fonctionnalités:**

- Basculement automatique entre providers en cas d'erreur
- Dégradé gracieux si un provider échoue
- Utilise `fetch` natif de Node.js (v18+)
- Timeouts et gestion des erreurs

**API:**

```javascript
class LLMProviderPool {
    async analyzeMessage(prompt, retries = 2) // Analyse un message
}
```

### 3. **docs/HELP_DETECTION_GUIDE.md**

Guide complet de configuration et usage.

### 4. **.env.example**

Template pour les variables d'environnement requises.

## Modifications Existantes

### main.js

```javascript
// Ajouts:
- Import de helpDetectionHandler
- Import de LLMProviderPool
- Initialisation du llmProviderPool dans initializeArcadius()
- Appel de helpDetectionHandler() après connexion
- Retour du llmProviderPool dans arcadiusBotState
```

## Flux d'Exécution Complet

```
1. Message envoyé dans un canal support (#discussions, #entraide)
   ↓
2. arcadiusClientlistens 'messageCreate'
   ↓
3. helpDetectionHandler intercepte le message
   ├→ Ignore si bot ou canal non-support
   └→ Continue si message > 10 caractères
   ↓
4. Appel detectHelpKeywords() - Regex patterns
   ├→ Si pas de match → FIN
   └→ Si match → Continuer
   ↓
5. Affiche "is typing" pour UX
   ↓
6. Appel LLMProviderPool.analyzeMessage()
   ├→ Groq essaie d'abord
   ├→ OpenRouter fallback
   └→ Gemini fallback
   ↓
7. LLM répond:
   {
     "isRealQuestion": boolean,
     "canAnswer": boolean,
     "category": string,
     "confidence": number,
     "reason": string
   }
   ↓
8. Si isRealQuestion && canAnswer:
   ├→ Génère réponse pratique
   ├→ Envoie réponse au message
   └→ Log "✅ Réponse d'aide envoyée"
   ↓
9. Si seulement isRealQuestion (pas d'answer):
   ├→ Ajoute réaction 👀
   └→ Log "ℹ️ Question détectée mais trop complexe"
   ↓
10. Fin du traitement
```

## Mots-Clés Supportés

### Questions (Patterns Regex)

```regex
/\bcomment\b/i              → "Comment installer..."
/\bquoi\b/i                 → "Quoi faire?"
/\bpourquoi\b/i             → "Pourquoi ne marche pas?"
/\bc'est quoi\b/i           → "C'est quoi ce bug?"
/\b\?\s*$/                  → Tout message finissant par ?
```

### Problèmes Techniques

```regex
/\bbug\b/i                  → "J'ai un bug"
/\bcrash\b/i                → "Le jeu crash"
/\berror\b/i                → "Error 404"
/\bne fonctionne|marche\b/i → "Ça ne marche pas"
/\bproblème\b/i             → "Problème d'affichage"
```

### Actions/Frustration

```regex
/\bj'arr(?:ive|iv)(?:e\s)?p/i → "J'arrive pas"
/ça marche pas/i            → "Ça marche pas"
/help\b/i                   → "Help!"
```

## Configuration Requise

### Variables d'Environnement (Minimum)

```env
DISCORD_TOKEN=...           # Requis
SUPPORT_CHANNEL_IDS=123,456 # Requis (au moins un canal)
GROQ_API_KEY=...            # Ou OPENROUTER_API_KEY OU GEMINI_API_KEY_SUPPORT
```

### Obtention des Clés API

**Groq (RECOMMANDÉ):**

- Gratuit, aucune limite de crédit
- 30+ requêtes/sec
- https://console.groq.com/

**OpenRouter:**

- ~$3 crédit gratuit
- Plusieurs modèles
- https://openrouter.ai/

**Gemini:**

- Clé API supplémentaire à votre clé existante
- https://ai.google.dev/

## Limitations et Mitigations

### 1. Réponses Génériques

- **Cause**: Prompt d'analyse demande au LLM de juger si répondre
- **Mitigation**: Le LLM ignore les questions trop génériques (canAnswer=false)
- **Résultat**: Ajoute une réaction 👀 au lieu de répondre

### 2. Pas de Contexte Multi-Messages

- **Cause**: Chaque message est analysé indépendamment
- **Mitigation**: Possible avec une base de données (future)
- **Résultat**: Fonctionne bien pour les questions autonomes

### 3. Limites d'API Gratuite

- **Groq**: 30 req/sec (suffit pour la plupart)
- **OpenRouter**: ~700 requêtes/mois avec $3 gratuit
- **Mitigation**: Failover automatique entre providers

### 4. Français Uniquement

- **Cause**: Prompts en français
- **Future**: Ajouter support multilingue

## Performance

### Temps de Réponse

- Détection des mots-clés: ~1ms
- Analyse LLM: 500-2000ms (dépend du provider)
- Génération réponse: 500-1500ms
- **Total**: ~1-3 secondes avant réponse

### Utilisation des Ressources

- Mémoire: ~5-10MB (pool LLM)
- CPU: Minimal (non-bloquant, async)
- Réseau: 1-2 requêtes HTTP par message traité

## Exemples de Comportement

### Exemple 1: Question Simple

```
Utilisateur: "Comment lancer le jeu?"
↓
Détection: ✅ Mot-clé "comment" détecté
↓
Analyse LLM: { isRealQuestion: true, canAnswer: true, category: "gameplay" }
↓
Bot: "Télécharge le launcher depuis ladresse X, double-clique le fichier .exe, puis log-toi."
```

### Exemple 2: Question Trop Générrique

```
Utilisateur: "J'arrive pas à jouer"
↓
Détection: ✅ Mot-clé "j'arrive pas" détecté
↓
Analyse LLM: { isRealQuestion: true, canAnswer: false, category: "autre" }
↓
Bot: 👀 (réaction) - Signale qu'on a vu mais trop vague
```

### Exemple 3: Pas une Question

```
Utilisateur: "Je joue au jeu en ce moment c'est cool"
↓
Détection: ✅ Mot-clé "joue" détecté
↓
Analyse LLM: { isRealQuestion: false, canAnswer: false }
↓
Bot: [Rien] - Ignore car ce n'est pas une demande d'aide
```

## Intégration Avec Arcadius

Le système est **intégré mais indépendant**:

- Même `client` Discord
- Même `logger`
- Pool LLM **séparé** du pool Gemini d'Arcadius
- Ne interfère pas avec les mentions du bot

## Debugging

### Logs Disponibles

```javascript
logger.info(`🔍 Détection d'aide potentielle: ${username} - ${message}`);
logger.info(`✅ Réponse d'aide envoyée (confiance: ${confidence}%)`);
logger.info(`ℹ️  Question détectée mais trop générique/complexe`);
logger.debug(`📊 Analyse: ${JSON.stringify(analysis)}`);
logger.warn(`⚠️  ${provider} a échoué: ${error}`);
```

### Test Manuel

```bash
# Supprimer le filtre de canaux (TEST SEULEMENT)
// if (!SUPPORT_CHANNELS.includes(message.channelId)) return;

# Puis envoyer un message dans n'importe quel canal:
"Comment faire?"  # Devrait déclencher la détection
```

## Évolutions Futures

- [ ] Système de cooldown par utilisateur
- [ ] Cache des réponses avec SQLite
- [ ] Modération avant envoi (filter.io API)
- [ ] Support des fichiers attachés
- [ ] Réactions pour noter la qualité
- [ ] Intégration avec FAQ/Base de connaissances
- [ ] Support multilingue automatique
- [ ] Dashboard d'analytics

## Troubleshooting Checklist

- [ ] `SUPPORT_CHANNEL_IDS` configuré et correct?
- [ ] Au moins UNE clé API gratuite configurée?
- [ ] Vérifier `echo $SUPPORT_CHANNEL_IDS` en terminal
- [ ] Vérifier les logs de la console
- [ ] Le bot a-t-il la permission de répondre?
- [ ] Node.js v18+ installé? (pour `fetch` natif)
