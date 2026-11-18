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
- 07:05 Implémentation (`f834ecb`). Le type `subagents` du brief `activity-panel-03` est retiré au profit du contrat du
  back : `Run.family`, `Run.activity`, `Run.estMere`, `Run.delegation`, `Run.famille`, `FamilyMember`,
  `MissionInput.delegation`. 281/281 verts.
- 07:07 CSS (`57dfacb`).
- 07:09 Premier essai contre le back intégré : la voie 1 passe. Le script cherchait la case pendant la mission (le
  composeur y est remplacé par la pastille) : corrigé, la case est lue dans « Nouvelle mission ».
- 07:12 Captures : titres des sous-missions illisibles dans la barre latérale (consigne coupée) et second champ de
  l'enveloppe coupé dans la fenêtre du composeur. Corrigé : `famille.titre`, champs côte à côte (`2dadc8d`). Le
  dépôt était formaté par `prettier` avant ce travail (vérifié fichier par fichier sur `7b2716c`) : les fichiers touchés
  par `activity-panel-03` et ce lot sont formatés de même.
- 07:14 3 tests e2e du panneau verts **contre le back intégré** (`AGENT_PLATFORM_BACKEND_DIR` =
  `~/Downloads/agregat-back-essai-13-11`).
- 07:16 Collision de classe vue sur capture : `style.css` a une règle globale `.waiting` (phrase d'attente du fil) qui
  estompait la tuile en attente. Tons préfixés `tone-*`, garde-fou ajouté au test. « 0 agent en activité » devient
  « Aucun agent en activité ». Icône des sous-agents à la place du mot dans la barre latérale (titre gardé).
  Titre de la sous-mission dans la barre haute (`c521673`).
- 07:21 Sorties finales : `npm test` 281/281, build OK, essai 9/9 contre le back intégré, arbre du back inchangé.

## En bref
- **Fait** : le front suit le contrat du back (`docs/api-delegation.md`, branche `contacts-13-11`) pour ce que son §8
  laisse au front.
  - **Liste des sous-missions** : une tuile par membre de `family`, avec son état (y compris `en_file` et
    `attend_accord`), son attente (`place`, `accord`, `question`, `carte_envoi`) et sa durée. Ouverte, la tuile
    montre la question en attente et deux boutons réels : « Ouvrir la sous-mission » et « Arrêter » (route ordinaire
    `POST /api/runs/:id/cancel`, qui couvre une sous-mission retenue). Ses détails techniques donnent l'agent, le
    modèle, l'identifiant et la ligne d'envoi de son Bilan.
  - **Compteur** : la phrase du back d'après `activity`.
  - **Case « Autoriser les sous-agents »** (voie 1) : texte exact du §6, enveloppe modifiable (6 et 3 par défaut,
    bornes 1-200 et 1-8). Rien n'est envoyé si la case est décochée ; `acceptedAt` part à l'envoi ; la case se
    décoche après un lancement réussi, puisque l'accord vaut pour une mission.
  - **Autour** : ligne du fil « N sous-agents en cours · x/y terminés · k attend ta réponse », ligne de la voie 2
    (`delegation_accepted.message`), journal de la mission pour les événements `delegation_*`, `child_*` et
    `family_waiting`, retour à la mission principale depuis une sous-mission, sous-missions marquées et titrées
    dans la barre latérale.
- **Vérifié** :
  - `npm test` 281/281 et `npm run build` OK ;
  - essai du front construit contre le **code du back intégré** (en lecture seule, dans un processus à moi, base
    temporaire, agent `fixture`, hors réseau) : 9 vérifications sur 9 (sortie ci-dessous) ;
  - 3 tests e2e du panneau contre ce même back ;
  - `git status` de `~/Downloads/agregat-back-essai-13-11` identique avant et après chaque essai.
- **Non vérifié** :
  - « Arrêter » sur une vraie sous-mission en cours (seulement en test unitaire : les sous-missions de l'essai sont
    écrites dans la base, pas lancées) ;
  - la carte d'accord de la voie 3 et la question « 5 de plus » de l'enveloppe, avec un vrai chef. Ce sont des
    questions ordinaires, que la carte « Demandes » existante affiche (une question de sous-mission s'est affichée
    dans l'essai), mais aucun chef réel n'a appelé `mission_lancer` ;
  - aucune mission avec un vrai agent (Claude, Codex), pour laisser l'usage au back ; l'API 4314 du manager n'a pas
    été touchée.

## Contrat du back et usage dans le front
| Back (`docs/api-delegation.md`) | Front |
|---|---|
| `POST /api/runs` `delegation` (voie 1) | case « Autoriser les sous-agents » (`Composer.tsx`, filtre « Sous-agents ») ; `toApiInput` ajoute `acceptedAt` ; vérifié contre le vrai schéma : `{"accepted":true,"via":"bouton","total":4,"parallel":2,"acceptedAt":"…Z"}` enregistré, mission menée en mode agent |
| `GET /api/runs/:id` `family[]` | section « Sous-agents » du panneau Activité et ligne du fil |
| `GET /api/runs/:id` `activity` | « N agents en activité (missions et sous-agents), dont K en attente de toi » |
| événements `child_launched`, `child_done` | modèle, durée et ligne d'envoi de la tuile, journal de la mission |
| `child_state`, `delegation_accepted`, `delegation_declined`, `delegation_envelope_reached`, `delegation_extended`, `family_waiting` | journal de la mission ; ligne de la voie 2 dans le fil |
| `famille { racine, mere, titre }` d'une sous-mission | titre dans la barre latérale et la barre haute, icône sous-agent, « Revenir à la mission principale » |
| `POST /api/runs/:id/cancel` sur une sous-mission | « Arrêter » de la tuile |
| carte d'accord (voie 3) et question « 5 de plus » | carte « Demandes » existante (questions ordinaires) ; rien d'ajouté |

## Fichiers touchés
- `src/types.ts` : `FamilyMember`, champs de délégation de `Run`, `MissionInput.delegation` ; `Subagent` et
  `Run.subagents` retirés.
- `src/api.ts` : `toApiInput` envoie `delegation` avec `acceptedAt`, et rien quand la case est décochée.
- `src/ActivityPanel.tsx` :
  - tuiles depuis `family`, enrichies par les événements de la mère ;
  - « Ouvrir » et « Arrêter » réels ;
  - compteur `activity` ;
  - retour à la mission principale ;
  - `SubagentsLine` prend `family` ;
  - les lignes d'activité et le « bientôt » de la version précédente disparaissent : le back ne fournit pas de
    lignes, et l'arrêt existe.
- `src/ConnectionsPanel.tsx` : journal des événements de la famille.
- `src/App.tsx` :
  - « Ouvrir » et « Arrêter » branchés sur `openRun` et sur la route d'annulation ;
  - ligne de la voie 2 dans le fil ;
  - case décochée après un lancement ;
  - sous-missions titrées et marquées dans la barre latérale, titre de la sous-mission en barre haute.
- `src/Composer.tsx` : filtre « Sous-agents ».
- `src/v2.css` : styles correspondants ; règles des lignes d'activité et du « bientôt » retirées.
- `scripts/sous-agents-19-11-essai.mjs` (nouveau) : essai contre le back intégré.

## Tests ajoutés (17) et adaptés
`src/sous-agents.test.tsx` (13) :
- une tuile par membre de `family`, avec son état (y compris `en_file`), son attente et le compteur d'agents ; jamais
  la classe nue `waiting` (collision).
- clic sur une tuile : pleine largeur, « Ouvrir » et « Arrêter » appellent les bons identifiants, détails techniques.
- une sous-mission finie ne propose pas « Arrêter » ; la ligne d'envoi de son Bilan est dans les détails.
- la question d'une sous-mission est visible dans la tuile et se répond dans la sous-mission.
- « Arrêter » est inactif pendant une action en cours.
- sans `family`, ni section ni ligne dans le fil.
- ligne du fil : « 1 sous-agent en cours · 1/4 terminés · 1 attend ta réponse ».
- une sous-mission ouverte donne le lien vers sa mission principale.
- journal : accord (case, prompt), lancement suivi jusqu'à la fin, file, refus, attente de la mère.
- case non cochée par défaut, texte du back avec l'enveloppe ; cochée, accord par bouton 6 et 3.
- enveloppe dans les bornes du back ; décocher retire l'accord.
- en mode workflow, la case dit que la mission sera menée par un agent.
- requête : `acceptedAt` ajouté, aucun champ sans la case.

`src/sous-agents-app.test.tsx` (4) :
- la case cochée part avec la requête de lancement, puis se décoche.
- une tuile ouvre sa sous-mission ; « Arrêter » annule cette sous-mission seulement.
- barre latérale : une sous-mission est marquée « sous-agent ».
- voie 2 : la ligne du back s'affiche dans le fil (élément dédié : le « Journal en direct » brut contient déjà le JSON
  de l'événement, ce qui rendait la première version du test vraie à tort).

Adaptés :
- `activity-panel.test.tsx` : les 4 tests de tuiles de la forme du brief (`subagents`) sont retirés, remplacés par
  ceux ci-dessus ; le test du vocabulaire utilise `family`.
- `activity-panel-app.test.tsx` : la ligne des sous-agents utilise `family`. « Sans sous-agents, aucune ligne » vise
  le fil seul, car le composeur dit désormais « Autoriser les sous-agents ».

## Essai contre le back intégré (07:21)
`npm run build && node scripts/sous-agents-19-11-essai.mjs` (back : `~/Downloads/agregat-back-essai-13-11`, `b382dd2`)
```
✓ voie 1 acceptée par le schéma réel : {"accepted":true,"via":"bouton","total":4,"parallel":2,"acceptedAt":"2026-11-18T20:22:03.130Z"} ; mode agent
✓ la case est décochée pour la mission suivante
✓ GET /api/runs/:id du back : family = [{"titre":"Offres FICTIVES sur SEEK","state":"running","attend":null},{"titre":"Offres FICTIVES sur LinkedIn","state":"completed","attend":null},{"titre":"Offres FICTIVES sur Indeed","state":"awaiting_owner","attend":"question"}] ; activity = {"agents":1,"awaitingOwner":0}
✓ tuiles du panneau : ["En cours","Terminée","Attend ta réponse"]
✓ ligne du fil : « 1 sous-agent en cours · 1/3 terminés · 1 attend ta réponse »
✓ barre latérale : les 3 sous-missions sont marquées « sous-agent »
✓ changement en direct suivi : la ligne passe à 2/3 terminés, la tuile à « Terminée »
✓ sous-mission ouverte depuis sa tuile, puis retour à la mission principale
✓ aucune erreur de page
```
Captures : `essai-case-sous-agents-1440-light.png` (case et texte du back), `essai-famille-1440-light.png`,
`essai-famille-1440-dark.png`, `essai-famille-924-dark.png` (panneau ouvert, barre latérale effacée),
`essai-sous-mission-1440-light.png` (sous-mission ouverte : sa question, retour à la mission principale).

## e2e du panneau contre le back intégré (07:14)
`AGENT_PLATFORM_BACKEND_DIR=~/Downloads/agregat-back-essai-13-11 nice -n 10 node --test --test-concurrency=1 --test-name-pattern="visuel v2|maquette v3" tests/e2e.test.mjs`
```
✔ visuel v2 : barre flottante, panneau, pastille à la place de la saisie, retour en fin de mission (31793.268167ms)
✔ visuel v2 mobile : barre masquée, pas de débordement horizontal (19273.959417ms)
✔ maquette v3 : suivi de mission, résumé sous le résultat et paramètres réels (41803.009791ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 97573.909375
```
Les captures de `front-01-screens` que l'e2e réécrit ont été remises à l'identique. Suite e2e complète non lancée.

## Sortie `npm test` (07:21)
```
> agre-agent-frontend@0.1.0 test
> vitest run --maxWorkers=2 --color=false


 RUN  v5.0.5 /Users/diaw/Downloads/agregat-front/.claude/worktrees/bold-goldstine-171eb9


 Test Files  19 passed (19)
      Tests  281 passed (281)
   Start at  07:21:07
   Duration  33.69s (environment 40%, tests 39%, import 18%, transform 2%)

Environment  jsdom was created 19 times · 25.10s total, 40% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments
```

## Sortie `npm run build` (07:21)
```
> agre-agent-frontend@0.1.0 build
> tsc --noEmit && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 2389 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                           0.52 kB │ gzip:   0.32 kB
dist/assets/index-CDhpP79N.css                           47.07 kB │ gzip:  10.34 kB
dist/assets/array-BifhSqXX.js                             0.10 kB │ gzip:   0.11 kB
dist/assets/pie-XZMESJXO-DX8C4XBp.js                      0.10 kB │ gzip:   0.12 kB
dist/assets/info-OHQRW6UA-D10YVPyx.js                     0.10 kB │ gzip:   0.12 kB
dist/assets/radar-ABXABTNO-B_9CRaj1.js                    0.10 kB │ gzip:   0.12 kB
dist/assets/packet-JDAUHWVQ-DUFg1BdH.js                   0.11 kB │ gzip:   0.12 kB
dist/assets/cynefin-EF2NZ3EQ-BlvPH6TD.js                  0.11 kB │ gzip:   0.12 kB
dist/assets/treemap-SAJKECNS-D8uFbET6.js                  0.11 kB │ gzip:   0.12 kB
dist/assets/wardley-7MLQ67FV-CALNQEJh.js                  0.11 kB │ gzip:   0.12 kB
dist/assets/gitGraph-VSP46ZUC-CNNF3o7Z.js                 0.11 kB │ gzip:   0.12 kB
dist/assets/railroad-I3PHUGI6-CcNkHKor.js                 0.11 kB │ gzip:   0.12 kB
dist/assets/treeView-D4JQ5SDB-DyDBakss.js                 0.11 kB │ gzip:   0.12 kB
dist/assets/channel-CRd9fCVQ.js                           0.11 kB │ gzip:   0.12 kB
dist/assets/railroad-peg-JR7BVNR7-4nVPQAvi.js             0.11 kB │ gzip:   0.13 kB
dist/assets/architecture-WOLXFQ4H-DEImFOjP.js             0.11 kB │ gzip:   0.12 kB
dist/assets/railroad-abnf-LNEFI6M7-CZr-_-UM.js            0.11 kB │ gzip:   0.13 kB
dist/assets/railroad-ebnf-DWYD2UWJ-C3LJlwh-.js            0.11 kB │ gzip:   0.13 kB
dist/assets/eventmodeling-K75KTNOO-MrXkbAFF.js            0.11 kB │ gzip:   0.13 kB
dist/assets/init-C-OQMol4.js                              0.14 kB │ gzip:   0.12 kB
dist/assets/chunk-Y2CYZVJY-DsF7k-Jl.js                    0.15 kB │ gzip:   0.14 kB
dist/assets/chunk-2Q5K7J3B-C1jixKkw.js                    0.19 kB │ gzip:   0.16 kB
dist/assets/chunk-JWPE2WC7-DVXcaiue.js                    0.22 kB │ gzip:   0.17 kB
dist/assets/chunk-XXDRQBXY-Do1EyStr.js                    0.26 kB │ gzip:   0.22 kB
dist/assets/chunk-5VM5RSS4-ZNzvKenW.js                    0.36 kB │ gzip:   0.27 kB
dist/assets/flowDiagram-IUGLLWBU-BRZsSJrQ.js              0.56 kB │ gzip:   0.31 kB
dist/assets/chunk-VQ5W62QI-BN3u2sDW.js                    0.57 kB │ gzip:   0.40 kB
dist/assets/chunk-J5ZVWO5B-oDCd-gWO.js                    0.63 kB │ gzip:   0.43 kB
dist/assets/infoDiagram-MVDRKAX5-medQj9Xo.js              0.65 kB │ gzip:   0.41 kB
dist/assets/swimlanesDiagram-AYQRV4AK-IzPvP6qi.js         0.83 kB │ gzip:   0.48 kB
dist/assets/sizeCapture-INFHLROL-3uHXrFqA.js              0.87 kB │ gzip:   0.51 kB
dist/assets/chunk-DUW6YSOI-Dgx8z5s3.js                    0.89 kB │ gzip:   0.46 kB
dist/assets/line-Cq3lLuq_.js                              0.94 kB │ gzip:   0.47 kB
dist/assets/ordinal-BDEzSJ7C.js                           1.17 kB │ gzip:   0.56 kB
dist/assets/chunk-ZAUX2LTX-CccyZRFV.js                    1.41 kB │ gzip:   0.79 kB
dist/assets/railroadDiagram-Y72NRBL7-C2ZRhXt1.js          1.65 kB │ gzip:   0.76 kB
dist/assets/abnfDiagram-WEYOIA3C-DkQTcPYG.js              1.84 kB │ gzip:   0.89 kB
dist/assets/chunk-UHW7PFBP-D8zuMm3E.js                    1.95 kB │ gzip:   0.95 kB
dist/assets/chunk-55XCU76K-BtvyELjE.js                    1.97 kB │ gzip:   0.88 kB
dist/assets/pegDiagram-ECIUJNBX-WHxyoSS4.js               2.01 kB │ gzip:   0.94 kB
dist/assets/ebnfDiagram-V4P3TTPT-vgWLlvOa.js              2.05 kB │ gzip:   0.89 kB
dist/assets/dist-DS8Sk9o1.js                              2.16 kB │ gzip:   0.96 kB
dist/assets/path-fybaL0A-.js                              2.27 kB │ gzip:   0.98 kB
dist/assets/arc-DBhZeXNJ.js                               3.47 kB │ gzip:   1.46 kB
dist/assets/diagram-I5XIIV2D-DePh3nQu.js                  4.34 kB │ gzip:   1.89 kB
dist/assets/defaultLocale-BFoDCU3G.js                     4.63 kB │ gzip:   2.12 kB
dist/assets/chunk-4EMNKR2T-B-EXRia0.js                    5.43 kB │ gzip:   2.50 kB
dist/assets/linear-o9FFbpWS.js                            5.51 kB │ gzip:   2.25 kB
dist/assets/chunk-YZO67HFG-BEJHZ7s-.js                    5.83 kB │ gzip:   2.68 kB
dist/assets/diagram-RJA3I4VV-SevRjbXa.js                  6.07 kB │ gzip:   2.56 kB
dist/assets/pieDiagram-GNMPY74T-DuhBKnuh.js               6.22 kB │ gzip:   2.59 kB
dist/assets/diagram-ODIL2UCW-D7uXMjPR.js                  8.12 kB │ gzip:   3.64 kB
dist/assets/cynefinDiagram-WF24UDRP-CX2eJrWi.js           9.94 kB │ gzip:   3.51 kB
dist/assets/chunk-ZCHMQSOR-LJ_q4vc6.js                   10.38 kB │ gzip:   4.32 kB
dist/assets/diagram-PFBEJUXE-CWVjJOg1.js                 10.92 kB │ gzip:   4.25 kB
dist/assets/chunk-HNE4Q36P-CmERlsd7.js                   14.84 kB │ gzip:   4.19 kB
dist/assets/chunk-2E7WHVMD-Bi9IJBqq.js                   15.64 kB │ gzip:   4.35 kB
dist/assets/diagram-CBK3MWTC-BjP0uGZ7.js                 15.75 kB │ gzip:   5.52 kB
dist/assets/mermaid-parser.core-DsHzD236.js              16.44 kB │ gzip:   3.92 kB
dist/assets/ishikawaDiagram-HPEHV2GE-DYNgKZHk.js         17.30 kB │ gzip:   6.53 kB
dist/assets/kanban-definition-FNSA4HC5-DqsW0HSR.js       20.26 kB │ gzip:   7.15 kB
dist/assets/sankeyDiagram-SY24JHO5-BUeie4w7.js           22.79 kB │ gzip:   8.26 kB
dist/assets/journeyDiagram-BOSHW7O7-Bj5KHXwu.js          23.15 kB │ gzip:   8.16 kB
dist/assets/mindmap-definition-6OY57UG3-BiK3ZHnx.js      23.66 kB │ gzip:   8.06 kB
dist/assets/graphlib-DS17s2tU.js                         23.90 kB │ gzip:   8.31 kB
dist/assets/wardleyDiagram-IVAIDKWA-BrJ-mQAj.js          25.20 kB │ gzip:   6.54 kB
dist/assets/rough.esm-Dy-Kn_BL.js                        27.10 kB │ gzip:   8.85 kB
dist/assets/gitGraphDiagram-PDYL7XHY-CaOc8VL3.js         29.01 kB │ gzip:   8.55 kB
dist/assets/chunk-7S6XSTFO-BOnaWGY-.js                   30.36 kB │ gzip:   8.44 kB
dist/assets/timeline-definition-JXYKGLGB-BQmpYDCr.js     30.45 kB │ gzip:  10.03 kB
dist/assets/erDiagram-KYQIGQAA-DUiu9q7c.js               30.65 kB │ gzip:  10.57 kB
dist/assets/requirementDiagram-EQYSW5RA-fqO3hm41.js      31.07 kB │ gzip:   9.82 kB
dist/assets/quadrantDiagram-D57K4MC3-BenHkDse.js         33.52 kB │ gzip:   9.74 kB
dist/assets/chunk-WQQL4CDK-KUP-lYay.js                   37.88 kB │ gzip:   8.20 kB
dist/assets/vennDiagram-Q3Y3IDCW-DasPT9qT.js             41.18 kB │ gzip:  15.11 kB
dist/assets/stateDiagram-v2-A6IESKWZ-DbEDggmT.js         41.55 kB │ gzip:  13.89 kB
dist/assets/blockDiagram-RJAE7QA3-DTvSLPgk.js            42.42 kB │ gzip:  13.87 kB
dist/assets/xychartDiagram-4URNHDU4-CXSvOOim.js          44.52 kB │ gzip:  12.35 kB
dist/assets/src-Du8GWxwf.js                              45.66 kB │ gzip:  15.99 kB
dist/assets/dagre-NK4GIZVX-BJ8hx7hR.js                   47.83 kB │ gzip:  17.10 kB
dist/assets/classDiagram-v2-4MYWR3UA-DljB8a6r.js         49.70 kB │ gzip:  16.15 kB
dist/assets/chunk-AQDTSKZB-PMCojYJ8.js                   51.23 kB │ gzip:  16.63 kB
dist/assets/chunk-NQOKRVIF-CGN6VvNN.js                   62.79 kB │ gzip:  20.36 kB
dist/assets/c4Diagram-XDPPPE54-D-UrcDRP.js               65.08 kB │ gzip:  18.60 kB
dist/assets/ganttDiagram-R7GPNTJY-X4G1jRih.js            70.01 kB │ gzip:  23.00 kB
dist/assets/diagram-TYUNFSNR-B4TEc1en.js                 80.44 kB │ gzip:  25.15 kB
dist/assets/cose-bilkent-JH36ORCC-DfBXAAHo.js            81.21 kB │ gzip:  21.51 kB
dist/assets/mermaid.core-XUyWGesE.js                     84.65 kB │ gzip:  29.29 kB
dist/assets/swimlanes-B3ENRKFQ-DfaPBz-h.js              106.42 kB │ gzip:  36.21 kB
dist/assets/chunk-HAGFOTED-CCMEtGiG.js                  115.46 kB │ gzip:  29.25 kB
dist/assets/sequenceDiagram-BLEHNHQU-DDbw4Dx9.js        117.67 kB │ gzip:  31.38 kB
dist/assets/architectureDiagram-ZHVYKT53-C72_dX4I.js    148.87 kB │ gzip:  41.10 kB
dist/assets/usecaseDiagram-WPOLBNNX-BqUUEGFo.js         187.90 kB │ gzip:  49.20 kB
dist/assets/chunk-DSNLSHJZ-Bdta8k59.js                  241.36 kB │ gzip:  40.32 kB
dist/assets/katex-B_JcIwqj.js                           258.80 kB │ gzip:  77.65 kB
dist/assets/cytoscape.esm-Bn1wUjr1.js                   434.71 kB │ gzip: 137.73 kB
dist/assets/index-DDv_CAQW.js                           502.31 kB │ gzip: 154.65 kB
dist/assets/chunk-NGNAAXSQ-Bw6tHVuc.js                  629.04 kB │ gzip: 127.32 kB
dist/assets/elk-QONTBCTQ-Cv-UfuEq.js                  1,462.86 kB │ gzip: 455.87 kB

✓ built in 3.85s
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

## Écarts et limites
1. Le brief `activity-panel-03` voulait, dans la tuile, les trois dernières lignes d'activité et des étapes ✓ • ○. Le
   back ne les donne pas dans `family`. `dernierOutil` existe dans `mission_suivre`, l'outil du chef, mais pas dans
   `GET /api/runs/:id`. La tuile montre l'état, l'attente et la durée ; le détail se lit en ouvrant la sous-mission.
2. Les sous-missions restent des entrées à part dans la barre latérale (`GET /api/runs` les liste), marquées et titrées,
   non regroupées sous leur mère.
3. `activity.agents` compte tous les agents de la machine (définition du back), pas seulement la famille ; la phrase
   le dit (« missions et sous-agents »).
4. La durée d'une tuile vient des événements de la mère (`child_launched` → `child_done`). Si le front a écarté ces
   événements (plus de 500 événements gardés), la durée manque, sans valeur inventée.

## Questions pour le manager et le propriétaire
1. Faut-il que le back ajoute `dernierOutil` (ou une courte activité) à `family`, pour retrouver les lignes d'activité
   des tuiles prévues par la maquette ?
2. Faut-il regrouper les sous-missions sous leur mère dans la barre latérale ?
3. Essai réel avec un vrai chef (Claude ou Codex) sur l'API du manager, pour voir la carte d'accord, « 5 de plus » et
   « Arrêter » en vrai : à faire par le manager, qui a la priorité sur ce serveur ?

