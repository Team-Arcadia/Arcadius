# Cas d'Usage Avancés - Système de Détection d'Aide

## 1. Intégration Avec une Base de Connaissances (FAQs)

```javascript
// modules/knowledgeBase.js
const fs = require("fs");

class KnowledgeBase {
  constructor() {
    this.faqs = this.loadFAQs();
  }

  loadFAQs() {
    try {
      return JSON.parse(fs.readFileSync("data/faqs.json", "utf8"));
    } catch (e) {
      return {};
    }
  }

  findAnswer(question) {
    const keywords = question.toLowerCase().split(" ");
    for (const [pattern, answer] of Object.entries(this.faqs)) {
      if (keywords.some((k) => pattern.includes(k))) {
        return answer;
      }
    }
    return null;
  }
}

module.exports = KnowledgeBase;
```

### data/faqs.json

```json
{
  "comment installer": "1. Télécharger depuis notre site\n2. Extraire le ZIP\n3. Lancer le launcher\n4. Accepter les termes",
  "j'arrive pas launcher": "Vérifiez votre antivirus, il peut bloquer le lancement. Désactivez-le temporairement.",
  "erreur 404": "Le serveur est down. Status: https://status.ourgame.com",
  "lag": "Essayez: 1) Fermer les apps en arrière-plan\n2) Réduire la qualité graphique\n3) Vérifier votre ping"
}
```

### Intégration dans helpDetectionHandler.js

```javascript
const KnowledgeBase = require("./knowledgeBase");
const kb = new KnowledgeBase();

// Avant d'envoyer au LLM
const knownAnswer = kb.findAnswer(message.content);
if (knownAnswer) {
  await message.reply({ content: knownAnswer });
  return; // Skip LLM
}
```

## 2. Système de Feedback et Apprentissage

```javascript
// modules/feedbackSystem.js
const { EmbedBuilder } = require("discord.js");

const feedbackSystem = {
  reactionCollector: (message, analysis) => {
    message.react("👍").catch(() => {});
    message.react("👎").catch(() => {});

    const filter = (reaction, user) => (reaction.emoji.name === "👍" || reaction.emoji.name === "👎") && !user.bot;

    const collector = message.createReactionCollector({
      filter,
      time: 3600000, // 1 heure
    });

    collector.on("collect", (reaction, user) => {
      const liked = reaction.emoji.name === "👍";
      saveFeedback(message.id, analysis, liked, user.id);
      logger.info(`📊 Feedback: ${liked ? "👍" : "👎"} pour question ${message.id}`);
    });
  },
};

function saveFeedback(messageId, analysis, liked, userId) {
  const feedback = {
    timestamp: new Date(),
    messageId,
    analysis: analysis.category,
    confidence: analysis.confidence,
    liked,
    userId,
  };

  const feedbackFile = "data/feedback.jsonl";
  const line = JSON.stringify(feedback) + "\n";
  fs.appendFileSync(feedbackFile, line);
}

module.exports = feedbackSystem;
```

### Utilisation

```javascript
if (analysis.isRealQuestion && analysis.canAnswer) {
  const response = await generateSupportResponse(message, analysis, llmClient);
  const sentMessage = await message.reply({ content: response });
  feedbackSystem.reactionCollector(sentMessage, analysis);
}
```

## 3. Escalade Vers les Modérateurs

```javascript
// modules/escalationSystem.js

const escalationRules = {
  confidenceBelow: 40, // Escaler si confiance < 40%
  complexKeywords: ["crash", "bug sévère", "perte de données"],
  requiresManualReview: (analysis) => {
    return analysis.confidence < escalationRules.confidenceBelow || escalationRules.complexKeywords.some((k) => analysis.reason.includes(k));
  },
};

async function escalateToModeration(message, analysis, channel) {
  const MODERATOR_CHANNEL_ID = process.env.MODERATOR_CHANNEL_ID;
  if (!MODERATOR_CHANNEL_ID) return;

  const modChannel = message.guild?.channels.cache.get(MODERATOR_CHANNEL_ID);
  if (!modChannel) return;

  const embed = new EmbedBuilder()
    .setColor("#FFA500")
    .setTitle("⚠️ Question Requiert une Révision Manuel")
    .addFields([
      { name: "Utilisateur", value: `${message.author} (${message.author.id})` },
      { name: "Message", value: message.content },
      { name: "Catégorie Détectée", value: analysis.category },
      { name: "Confiance IA", value: `${analysis.confidence}%` },
      { name: "Raison", value: analysis.reason },
      { name: "Lien", value: `[Aller au message](${message.url})` },
    ])
    .setTimestamp();

  await modChannel.send({ embeds: [embed] });
  await message.react("⏳");
}

module.exports = { escalationRules, escalateToModeration };
```

### Intégration

```javascript
import { escalateToModeration } = require('./escalationSystem');

if (escalationRules.requiresManualReview(analysis)) {
    await escalateToModeration(message, analysis, message.channel);
}
```

## 4. Analyse Statistique et Tableau de Bord

```javascript
// modules/analyticsService.js
const sqlite3 = require("sqlite3");

class AnalyticsService {
  constructor() {
    this.db = new sqlite3.Database("data/analytics.db");
    this.initDB();
  }

  initDB() {
    this.db.run(`
            CREATE TABLE IF NOT EXISTS help_requests (
                id INTEGER PRIMARY KEY,
                user_id TEXT,
                channel_id TEXT,
                message TEXT,
                category TEXT,
                confidence INTEGER,
                was_answered INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
  }

  async log(message, analysis, wasAnswered) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
                INSERT INTO help_requests 
                (user_id, channel_id, message, category, confidence, was_answered)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
        [message.author.id, message.channelId, message.content, analysis.category, analysis.confidence, wasAnswered ? 1 : 0],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  async getStats(days = 7) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as total_requests,
                    SUM(was_answered) as answered,
                    category,
                    AVG(confidence) as avg_confidence
                FROM help_requests
                WHERE timestamp > datetime('now', '-' || ? || ' days')
                GROUP BY DATE(timestamp), category
            `,
        [days],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
  }
}

module.exports = new AnalyticsService();
```

## 5. Limitation par Utilisateur (Cooldown Avancé)

```javascript
// modules/rateLimiter.js

class RateLimiter {
  constructor() {
    this.userRequests = new Map();
    this.config = {
      maxRequestsPerHour: 5,
      maxRequestsPerDay: 20,
      warningThreshold: 0.8,
    };
  }

  checkLimit(userId) {
    const now = Date.now();
    const hour = 3600000;
    const day = 86400000;

    if (!this.userRequests.has(userId)) {
      this.userRequests.set(userId, []);
    }

    const requests = this.userRequests.get(userId).filter((time) => now - time < day);

    this.userRequests.set(userId, requests);

    // Vérifier limite horaire
    const recentHour = requests.filter((time) => now - time < hour);
    if (recentHour.length >= this.config.maxRequestsPerHour) {
      const timeUntilReset = Math.ceil((recentHour[0] + hour - now) / 1000);
      return {
        allowed: false,
        reason: `Limite horaire atteinte. Réessayez dans ${timeUntilReset}s`,
        type: "hourly",
      };
    }

    // Vérifier limite journalière
    if (requests.length >= this.config.maxRequestsPerDay) {
      return {
        allowed: false,
        reason: "Limite journalière atteinte. Essayez demain.",
        type: "daily",
      };
    }

    // Warning si près de la limite
    const ratio = requests.length / this.config.maxRequestsPerDay;
    if (ratio > this.config.warningThreshold) {
      requests.push(now);
      return {
        allowed: true,
        warning: `Vous avez utilisé ${Math.ceil(ratio * 100)}% de votre quota`,
      };
    }

    requests.push(now);
    return { allowed: true };
  }
}

module.exports = new RateLimiter();
```

## 6. Support Multilingue

```javascript
// modules/translationService.js
const translations = {
  fr: {
    timeout: "Je suis en pause café ☕",
    no_answer: "Votre question semble trop complexe, renvoyons-la aux modos",
    analyzing: "Analyse en cours...",
  },
  en: {
    timeout: "I'm on coffee break ☕",
    no_answer: "Your question seems too complex, sending to mods",
    analyzing: "Analyzing...",
  },
  es: {
    timeout: "Estoy en pausa de café ☕",
    no_answer: "Tu pregunta parece demasiado compleja",
    analyzing: "Analizando...",
  },
};

function detectLanguage(content) {
  // Détection simple basée sur les mots communs
  if (/\b(comment|quoi|bug|erreur|j'arrive|ça marche|je|mon|la|le)\b/i.test(content)) {
    return "fr";
  }
  if (/\b(how|what|bug|error|can't|doesn't|my|the|is|how to)\b/i.test(content)) {
    return "en";
  }
  if (/\b(cómo|qué|error|no funciona|mi|el|la|está)\b/i.test(content)) {
    return "es";
  }
  return "fr"; // Default
}

function getTranslation(key, language = "fr") {
  return translations[language]?.[key] || translations.fr[key];
}

module.exports = { detectLanguage, getTranslation, translations };
```

## 7. Configuration de Webhook pour Intégration Externe

```javascript
// modules/webhookLogger.js
const fetch = require("node-fetch");

async function sendWebhookEvent(event) {
  const webhookUrl = process.env.ANALYTICS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const payload = {
    timestamp: new Date().toISOString(),
    event: event.type,
    data: event,
    source: "help-detection-system",
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.warn(`Webhook failed: ${err.message}`);
  }
}

module.exports = { sendWebhookEvent };
```

## 8. Mise en Cache des Réponses

```javascript
// modules/responseCache.js
const crypto = require("crypto");

class ResponseCache {
  constructor(ttl = 86400000) {
    // 24 heures par défaut
    this.cache = new Map();
    this.ttl = ttl;
  }

  getHash(message) {
    return crypto.createHash("md5").update(message.toLowerCase()).digest("hex");
  }

  get(message) {
    const hash = this.getHash(message);
    const entry = this.cache.get(hash);

    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(hash);
      return null;
    }

    return entry.response;
  }

  set(message, response) {
    const hash = this.getHash(message);
    this.cache.set(hash, {
      response,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

module.exports = new ResponseCache();
```

### Utilisation

```javascript
import responseCache from "./responseCache";

// Avant LLM
const cachedResponse = responseCache.get(message.content);
if (cachedResponse) {
  await message.reply({ content: cachedResponse });
  return;
}

// Après génération
const response = await generateSupportResponse(message, analysis, llmClient);
responseCache.set(message.content, response);
```

---

Tous ces modules peuvent être intégrés progressivement dans votre système selon vos besoins!
