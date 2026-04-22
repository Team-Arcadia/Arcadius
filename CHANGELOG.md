# Changelog

All notable changes to this project will be documented in this file. / Tous les changements notables de ce projet seront documentés dans ce fichier.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.6.1] - 2026-04-23

### Fixed / Corrections

- **(EN)** Fixed Discord.js v14 compatibility: changed 'ready' event to 'clientReady' in ready handlers.
- **(EN)** Fixed player count fetching from Minecraft servers with robust VarInt parsing.
- **(EN)** Reduced excessive timeout from 120 seconds to 10 seconds per server query.
- **(EN)** Added comprehensive error logging for server status queries for better debugging.
- **(EN)** Fixed offset tracking in Minecraft protocol parsing to prevent data loss.
- **(FR)** Correction de la compatibilité Discord.js v14 : événement 'ready' changé en 'clientReady'.
- **(FR)** Correction du parsing du protocole Minecraft pour la récupération du nombre de joueurs en ligne.
- **(FR)** Réduction du timeout excessif (120s → 10s) pour les requêtes serveur.
- **(FR)** Ajout de logs complètes pour le débogage des requêtes de statut serveur.
- **(FR)** Correction du suivi des décalages (offsets) dans le parsing du protocole.

### Added / Ajouté

- **(EN)** New test script `test-player-count.js` to debug player count fetching.
- **(EN)** Debugging guide `PLAYER_COUNT_DEBUG.md` with troubleshooting steps.
- **(FR)** Nouveau script de test `test-player-count.js` pour déboguer la récupération du nombre de joueurs.
- **(FR)** Guide de débogage `PLAYER_COUNT_DEBUG.md` avec les étapes de dépannage.

---

## [1.6.0] - 2026-04-12

### Added / Ajouté

- **(EN)** Help detection system with LLM integration for intelligent command recognition.
- **(EN)** Customizable responses for help detection triggers.
- **(EN)** Additional Minecraft servers to the server list.
- **(EN)** Enhanced rate limiting for message handling to prevent spam.
- **(FR)** Système de détection d'aide avec intégration LLM pour la reconnaissance des commandes.
- **(FR)** Réponses personnalisables pour les déclencheurs de détection d'aide.
- **(FR)** Serveurs Minecraft supplémentaires à la liste.
- **(FR)** Limitation de débit améliorée pour la gestion des messages.

### Changed / Modifié

- **(EN)** Significantly expanded keyword matching logic for improved accuracy and coverage.
- **(EN)** Rebalanced keyword responses with extensive variations.
- **(EN)** Enhanced insult keyword detection and response accuracy.
- **(EN)** Downgraded discord.js to version 13.17.1 for enhanced compatibility.
- **(EN)** Improved model configurations and priority system.
- **(FR)** Logique de correspondance des mots-clés considérablement étendue.
- **(FR)** Réponses aux mots-clés rééquilibrées avec des variations étendues.
- **(FR)** Amélioration de la détection des insultes et de la précision des réponses.
- **(FR)** Rétrogradage de discord.js vers la version 13.17.1 pour une meilleure compatibilité.
- **(FR)** Amélioration des configurations des modèles et du système de priorité.

### Fixed / Corrections

- **(EN)** Corrected Gemini model names and API integration.
- **(EN)** Fixed model priority list to use correct Gemini versions.
- **(EN)** Enforced strict user identification for reactions and ignored users to prevent impersonation.
- **(EN)** Improved server status and crash information handling for bug responses.
- **(FR)** Correction des noms des modèles Gemini et de l'intégration de l'API.
- **(FR)** Correction de la liste des priorités des modèles pour utiliser les bonnes versions de Gemini.
- **(FR)** Identification stricte des utilisateurs pour les réactions et utilisateurs ignorés.
- **(FR)** Amélioration de la gestion des informations d'état du serveur et des plantages.

---

## [1.5.0] - 2026-02-04

### Added / Ajouté

- **(EN)** New "Memory" failover system for robust user profiling.
- **(EN)** `CHANGELOG.md` and `README.md` documentation.
- **(EN)** Git configuration updates (.gitignore cleanup).
- **(FR)** Nouveau système de "failover" pour la mémoire utilisateur.
- **(FR)** Documentation `CHANGELOG.md` et `README.md`.
- **(FR)** Mise à jour de la configuration Git (nettoyage .gitignore).

### Changed / Modifié

- **(EN)** Updated `Arcadius.py` to include version info.
- **(EN)** Improved `.gitignore` rules for security (hidden secrets).
- **(EN)** Fixed user reaction logic to strictly match IDs/usernames and prevent impersonation.
- **(FR)** Mise à jour de `Arcadius.py` avec les infos de version.
- **(FR)** Amélioration des règles `.gitignore` pour la sécurité.
- **(FR)** Correction de la logique de réaction utilisateur pour vérifier strictement l'ID ou le nom d'utilisateur afin d'empêcher l'usurpation.

---

**Author**: vyrriox
