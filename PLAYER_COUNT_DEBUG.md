# Débogage - Récupération du nombre de joueurs en ligne

## Problèmes corrigés

### 1. **Timeout excessif (120 secondes)**

- **Avant**: Les requêtes avaient un timeout de 120 secondes par serveur
- **Après**: Réduit à 10 secondes par serveur avec un timeout global de 15 secondes
- **Impact**: Les mises à jour de présence du bot ne tardaient plus 2-8 minutes

### 2. **Parsing VarInt non robuste**

- **Avant**: La logique de lecture des VarInts pouvait perdre le suivi du décalage (offset)
- **Après**: Refactorisée avec une fonction `readVarInt()` qui retourne à la fois la valeur ET le nouvel offset
- **Impact**: Les réponses du serveur Minecraft sont maintenant correctement parsées

### 3. **Pas de gestion d'erreur globale**

- **Avant**: Les erreurs individuelles de serveur n'étaient pas loggées
- **Après**: Ajout de logs détaillées pour chaque serveur et un timeout global
- **Impact**: Meilleure visibilité sur les problèmes

### 4. **Logs insuffisantes**

- **Avant**: Aucune indication du statut de la requête
- **Après**: Logs à chaque étape (connexion, parsing, résultat)
- **Impact**: Diagnostic plus facile des problèmes

## Comment tester

### Test rapide

```bash
node test-player-count.js
```

Ce script affichera:

- Les serveurs configurés
- Le nombre total de joueurs en ligne
- Le temps d'exécution de la requête

### Troubleshooting

**Le bot affiche "0 joueur en ligne" ?**

1. Vérifiez les logs lors du démarrage du bot
2. Exécutez `node test-player-count.js` pour isoler le problème
3. Vérifiez que les serveurs dans `serverStatus.js` sont accessibles

**Les serveurs ne répondent pas ?**

1. Testez la connectivité: `telnet HOST PORT`
2. Vérifiez les adresses IP/ports dans `modules/serverStatus.js`
3. Vérifiez les règles firewall

**Les logs ne s'affichent pas ?**
Le bot utilise `console.log()` - vérifiez les logs de démarrage du processus

## Architecture améliorée

```
readyHandler.js
    ↓
updatePresence() [toutes les 60 secondes]
    ↓
getTotalPlayerCount()
    ↓
Promise.all([getPlayerCount(server1), getPlayerCount(server2), ...])
    ↓
Chaque getPlayerCount() avec timeout de 10 secondes
    ↓
Parsing robuste du protocole Minecraft
    ↓
Retourne le nombre de joueurs
```

## Fichiers modifiés

- `modules/serverStatus.js` - Correction du parsing et timeouts
- `modules/readyHandler.js` - Logs améliorées
- `test-player-count.js` - Nouveau script de test
