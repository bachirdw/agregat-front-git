# Rapport activity-panel-03 : panneau « Activité »

## Journal
- 19:33 Étape 0 : `design_handoff_conversation_agent/` créé, brief copié à l'identique, commit `e4c426c [activity-panel-03] brief`.
- 19:33 Maquette `design_handoff_conversation_agent/Conversation agent v4.dc.html` **absente** (ni dans le worktree ni dans `~/Downloads/agregat-front/`). Suite avec le brief seul.
- 19:40 Étape 1 : lecture de `App.tsx`, `Tracker.tsx`, `ConnectionsPanel.tsx`, `types.ts`, `v2.css`, `style.css` (règles de base `.connections-panel`, `.with-panel`), `v2.test.tsx`, `ConnectionsPanel.test.tsx`, `tests/e2e.test.mjs`.
- 19:45 Vérification back : aucune mémoire de domaines « Toujours autoriser ». Le back refuse `allow_always` (`packages/policy-engine/index.js:16` : « no grant outlives a mission ») et `agregat-back/.manager/HANDOFF.md:136` indique qu'un test exige que l'autorisation permanente reste masquée. Conflit avec la section « Sites autorisés » du brief : question posée au manager, codage en attente.

## Questions pour le manager
1. Sites autorisés : le back interdit « Toujours autoriser ». Masquer la section, ou afficher `run.browserDomains` (domaines limités saisis pour la mission) en lecture seule, sans bouton « Retirer » (aucun endpoint) ?
2. Tests e2e (`tests/e2e.test.mjs:768-863`) visent `.connections-panel`, `.panel-cost` et la région « Suivi de la mission » : à adapter dans ce lot ?
