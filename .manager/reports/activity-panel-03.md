# Rapport activity-panel-03 : panneau « Activité »

## Journal
- 19:33 Étape 0 : `design_handoff_conversation_agent/` créé, brief copié à l'identique, commit `e4c426c [activity-panel-03] brief`.
- 19:33 Maquette `design_handoff_conversation_agent/Conversation agent v4.dc.html` **absente** (ni dans le worktree ni dans `~/Downloads/agregat-front/`). Suite avec le brief seul.
- 19:40 Étape 1 : lecture de `App.tsx`, `Tracker.tsx`, `ConnectionsPanel.tsx`, `types.ts`, `v2.css`, `style.css` (règles de base `.connections-panel`, `.with-panel`), `v2.test.tsx`, `ConnectionsPanel.test.tsx`, `tests/e2e.test.mjs`.
- 19:45 Vérification back : aucune mémoire de domaines « Toujours autoriser ». Le back refuse `allow_always` (`packages/policy-engine/index.js:16` : « no grant outlives a mission ») et `agregat-back/.manager/HANDOFF.md:136` indique qu'un test exige que l'autorisation permanente reste masquée. Conflit avec la section « Sites autorisés » du brief : question posée au manager, codage en attente.

## Questions pour le manager
1. Sites autorisés : le back interdit « Toujours autoriser ». Masquer la section, ou afficher `run.browserDomains` (domaines limités saisis pour la mission) en lecture seule, sans bouton « Retirer » (aucun endpoint) ?
2. Tests e2e (`tests/e2e.test.mjs:768-863`) visent `.connections-panel`, `.panel-cost` et la région « Suivi de la mission » : à adapter dans ce lot ?

## Suite du journal
- 19:46 Réponse du manager : option a, « Sites autorisés » = `run.browserDomains` (domaines demandés pour la mission), lecture seule, sans « Retirer » ni mention de « Toujours autoriser ».
- 19:37 Captures « avant » : `scripts/activity-panel-03-captures.mjs avant` (back fixture hors réseau, agent `fixture`). 18 images dans `.manager/reports/activity-panel-03/avant-*.png` : en cours (mission injectée dans le store, état `running`, données FICTIVES), accord en attente (workflow `application-draft` réel), terminée (workflow `opportunity-discovery-dag` réel) ; 1440 et 924 px ; clair et sombre ; à 924 px une capture de plus avec le panneau ouvert. Commit `9db2e80`.
- 19:45 Tests rouges : `src/activity-panel.test.tsx` (composant, échoue à l'import : `./ActivityPanel` n'existe pas) et `src/activity-panel-app.test.tsx` (8 tests d'intégration, échecs d'assertion). Sortie résumée : `.manager/reports/activity-panel-03/tests-rouges.txt` → `Test Files 2 failed | 15 passed (17)`, `Tests 8 failed | 232 passed (240)`.

## Tests retirés des anciens fichiers (portés ailleurs)
- `v2.test.tsx` « panneau v2 » (4 tests sur `ConnectionsPanel`) → composant supprimé ; repris dans `activity-panel.test.tsx` (Connecteurs : agents réels sans démonstrateur, repli ; coût visible seulement dans Détails techniques, « Non mesuré », registre altéré, fictif).
- `v2.test.tsx` « corrige la collision entre le tableau et la liste .activity » → le journal n'utilise plus la classe `.activity` ; vérifié par le test du journal (`table.activity-log`, jamais `.activity`).
- `v2.test.tsx` « sans outil ni étape, aucun compteur inventé » (rendu `<Tracker>`) → repris dans « Étapes de la mission ».
- `v2.test.tsx` « mise en page v3 » (2 tests CSS sur `.tracker`) → remplacés par « feuille : panneau Activité » (344px, marge, surimpression < 760px, plus aucune règle `.tracker`/`.connections-panel`).
- `ConnectionsPanel.test.tsx` « panneau Connexions locales » (2 tests) → repris dans Connecteurs (journal en tableau, phrase sans mission).
