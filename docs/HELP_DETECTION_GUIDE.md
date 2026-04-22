# Système de Détection d'Aide Automatique - Guide de Configuration

## Vue d'ensemble

Le système de détection d'aide automatique surveille les canaux Discord spécifiés (ex: #discussions, #entraide) et utilise l'IA pour :

1. **Détecter** les demandes d'aide via une liste de mots-clés intelligents
2. **Analyser** si c'est une vraie question que le bot peut répondre
3. **Répondre automatiquement** avec des solutions pratiques et courtes

## Fonctionnement

```
Message Discord
    ↓
[Détection de mots-clés] (comment, bug, j'arrive pas, etc.)
    ↓
[Si match] → Envoi au LLM pour analyse
    ↓
[Analyse LLM] : "Is this a real question?" + "Can I answer it well?"
    ↓
[Si oui] → Génération de réponse courte et pratique
    ↓
[Répondre] au message Discord ou signaler avec 👀
```

## Configuration Requise

### 1. Variables d'Environnement (.env)

```env
# Token Discord (requis)
DISCORD_TOKEN=votre_token_discord
# ou
TOKEN=votre_token_discord

# Canaux de support (IDs Discord, séparés par des virgules)
SUPPORT_CHANNEL_IDS=123456789,987654321

# LLM Providers (au moins UN est requis)

# Option 1: Groq API (RECOMMANDÉ - Gratuit et rapide)
GROQ_API_KEY=votre_cle_groq

# Option 2: OpenRouter API (Gratuit avec certains modèles)
OPENROUTER_API_KEY=votre_cle_openrouter

# Option 3: Gemini (Si vous avez une clé API supplémentaire)
GEMINI_API_KEY_SUPPORT=votre_cle_gemini_support

# Autres configurations optionnelles
OPENROUTER_REFERER=https://github.com
```

## Comment Obtenir les Clés API Gratuites

### Groq API (RECOMMANDÉ)

1. Aller sur https://console.groq.com/
2. S'inscrire gratuitement
3. Créer une clé API
4. Ajouter à `.env` : `GROQ_API_KEY=gsk_xxx`

- **Limites gratuites** : Très généreuses (30+ requêtes/sec)
- **Modèles** : Mixtral 8x7B, Llama 2 70B

### OpenRouter

1. Aller sur https://openrouter.ai/
2. S'inscrire
3. Créer une clé API
4. Ajouter à `.env` : `OPENROUTER_API_KEY=sk-or-xxx`

- **Limites gratuites** : ~$3 de crédits
- **Modèles** : Plusieurs options gratuites

### Trouver les IDs des Canaux Discord

**Méthode 1 : Via Discord**

1. Activer le "Mode Développeur" : Utilisateur → Paramètres → Avancés → Mode Développeur
2. Clic-droit sur le canal → Copier l'ID du canal

**Méthode 2 : Via URL**

```
discord.com/channels/GUILD_ID/CHANNEL_ID
                             ↑ C'est l'ID du canal
```

## Mots-Clés Détectés

Le système détecte automatiquement :

### Questions

- Phrases commençant par "comment"
- Toutesquestions (finissant par `?`)
- "c'est quoi ?", "pourquoi", "quoi"

### Problèmes Techniques

- "bug", "crash", "error"
- "ne fonctionne pas", "ne marche pas"
- "problème", "glitch", "lag"

### Actions

- "jouer", "launcher"
- "installer", "télécharger"
- "commencer", "démarrer"

### Frustration

- "j'arrive pas"
- "ça marche pas"
- "help!", "aide moi"
- "je comprends pas"

## Architecture des Modules

### `helpDetectionHandler.js`

- Écoute les messages Discord
- Détecte les mots-clés via regex
- Orchestration du flux d'analyse et réponse

### `llmProviderPool.js`

- Gère un pool de fournisseurs LLM (Groq, OpenRouter, Gemini)
- Bascule automatique si un provider échoue
- Supporte les retries

## Flux d'Analyse LLM

### 1. Analyse Initiale

```json
{
  "isRealQuestion": boolean,      // C'est une vraie question?
  "canAnswer": boolean,            // Je peux répondre efficacement?
  "category": "bug|gameplay|installation|autre",
  "confidence": number,            // 0-100
  "reason": "explication"
}
```

### 2. Génération de Réponse

- Limité à 3-5 lignes maximum
- Solution directe ou prochaines étapes
- Pas de réponses génériques

## Exemples de Configuration

### Exemple 1: Configuration Simple (Groq)

```env
DISCORD_TOKEN=MjMyNDMyMzIzMzIzMjMyNDMyMjM.ABC123
SUPPORT_CHANNEL_IDS=1234567890,0987654321
GROQ_API_KEY=gsk_xxx
```

### Exemple 2: Configuration Multi-Providers

```env
DISCORD_TOKEN=MjMyNDMyMzIzMzIzMjMyNDMyMjM.ABC123
SUPPORT_CHANNEL_IDS=discussions_channel_id,entraide_channel_id
GROQ_API_KEY=gsk_xxx
OPENROUTER_API_KEY=sk-or-xxx
GEMINI_API_KEY_SUPPORT=AIzaSy...
```

## Logs et Débogage

### Log Levels

- `✅` Success
- `🔍` Detection in progress
- `⚠️` Warning (channel not configured, no provider)
- `❌` Error

### Commandes de Débogage

Vérifier les canaux configurés:

```bash
echo $SUPPORT_CHANNEL_IDS
```

Vérifier la clé Groq:

```bash
echo $GROQ_API_KEY | cut -c1-10
```

## Limitations Actuelles

1. **Réponses en français uniquement** - Le prompt est en français
2. **Pas de context mémoire** - Chaque question est analysée indépendamment
3. **Pas de cooldown** - Peut répondre à chaque message
4. **Limites d'API gratuite** - Groq a ~30 req/sec, OpenRouter ~$3/mois

## Améliorations Possibles

- [ ] Ajouter un cooldown par utilisateur
- [ ] Mémoriser les réponses dans une base de données
- [ ] Support multilingue
- [ ] Intégration avec une base de connaissances (FAQs)
- [ ] Système de feedback pour améliorer les réponses
- [ ] Modération de contenu avant réponse

## Troubleshooting

### Aucune réponse automatique

1. Vérifier SUPPORT_CHANNEL_IDS est configuré et correct
2. Vérifier qu'au moins UNE clé API est configée (GROQ_API_KEY, etc.)
3. Vérifier les logs du bot

### "Aucun fournisseur LLM disponible"

- Ajouter une clé API gratuite (Groq recommandé)

### Réponses génériques

- Le LLM peut juger que c'était une question trop complexe
- Peut aussi être une limite de 3-5 lignes

## Support

Pour toute question ou bug, consultez les logs du bot ou créez un issue.
