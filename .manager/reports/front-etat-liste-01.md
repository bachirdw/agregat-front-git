# front-etat-liste-01 — état des missions en attente dans la liste

Branche `cloud/front-etat-liste-01` depuis `origin/envoi-question` (73170cb). Session cloud : aucun backend
réel disponible, API simulée (Vitest) seulement.

## Journal
- 05:43 — Lecture de README.md, AGENTS.md, .manager/reports/envoi-question-05-11.md (« Non fait / limites »),
  src/App.tsx (rafraîchissement : `refresh()` relit `GET /runs/:id` 100 ms après chaque événement SSE et
  toutes les 2 s, mais ne met à jour que `run`, jamais `runs` ; la liste n'est relue qu'à la fin du flux,
  au lancement ou via « Actualiser »). Cause du défaut constaté par le propriétaire confirmée.
- 05:43 — Décision : réutiliser `refresh()` et l'événement SSE `state` pour répercuter l'état de la mission
  ouverte dans `runs` (aucun nouveau minuteur). Repère : pastille orange + badge « À vous de répondre ».
  Compteur global dans la barre latérale (titre « Missions ») et dans la barre haute quand la barre
  latérale est masquée.
- 05:45 — `npm ci --ignore-scripts` OK (Node v22.23.4 dans le cloud, README demande 24+ : Vite/Vitest
  tournent quand même). Test rouge `src/etat-liste.test.tsx` : 3 échecs attendus (liste figée sur
  « En cours » après les événements `question`/`permission`/`state` ; aucun compteur).
- 05:46 — Point 1 implémenté : `syncList()` dans App.tsx, appelé par `refresh()` (relecture après chaque
  événement SSE, dont `question`/`answer`/`permission`, et toutes les 2 s) et dès l'événement SSE `state` ;
  `ownerStates` dans types.ts ; badge « À vous de répondre » + pastille orange pulsée (`.dot.awaiting_owner`,
  `.dot.waiting_permission`, animation coupée par la règle globale prefers-reduced-motion). Le libellé d'état
  passe en `sr-only` quand le badge est affiché (ligne de 28 px, pas de place pour les deux).
  Vérifié : `npx vitest run src/etat-liste.test.tsx` 2/2 verts, `npm test` 164 verts (12 fichiers),
  `npx tsc --noEmit` OK, `npx prettier --check src` OK (les .md de .manager/reports ne passent pas Prettier,
  comme les rapports précédents : hors périmètre).
