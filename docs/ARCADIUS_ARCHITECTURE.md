# Architecture Arcadius - Bot-Arcadius-JS

## 📁 Structure des modules

Le bot Arcadius a été refactorisé en suivant l'architecture modulaire du Bot-Arcadius-JS. Voici la structure:

```
Bot-Arcadius-JS/
├── main.js                              # Point d'entrée (Bot Commandes + Arcadius)
├── modules/
│   ├── arcadiusConfig.js               # Configuration et constantes
│   ├── logger.js                       # Système de logging avec couleurs
│   ├── geminiPool.js                   # Gestion des pools de clés API Gemini
│   ├── dataManager.js                  # Gestion des fichiers de données JSON
│   ├── generationService.js            # Génération avec failover et découverte de modèles
│   ├── promptBuilder.js                # Construction des prompts
│   ├── memoryService.js                # Mise à jour de la mémoire utilisateur
│   ├── arcadiusReadyHandler.js         # Handler pour l'événement ready
│   ├── arcadiusMessageHandler.js       # Handler pour l'événement messageCreate
│   ├── readyHandler.js                 # Handler du bot de commandes
│   ├── commandsHandler.js              # Gestionnaire des commandes
│   └── interactionHandler.js           # Gestionnaire des interactions
├── data/                               # Fichiers de données (JSON)
├── logs/                               # Fichiers de logs
└── commands/                           # Commandes Discord
```

## 🔧 Modules Arcadius

### `arcadiusConfig.js`

Configuration centralisée pour Arcadius:

- VERSION, AUTHOR
- REFRESH_INTERVAL, GENERATION_TIMEOUT
- MODEL_PRIORITY (liste de modèles Gemma)
- Chemins des répertoires

### `logger.js`

Système de logging personnalisé:

- Logs en console avec couleurs
- Sauvegarde dans des fichiers `/logs/arcadius-YYYY-MM-DD.log`
- Niveaux: debug, info, warn, error

### `geminiPool.js`

Gestion des pools de clés API Google:

- Charge GEMINI_API_KEY et GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.
- Gère les clients Gemini
- Permet rotation et failover

### `dataManager.js`

Gestion des données persistantes:

- Charge/sauvegarde `server_info.json`, `user_reactions.json`, `mods.json`, etc.
- Format automatique des données
- Mise à jour de la mémoire utilisateur

### `generationService.js`

Génération de contenu avec résilience:

- `generateWithFailover()` - Essaie modèles et clés jusqu'au succès
- `findBestModel()` - Découvre le meilleur modèle disponible
- Gestion des timeouts et erreurs

### `promptBuilder.js`

Construction intelligente des prompts:

- `buildPromptContext()` - Crée le contexte à partir du message
- `buildFullPrompt()` - Assemble le prompt final avec identity, directives, personnalité
- Inclut mods, liens, infos serveur si pertinent

### `memoryService.js`

Mise à jour asynchrone de la mémoire:

- `updateUserMemory()` - Analyse les messages pour mémoriser les utilisateurs
- Utilise le pool mémoire Gemini
- Non-bloquant

### `arcadiusReadyHandler.js`

Événement ready:

- Affiche info de connexion
- Démarre le rafraîchissement des données (5 min)
- Configure l'activité du bot

### `arcadiusMessageHandler.js`

Événement messageCreate:

- Filtre les messages du canal cible
- Construit le contexte et prompt
- Génère la réponse via failover
- Met à jour la mémoire en arrière-plan

## 🚀 Variables d'environnement

```env
# Bot Commandes
DISCORD_TOKEN=your_bot_token
TOKEN=your_bot_token
APP_ID=your_app_id

# Arcadius (optionnel)
ARCADIUS_TOKEN=your_arcadius_token
ARCADIUS_CHANNEL_ID=channel_id
GEMINI_API_KEY=your_gemini_key
GEMINI_API_KEY_2=second_gemini_key
GEMINI_API_KEY_MEMORY=memory_pool_key
LOG_LEVEL=info
```

## 📊 Architecture Générale

```
main.js
├─ Bot Commandes (commandClient)
│  ├─ readyHandler
│  ├─ commandHandler
│  └─ interactionHandler
│
└─ Bot Arcadius (arcadiusClient) [optionnel]
   ├─ initializeArcadius()
   │  ├─ GeminiClientPool (CHAT)
   │  ├─ GeminiClientPool (MEMORY)
   │  ├─ BotDataManager
   │  └─ findBestModel()
   ├─ arcadiusReadyHandler
   └─ arcadiusMessageHandler
      └─ generateWithFailover() + updateUserMemory()
```

## ✨ Points clés de la refactorisation

1. **Modularité** - Chaque responsabilité dans son propre module
2. **Résilience** - Failover sur clés API et modèles
3. **Logging** - Traçabilité complète avec fichiers logs
4. **Gestion d'erreurs** - Try-catch à tous les niveaux
5. **Asynchrone** - Mise à jour mémoire non-bloquante
6. **Flexibilité** - Arcadius optionnel via ARCADIUS_TOKEN

## 🔄 Flux d'un message

1. Message reçu
2. Filtre: channel + mention
3. `buildPromptContext()` - Crée le contexte
4. `buildFullPrompt()` - Assemble le prompt complet
5. `generateWithFailover()` - Génère la réponse
6. Split en chunks < 2000 chars
7. Envoie la réponse
8. En arrière-plan: `updateUserMemory()` - Mémorise l'utilisateur
