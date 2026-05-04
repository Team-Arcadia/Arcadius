# 🚀 Implémentation du Système de Détection d'Aide sur Discord

Ce guide vous montre comment le système fonctionne concrètement quand un utilisateur envoie un message sur Discord.

## 📱 Flux Complet sur Discord

### 1️⃣ L'utilisateur envoie un message

```
Canal #entraide
Utilisateur: "Comment lancer le jeu?"
```

### 2️⃣ Le bot détecte les mots-clés

```
modules/helpDetectionHandler.js → detectHelpKeywords()
├─ Cherche: "comment" ✅ Trouvé!
├─ Catégorie: "gameplay"
└─ Passe à l'étape suivante
```

### 3️⃣ L'IA analyse si c'est vraiment une question

```
modules/helpDetectionHandler.js → analyzeSupportRequest()
│
├─ Envoie au LLM (Gemini/Groq/OpenRouter):
│   "Est-ce une vraie demande d'aide?"
│
└─ L'IA répond:
   {
     "isRealQuestion": true,      // ✅ Oui, c'est une question
     "canAnswer": true,            // ✅ On peut y répondre
     "category": "gameplay",       // 📁 Catégorie
     "confidence": 95,             // 🎯 95% de certitude
     "reason": "Demande claire sur le lancement"
   }
```

### 4️⃣ Le bot génère et envoie une réponse

```
modules/helpDetectionHandler.js → generateSupportResponse()

// L'IA génère une réponse contextuelle basée sur:
// - Le message original ("Comment lancer le jeu?")
// - La catégorie ("gameplay")
// - Le contexte du serveur

└─ Réponse générée:
   "Télécharge le launcher depuis le lien sur le site,
    puis lance-le. Si ça ne marche pas, vérife que tu as
    la bonne version de Java installée! 🎮"

✅ Message envoyé au utilisateur dans Discord!
```

---

## 📊 Différents Scénarios

### Scénario A: Question clair et répondable ✅

```
Utilisateur: "J'ai un crash au démarrage"
└─ Mots-clés: "crash" + "démarrage" ✅
└─ Analyse IA: isRealQuestion=true, canAnswer=true
└─ Action: 🤖 Envoi d'une réponse automatique
```

### Scénario B: Question trop vague 👀

```
Utilisateur: "J'arrive pas à jouer"
└─ Mots-clés: "j'arrive pas" ✅
└─ Analyse IA: isRealQuestion=true, canAnswer=false
   (trop vague, plusieurs causes possibles)
└─ Action: 👀 Réaction ajoutée (on a vu le message)
```

### Scénario C: Pas une demande d'aide ➡️

```
Utilisateur: "Je joue en ce moment, c'est trop cool!"
└─ Mots-clés: "joue" détecté ✅
└─ Analyse IA: isRealQuestion=false
   (c'est juste une conversation, pas une question d'aide)
└─ Action: ➡️ Rien (message ignoré)
```

---

## 🔧 Configuration Requise pour Que Ça Marche

### 1. Fichier `.env`

```env
# Pour que le bot s'active sur Discord
DISCORD_TOKEN=votre_token_discord

# Pour que le bot écoute les messages d'aide
SUPPORT_CHANNEL_IDS=ID_CANAL_1,ID_CANAL_2

# Pour que l'IA analyse les messages
GEMINI_API_KEY_SUPPORT=clé_api_ou
GROQ_API_KEY=clé_groq
```

### 2. Permissions Discord

Le bot doit avoir ces permissions sur les canaux de support:

- ✅ Lire les messages
- ✅ Envoyer des messages (pour répondre)
- ✅ Ajouter des réactions (pour les 👀)

### 3. Canal de Support

```
#entraide
└─ Messages reçus par le bot
   └─ Analysés automatiquement
   └─ Réponses envoyées
```

---

## 💻 Code Principal (Résumé)

### 1. Point d'entrée: `main.js`

```javascript
// Initialiser les pools LLM
const llmProviderPool = new LLMProviderPool();

// Activer le listener Discord
helpDetectionHandler(arcadiusClient, llmProviderPool);
```

### 2. Détection: `modules/helpDetectionHandler.js`

```javascript
client.on("messageCreate", async (message) => {
  // ✅ Étape 1: Détecter les mots-clés
  if (!detectHelpKeywords(message.content)) return;

  // ✅ Étape 2: Analyser avec l'IA
  const analysis = await analyzeSupportRequest(message, llmClient);

  // ✅ Étape 3: Répondre selon l'analyse
  if (analysis.isRealQuestion && analysis.canAnswer) {
    // Générer et envoyer une réponse
    const response = await generateSupportResponse(message, analysis, llmClient);
    await message.reply(response);
  } else if (analysis.isRealQuestion) {
    // Ajouter une réaction 👀
    await message.react("👀");
  }
  // Sinon: ignorer (pas une question d'aide)
});
```

### 3. IA: `modules/llmProviderPool.js`

```javascript
class LLMProviderPool {
  async analyzeMessage(prompt) {
    // Essayer Gemini d'abord
    // Si ça échoue → Groq
    // Si ça échoue → OpenRouter
    // Failover automatique!
  }
}
```

---

## 🧩 Mots-Clés Détectés (Par le Code)

Les patterns regex du code détectent automatiquement:

**Questions:**

- comment, pourquoi, quoi, c'est quoi, messages finissant par ?

**Problèmes Techniques:**

- bug, crash, error, problème, ça ne marche pas, lag, glitch

**Installation/Configuration:**

- lancer, installer, télécharger, configurer

**Frustration:**

- j'arrive pas, ça marche pas, help, aide, impossible

---

## ✅ Checklist de Mise en Prod

- [ ] `.env` configuré avec `DISCORD_TOKEN`
- [ ] `SUPPORT_CHANNEL_IDS` rempli avec les bons IDs
- [ ] Une clé API LLM configurée (Gemini/Groq/OpenRouter)
- [ ] Bot connecté à Discord ✅
- [ ] Permissions du bot vérifiées
- [ ] Tester: `node check-help-detection-setup.js`
- [ ] Tester la connexion LLM: `node test-llm-connection.js`
- [ ] Envoyer un message de test dans le canal de support
- [ ] Vérifier les logs: `tail -f logs/bot.log`
- [ ] 🚀 Ça marche!

---

## 🐛 Dépannage

### Le bot ne répond pas aux messages

```bash
# 1. Vérifier que le canal est dans SUPPORT_CHANNEL_IDS
echo $SUPPORT_CHANNEL_IDS

# 2. Vérifier que le LLM est configuré
grep -E "GEMINI_API_KEY_SUPPORT|GROQ_API_KEY|OPENROUTER_API_KEY" .env

# 3. Vérifier les logs
tail -f logs/bot.log | grep "Détection"

# 4. Vérifier la permission du bot sur le canal
```

### Erreur "Aucun fournisseur LLM disponible"

```bash
# Au moins UNE clé API doit être configurée
# Ajouter au .env:
GROQ_API_KEY=gsk_votre_clé_groq_ici
```

### Le bot ajoute 👀 au lieu de répondre

C'est normal! Ça veut dire:

- ✅ La question a été détectée
- ℹ️ Mais elle est trop vague ou générale
- 👀 Réaction = "on a vu, quelqu'un d'autre peut aider"

---

## 📈 Monitoring

Voir les questions détectées:

```bash
tail -f logs/bot.log | grep "Détection d'aide"
```

Voir les réponses envoyées:

```bash
tail -f logs/bot.log | grep "Réponse d'aide envoyée"
```

Voir tous les événements help detection:

```bash
tail -f logs/bot.log | grep -E "🔍|✅|👀|ℹ️"
```
