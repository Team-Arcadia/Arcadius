# 🤖 Système de Détection d'Aide Automatique pour Bot Arcadius

Un système intelligent qui détecte et répond automatiquement aux demandes d'aide dans les canaux Discord (#discussions, #entraide, etc.) en utilisant une analyse par LLM.

## 🚀 Démarrage Rapide (5 minutes)

### 1. Copier la Configuration

```bash
cp .env.example .env
```

### 2. Obtenir une Clé API Gratuite (Groq recommandé)

```bash
# Option 1: Groq (RECOMMANDÉ)
# 1. Aller sur https://console.groq.com/
# 2. Copier la clé API
# 3. Ajouter au .env:
GROQ_API_KEY=gsk_votre_clé_ici

# Option 2: OpenRouter
OPENROUTER_API_KEY=sk-or-votre_clé_ici

# Option 3: Gemini
GEMINI_API_KEY_SUPPORT=AIzaSy_votre_clé_ici
```

### 3. Configurer les Canaux Discord

```env
# .env
SUPPORT_CHANNEL_IDS=123456789,987654321

# Comment obtenir les IDs:
# - Activez le Mode Développeur (Discord → Paramètres → Avancés)
# - Clic-droit sur le canal → "Copier l'ID du canal"
```

### 4. Vérifier la Configuration

```bash
node check-help-detection-setup.js
```

### 5. Tester la Connexion LLM (Optionnel)

```bash
node test-llm-connection.js
```

### 6. Démarrer le Bot

```bash
node main.js
# ou
npm start
```

## 🧠 Processus de Détection Intelligente

Le bot utilise un système à **deux étages** pour déterminer si un message est une vraie demande d'aide:

### Étape 1: Détection des Mots-Clés (Rapide)

Le bot scanne d'abord le message pour trouver des **patterns spécifiques** qui indiquent généralement une demande d'aide:

#### Mots-Clés de Questions

```
- comment, pourquoi, quoi, c'est quoi
- peux-tu, peux-tu m', tu peux
- Tout message finissant par ? (ex: "ça marche?")
```

#### Mots-Clés de Problèmes Techniques

```
- bug, crash, error, problème
- ça ne marche pas, ça marche pas
- ne fonctionne pas, ne fonctionne
- freeze, lag, bugs
```

#### Mots-Clés d'Installation/Configuration

```
- comment installer, télécharger
- lancer, configurer, mettre en place
- patcher, updater, installer des mods
```

#### Mots-Clés de Frustration

```
- j'arrive pas, j'arrive pas à
- je comprends pas, je comprends rien
- help, aide, sos
- j'y arrive pas, impossible
```

**Si aucun mot-clé n'est trouvé** → Le message est ignoré (pas d'analyse supplémentaire). ✅ Rapide et efficace!

---

### Étape 2: Analyse Intelligente par IA (LLM)

Si un mot-clé est détecté, le bot demande à l'IA une analyse plus profonde pour confirmer que c'est vraiment une demande d'aide:

L'IA répond avec 5 critères:

```json
{
  "isRealQuestion": true|false,      // ✅ Est-ce vraiment une question d'aide?
  "canAnswer": true|false,            // ✅ Peut-on répondre efficacement?
  "category": "bug|gameplay|installation|autre",  // 📁 Type de question
  "confidence": 0-100,                // 🎯 Certitude en pourcentage
  "reason": "Explication brève"       // 📝 Pourquoi on répond (ou pas)
}
```

**Exemples d'analyse:**

| Message                  | isRealQuestion | canAnswer | Résultat                          |
| ------------------------ | -------------- | --------- | --------------------------------- |
| "Comment lancer le jeu?" | ✅ true        | ✅ true   | 🤖 **Réponse automatique**        |
| "J'ai un crash"          | ✅ true        | ✅ true   | 🤖 **Réponse automatique**        |
| "J'arrive pas à jouer"   | ✅ true        | ❌ false  | 👀 **Réaction** (trop vague)      |
| "Je joue c'est cool!"    | ❌ false       | ❌ false  | ➡️ **Ignoré** (pas une question)  |
| "Pourquoi tu es bête?"   | ❌ false       | ❌ false  | ➡️ **Ignoré** (insulte, pas aide) |

---

### Décision Finale: Comment le Bot Répond

Après les deux étapes, le bot prend une décision:

#### Cas 1: `isRealQuestion=true` ET `canAnswer=true`

✅ **Le bot génère et envoie une réponse automatique**

- Courte et pratique (3-5 lignes max)
- Utilise les informations du serveur si disponible
- Répond directement au message de l'utilisateur

#### Cas 2: `isRealQuestion=true` MAIS `canAnswer=false`

👀 **Le bot ajoute une réaction pour signaler qu'il a vu le message**

- Indique que la question est trop générique ou complexe
- Notifie l'utilisateur que quelqu'un d'autre peut l'aider
- Permet aux modos de prendre le relais

#### Cas 3: `isRealQuestion=false`

➡️ **Le bot ignore le message complètement**

- Pas une demande d'aide réelle
- Peut être une conversation normale, une blague, etc.
- Le bot ne fournit aucune réponse ni réaction

---

## 📋 Description Détaillée

Le système fonctionne en 3 étapes :

### 1. **Détection des Mots-Clés**

Surveille les canaux configurés pour les messages contenant:

- `comment`, `pourquoi`, `quoi`, `c'est quoi`, messages finissant par `?`
- `bug`, `crash`, `error`, `problème`, `ça ne marche pas`
- `jouer`, `launcher`, `installer`, `télécharger`
- `j'arrive pas`, `help`, `aide`, `je comprends pas`

### 2. **Analyse Intelligente par LLM**

Pour chaque message détecté, demande au LLM:

- Est-ce une **vraie demande d'aide**? (pas juste une conversation)
- Peux-je **répondre efficacement**? (pas générique)
- Quelle **catégorie**? (bug, gameplay, installation, autre)
- **Niveau de confiance**? (0-100%)

### 3. **Réponse Automatique**

Si la réponse est oui:

- Génère une réponse **courte et pratique** (3-5 lignes max)
- Répond au message de l'utilisateur
- Sinon: ajoute une réaction 👀 pour signaler qu'on a vu

## 📁 Fichiers Créés

```
modules/
├── helpDetectionHandler.js       # 📡 Détection et orchestration
└── llmProviderPool.js            # 🧠 Pool multi-providers LLM

docs/
├── HELP_DETECTION_GUIDE.md       # 📖 Guide complet
└── HELP_DETECTION_TECHNICAL.md   # 🔧 Documentation technique

check-help-detection-setup.js     # ✅ Vérificateur de config
test-llm-connection.js            # 🧪 Test de connexion LLM
.env.example                       # 📝 Template de configuration
```

## 🔑 Fournisseurs LLM Gratuits

| Provider    | API Key                   | Limite Gratuite | Modèles            | Vitesse |
| ----------- | ------------------------- | --------------- | ------------------ | ------- |
| **Groq** 🚀 | https://console.groq.com/ | Illimité        | Mixtral, Llama 70B | ⚡⚡⚡  |
| OpenRouter  | https://openrouter.ai/    | ~$3             | Mistral 7B         | ⚡⚡    |
| Gemini      | https://ai.google.dev/    | 60 req/min      | Gemini Flash       | ⚡⚡    |

**Recommandation**: Utilisez **Groq** - c'est gratuit, illimité et très rapide.

## 🎯 Exemples de Comportement

### Positif : Question réelle

```
Utilisateur:  "Comment lancer le jeu?"
Bot:          "Télécharge la dernière version depuis [lien],
               puis lance le launcher. Si ça ne marche pas,
               réinstalle et vérife ta version de Windows."
```

### Positif : Problème technique

```
Utilisateur:  "J'ai un crash au démarrage"
Bot:          "Essaie: 1) Vérifier les fichiers (Steam → Properties → Verify)
               2) Désactiver les overlays si tu les as activés
               3) Mettre à jour tes drivers GPU"
```

### Neutre : Question trop vague

```
Utilisateur:  "J'arrive pas à jouer"
Bot:          👀 (réaction) - Signale qu'on a vu mais c'est trop vague
```

### Ignoré : Pas une demande d'aide

```
Utilisateur:  "Je joue en ce moment, c'est trop cool!"
Bot:          [Rien - ce n'est pas une demande d'aide]
```

## ⚙️ Configuration Avancée

### Modifier les Mots-Clés

Éditer `modules/helpDetectionHandler.js`:

```javascript
const HELP_TRIGGERS = {
  questions: [
    /\bcomment\b/i, // Ajouter/modifier des patterns regex
    /\bnouveau_mot\b/i,
  ],
  // ... autres catégories
};
```

### Ajouter un Autre Fournisseur LLM

Créer une méthode dans `llmProviderPool.js`:

```javascript
async callMyProvider(provider, prompt) {
    // Implémenter l'appel API
}
```

### Configurer un Cooldown (Limitation)

Ajouter dans `helpDetectionHandler.js`:

```javascript
const userCooldowns = new Map();
const COOLDOWN_MS = 5000; // 5 secondes

if (userCooldowns.has(message.author.id)) return;
userCooldowns.set(message.author.id, true);
setTimeout(() => userCooldowns.delete(message.author.id), COOLDOWN_MS);
```

## 🐛 Troubleshooting

### "Aucun fournisseur LLM disponible"

```bash
# Vérifier que au moins une clé API est configurée
grep -E "GROQ_API_KEY|OPENROUTER_API_KEY|GEMINI_API_KEY_SUPPORT" .env

# Ou afficher la clé (test seulement!)
echo $GROQ_API_KEY
```

### Pas de réponses automatiques

1. Vérifier les IDs de canaux: `echo $SUPPORT_CHANNEL_IDS`
2. Vérifier les logs du bot pour les messages de détection
3. Tester avec: `node check-help-detection-setup.js`
4. Tester la connexion LLM: `node test-llm-connection.js`

### Réponses génériques ou mauvaises

C'est normal! Les modèles gratuits ont des limites. Vous pouvez:

- Essayer Groq au lieu d'OpenRouter
- Améliorer les prompts dans `helpDetectionHandler.js`
- Ajouter une base de connaissances (FAQs)

### Erreur "Node.js v18+ requis"

```bash
node --version  # Doit être v18+
# Mettre à jour Node.js via https://nodejs.org/
```

## 📊 Logs et Monitoring

### Voir les messages détectés

```bash
tail -f logs/bot.log | grep "Détection d'aide"
```

### Voir les analyses LLM

```bash
tail -f logs/bot.log | grep -E "Analyse:|Confiance"
```

### Voir les réponses envoyées

```bash
tail -f logs/bot.log | grep "Réponse d'aide"
```

## 🔒 Sécurité

- **Ne jamais commit le .env** (clés API privées)
- **Utiliser les créations gratuites** (aucun paiement nécessaire)
- **Limiter le modération au LLM** (pas de contenu hautement offensant)

## 📈 Statistiques

Après quelques jours:

- Nombre de messages analysés
- Taux de réponses automatiques
- Préférence des utilisateurs pour les sujets
- Fournisseurs LLM utilisés

(À implémenter dans une future version)

## 🤝 Dépannage et Contributions

Si vous trouvez un bug:

1. Exécuter `check-help-detection-setup.js`
2. Exécuter `test-llm-connection.js`
3. Vérifier les logs
4. Créer une issue avec les détails

## 📚 Documentation Complémentaire

- [Guide Complet](docs/HELP_DETECTION_GUIDE.md) - Configuration détaillée
- [Documentation Technique](docs/HELP_DETECTION_TECHNICAL.md) - Internals et architecture

## 🎓 Qu'est-ce qu'on a appris?

Ce système démontre:

- Pool de fournisseurs avec fallback automatique
- Analyse de texte avec regex et LLM
- Intégration Discord.js
- Gestion des erreurs et retry logic
- Architecture modulaire et réutilisable

Vous pouvez l'adapter pour:

- Détection de spam/contenu offensant
- Classification de tickets d'assistance
- Réponses automatiques pour les FAQs
- Modération du contenu
- Analytics des questions posées

---

**Créé pour Bot Arcadius** | Système de Détection d'Aide v1.0
