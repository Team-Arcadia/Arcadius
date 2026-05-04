# ⚡ QUICK START: Système de Détection d'Aide

**Durée: ~5 minutes pour être opérationnel!**

---

## 1️⃣ Obtenir une Clé API LLM (2 minutes)

### Option A: Groq (⭐ RECOMMANDÉ - Gratuit et Rapide)

```bash
1. Aller sur: https://console.groq.com/
2. Créer un compte (gratuit)
3. Copier la clé API
4. Ajouter au .env:
   GROQ_API_KEY=gsk_votre_clé_ici
```

### Option B: Gemini (Google)

```bash
1. Aller sur: https://ai.google.dev/
2. Cliquer "Get API Key"
3. Copier la clé
4. Ajouter au .env:
   GEMINI_API_KEY_SUPPORT=AIzaSy_votre_clé_ici
```

### Option C: OpenRouter (Fallback)

```bash
1. Aller sur: https://openrouter.ai/
2. Créer un compte
3. Copier la clé API
4. Ajouter au .env:
   OPENROUTER_API_KEY=sk-or-votre_clé_ici
```

---

## 2️⃣ Configurer le Bot (1 minute)

### Copier le template

```bash
cp .env.example .env
```

### Remplir les variables requises

```env
# Obligatoire
DISCORD_TOKEN=votre_token_discord_ici

# ID des canaux où le bot écoute (obtenir avec Mode Développeur)
SUPPORT_CHANNEL_IDS=123456789,987654321

# Clé API LLM (au moins une!)
GROQ_API_KEY=gsk_votre_clé_groq_ici
```

### Comment obtenir les IDs Discord?

```
1. Aller dans Discord
2. Paramètres → Avancés → Mode Développeur (activer)
3. Clic-droit sur un canal → "Copier l'ID du canal"
4. Mettre cet ID dans SUPPORT_CHANNEL_IDS
```

---

## 3️⃣ Tester la Configuration (2 minutes)

```bash
# Exécuter le test
node test-help-detection.js

# Vous devriez voir:
✅ Configuration valide!
✅ Données de support chargées
✅ Tests de mots-clés réussis
✅ LLM répond correctement
🚀 Vous pouvez maintenant démarrer le bot
```

Si une erreur apparaît, vérifier:

```bash
# Vérifier que GROQ_API_KEY est configuré
echo $GROQ_API_KEY

# Vérifier que SUPPORT_CHANNEL_IDS est configuré
echo $SUPPORT_CHANNEL_IDS
```

---

## 4️⃣ Démarrer le Bot (1 minute)

```bash
# Lancer le bot
node main.js

# Ou utiliser npm
npm start

# Vous devriez voir:
🚀 Bot Arcadius v1.6.0 - Initialisation...
✅ Pool LLM initialisé avec 1 fournisseur(s): Groq
✅ Handler de détection d'aide initialisé pour 2 canal(aux)
```

---

## 5️⃣ Tester sur Discord (Immédiat!)

```
1. Aller dans #entraide (ou votre canal configuré)

2. Envoyer un message de test:
   "Comment lancer le jeu?"

3. Résultat attendu:
   ✅ Le bot répond automatiquement dans 1-3 secondes

4. Vérifier les logs du bot:
   tail -f logs/bot.log | grep "Réponse d'aide"
```

---

## 🎯 Exemples de Fonctionnement

| Message           | Action du Bot | Logs                   |
| ----------------- | ------------- | ---------------------- |
| "Comment lancer?" | 🤖 Réponse    | ✅ Réponse envoyée     |
| "J'arrive pas"    | 👀 Réaction   | ℹ️ Question trop vague |
| "C'est cool!"     | ➡️ Rien       | ➡️ Ignoré              |

---

## 🆘 Si Ça Ne Marche Pas

### Erreur: "Aucun fournisseur LLM disponible"

```bash
# Vérifier que GROQ_API_KEY est dans .env
grep GROQ_API_KEY .env

# Sinon ajouter une clé API Groq:
# 1. Aller sur https://console.groq.com/
# 2. Copier la clé
# 3. Ajouter: GROQ_API_KEY=gsk_...
```

### Le bot ne répond pas dans Discord

```bash
# Vérifier que le canal est dans SUPPORT_CHANNEL_IDS:
grep SUPPORT_CHANNEL_IDS .env

# Vérifier que le bot a les permissions:
# Serveur → Paramètres → Rôles → @Arcadius
# Permissions: Lire, Envoyer, Réagir
```

### Vérifier les logs

```bash
# Voir les messages détectés:
tail -f logs/bot.log | grep "Détection"

# Voir les réponses envoyées:
tail -f logs/bot.log | grep "✅"

# Tous les logs help detection:
tail -f logs/bot.log | grep -E "🔍|✅|👀"
```

---

## 📖 Documentation Complète

Pour plus de détails, voir:

- 📖 [HELP_DETECTION_SETUP.md](./HELP_DETECTION_SETUP.md) - Guide complet
- 💡 [HELP_DETECTION_EXAMPLES.md](./docs/HELP_DETECTION_EXAMPLES.md) - Exemples concrets
- 🔧 [HELP_DETECTION_TECHNICAL.md](./docs/HELP_DETECTION_TECHNICAL.md) - Détails techniques

---

## ✅ Checklist Finale

- [ ] GROQ_API_KEY ou autre LLM configuré dans .env
- [ ] SUPPORT_CHANNEL_IDS configuré avec les bons IDs
- [ ] DISCORD_TOKEN configuré
- [ ] `node test-help-detection.js` passe tous les tests
- [ ] `node main.js` se lance sans erreur
- [ ] Message de test envoyé dans #entraide
- [ ] Bot a répondu ✅
- [ ] Logs montrent "✅ Réponse d'aide envoyée"
- [ ] 🎉 C'est bon!

---

## 🚀 C'est Prêt!

Le système est maintenant **opérationnel** et détectera automatiquement les demandes d'aide sur Discord.

```
Quand quelqu'un écrira:
"Comment lancer le jeu?"

Le bot répondra automatiquement en ~1-3 secondes! 🤖
```

**Besoin d'aide?** Voir la documentation complète dans `docs/`
