# 🚀 Guide d'Installation - Système de Détection d'Aide

## ✅ Étape 1 : Vérifier les Prérequis

```bash
# Vérifier la version de Node.js (doit être v18+)
node --version

# Vérifier npm/pnpm
npm --version
# ou
pnpm --version
```

## ✅ Étape 2 : Configuration du Fichier .env

### Copier le template

```bash
cp .env.example .env
```

### Remplir les variables essentielles

```env
# 1. Discord Bot Token (REQUIS)
DISCORD_TOKEN=MzIzMjMyMzIyNzIyNzIyNzIyNzI.ABC123...

# 2. IDs des Canaux à Monitorer (REQUIS)
# Comment obtenir les IDs?
# - Clic-droit sur le canal Discord → "Copier l'ID du canal"
# Exemple pour #discussions et #entraide:
SUPPORT_CHANNEL_IDS=1234567890123456789,9876543210987654321

# 3. Clé API LLM (AU MOINS UNE REQUISE)
# Option A: Groq (RECOMMANDÉ - gratuit, rapide)
GROQ_API_KEY=gsk_...

# Option B: OpenRouter (gratuit avec $3 crédit)
OPENROUTER_API_KEY=sk-or-...

# Option C: Gemini (clé supplémentaire)
GEMINI_API_KEY_SUPPORT=AIzaSy_...
```

## ✅ Étape 3 : Obtenir une Clé API Gratuite

### 🥇 Option 1: Groq (RECOMMANDÉ)

1. Accéder à https://console.groq.com/
2. S'inscrire avec Google/GitHub (gratuit)
3. Accédez à API Keys
4. Créer une nouvelle clé
5. Copier la clé et ajouter au `.env`:
   ```env
   GROQ_API_KEY=gsk_abc123...
   ```

**Avantages:**

- ✅ Gratuit et illimité
- ✅ Très rapide (13K tokens/sec)
- ✅ Modèles puissants (Mixtral 8x7B)
- ✅ Zero downtime

### 🥈 Option 2: OpenRouter

1. Accéder à https://openrouter.ai/
2. S'inscrire
3. Copier la clé API depuis Settings
4. Ajouter au `.env`:
   ```env
   OPENROUTER_API_KEY=sk-or-...
   OPENROUTER_REFERER=https://github.com/yourrepo
   ```

### 🥉 Option 3: Gemini

1. Accéder à https://ai.google.dev/
2. Créer une nouvelle clé API
3. Ajouter au `.env`:
   ```env
   GEMINI_API_KEY_SUPPORT=AIzaSy_...
   ```

## ✅ Étape 4 : Vérifier la Configuration

```bash
# Exécuter le script de vérification
node check-help-detection-setup.js

# Vous devriez voir:
# ✅ helpDetectionHandler.js existe
# ✅ llmProviderPool.js existe
# ✅ DISCORD_TOKEN configuré
# ✅ SUPPORT_CHANNEL_IDS configuré
# ✅ Au moins UN fournisseur LLM configuré
# ✅ Node.js v18+ détecté
# ... autres vérifications
```

### Si des vérifications échouent

Consultez la section "Troubleshooting" ci-dessous.

## ✅ Étape 5 : Tester la Connexion LLM (Optionnel)

```bash
# Vérifier que votre clé API fonctionne
node test-llm-connection.js

# Vous devriez voir:
# ✅ 1 fournisseur LLM trouvé: Groq
# ✅ Réponse reçue du LLM
# ✅ Analyse reçue
# ✅ TOUS LES TESTS RÉUSSIS
```

## ✅ Étape 6 : Modifier main.js (si nécessaire)

Le `main.js` a déjà été modifié pour inclure le système de détection d'aide.

**Vérifier que ces lignes existent:**

```javascript
// Imports
const { helpDetectionHandler } = require("./modules/helpDetectionHandler");
const LLMProviderPool = require("./modules/llmProviderPool");

// Dans initializeArcadius()
const llmProviderPool = new LLMProviderPool();

// Dans la section démarrage
helpDetectionHandler(arcadiusClient, arcadiusBotState.llmProviderPool);
```

Si ces lignes manquent, les ajouter manuellement.

## ✅ Étape 7 : Démarrer le Bot

```bash
# Méthode 1: Utiliser node directement
node main.js

# Méthode 2: Utiliser npm (si configuré dans package.json)
npm start

# Méthode 3: En mode développement (avec auto-reload)
npm install -g nodemon
nodemon main.js
```

### Logs attendus

```
✅ Bot connecté: YourBot#1234 (ID: 123456789)
🔍 Handler de détection d'aide initialisé pour 2 canal(aux)
```

## ✅ Étape 8 : Tester le Système

1. **Dans Discord**, aller dans un des canaux configurés (#discussions ou #entraide)

2. **Envoyer un message de test:**

   ```
   Comment installer le jeu?
   ```

3. **Observer le comportement:**
   - Le bot affiche "is typing..."
   - Au bout de 1-3 secondes, le bot répond

4. **Exemples de messages pour tester:**
   ```
   "Comment lancer le jeu?"          → ✅ Réponse directe
   "J'ai un bug au démarrage"        → ✅ Réponse directe ou 👀
   "Pourquoi ça ne marche pas?"      → ✅ Réponse direct ou 👀
   "Je joue en ce moment"            → Aucune réponse (pas une demande)
   "C'est trop cool!"                → Aucune réponse (pas une question)
   ```

## 🔧 Troubleshooting

### Issue: "Aucun fournisseur LLM disponible"

**Cause:** Aucune clé API n'est configurée

**Solution:**

```bash
# 1. Vérifier le .env
cat .env | grep API_KEY

# 2. Obtenir une clé API gratuite (voir Étape 3)

# 3. Ajouter au .env et redémarrer le bot
GROQ_API_KEY=gsk_...
```

### Issue: "Impossible de trouver SUPPORT_CHANNEL_IDS"

**Cause:** Variable d'environnement manquante ou vide

**Solution:**

```bash
# 1. Vérifier que le .env a SUPPORT_CHANNEL_IDS
grep SUPPORT_CHANNEL_IDS .env

# 2. Si absent, ajouter:
echo "SUPPORT_CHANNEL_IDS=123456789,987654321" >> .env

# 3. Redémarrer le bot
```

### Issue: Pas de réponse automatique

**Cause:** Plusieurs possibilités

**Checklist:**

- [ ] Les canaux configurés dans `SUPPORT_CHANNEL_IDS` sont-ils corrects?
- [ ] Avez-vous testé avec des mots-clés détectés? ("comment", "bug", "j'arrive pas")
- [ ] Le bot a-t-il la permission de répondre dans le canal?
- [ ] Vérifier les logs: `tail logs/bot.log`

### Issue: "Error: Node.js v18+ required"

**Cause:** Version de Node.js trop ancienne

**Solution:**

```bash
# 1. Vérifier la version
node --version

# 2. Mettre à jour Node.js
# Accéder à https://nodejs.org/
# Télécharger et installer la dernière version LTS

# 3. Vérifier après installation
node --version  # Doit être v18.0.0+
```

### Issue: Réponses génériques ou mauvaises

**Cause:** Le modèle LLM trouve la question trop vague

**Solutions:**

1. Essayer Groq au lieu d'OpenRouter (plus puissant)
2. Améliorer les prompts dans `helpDetectionHandler.js`
3. Ajouter une base de connaissances (FAQs) - voir [Advanced Use Cases](docs/ADVANCED_USE_CASES.md#1-intégration-avec-une-base-de-connaissances-faqs)

### Issue: "Discord.js TypeError"

**Cause:** Mauvaise version de discord.js

**Solution:**

```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install

# ou avec pnpm
pnpm install
```

## 📚 Documentation Complète

Pour aller plus loin:

- **[Guide Complet](HELP_DETECTION_README.md)** - Vue d'ensemble
- **[Configuration Détaillée](docs/HELP_DETECTION_GUIDE.md)** - Toutes les options
- **[Documentation Technique](docs/HELP_DETECTION_TECHNICAL.md)** - Architecture interne
- **[Cas d'Usage Avancés](docs/ADVANCED_USE_CASES.md)** - FAQs, analytics, etc.

## 🎯 Prochaines Étapes Recommandées

Une fois le système en place et fonctionnel:

1. **Configurer une base de FAQs** (voir Advanced Use Cases)
2. **Ajouter un système de modération** pour escalader les questions complexes
3. **Mettre en place des analytics** pour suivre les questions posées
4. **Améliorer les prompts LLM** selon vos besoins spécifiques
5. **Ajouter un cooldown par utilisateur** pour éviter l'abuse

## 💡 Tips et Bonnes Pratiques

1. **Testez avec des questions simples d'abord** - Confirmer que ça marche
2. **Surveillez les logs** dès le démarrage - Important pour les bugs
3. **Utilisez Groq** - C'est le meilleur rapport gratuit/performance
4. **Mettre à jour les mots-clés** selon vos besoins communautaires
5. **Faire des backups de .env** - Ne pas perdre les clés API

## ❓ Questions Fréquentes

**Q: Puis-je utiliser plusieurs bots?**
A: Oui, chaque bot peut avoir sa propre clé API et ses propres canaux.

**Q: Les clés API sont-elles sécurisées?**
A: Oui, aucune clé n'est partagée. Mettez en place un `.gitignore` pour éviter de commit accidentellement.

**Q: Combien de coût ça?**
A: Zéro! Groq, OpenRouter et Gemini offrent des tiers gratuits généreux.

**Q: Puis-je modifier les réponses?**
A: Oui, voir [Advanced Use Cases](docs/ADVANCED_USE_CASES.md) pour des exemples d'intégration FAQs.

**Q: Comment supprimer le système?**
A: Commenter/supprimer l'import et l'appel dans `main.js`, puis redémarrer.

---

## ✨ Succès!

Si vous êtes arrivé ici, le système devrait être entièrement fonctionnel. Pour toute question:

1. Consultez la documentation
2. Vérifiez les logs du bot
3. Exécutez les scripts de vérification

Bon courage! 🚀
