# Rapport sous-agents-19-11 : les sous-agents du back dans le front

Demande du propriétaire (19/11) : « On utilise [le back], regarde où il en est, car c'est lui qui a toujours la
priorité. Et tu peux commencer à implémenter dans le front-end, tester. » Suite de `activity-panel-03`.

## Journal
- 06:57 Back en lecture seule. La délégation (sprint `delegation-v2-01`) est codée, relue, essayée et **intégrée dans
  `contacts-13-11`** (arbre `~/Downloads/agregat-back-essai-13-11`, tête `b382dd2`, HANDOFF §0 du 19/11 04:24 ; API du
  manager sur 4314). Contrat : `docs/api-delegation.md`. Le §8 du contrat liste ce que le front doit faire
  (`delegation-v2-02`) : case « Autoriser les sous-agents » avec l'enveloppe modifiable, compteur, liste des
  sous-missions.
- 07:00 Lu dans le code du back : `family[]` = `{ id, titre, agent, state, attend, pendingQuestion, pendingPermission }`
  (`packages/orchestrator/delegation.js` `view()` / `line()`) ; `state` vaut l'état de la sous-mission, ou `en_file` /
  `attend_accord` tant que la plateforme la retient ; `attend` ∈ `place`, `accord`, `question`, `carte_envoi`, `null` ;
  `pendingPermission` = `{ id, capability, actionClass, toolCallId, askedAt, preview }` ; `activity` = `{ agents,
  awaitingOwner }`. `GET /api/runs` liste aussi les sous-missions (aucun filtre). `POST /api/runs/:id/cancel` annule
  une sous-mission, y compris retenue (`cancelHeld`). Schéma `delegation` strict : `accepted`, `via`, `total` 1-200,
  `parallel` 1-8, `acceptedAt` ISO avec fuseau.
- 07:03 Tests rouges (`tests-rouges.txt`) : `Test Files 4 failed | 15 passed (19)`, `Tests 18 failed | 263 passed (281)`.
