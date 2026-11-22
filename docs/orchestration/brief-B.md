# Brief chantier B — écran Consommation

Tu es Codex, chantier **B**, dans le worktree `~/Downloads/agregat-wt-b`, branche `feat/consommation`.
Un chef de chantier (Claude Code) relit chaque commit, relance les tests et lit ton rapport. Il préfère une erreur
avouée à un succès inventé. Un autre Codex (chantier A : Skills et composer) travaille en même temps dans un
autre worktree : ne touche jamais à ses fichiers.

Lis d'abord `AGENTS.md` (règles du dépôt) et `docs/orchestration/plan.md`. Langue : interface et rapport en
français avec les accents ; code et identifiants en anglais.

## Objectif

Reproduire fidèlement la maquette `docs/design/mockups/Consommation.html`, version lisible
`docs/design/mockups/Consommation.src/template.html` :

- onglets **Aperçu / Statistiques** ;
- Statistiques : sélecteur de période (7 / 30 jours), regroupement (par fonction : Agent principal, Sous-agents,
  Vérification, Titres et résumés ; par agent ; par modèle), **barres empilées** par jour avec infobulle,
  légende avec pourcentages et totaux ;
- liste des **missions dépliables** : titre, état coloré, total, coût, durée ; une fois dépliée, une ligne par
  **sous-agent / étape** (phase, nom, agent, colonnes de la maquette) et la note éventuelle (sous-tâche relancée,
  quota atteint…) ; « Tout afficher » ;
- Aperçu : les blocs de la maquette (limites, plafond, compte à 100 %…).

Les valeurs (couleurs, espacements, rayons, tailles de texte, couleurs des séries) sont dans les attributs
`style` inline et dans la logique du template. **Ne réinterprète pas : reproduis.** Mets-les dans
`src/screen-consumption.css` (classes dédiées, préfixe `cs-`) ; pas de styles inline dans le JSX sauf valeur
dynamique (hauteur d'un segment, couleur d'une série).

## Fichiers autorisés (et rien d'autre)

- `src/Consumption.tsx` (écran Consommation, déjà sorti de `Galleries.tsx` sans changement),
  `src/screen-consumption.css` ;
- nouveaux fichiers : `src/consommation*.test.tsx`, tout fichier sous `src/consumption/`,
  `scripts/orchestre-B-captures.mjs`, `docs/orchestration/report-B.md`, `docs/orchestration/captures-B/**` ;
- tests existants qui visent l'écran Consommation (`components.test.tsx`, `v2.test.tsx`…) : seulement pour adapter
  un sélecteur ou un libellé que la maquette change. Jamais supprimer, désactiver (`skip`, `todo`) ou affaiblir
  une assertion de comportement. Liste chaque adaptation dans le rapport.

**Interdit** : `src/types.ts`, `src/api.ts`, `src/App.tsx`, `src/main.tsx`, `src/Galleries.tsx`, `src/Mission.tsx`
(tu peux importer `UsageCard`, pas le modifier), `src/v2.css`, `src/style.css`, `package.json`,
`package-lock.json`, le backend, toute autre source. Pas de nouvelle dépendance npm. S'il te manque un type, un
appel d'API ou une prop venue d'`App`, n'y touche pas : écris-le dans le rapport (« Demandes au chef de
chantier ») et contourne localement (type local dans `src/consumption/`).

## Données réelles et champs manquants (important)

L'écran reçoit aujourd'hui de `App` : `catalog` (compteurs `meters`, tarifs `pricing.centsPerUnit`, plafond
`pricing.monthlyCapCents`), `runs` (missions et sous-missions, `famille`), `selected` / `onSelect` (consommation
détaillée d'une mission : `run.usage`, `Cost`). Lis `src/types.ts` pour les formes exactes.

Constat du chef de chantier : **le back ne mesure aucun token** (ni par fonction, ni par agent, ni par modèle, ni
par jour) et n'expose pas de limites fournisseur par période. Donc :

- tout ce que la maquette montre et que l'API n'a pas passe par **un seul module isolé**,
  `src/consumption/missing.ts`, dont chaque fonction renvoie `undefined` / tableau vide tant que le back ne
  fournit pas le champ ;
- l'interface affiche alors l'état vide de la maquette ou un « Bientôt » visible, jamais les nombres factices de
  la maquette (ses 1 078 000 tokens, ses missions « Recherche marché… » sont des exemples, pas des données) ;
- ce qui existe vraiment (missions, états, sous-missions, coûts en centimes, plafond, tarifs) est branché pour de
  vrai ;
- les données factices ne sont permises que dans les tests et dans le banc de captures, marquées FICTIF.

Liste chaque champ manquant dans le rapport : nom proposé, type TypeScript attendu, niveau (mission, sous-agent,
jour, fournisseur), où il s'affiche, et comment il est affiché en attendant.

## Méthode

- Tests d'abord (Vitest + Testing Library, comme les tests existants) : changement d'onglet, période,
  regroupement, mission dépliée et repliée, lignes par sous-agent, compte à 100 % du plafond, liste vide, données
  absentes (« Bientôt »).
- Commits atomiques et fréquents, préfixe `[orchestre-B]`, message en français. Avant **chaque** commit :
  `npm run build` et `npm test` verts. Jamais de push, jamais de réécriture d'historique, jamais `--no-verify`.
- `node_modules` est déjà présent dans le worktree : n'installe rien.
- Captures avant/après à 1440, 1024 et 768 px (Aperçu, Statistiques, mission dépliée, liste vide) dans
  `docs/orchestration/captures-B/`, avec un script `scripts/orchestre-B-captures.mjs` calqué sur
  `scripts/equipe-05-captures.mjs` (banc isolé : back réel en fixture, `AGENT_PLATFORM_NETWORK=0`, données,
  career-ops et Skills dans un dossier temporaire, données marquées FICTIF, serveur sur 127.0.0.1 arrêté à la
  fin). Ne vise jamais les ports 4310, 5173, 4316, 4317. Si le bac à sable t'empêche de lancer Chrome ou un
  serveur, ne contourne pas : écris-le dans le rapport, le chef de chantier fera les captures.

## Rapport (au fil de l'eau)

Tiens `docs/orchestration/report-B.md` à jour pendant le travail (ta session peut être coupée à tout moment), et
commite-le avec le reste. Sections :

1. **Fait** (avec les commits)
2. **Non fait** (et pourquoi)
3. **Fichiers touchés** (et tests existants adaptés, avec la raison)
4. **Champs backend manquants** (nom, type attendu, niveau, où, affichage en attendant)
5. **Écarts avec la maquette** (assumés ou non résolus)
6. **Captures avant/après** (1440, 1024, 768 px) ou raison de leur absence
7. **Demandes au chef de chantier** (fichiers partagés, types, props)
8. **Commandes et résultats** (build, tests : nombres réels, y compris les échecs)

Quand tout est fait et commité, termine par une dernière ligne de rapport : `ÉTAT : TERMINÉ`.
