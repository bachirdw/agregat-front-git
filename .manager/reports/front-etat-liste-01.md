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
- 05:50 — Point 1 commité (dae9939). Point 2 : test rouge (compteur absent), puis compteur `waiting` = missions
  de `runs` dans `ownerStates`, badge orange avec aria-label « N mission(s) attend(ent) votre réponse »,
  dans le titre « Missions » de la barre latérale et dans la barre haute quand la barre latérale est masquée
  (la règle mobile qui cache les badges de la barre haute l'exempte). Masqué à zéro.
- 05:50 — Vérification visuelle avec un backend FACTICE local (script dans le scratchpad, données fictives,
  port 4310, Vite 5173, Chromium headless) : le badge « À vous de répondre » écrasait le titre de la
  mission (ligne de 28 px) → texte visible raccourci en « À vous », infobulle « À vous de répondre »,
  libellé d'état complet en `sr-only`. Captures non commitées (comme les lots précédents). Serveurs arrêtés.
  Vérifié : `npm test` 166 verts, `npx tsc --noEmit` OK, `npx prettier --check src` OK.
- 05:50 — Point 2 commité (bd81f58). Relecture du diff complet, rapport finalisé, poussée de la branche.

## Branché sur l'API réelle vs simulé
- Aucun nouvel appel : la liste se met à jour depuis `GET /api/runs/:id` (relecture déjà existante de la
  mission ouverte, 100 ms après chaque événement SSE et toutes les 2 s) et depuis l'événement SSE `state`.
  Les états `awaiting_owner` / `waiting_permission` sont ceux de docs/api-questions.md et docs/api-sends.md.
- Dans le cloud : tout a été exercé avec l'API simulée (mock Vitest de `src/api.ts`) et un stub local jetable
  pour les captures. Aucun backend réel, aucun agent, aucun test live.

## Vérifié
- `npm test` : 166 verts (12 fichiers), dont 4 nouveaux dans `src/etat-liste.test.tsx` :
  running → awaiting_owner → waiting_permission → running sans aucune relecture de `GET /runs` ;
  mise à jour immédiate sur l'événement SSE `state` ; compteur « 2 » (barre latérale puis barre haute
  quand la barre latérale est masquée) ; compteur absent à zéro.
- `npx tsc --noEmit` : OK. `npx prettier --check src` : OK.
- Rendu : captures Chromium (liste, fiche, barre haute, mobile 390 px) sur données fictives, non commitées.

## Non vérifié
- Comportement avec l'API réelle et un vrai agent (question / accord d'envoi) : à faire par le manager en
  local. Délai réel attendu ≤ 2 s après le changement (relecture périodique), ~100 ms si un événement SSE
  `question`/`permission`/`state` arrive.
- E2E (`npm run test:e2e`, Chrome système + backend) : non lancés dans le cloud.

## Écarts / limites
- Seule la **mission ouverte** est synchronisée en continu (c'est le cas constaté par le propriétaire). Une
  autre mission qui passerait en attente pendant qu'on regarde l'accueil ou une autre fiche n'est reflétée
  dans la liste et le compteur qu'à la prochaine relecture de la liste (fin d'un flux, lancement,
  « Actualiser »). Ajouter une relecture périodique de `GET /runs` aurait été un nouveau minuteur, exclu
  par le brief ; à décider par le manager (ou s'appuyer sur la future file `/api/career/pending`).
- Badge de liste : texte visible « À vous » (pas « À vous de répondre ») pour préserver le titre de la
  mission sur 28 px ; libellé complet en infobulle et libellé d'état exact en `sr-only`.
- Les rapports .md ne passent pas Prettier (idem rapports précédents) ; non corrigé.

## Questions pour le manager
- Faut-il aussi suivre les missions non ouvertes (relecture périodique de la liste ou file globale) ?
