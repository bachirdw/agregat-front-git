Tu travailles sur le frontend React de l'agrégateur d'agents. Objectif : refondre l'affichage des réponses de l'agent selon le BRIEF ci-dessous (inspiré de Claude Code : surtout du texte, des blocs riches seulement si nécessaire).

Fichiers de référence (dans `docs/design/`) :
- `Conversation agent v5.dc.html` : la maquette. Lis son **code source** : c'est du HTML avec styles inline, prends-y les valeurs exactes (tailles, couleurs, espacements, rayons). Ne copie pas sa structure `<x-dc>`/`sc-for` : réécris-la en composants React du projet.
- `support.js` : seulement pour ouvrir la maquette dans un navigateur (`npx serve docs/design`), ne l'importe pas dans l'app.
- `BRIEF-conversation-reponse-04.md` : les règles.

Méthode :
1. Lis le code existant de la vue conversation (composants de résultat, preuves, coût, exécution, composer). Liste les composants à supprimer ou à fusionner.
2. Copie ce brief dans `docs/BRIEF-conversation-reponse-04.md`.
3. Capture l'état « avant » en mode sombre (mission terminée avec preuves et coût).
4. Tests d'abord (rouges) : rendu markdown avec tableau GFM ; bloc ```chart valide → graphique ; bloc ```chart invalide → code brut ; ligne méta repliée par défaut puis dépliée ; incident affiché en ligne et non en bannière.
5. Implémente. Utilise `react-markdown` + `remark-gfm`, et pour les graphiques un composant léger en SVG maison (pas de grosse librairie).
6. Ajoute la convention ```chart et les consignes de structure au prompt système de l'agent.
7. Commits atomiques. `npm test` et `npm build` au vert, avec leur sortie dans le rapport.
8. Captures « après » en mode sombre, à 1440, 924 et 760 px. Rapport : fichiers modifiés et supprimés, captures avant/après, points ouverts.

Ne touche pas au panneau d'activité (BRIEF 03).

---

[coller ici le contenu de BRIEF-conversation-reponse-04.md]
