# conversation-02 — le tour compact remplace la vue « Exécution »

Brief : `design_handoff_conversation_agent/BRIEF-conversation-02.md` (commit `158301d` [handoff]). Le README et les captures du handoff n'ont pas été fournis : seules les valeurs du brief font foi.

## Journal
- 04:45 Captures « avant » en sombre, 1280×800, prises sur le code de `0f87b40` (skill-chip-01 inclus, conversation-02 pas encore commencé) : `conversation-02/avant-1-en-cours.png`, `avant-2-accord-en-attente.png`, `avant-3-terminee.png`. Script : `conversation-02/capture.mjs` (backend fixture dans le processus et Vite dev, ports aléatoires, données fictives). « En cours » a été capturé avant l'affichage de l'accord.
- 04:46 Inventaire des tests qui passent par la branche « hors career-ops » d'`App`, donc par la future `RunTurn` :
  - Tests unitaires : aucun test d'`App.test.tsx` ne cherche un badge, `UsageCard`, « Exécution » ou un bouton d'accord du fil. Les tests qui rendent `RunView` directement (`components.test.tsx`, `affichage.test.tsx`) ne changent pas, puisque `RunView` reste exporté et inchangé dans son rendu.
  - E2E (`tests/e2e.test.mjs`) : plusieurs vérifications ciblent la vue « Exécution ». Elles sont adaptées et listées plus bas.
- 04:47 Tests rouges écrits dans `src/RunTurn.test.tsx` (nouveau fichier, 13 tests : branche d'`App`, `RunTurn`, `Tracker`). Résultat avant le code : **13/13 rouges**, pour les bonnes raisons (`App` rend encore `RunView`, `RunTurn` n'existe pas, ligne « Données » et journal brut absents) :
```text
     × aucun badge, aucune progression, aucune carte de consommation, un seul .agent-turn 1401ms
     × permission en attente : boutons dans .agent-turn, même endpoint et mêmes options 8ms
     × étape en attente d'accord : Approuver et Refuser appellent le même endpoint qu'avant 4ms
     × étape incertaine : mêmes actions qu'avant 2ms
     × étapes du workflow : une ligne repliable « Étape i/n · titre en cours » 2ms
     × erreur : une ligne .danger dans le tour 2ms
     × résultat fictif : synthèse, « Données fictives », offres et preuves repliées 2ms
     × résultat réel : pas de mention « Données fictives » 1ms
     × Reprendre : bouton pill, même endpoint qu'avant 2ms
     × Arrêter la mission reste rendu (masqué en .run-active par la feuille) et garde son endpoint 2ms
     × pastille de skill juste avant .agent-turn quand la mission tourne 2ms
     × trackerDetails contient la ligne « Données » avec le texte d'aujourd'hui 2ms
     × Détails techniques : journal brut replié sous la grille 8ms
⎯⎯⎯⎯⎯⎯ Failed Tests 13 ⎯⎯⎯⎯⎯⎯⎯
      Tests  13 failed (13)
```
- 04:49 Code (voir « Ce qui a été fait »). Premier passage : 12/13. Le test « résultat fictif » a trouvé un `.badge` : le badge « Sponsoring » des cartes d'offres. Corrigé dans le tour compact (mêmes mots, en `small.warning`). Ensuite 13/13, et la suite complète à 174/174 **sans modifier aucun test unitaire existant**.
- 04:50 E2E sur le nouveau code : 11/15. Les 4 échecs visaient l'ancienne vue (voir « Tests existants adaptés »).
- 04:52 Après adaptation, l'e2e est à 14/15. Échec restant : « SSE réel », assertion « Reconnexion native avec Last-Event-ID ». Cause : pendant la coupure, `App` rafraîchit le run par l'API et remplace « Connexion perdue · reconnexion… » par « API reconnectée · journal synchronisé ». Le message de perte disparaissait donc avant la reconnexion SSE native. Le test attend maintenant la requête de reconnexion elle-même, puis la disparition du message.
- 04:54 E2E : **15/15**. Les captures suivies de `front-01-screens/`, régénérées par l'e2e, ont été remises à leur état d'origine après chaque passage (`git checkout`), car elles sont hors du périmètre.
- 04:55 Captures « après » en sombre : `conversation-02/apres-1-en-cours.png`, `apres-2-accord-en-attente.png`, `apres-3-terminee.png`.
- 04:55 Contrôle : dans `apres-3`, la zone de saisie est dépliée (réglages de session, filtres), alors qu'elle était compacte dans `avant-3`. J'ai vérifié sur l'ancien code (`git stash`) en descendant en bas du fil : l'état déplié est identique (`controle-avant-3-terminee-en-bas.png`). Ce n'est pas une régression. Dans `avant-3`, la zone était compacte seulement parce que le fil, plus long, n'était pas en bas.
- 04:56 Vérifications finales (sorties réelles ci-dessous) : `npm test` 174/174, `npm run build` code 0, prettier propre. Backend non modifié (`git status` du back : 0 fichier modifié), donc pas de `npm test` à relancer côté back.

## Ce qui a été fait
- **`src/Mission.tsx` : nouveau composant exporté `RunTurn`.** Une seule carte `.agent-turn`, précédée de `SkillChip` quand la mission tourne. Elle contient :
  1. `AgentActivity`.
  2. Les étapes du workflow, sur une ligne repliable `details.fold.tool-group` « Étape i/n · titre en cours ». Une fois dépliée, la liste affiche ✓ ✕ • ○. Les marques viennent de `trackerItems()` ; une étape en attente d'accord prend « • ».
  3. `SkillSteps`, conservé hors career-ops comme avant.
  4. Les accords d'étape et les permissions, en bandeaux `.inline-approval` (`section` avec les mêmes `aria-label` : « Votre accord est requis » et « Permission agent »). Le compte à rebours reste en `<small role="timer">`. Le JSON de la demande est dans un `details.fold` « Détails de la demande », replié.
  5. La perte de connexion, en `small.danger`.
  6. `run.error`, sur une ligne `p.danger` : « Mission incomplète : … » ou « <label> · <erreur> ».
  7. Le résultat : synthèse `Markdown`, `<small className="warning">Données fictives</small>` si `result.simulated`, offres dans « Voir les N offres » et preuves dans « Preuves · N », repliées.
  8. « Arrêter la mission » (classe `stop-mission`, toujours masquée en `.run-active` par la feuille) et « Reprendre » en pilule.
- **Endpoints des boutons d'accord strictement identiques.** Les boutons sont extraits dans `StepActions` et `PermissionActions`, utilisés à la fois par `RunView` et par `RunTurn` :
  - accord d'étape : `act("/runs/<id>/steps/<step>", { approved: true | false })` ;
  - étape incertaine : `act("/runs/<id>/steps/<step>", { action: "retry" | "done" | "fail" })` ;
  - permission : `act("/permissions/<id>", { optionId })`, avec seulement `allow_once`, `reject_once` et `reject_always` ; « Autoriser toujours » n'est jamais proposé.
  Les tests de `RunView` (`components.test.tsx`, `affichage.test.tsx`) et ceux de `RunTurn` vérifient ces appels.
- **`RunView` reste exporté et rend la même chose.** Seules ses parties partagées sont factorisées (`useNow`, `StepActions`, `PermissionActions`, `countdown`, `Opportunities`, `dataLabel`). Il sert toujours dans CareerThread › Détails techniques et dans les tests.
- **`src/Tracker.tsx`.** `dataModeLabel` et `dataLabel(run, events)` y sont déplacés : même texte qu'avant (« Page observée · preuves navigateur », portée de vérification du backend si `unverified`, sinon le libellé du mode), jamais plus large. `trackerDetails()` gagne la ligne ["Données", …]. Détails techniques gagne, sous la grille, un `<details className="event-log">` « Journal brut · N entrées », replié.
- **`src/App.tsx`.** La branche hors career-ops rend `RunTurn` au lieu de `RunView`.
- **`src/v2.css`.** CSS du brief (`.inline-approval` et ses enfants, `.agent-turn` en colonne flex avec 8px d'écart), plus une règle hors brief, signalée plus bas.
- **Défaut B3 de maquette-ecarts-01 réglé.** Les points de « Réflexion… » sont maintenant dans la carte et suivent sa marge intérieure.

## Tests existants adaptés (tous dans `tests/e2e.test.mjs`, aucun test unitaire)
1. « production réelle… » : l'attente de la région « Exécution » devient une attente de `.thread .agent-turn`. `.results` /DONNÉES FICTIVES/ devient /Données fictives/. `.usage-card` /Intègre/ dans le fil devient : aucune `.usage-card` dans `.thread`, et /Intègre/ dans `.panel-cost`. `.timeline-heading` puis `.event-log` devient Suivi › Détails techniques › « Journal brut » (/step/).
2. « accord du workflow application-draft… » : `.approval` /Aucun envoi/ devient `.inline-approval`. « Reprendre le workflow » devient « Reprendre ». `.review-output` est inchangé : le brouillon reste visible avant de décider.
3. « SSE réel… » : « Flux en direct » n'est plus affiché. Le test attend la requête SSE avec `Last-Event-ID`, puis la disparition de « Connexion perdue · reconnexion… ». L'assertion de reconnexion est inchangée.
4. « Markdown non fiable… » : aucune modification du test. C'est le code qui garde la classe `.results` sur le bloc résultat de `RunTurn`. Sinon, `.results script` et `.results a[href^=javascript]` seraient devenus des vérifications vides, toujours vraies.

## Décisions hors brief, à valider par le manager
- **Brouillon à relire.** L'ancienne carte d'accord montrait le contenu à relire (`.review-output`). Le bandeau du brief n'a qu'un titre court : je l'ai gardé juste sous le bandeau, dans un `details.fold` « À relire avant de décider », **ouvert par défaut**. Sans lui, on approuverait un brouillon sans le voir.
- **Texte d'aide de l'accord.** « Relisez le brouillon avant de valider. Aucun envoi ne sera effectué. » (ou le texte d'une étape incertaine) est conservé en `<small>` dans le bandeau. Le brief donne la règle CSS `small { flex-basis: 100% }`.
- **Pilule « Reprendre ».** La règle `.agent-turn > .resume` (26px de haut, rayon 13px, 12px) est un ajout à `v2.css` : le brief demande une « pilule » sans en donner le CSS. Les valeurs viennent de l'export de maquette du 28/10.
- **Badge « Sponsoring » des offres.** Dans le tour compact, il est rendu en `small.warning`, avec les mêmes mots, à cause de la règle « aucun badge dans le fil ». `RunView` garde le badge.
- **Ce qui disparaît du fil.** Les badges « Offres réelles · sources citées » / « Résultat agent » et « Analyse : … » ne sont plus affichés. La vérification et la provenance restent dans Suivi › Détails techniques ; « Analyse » n'a pas d'équivalent. **Question : faut-il l'ajouter à `trackerDetails()` ?**
- **Statut de connexion.** Seule la perte de connexion s'affiche dans le tour. « Flux en direct » et « Journal synchronisé » ne sont plus visibles nulle part.
- **Animations.** `.inline-approval` et sa pastille n'ont pas été ajoutées au bloc `prefers-reduced-motion` de `v2.css` (le brief ne le demande pas). Le bloc global de `style.css` coupe déjà toutes les animations, avec `!important`.

## Sorties finales réelles
### npm test
```text

> agre-agent-frontend@0.1.0 test
> vitest run


 RUN  v5.0.5 /home/user/agregat-front-git


 Test Files  12 passed (12)
      Tests  174 passed (174)
   Start at  04:56:06
   Duration  6.70s (tests 53%, environment 33%, import 12%, transform 1%)

Environment  jsdom was created 12 times · 6.03s total, 33% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

CODE_SORTIE=0
```
### npm run build
```text

> agre-agent-frontend@0.1.0 build
> tsc --noEmit && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 2383 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                           0.52 kB │ gzip:   0.32 kB
dist/assets/index-E5dhoLUW.css                           43.01 kB │ gzip:   9.57 kB
dist/assets/array-BifhSqXX.js                             0.10 kB │ gzip:   0.11 kB
dist/assets/pie-XZMESJXO-C5Tsbnz2.js                      0.10 kB │ gzip:   0.12 kB
dist/assets/info-OHQRW6UA-DZI-x4u3.js                     0.10 kB │ gzip:   0.12 kB
dist/assets/radar-ABXABTNO-D9KuFN3K.js                    0.10 kB │ gzip:   0.12 kB
dist/assets/packet-JDAUHWVQ-Bmx2X02I.js                   0.11 kB │ gzip:   0.12 kB
dist/assets/cynefin-EF2NZ3EQ-DN5A8SoT.js                  0.11 kB │ gzip:   0.12 kB
dist/assets/treemap-SAJKECNS-DxA6z5Z8.js                  0.11 kB │ gzip:   0.12 kB
dist/assets/wardley-7MLQ67FV-DwJ2eyxk.js                  0.11 kB │ gzip:   0.12 kB
dist/assets/gitGraph-VSP46ZUC-Cr7WGXcR.js                 0.11 kB │ gzip:   0.12 kB
dist/assets/railroad-I3PHUGI6-CgZXFvHG.js                 0.11 kB │ gzip:   0.12 kB
dist/assets/treeView-D4JQ5SDB-Ci27kfTS.js                 0.11 kB │ gzip:   0.12 kB
dist/assets/channel-C7y-k60j.js                           0.11 kB │ gzip:   0.12 kB
dist/assets/railroad-peg-JR7BVNR7-NUMUK0Kz.js             0.11 kB │ gzip:   0.13 kB
dist/assets/architecture-WOLXFQ4H-B1t5gNj9.js             0.11 kB │ gzip:   0.12 kB
dist/assets/railroad-abnf-LNEFI6M7-BAdXBF5w.js            0.11 kB │ gzip:   0.13 kB
dist/assets/railroad-ebnf-DWYD2UWJ-BHghpSNs.js            0.11 kB │ gzip:   0.13 kB
dist/assets/eventmodeling-K75KTNOO-CNVeOVS3.js            0.11 kB │ gzip:   0.13 kB
dist/assets/init-C-OQMol4.js                              0.14 kB │ gzip:   0.12 kB
dist/assets/chunk-Y2CYZVJY-DsF7k-Jl.js                    0.15 kB │ gzip:   0.14 kB
dist/assets/chunk-2Q5K7J3B-C1jixKkw.js                    0.19 kB │ gzip:   0.16 kB
dist/assets/chunk-JWPE2WC7-DVXcaiue.js                    0.22 kB │ gzip:   0.17 kB
dist/assets/chunk-XXDRQBXY-kTwbnBiL.js                    0.26 kB │ gzip:   0.22 kB
dist/assets/chunk-5VM5RSS4-ZNzvKenW.js                    0.36 kB │ gzip:   0.27 kB
dist/assets/flowDiagram-IUGLLWBU-D1j2VkAz.js              0.56 kB │ gzip:   0.31 kB
dist/assets/chunk-VQ5W62QI-roxV7dGo.js                    0.57 kB │ gzip:   0.40 kB
dist/assets/chunk-J5ZVWO5B-oDCd-gWO.js                    0.63 kB │ gzip:   0.43 kB
dist/assets/infoDiagram-MVDRKAX5-Drq51s5G.js              0.65 kB │ gzip:   0.41 kB
dist/assets/swimlanesDiagram-AYQRV4AK-BMJW-Wzv.js         0.83 kB │ gzip:   0.48 kB
dist/assets/sizeCapture-INFHLROL-3uHXrFqA.js              0.87 kB │ gzip:   0.51 kB
dist/assets/chunk-DUW6YSOI-Dgx8z5s3.js                    0.89 kB │ gzip:   0.46 kB
dist/assets/line-BqK31IFh.js                              0.94 kB │ gzip:   0.47 kB
dist/assets/ordinal-BDEzSJ7C.js                           1.17 kB │ gzip:   0.56 kB
dist/assets/chunk-ZAUX2LTX-CRTHzOZQ.js                    1.41 kB │ gzip:   0.79 kB
dist/assets/railroadDiagram-Y72NRBL7-Bin13Enz.js          1.65 kB │ gzip:   0.77 kB
dist/assets/abnfDiagram-WEYOIA3C-B4t_Nu_1.js              1.84 kB │ gzip:   0.89 kB
dist/assets/chunk-UHW7PFBP-iDX5NlDO.js                    1.95 kB │ gzip:   0.95 kB
dist/assets/chunk-55XCU76K-Cg6GRDAs.js                    1.97 kB │ gzip:   0.88 kB
dist/assets/pegDiagram-ECIUJNBX-DPRlOkR-.js               2.01 kB │ gzip:   0.94 kB
dist/assets/ebnfDiagram-V4P3TTPT-CqXCReZM.js              2.05 kB │ gzip:   0.88 kB
dist/assets/dist-CsrtVO1v.js                              2.16 kB │ gzip:   0.96 kB
dist/assets/path-fybaL0A-.js                              2.27 kB │ gzip:   0.98 kB
dist/assets/arc-CUFzWnR2.js                               3.47 kB │ gzip:   1.46 kB
dist/assets/diagram-I5XIIV2D-DayxCy10.js                  4.34 kB │ gzip:   1.89 kB
dist/assets/defaultLocale-BFoDCU3G.js                     4.63 kB │ gzip:   2.12 kB
dist/assets/chunk-4EMNKR2T-CSPUKhV7.js                    5.43 kB │ gzip:   2.50 kB
dist/assets/linear-BVArLEJ_.js                            5.51 kB │ gzip:   2.25 kB
dist/assets/chunk-YZO67HFG-CYQTjzjy.js                    5.83 kB │ gzip:   2.68 kB
dist/assets/diagram-RJA3I4VV-DQpmm-Ms.js                  6.07 kB │ gzip:   2.56 kB
dist/assets/pieDiagram-GNMPY74T-DcFpsvpG.js               6.22 kB │ gzip:   2.59 kB
dist/assets/diagram-ODIL2UCW-BQHxJtml.js                  8.12 kB │ gzip:   3.64 kB
dist/assets/cynefinDiagram-WF24UDRP-JmVVZOUp.js           9.94 kB │ gzip:   3.51 kB
dist/assets/chunk-ZCHMQSOR-BJqfXDNW.js                   10.38 kB │ gzip:   4.31 kB
dist/assets/diagram-PFBEJUXE-DI-lZxsL.js                 10.92 kB │ gzip:   4.25 kB
dist/assets/chunk-HNE4Q36P-CeAktC5d.js                   14.84 kB │ gzip:   4.19 kB
dist/assets/chunk-2E7WHVMD-rHQIlYNt.js                   15.64 kB │ gzip:   4.35 kB
dist/assets/diagram-CBK3MWTC-Jxs7wDg0.js                 15.75 kB │ gzip:   5.52 kB
dist/assets/mermaid-parser.core-DoeXZ4vG.js              16.44 kB │ gzip:   3.92 kB
dist/assets/ishikawaDiagram-HPEHV2GE-DL-zZFM3.js         17.30 kB │ gzip:   6.53 kB
dist/assets/kanban-definition-FNSA4HC5-C0vDAhNZ.js       20.26 kB │ gzip:   7.15 kB
dist/assets/sankeyDiagram-SY24JHO5-Ck9SWtf7.js           22.79 kB │ gzip:   8.25 kB
dist/assets/journeyDiagram-BOSHW7O7-BlGGT-mL.js          23.15 kB │ gzip:   8.16 kB
dist/assets/mindmap-definition-6OY57UG3-C-y2vcEM.js      23.66 kB │ gzip:   8.06 kB
dist/assets/graphlib-DS17s2tU.js                         23.90 kB │ gzip:   8.31 kB
dist/assets/wardleyDiagram-IVAIDKWA-CpsQnR3n.js          25.20 kB │ gzip:   6.54 kB
dist/assets/rough.esm-Dy-Kn_BL.js                        27.10 kB │ gzip:   8.85 kB
dist/assets/gitGraphDiagram-PDYL7XHY-CEmpfaqU.js         29.01 kB │ gzip:   8.55 kB
dist/assets/chunk-7S6XSTFO-DDox8TbL.js                   30.36 kB │ gzip:   8.44 kB
dist/assets/timeline-definition-JXYKGLGB-D7MmcgS6.js     30.45 kB │ gzip:  10.03 kB
dist/assets/erDiagram-KYQIGQAA-0mRYEp0U.js               30.65 kB │ gzip:  10.57 kB
dist/assets/requirementDiagram-EQYSW5RA-BxdWYmgL.js      31.07 kB │ gzip:   9.82 kB
dist/assets/quadrantDiagram-D57K4MC3-Co497orx.js         33.52 kB │ gzip:   9.74 kB
dist/assets/chunk-WQQL4CDK-DR-l-r5R.js                   37.88 kB │ gzip:   8.20 kB
dist/assets/vennDiagram-Q3Y3IDCW-D2TIR0EJ.js             41.18 kB │ gzip:  15.11 kB
dist/assets/stateDiagram-v2-A6IESKWZ-yWgTFAZb.js         41.55 kB │ gzip:  13.89 kB
dist/assets/blockDiagram-RJAE7QA3-CQft-NfL.js            42.42 kB │ gzip:  13.87 kB
dist/assets/xychartDiagram-4URNHDU4-deWoArjM.js          44.52 kB │ gzip:  12.35 kB
dist/assets/src-Bi_xTAbw.js                              45.66 kB │ gzip:  15.99 kB
dist/assets/dagre-NK4GIZVX-D8QXTrZz.js                   47.83 kB │ gzip:  17.10 kB
dist/assets/classDiagram-v2-4MYWR3UA-D5b7cUgF.js         49.70 kB │ gzip:  16.15 kB
dist/assets/chunk-AQDTSKZB-BwCXbloF.js                   51.23 kB │ gzip:  16.63 kB
dist/assets/chunk-NQOKRVIF-CKth3lx3.js                   62.79 kB │ gzip:  20.36 kB
dist/assets/c4Diagram-XDPPPE54-C2Z_f2ww.js               65.08 kB │ gzip:  18.61 kB
dist/assets/ganttDiagram-R7GPNTJY-D3ybgV8D.js            70.01 kB │ gzip:  23.00 kB
dist/assets/diagram-TYUNFSNR-Bi_p1MQW.js                 80.44 kB │ gzip:  25.15 kB
dist/assets/cose-bilkent-JH36ORCC-DS0019vW.js            81.21 kB │ gzip:  21.51 kB
dist/assets/mermaid.core-JfVLOf9-.js                     84.65 kB │ gzip:  29.28 kB
dist/assets/swimlanes-B3ENRKFQ-BuRNXZe8.js              106.42 kB │ gzip:  36.21 kB
dist/assets/chunk-HAGFOTED-BYGdaDYA.js                  115.46 kB │ gzip:  29.24 kB
dist/assets/sequenceDiagram-BLEHNHQU-XGO6NEQE.js        117.67 kB │ gzip:  31.38 kB
dist/assets/architectureDiagram-ZHVYKT53-C7a7Cckn.js    148.87 kB │ gzip:  41.10 kB
dist/assets/usecaseDiagram-WPOLBNNX-Cx6ll6PM.js         187.90 kB │ gzip:  49.20 kB
dist/assets/chunk-DSNLSHJZ-DWvpt-vt.js                  241.36 kB │ gzip:  40.31 kB
dist/assets/katex-B_JcIwqj.js                           258.80 kB │ gzip:  77.65 kB
dist/assets/cytoscape.esm-Bn1wUjr1.js                   434.71 kB │ gzip: 137.73 kB
dist/assets/index-CV3nTOvr.js                           474.29 kB │ gzip: 144.66 kB
dist/assets/chunk-NGNAAXSQ-Bw6tHVuc.js                  629.04 kB │ gzip: 127.32 kB
dist/assets/elk-QONTBCTQ-DFy6BM9S.js                  1,462.86 kB │ gzip: 455.86 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 2.75s
CODE_SORTIE=0
```
### npx prettier --check src tests
```text
Checking formatting...
All matched files use Prettier code style!
CODE_SORTIE=0
```
### npm run test:e2e (dernier passage)
```text
ok 1 - CV FICTIF : dépôt sur la fenêtre et bouton d'ajout visible en mode compact
ok 2 - production réelle : accueil, filtres, plan → SSE → résultats, historique et galeries
ok 3 - accord du workflow application-draft, refus puis reprise en place
ok 4 - budget réel : estimation puis refus serveur, aucune mission créée
ok 5 - thème sombre persistant, mobile sans débordement et navigation clavier
ok 6 - proxy Vite : mutation avec Origin frontend réécrit, sécurité backend maintenue
ok 7 - SSE réel : coupure réseau, reconnexion et revue après réouverture de la mission
ok 8 - défilement FICTIF : le composeur ne boucle pas après une petite remontée
ok 9 - Markdown non fiable et Mermaid sous CSP de production, sans chargement externe
ok 10 - Skills réels : source Git refusée, quarantaine, revue par hash et activation
ok 11 - permission ACP réelle : décision ponctuelle, autorisation permanente masquée
ok 12 - visuel v2 : barre flottante, panneau, pastille à la place de la saisie, retour en fin de mission
ok 13 - visuel v2 mobile : barre masquée, pas de débordement horizontal
ok 14 - maquette v3 : suivi de mission, résumé sous le résultat et paramètres réels
ok 15 - conversation relancée : les tours passés restent dans le fil, avec leur détail
# tests 15
# pass 15
# fail 0
```

## Limites
- E2E et captures exécutés dans le conteneur Linux : Chromium du conteneur au lieu du Chrome macOS (via un lien symbolique hors dépôt), sans SF Pro.
- Le test unitaire instable de `App.test.tsx` relevé dans skill-chip-01 n'a pas réapparu ici (174/174), mais il n'est pas corrigé.
