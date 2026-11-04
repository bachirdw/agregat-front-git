# verif-01 — dossier de preuves pour la vérification du rendu

Aucun fichier de `src/` modifié. Aucun push. Tout est en données fictives (backend en mode fixture, sans réseau ni appel payant).

## Garde-fou : session principale
- Avant de commencer : `ps` et `ss` dans ce conteneur cloud ne montrent aucun serveur à l'écoute ni aucune autre session Claude. La session principale, qui travaille sur le backend, tourne ailleurs. Rien de ce qui suit ne peut l'interrompre.
- `agregat-back-git` est seulement **lu** : import de `apps/api/server.js` dans le processus, avec un `dataDir` temporaire dans `/tmp` supprimé à la fin. `git status` du back est propre avant et après.
- Port 4310 non utilisé (backend fixture sur un port aléatoire). `npm run dev` est lancé dans son propre groupe de processus, puis seul ce groupe est arrêté (`kill -TERM -<pgid>`). Aucun `pkill` ni `killall`.

## git log --oneline -15
```text
d349d88 [maquette-ecarts-01] Rapport des écarts maquette du 28/10 / app, captures et scripts
c013a07 Merge pull request #1 from bachirdw/front-affichage-03-11
fa36383 Captures de test régénérées par les tests de bout en bout
f340c10 [front-affichage-03-11] Rapport : vérifications réelles et limites
048953a [front-affichage-03-11] Corriger dix défauts d'affichage vus sur une mission career-ops réelle
46d1233 [fil-conversation] Garder les tours passés et le texte entier dans le fil
31ee73e Captures de test régénérées par les tests de bout en bout
85d6352 [audit-claude-cloud] Tableau : une session non rechargée n'est plus dite introuvable
00bc9d6 [front-v2] Signaler une session perdue dans le tableau des événements
e23ca47 [front-v2] Le tableau garde les outils et les états sur les longues missions
47bdc93 [front-v2] Visuel de la maquette v3 sur les données réelles de l'API
d95374a [front-v2] Base : instantané du travail en cours sur le panneau Connexions locales
8b98ec6 [fix-open-01] Stabiliser le composeur pendant le défilement
f6ac7a5 [fix-open-01] Retirer le faux réglage navigateur bientôt
2da487c [fix-open-01] Afficher la preuve de navigation dans le résultat
```

## git status
```text
On branch claude/beautiful-gauss-gdxbeg
nothing to commit, working tree clean
```

## git diff main~5 --stat
Comparaison de `main~5` avec l'arbre de travail. `main` local = `c013a07`, et la branche porte en plus `d349d88` (rapport maquette-ecarts-01, non poussé) : ses fichiers apparaissent donc dans la liste.
```text
 .manager/reports/front-01-screens/01-accueil.png   | Bin 102864 -> 215350 bytes
 .../front-01-screens/02-mission-comparer-4.png     | Bin 138926 -> 185302 bytes
 .../front-01-screens/02-mission-lettre-3.png       | Bin 146511 -> 277992 bytes
 .../front-01-screens/02-mission-offres-2.png       | Bin 165659 -> 300252 bytes
 .../front-01-screens/02-mission-senior-0.png       | Bin 158444 -> 257300 bytes
 .../front-01-screens/02-mission-veille-1.png       | Bin 138598 -> 254433 bytes
 .manager/reports/front-01-screens/03-agents.png    | Bin 158947 -> 272638 bytes
 .manager/reports/front-01-screens/03-modeles.png   | Bin 92114 -> 206095 bytes
 .../front-01-screens/04-skills-quarantaine.png     | Bin 126404 -> 197364 bytes
 .manager/reports/front-01-screens/04-skills.png    | Bin 129877 -> 219104 bytes
 .../reports/front-01-screens/05-domain-packs.png   | Bin 129086 -> 230746 bytes
 .../reports/front-01-screens/06-consommation.png   | Bin 140481 -> 235074 bytes
 .../front-01-screens/07-suggestion-remplie.png     | Bin 111715 -> 220327 bytes
 .manager/reports/front-01-screens/08-plan.png      | Bin 146721 -> 211799 bytes
 .manager/reports/front-01-screens/09-execution.png | Bin 141329 -> 260851 bytes
 .../front-01-screens/10-execution-suite.png        | Bin 158444 -> 257300 bytes
 .../reports/front-01-screens/11-filtre-1-agent.png | Bin 109849 -> 221877 bytes
 .../11-filtre-2-mod\303\250le.png"                 | Bin 116258 -> 226235 bytes
 .../front-01-screens/11-filtre-3-skills.png        | Bin 126577 -> 235850 bytes
 .../reports/front-01-screens/11-filtre-4-pack.png  | Bin 115078 -> 219092 bytes
 .../reports/front-01-screens/11-filtre-5-mode.png  | Bin 116121 -> 226862 bytes
 .../reports/front-01-screens/12-theme-sombre.png   | Bin 102087 -> 170460 bytes
 .manager/reports/front-01-screens/13-mobile.png    | Bin 58587 -> 95704 bytes
 .../front-01-screens/14-markdown-mermaid.png       | Bin 106520 -> 236939 bytes
 .../reports/front-01-screens/15-permission-acp.png | Bin 159036 -> 253210 bytes
 .../reports/front-01-screens/v2-mission-active.png | Bin 256563 -> 256707 bytes
 .../reports/front-01-screens/v2-mission-sombre.png | Bin 250144 -> 250854 bytes
 .../reports/front-01-screens/v3-parametres.png     | Bin 169571 -> 170730 bytes
 .../reports/front-01-screens/v3-suivi-details.png  | Bin 298017 -> 297202 bytes
 .manager/reports/front-affichage-03-11-rouge.txt   |  20 +
 .manager/reports/front-affichage-03-11-vert.txt    |  11 +
 .manager/reports/front-affichage-03-11.md          |  46 ++
 .manager/reports/maquette-ecarts-01.md             | 109 +++++
 .../maquette-ecarts-01/app-conv-styles.json        |  20 +
 .../maquette-ecarts-01/app-dark-1-conversation.png | Bin 0 -> 214823 bytes
 .../maquette-ecarts-01/app-dark-1-fil-haut.png     | Bin 0 -> 276158 bytes
 .../app-dark-2-barre-flottante.png                 | Bin 0 -> 290554 bytes
 .../app-dark-3-autorisation-acp.png                | Bin 0 -> 280222 bytes
 .../app-dark-3-autorisation-envoi.png              | Bin 0 -> 290588 bytes
 .../app-dark-4-suivi-details.png                   | Bin 0 -> 295339 bytes
 .../maquette-ecarts-01/app-dark-5-parametres.png   | Bin 0 -> 157194 bytes
 .../app-light-1-conversation.png                   | Bin 0 -> 228043 bytes
 .../maquette-ecarts-01/app-light-1-fil-haut.png    | Bin 0 -> 307016 bytes
 .../app-light-2-barre-flottante.png                | Bin 0 -> 262173 bytes
 .../app-light-3-autorisation-acp.png               | Bin 0 -> 251602 bytes
 .../app-light-3-autorisation-envoi.png             | Bin 0 -> 262258 bytes
 .../app-light-4-suivi-details.png                  | Bin 0 -> 327241 bytes
 .../maquette-ecarts-01/app-light-5-parametres.png  | Bin 0 -> 197781 bytes
 .../reports/maquette-ecarts-01/app-styles.json     |  71 +++
 .../maquette-ecarts-01/mock-dark-1-fil-deplie.png  | Bin 0 -> 132953 bytes
 .../maquette-ecarts-01/mock-dark-1-fil-encours.png | Bin 0 -> 84109 bytes
 .../maquette-ecarts-01/mock-dark-1-fil-fin.png     | Bin 0 -> 108286 bytes
 .../maquette-ecarts-01/mock-light-1-fil-deplie.png | Bin 0 -> 131694 bytes
 .../mock-light-1-fil-encours.png                   | Bin 0 -> 83834 bytes
 .../maquette-ecarts-01/mock-light-1-fil-fin.png    | Bin 0 -> 107518 bytes
 .../reports/maquette-ecarts-01/mock-styles.json    | 510 +++++++++++++++++++++
 .../maquette-ecarts-01/scripts/app-check.mjs       |  74 +++
 .../reports/maquette-ecarts-01/scripts/app.mjs     |  93 ++++
 .../reports/maquette-ecarts-01/scripts/conv.mjs    |  57 +++
 .../reports/maquette-ecarts-01/scripts/mock2.mjs   |  36 ++
 .manager/reports/maquette-ecarts-01/z-dots.png     | Bin 0 -> 26783 bytes
 .manager/reports/maquette-ecarts-01/z-meta.png     | Bin 0 -> 134680 bytes
 .manager/reports/maquette-ecarts-01/z-panel.png    | Bin 0 -> 105784 bytes
 src/App.tsx                                        |  46 +-
 src/Career.tsx                                     | 252 ++++++++--
 src/Composer.tsx                                   |  21 +-
 src/ConnectionsPanel.test.tsx                      |  69 +++
 src/ConnectionsPanel.tsx                           |   7 +
 src/Mission.tsx                                    |  48 +-
 src/affichage.test.tsx                             | 440 ++++++++++++++++++
 src/agentStatus.ts                                 |  27 ++
 src/api.ts                                         |  55 +++
 src/components.test.tsx                            |  53 +++
 src/conversation.test.tsx                          |  30 +-
 src/front-anim.test.tsx                            |   7 +-
 src/style.css                                      |  17 +
 src/types.ts                                       |   3 +
 src/v2.test.tsx                                    |   2 +-
 tests/e2e.test.mjs                                 |  64 +++
 79 files changed, 2133 insertions(+), 55 deletions(-)
exit 0
```

## Diff de src/v2.css et src/Career.tsx depuis le dernier commit [skill-chip-01]
**Sans objet : aucun commit `[skill-chip-01]` n'existe**, ni sur la branche ni sur aucune branche locale ou distante (`git log --all --grep='\[skill-chip-01\]'` ne renvoie rien). Le brief `design_handoff_conversation_agent/BRIEF-skill-chip-01.md` n'a jamais été trouvé, et ce sprint n'a pas été fait. Pour la même raison, la classe `.skill-chip` n'existe pas dans `src/` : elle vaut `null` dans `styles.json`, et aucune capture ne montre de pastille de skill.

## npm test (sortie complète)
```text

> agre-agent-frontend@0.1.0 test
> vitest run


 RUN  v5.0.5 /home/user/agregat-front-git


 Test Files  10 passed (10)
      Tests  152 passed (152)
   Start at  04:15:50
   Duration  8.04s (tests 44%, environment 36%, import 11%, transform 9%)

Environment  jsdom was created 10 times · 7.56s total, 36% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

CODE_SORTIE=0
```

## npm run build (sortie complète)
```text

> agre-agent-frontend@0.1.0 build
> tsc --noEmit && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 2383 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                           0.52 kB │ gzip:   0.32 kB
dist/assets/index-CCAJd2Rs.css                           41.24 kB │ gzip:   9.31 kB
dist/assets/array-BifhSqXX.js                             0.10 kB │ gzip:   0.11 kB
dist/assets/pie-XZMESJXO-CRhlT7ZH.js                      0.10 kB │ gzip:   0.12 kB
dist/assets/info-OHQRW6UA-BhuYwVMX.js                     0.10 kB │ gzip:   0.12 kB
dist/assets/radar-ABXABTNO-DcEAJLHP.js                    0.10 kB │ gzip:   0.12 kB
dist/assets/packet-JDAUHWVQ-neymI13o.js                   0.11 kB │ gzip:   0.12 kB
dist/assets/cynefin-EF2NZ3EQ-CCTOGNGz.js                  0.11 kB │ gzip:   0.12 kB
dist/assets/treemap-SAJKECNS-AnawOvhP.js                  0.11 kB │ gzip:   0.12 kB
dist/assets/wardley-7MLQ67FV-D_avAD3S.js                  0.11 kB │ gzip:   0.12 kB
dist/assets/gitGraph-VSP46ZUC-AmMayx2j.js                 0.11 kB │ gzip:   0.12 kB
dist/assets/railroad-I3PHUGI6-658fAkCW.js                 0.11 kB │ gzip:   0.12 kB
dist/assets/treeView-D4JQ5SDB-BHyIU5MI.js                 0.11 kB │ gzip:   0.12 kB
dist/assets/channel-CkpeGpcA.js                           0.11 kB │ gzip:   0.12 kB
dist/assets/railroad-peg-JR7BVNR7-C1kwjGTO.js             0.11 kB │ gzip:   0.12 kB
dist/assets/architecture-WOLXFQ4H-BnAPjvBk.js             0.11 kB │ gzip:   0.12 kB
dist/assets/railroad-abnf-LNEFI6M7-ms9foo6v.js            0.11 kB │ gzip:   0.13 kB
dist/assets/railroad-ebnf-DWYD2UWJ-B6---pKu.js            0.11 kB │ gzip:   0.13 kB
dist/assets/eventmodeling-K75KTNOO-rBh0g2Uh.js            0.11 kB │ gzip:   0.13 kB
dist/assets/init-C-OQMol4.js                              0.14 kB │ gzip:   0.12 kB
dist/assets/chunk-Y2CYZVJY-DsF7k-Jl.js                    0.15 kB │ gzip:   0.14 kB
dist/assets/chunk-2Q5K7J3B-C1jixKkw.js                    0.19 kB │ gzip:   0.16 kB
dist/assets/chunk-JWPE2WC7-DVXcaiue.js                    0.22 kB │ gzip:   0.17 kB
dist/assets/chunk-XXDRQBXY-DCGs-Ssi.js                    0.26 kB │ gzip:   0.22 kB
dist/assets/chunk-5VM5RSS4-ZNzvKenW.js                    0.36 kB │ gzip:   0.27 kB
dist/assets/flowDiagram-IUGLLWBU-BDbk4XOh.js              0.56 kB │ gzip:   0.31 kB
dist/assets/chunk-VQ5W62QI-Dk86NPny.js                    0.57 kB │ gzip:   0.40 kB
dist/assets/chunk-J5ZVWO5B-oDCd-gWO.js                    0.63 kB │ gzip:   0.43 kB
dist/assets/infoDiagram-MVDRKAX5-DgHdinjC.js              0.65 kB │ gzip:   0.41 kB
dist/assets/swimlanesDiagram-AYQRV4AK-DeY2x-S6.js         0.83 kB │ gzip:   0.48 kB
dist/assets/sizeCapture-INFHLROL-3uHXrFqA.js              0.87 kB │ gzip:   0.51 kB
dist/assets/chunk-DUW6YSOI-Dgx8z5s3.js                    0.89 kB │ gzip:   0.46 kB
dist/assets/line-wIuu-A_h.js                              0.94 kB │ gzip:   0.47 kB
dist/assets/ordinal-BDEzSJ7C.js                           1.17 kB │ gzip:   0.56 kB
dist/assets/chunk-ZAUX2LTX-6EnlE-Ge.js                    1.41 kB │ gzip:   0.78 kB
dist/assets/railroadDiagram-Y72NRBL7-DtRzJRet.js          1.65 kB │ gzip:   0.76 kB
dist/assets/abnfDiagram-WEYOIA3C-rFbqfIYP.js              1.84 kB │ gzip:   0.89 kB
dist/assets/chunk-UHW7PFBP-lA3ZpD4z.js                    1.95 kB │ gzip:   0.95 kB
dist/assets/chunk-55XCU76K-DbOBgwkO.js                    1.97 kB │ gzip:   0.88 kB
dist/assets/pegDiagram-ECIUJNBX-DfWj2j0L.js               2.01 kB │ gzip:   0.94 kB
dist/assets/ebnfDiagram-V4P3TTPT-CFrZ2qhT.js              2.05 kB │ gzip:   0.89 kB
dist/assets/dist-BYBmfXd-.js                              2.16 kB │ gzip:   0.96 kB
dist/assets/path-fybaL0A-.js                              2.27 kB │ gzip:   0.98 kB
dist/assets/arc-CeNvfiB3.js                               3.47 kB │ gzip:   1.46 kB
dist/assets/diagram-I5XIIV2D-OpxuU01r.js                  4.34 kB │ gzip:   1.89 kB
dist/assets/defaultLocale-BFoDCU3G.js                     4.63 kB │ gzip:   2.12 kB
dist/assets/chunk-4EMNKR2T-B6aPH9N2.js                    5.43 kB │ gzip:   2.49 kB
dist/assets/linear-B7JSoZyY.js                            5.51 kB │ gzip:   2.25 kB
dist/assets/chunk-YZO67HFG-HcvFwqR_.js                    5.83 kB │ gzip:   2.68 kB
dist/assets/diagram-RJA3I4VV-D8chnDsc.js                  6.07 kB │ gzip:   2.56 kB
dist/assets/pieDiagram-GNMPY74T-CbRbJ4ls.js               6.22 kB │ gzip:   2.59 kB
dist/assets/diagram-ODIL2UCW-DLnZT53u.js                  8.12 kB │ gzip:   3.64 kB
dist/assets/cynefinDiagram-WF24UDRP-CEvu7JXH.js           9.94 kB │ gzip:   3.51 kB
dist/assets/chunk-ZCHMQSOR-CAkZKQ-0.js                   10.38 kB │ gzip:   4.32 kB
dist/assets/diagram-PFBEJUXE-BZcrdjew.js                 10.92 kB │ gzip:   4.25 kB
dist/assets/chunk-HNE4Q36P-CxYuxgFz.js                   14.84 kB │ gzip:   4.19 kB
dist/assets/chunk-2E7WHVMD-JtumwQ7I.js                   15.64 kB │ gzip:   4.35 kB
dist/assets/diagram-CBK3MWTC-CVrsKABr.js                 15.75 kB │ gzip:   5.52 kB
dist/assets/mermaid-parser.core-BRm43lSA.js              16.44 kB │ gzip:   3.91 kB
dist/assets/ishikawaDiagram-HPEHV2GE-DgvdORLd.js         17.30 kB │ gzip:   6.53 kB
dist/assets/kanban-definition-FNSA4HC5-C6gz5h34.js       20.26 kB │ gzip:   7.15 kB
dist/assets/sankeyDiagram-SY24JHO5-D8-1cBA8.js           22.79 kB │ gzip:   8.26 kB
dist/assets/journeyDiagram-BOSHW7O7-Jyc8N--V.js          23.15 kB │ gzip:   8.16 kB
dist/assets/mindmap-definition-6OY57UG3-Dh18UR3V.js      23.66 kB │ gzip:   8.06 kB
dist/assets/graphlib-DS17s2tU.js                         23.90 kB │ gzip:   8.31 kB
dist/assets/wardleyDiagram-IVAIDKWA-9CrNaMl2.js          25.20 kB │ gzip:   6.54 kB
dist/assets/rough.esm-Dy-Kn_BL.js                        27.10 kB │ gzip:   8.85 kB
dist/assets/gitGraphDiagram-PDYL7XHY-uLg5g-Kf.js         29.01 kB │ gzip:   8.55 kB
dist/assets/chunk-7S6XSTFO-vbIys80o.js                   30.36 kB │ gzip:   8.44 kB
dist/assets/timeline-definition-JXYKGLGB-cyPJzTHy.js     30.45 kB │ gzip:  10.03 kB
dist/assets/erDiagram-KYQIGQAA-BQOLl4pI.js               30.65 kB │ gzip:  10.57 kB
dist/assets/requirementDiagram-EQYSW5RA-CFeRAO2A.js      31.07 kB │ gzip:   9.82 kB
dist/assets/quadrantDiagram-D57K4MC3-DIXgEfVF.js         33.52 kB │ gzip:   9.74 kB
dist/assets/chunk-WQQL4CDK-DEIsebqj.js                   37.88 kB │ gzip:   8.20 kB
dist/assets/vennDiagram-Q3Y3IDCW-BTLbW-T6.js             41.18 kB │ gzip:  15.11 kB
dist/assets/stateDiagram-v2-A6IESKWZ-C5rXweYI.js         41.55 kB │ gzip:  13.89 kB
dist/assets/blockDiagram-RJAE7QA3-DWu27gIP.js            42.42 kB │ gzip:  13.87 kB
dist/assets/xychartDiagram-4URNHDU4-Mx6v9iw1.js          44.52 kB │ gzip:  12.35 kB
dist/assets/src-B8XKtDsr.js                              45.66 kB │ gzip:  15.99 kB
dist/assets/dagre-NK4GIZVX-CGQUs5S4.js                   47.83 kB │ gzip:  17.10 kB
dist/assets/classDiagram-v2-4MYWR3UA-Bi82HW5e.js         49.70 kB │ gzip:  16.15 kB
dist/assets/chunk-AQDTSKZB-PfQoGESm.js                   51.23 kB │ gzip:  16.63 kB
dist/assets/chunk-NQOKRVIF-DVq1BesY.js                   62.79 kB │ gzip:  20.36 kB
dist/assets/c4Diagram-XDPPPE54-Cld5VrU7.js               65.08 kB │ gzip:  18.60 kB
dist/assets/ganttDiagram-R7GPNTJY-BEW15N5H.js            70.01 kB │ gzip:  23.00 kB
dist/assets/diagram-TYUNFSNR-DyMli0TM.js                 80.44 kB │ gzip:  25.15 kB
dist/assets/cose-bilkent-JH36ORCC-CrAcuCRQ.js            81.21 kB │ gzip:  21.51 kB
dist/assets/mermaid.core-Cys97-RG.js                     84.65 kB │ gzip:  29.29 kB
dist/assets/swimlanes-B3ENRKFQ-B_KQ1-bA.js              106.42 kB │ gzip:  36.21 kB
dist/assets/chunk-HAGFOTED-CsRk0I1l.js                  115.46 kB │ gzip:  29.24 kB
dist/assets/sequenceDiagram-BLEHNHQU-doxWAGXy.js        117.67 kB │ gzip:  31.38 kB
dist/assets/architectureDiagram-ZHVYKT53-CFGZhA-a.js    148.87 kB │ gzip:  41.10 kB
dist/assets/usecaseDiagram-WPOLBNNX-Z1jvNL6k.js         187.90 kB │ gzip:  49.20 kB
dist/assets/chunk-DSNLSHJZ-CZaAxqS9.js                  241.36 kB │ gzip:  40.31 kB
dist/assets/katex-B_JcIwqj.js                           258.80 kB │ gzip:  77.65 kB
dist/assets/cytoscape.esm-Bn1wUjr1.js                   434.71 kB │ gzip: 137.73 kB
dist/assets/index-DgSgwE3t.js                           469.73 kB │ gzip: 143.82 kB
dist/assets/chunk-NGNAAXSQ-Bw6tHVuc.js                  629.04 kB │ gzip: 127.32 kB
dist/assets/elk-QONTBCTQ-CnCqhOnP.js                  1,462.86 kB │ gzip: 455.86 kB

✓ built in 2.77s
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
CODE_SORTIE=0
```

## Captures : conditions et limites
- `npm run dev` (Vite, port 5173) avec `AGENT_PLATFORM_API_URL` pointant vers le backend fixture, comme dans `tests/e2e.test.mjs`.
- Le Chrome système de `tests/e2e.test.mjs` (`/Applications/Google Chrome.app/...`, macOS) n'existe pas dans ce conteneur Linux. J'ai utilisé `playwright-core` du projet avec le Chromium du conteneur (`/opt/pw-browsers/chromium`, Chromium 1243). SF Pro est absent : la pile `-apple-system…` tombe sur la police de secours, donc les glyphes diffèrent d'un Mac.
- Fenêtre 1280×800, facteur d'échelle 1 : chaque PNG fait exactement 1280×800. Thème forcé par `localStorage.agre-theme` et `colorScheme`.
- Scénario, pour chaque thème : accueil, puis mission workflow `application-draft` (agent `fixture`, pack `najah`), lancée puis arrêtée sur la demande d'accord. Ensuite, permission ACP fictive injectée par `app.engine.permission` (comme le test e2e), refusée. Enfin, accord approuvé, mission terminée, suivi déplié, Paramètres.
- Un seul backend sert les deux thèmes : en sombre, la barre latérale et l'onglet Utilisation montrent donc **deux** missions (celle du passage en clair et celle du passage en sombre).
- **02-mission-en-cours** : une mission workflow fixture ne reste « en cours » que pendant l'attente d'accord, et c'est cet état qui est capturé (`.run-active` présent, vérifié). Aucune pastille de skill : voir ci-dessus.
- **03-suivi-deplie** : pris sur la mission terminée, carte Suivi dépliée et « Détails techniques » ouvert.
- **04-demande-autorisation** : on voit à la fois la carte d'accord de la plateforme (« Relire et valider le brouillon ») et la carte de permission ACP ponctuelle.
- Aucune erreur de page JavaScript (`pageerror`) dans les deux thèmes.

## styles.json : lecture
- `repos` = accueil sans mission (`.run-active` absent). `mission` = mission en attente d'accord (`.run-active` présent).
- `null` au repos : `.prompt-bubble`, `.agent-turn`, `.skill-chip`, `.tracker`, `.mission-pill` (rien de tout cela n'existe sans mission).
- `null` pendant la mission : `.agent-turn` (cette classe ne sert qu'au fil career-ops, `src/Career.tsx`, pas au rendu workflow `src/Mission.tsx`) et `.skill-chip` (inexistant).
- `.glow i` : `animation-play-state` vaut `paused` au repos et `running` en mission ; `animation-duration` passe de 14s à 6s.

## variables.txt
Variables personnalisées déclarées dans une règle dont le sélecteur contient `:root` (`style.css` et `v2.css`, y compris `:root[data-theme="dark"]`). Valeurs calculées sur `document.documentElement`, thème clair puis sombre.

## Journal
- 04:15 Garde-fou vérifié (aucun processus ni port partagé). `git log`, `status`, `diff --stat`.
- 04:15 `npm test` : code de sortie 0. `npm run build` : code de sortie 0 (avertissement de taille de chunk > 500 kB).
- 04:17 Script `verif-capture.mjs` : 16 captures, `styles.json`, `variables.txt`. Premier lancement en échec immédiat : mauvais chemin du binaire Chromium, corrigé en `/opt/pw-browsers/chromium`.
- 04:18 Arrêt : Chrome fermé, groupe `npm run dev` arrêté (pgid 2178). Le script a écrit « encore vivant » parce qu'il a vérifié 0,8 s seulement après l'arrêt ; un contrôle juste après ne trouve plus aucun processus de ce groupe et le port 5173 est libre. Backend fixture fermé, `dataDir` supprimé.
- 04:18 Rapport rédigé, commit local `[verif-01]`.
