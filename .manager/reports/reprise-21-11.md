# Note de reprise (21/11/2026, mise à jour à 13:15 après le test complet de l'interface)

À lire en premier par la session qui reprend. Détails : `test-ui-21-11.md` (dernier lot), `reponse-04.md`,
`sous-agents-19-11.md`, `activity-panel-03.md`.

## Où est le code
- Front : worktree `~/Downloads/agregat-front/.claude/worktrees/bold-goldstine-171eb9`, branche
  `claude/bold-goldstine-171eb9`, poussée sur `origin` le 21/11 (accord du propriétaire : « tu peux pousser pour qu'on
  puisse voir le rendu »). `main` local et distant : `7b2716c` (inchangé).
- Back : rien modifié dans les arbres du manager (lecture seule). Branche **locale** `reponse-04-format`, dans
  `~/Downloads/agregat-back-reponse-04` : règle de forme (`c6aa540`) puis **fusion de `swarm-20-11` à `35af485`**
  (`6aa7a5c`, sans conflit, 49 tests ciblés verts) ; **non poussée, non intégrée**. Son `node_modules` est un lien vers
  `../agregat-back-swarm/node_modules`.
- Serveurs de test du propriétaire (lancés le 21/11 par `preview_start`, configuration `.claude/launch.json` du
  worktree, non commitée) :
  - back sur 127.0.0.1:4310 depuis `agregat-back-reponse-04`, mêmes réglages que les backs d'essai du manager
    (4316/4317) : agents réels, mode propriétaire, délais longs, espace career-ops `~/Downloads/career-ops-essai`
    (jamais le vrai `agregat-career-ops`) ; base `.data` de ce worktree, vide au départ ;
  - front Vite sur localhost:5173 depuis ce worktree (sert les sources : pas besoin de rebuild).
  - **14:26 : l'API 4310 est désormais gérée par le manager du back** (session `agregat-back-c8`) : il a ajouté trois
    commits `[e160-01]` sur `reponse-04-format` (tête `480ecc4`, cherry-pick de `swarm-20-11`, correctif E160 des
    étapes outil refusées) et relancé l'API par `nohup`, même dossier, mêmes variables. **Ne pas relancer `back`
    par `preview_start`** (conflit de port). Un second correctif suit sur la même branche (mission refusée « Skill
    inconnu » quand le pack choisi automatiquement n'a pas son Skill) ; le manager prévient avant de relancer.

- **21/11 soir** : le Vite de 5173 lancé depuis `bold-goldstine` s'était arrêté. À la demande du propriétaire, il est
  relancé par `preview_start` (configuration `front` seule, `.claude/launch.json` non commité) depuis le worktree
  `passation-reprise-21-11-a815c6`, même commit que `bold-goldstine`. Il sert donc directement les sources de cette
  branche. L'API 4310 reste celle du manager du back : ne pas la relancer.

## Règles données par le propriétaire (à garder)
- **Le back a toujours la priorité** : le front suit le contrat du back le plus récent. On ne touche pas aux arbres du
  manager, on économise l'usage et la machine (tests en `nice`, `--maxWorkers=2`, pas de revue multi-agents), et on
  n'impose pas de contrat concurrent.
- Pousser la branche front est autorisé pour voir le rendu. Le back n'est pas poussé : c'est le manager qui décide.
- Compacter la discussion une fois la tâche finie, en gardant fichiers et décisions (cette note).

## Lots faits, dans l'ordre
1. **activity-panel-03** : panneau « Activité » (`src/ActivityPanel.tsx`) en colonne à côté du fil (344 px), qui
   remplace `Tracker` flottant et `ConnectionsPanel`. Les fonctions `trackerItems`, `trackerPhrase`, `trackerDetails`,
   `metaLine` et `activityRows` restent exportées. « Sites autorisés » = `run.browserDomains` en lecture seule (le back
   refuse « Toujours autoriser »).
2. **sous-agents-19-11** : contrat de délégation du back, journal des événements `delegation_*`, `child_*` et
   `family_waiting` dans `activityRows`. Ma case « Autoriser les sous-agents » et mes tuiles ont été **remplacées**
   ensuite par le code de swarm.
3. **Fusion de `swarm-11`** (`c714405`), le « nouveau code » d'équipe écrit par les lots du manager :
   - interrupteur « Équipe d’agents » et accord séparé (`team`, `teamConsent`) ;
   - `src/Team.tsx` (`TeamBlock`, `CarnetBlock`) et `src/status.ts` ;
   - liste des missions sans sous-missions, avec résumé d'équipe ;
   - `?equipe=1` sur chaque lecture d'une mission.
4. **reponse-04** (brief 04, maquette v5 ; passation du zip versée dans `design_handoff_conversation_agent/`) :
   - `src/RunTurn.tsx` remplace `RunView` dans le fil hors career-ops ; `RunView` est gardé et exporté. Contenu :
     - lignes d'activité et d'étapes repliables ;
     - incident « ! » en ligne, perte du flux comprise ;
     - texte markdown ;
     - fichiers produits (outils `kind: edit`) ;
     - ligne méta « ✓ Vérifié · preuves · agent · coût » dépliée sur place ;
     - accords d'étape `.inline-approval` ;
     - offres repliées.
   - `src/Chart.tsx` : convention ```chart (`bar`, `line`), dans `src/Markdown.tsx` avec les tableaux `.md-table`.
   - Autour de la réponse :
     - bulle coupée à 170 caractères (« Afficher tout » / « Réduire ») ;
     - composer d'une mission avec un seul bouton « agent · modèle » (`details.session-menu`), plus de note d'aide ;
     - bouton rond « Revenir en bas » ;
     - bannière rouge seulement si la mission attend l'utilisateur.
   - Équipe et Carnet d’équipe **dans le panneau Activité**. `TeamBlock` gagne « Voir à côté » et « Arrêter ».
   - **Vue scindée** `src/SidePane.tsx` : un membre suivi en direct à côté du fil. Elle efface la barre latérale
     jusqu'à 1560 px et prend la place du panneau jusqu'à 1340 px.
   - Brief 02 : ligne « Données » dans `trackerDetails`, journal brut dans les détails techniques du panneau.
     `skill-chip-01` : pastille de skill (`SkillChip`), lueur à trois trajectoires.
   - Back : règle `ANSWER_FORMAT_RULE` (structure, « À vérifier », ```chart) sur la branche locale ci-dessus. Le test
     d'égalité avec la base `48a2f4e` est adapté : la règle est retirée avant comparaison, après vérification de sa
     présence. 185 tests back ciblés verts ; suite complète non lancée.

## Après compactage (21/11, 11:10-11:40)
- E2E « défilement » corrigé : le panneau Activité, ouvert d'office en large, couvrait le fil après un passage sous
  760 px. Il se ferme maintenant à ce passage (`App.tsx`, test dans `activity-panel-app.test.tsx`).
- Back relu à `35af485` (`swarm-14`, `15`, `16`) : événement `usage` → ligne « Annoncé par l’agent » du détail de la
  ligne méta (`texteAnnonce`, `status.ts`) ; `lecon_gardee` → ligne du journal. Pas fait : `niveau` (absent de
  `family[]`), écran des leçons (`/api/lecons`).
- Captures « après » refaites.

## Test complet de l'interface (21/11, 11:45-13:15) : `test-ui-21-11.md`
- Le propriétaire : « l'interface ne marche pas, teste tout ». 4 testeurs en parallèle (workflow), chacun sur son banc
  isolé (back fixture hors réseau, base et espace career-ops temporaires, Chrome sans fenêtre) : 49 défauts.
- Sa capture (panneau coupé à droite) = **zoom par pincement** du trackpad (~1,15), pas un défaut de mise en page.
- Corrigés : tous les défauts majeurs et la plupart des mineurs, en 6 commits `[test-ui-21-11]` (`ea44fcf` →
  `8a613ec`), test rouge puis vert à chaque fois.
- **Décisions** (détail dans le rapport) :
  - agent unique par défaut à l'accueil (en workflow, pas de message de suite possible) ;
  - « Reprendre » seulement après un arrêt ou un échec ;
  - « Nouvelle mission » repart d'une page vierge (choix de `front-02` gardé) ;
  - mission ouverte en bas ;
  - vue scindée en plein écran sous 980 px ;
  - mission gardée dans l'adresse (`#mission/<id>`).
- Fichiers modifiés :
  - `src/` : `App.tsx`, `Composer.tsx`, `RunTurn.tsx`, `OwnerRequests.tsx`, `Team.tsx`, `SidePane.tsx`,
    `ActivityPanel.tsx`, `Galleries.tsx`, `Settings.tsx`, `Tracker.tsx`, `Chart.tsx`, `PromptBubble.tsx`, `follow.ts`,
    `api.ts`, `types.ts`, `v2.css`, `style.css` ;
  - nouveau `src/test-setup.ts` (remet l'adresse à « / » après chaque test) ; `vite.config.ts` (`setupFiles`) ;
  - `index.html` ; `public/favicon.svg` déplacé en `src/assets/favicon.svg` ;
  - tests : `App`, `api`, `components`, `demandes`, `equipe`, `v2`, `activity-panel(-app)`, `reponse-04(-app)`,
    `sous-agents-app` ; `tests/e2e.test.mjs` (helper `choose()` : menu de l'accueil, attribut `open` booléen) ;
  - `scripts/*-captures.mjs`, `scripts/sous-agents-19-11-essai.mjs` (même helper).

## Écrire à l'agent pendant la mission (21/11, 15:05) : `chat-mission-21-11.md`
- Demande du propriétaire : plus de crayon caché en bas à droite, mais un champ de chat visible pendant que l'agent
  travaille.
- `MissionPill` est maintenant un champ toujours visible, à la place du composer, avec Arrêter à côté de l'envoi. La
  route `POST /runs/:id/message` est inchangée. En workflow, seul l'arrêt flottant reste (le back refuse les messages).
- Commits `2fe8b65`, puis `fc16bad` (fusion de la note `c0f2e27`). Branche `claude/passation-reprise-21-11-a815c6`.
  Le worktree de l'aperçu (`bold-goldstine`) est avancé dessus (fast-forward).
- Vérifications :
  - 431/431, build OK, prettier OK ;
  - vu dans l'aperçu sur la mission réelle `bd54ee7a` (rien envoyé) ;
  - E2E non relancé.

## Fichiers lisibles et discussion complète (21/11, après-midi) : `fichiers-fil-21-11.md`
- **Back** :
  - branche **locale** `fichiers-21-11` (`b63323c`), dossier `~/Downloads/agregat-back-fichiers`, partie de
    `480ecc4` ;
  - route `GET /api/runs/:id/file`, doc `docs/api-fichiers.md` ;
  - non poussée, **non intégrée** à l'API 4310 du manager.
- **Front** :
  - `9dbefbd` et `4881c38` ;
  - le fil garde le texte des tours d'avant, les questions de l'agent et les réponses du propriétaire ;
  - les cartes de fichiers ont « Ouvrir » et « Télécharger ».
- **Vérifications** : 446/446, et banc isolé sur 4330 vu dans le navigateur.

## Équipe et notes du panneau Activité (21/11, 18:25) : `equipe-05.md`
- Maquette « Panneau equipe v6 » :
  - l'équipe en liste verticale (groupée par `phase`, dépliée au clic) ;
  - « Ce que l’équipe a appris » à la place du carnet en paragraphes.
- Commits `fc6d187` (code et tests) et `762b035` (maquette, captures, rapport).
- Vérifications : 462/462, build OK.
- Champs du back, noms choisis par le manager (lot `equipe-v6-01`, en cours, pas encore sur 4310) :
  - `decoupage`, `etape: { numero, libelle? }` et `motif` dans `family[]` ;
  - notes `titre`, `situation`, `regle`, `lecon: { id }`.
  Le front est aligné (465/465). Le manager demande de ne pas toucher `docs/api-equipe-vue.md` ni ses fichiers back
  en attendant ; il fait relire `fichiers-21-11` (sécurité) après 19:20.
- Écart : panneau gardé à 344 px (380 décalerait les seuils de mise en page).

## Skill choisi explicitement (21/11, après 19:22) : `skill-explicite.md`
- Décision du propriétaire, transmise par le manager du back : un Skill ne s'active jamais tout seul. Côté back, lot
  `skill-explicite-01` en cours.
- Front : sélecteur « Skill » (« Aucun Skill » par défaut) à la place des cases à cocher ; le bouton des réglages
  dit le Skill.
- Contrat confirmé par le manager : sans choix, garder `pack: "auto"` (pas `core`) ; après `skill-explicite-01`,
  il veut dire « aucun pack, chemin général », sans détection d'après le prompt.
  `skill-explicite-01` est en service sur 4310 depuis 20:47 (a50b247). L'option est renommée « Aucun · chemin
  général » (474/474). Workflow « auto » : « Auto · choisi dans le pack selon l’objectif », avec une aide qui dit le
  chemin général sans pack (475/475).
- Réglage « Pack » rangé dans le dernier réglage « Avancé » (validé par le propriétaire), 472/472.
- Vérifications : 471/471.

## État des vérifications (21/11, 13:15)
- `npm test` : 26 fichiers, 430/430.
- `npm run build` : OK.
- `prettier` : OK.
- E2E contre `~/Downloads/agregat-back-reponse-04` (`swarm-20-11` à `35af485` + règle de forme) : **18/18**.
- Captures avant/après : `.manager/reports/reponse-04/` (refaites à 13:00).
- Non vérifié : aucun vrai agent lancé.

## Reste à faire
1. Questions au propriétaire :
   - tutoiement ou vouvoiement partout ? (mélangés aujourd'hui, une douzaine de tests figent le « vous ») ;
   - refondre aussi le fil career-ops sur `RunTurn` ?
   - intégrer `reponse-04-format` dans le back ?
   - garder la vue scindée ?
2. Petits défauts laissés (liste dans `test-ui-21-11.md`) : composer replié plus haut, Mermaid non thémé, bouton
   coupé dans Consommation à 375 px, Tab sous la vue scindée en plein écran.
3. Commandes utiles :
   - `npm run build && node scripts/reponse-04-captures.mjs apres` ;
   - `AGENT_PLATFORM_BACKEND_DIR=$HOME/Downloads/agregat-back-reponse-04 nice -n 10 node --test --test-concurrency=1 tests/e2e.test.mjs` ;
   - un banc de test hors des serveurs du propriétaire : `createApp({ dataDir: <tmp>, live: false, webDir: dist })`
     avec `AGENT_PLATFORM_NETWORK=0`, `AGENT_PLATFORM_BROWSER=fixture` et `AGENT_PLATFORM_CAREER_WORKSPACE`,
     `AGENT_PLATFORM_WORKSPACE_ROOTS`, `AGENT_PLATFORM_SKILL_ROOTS` vers un dossier temporaire (hors contexte de test,
     l'espace career-ops par défaut est le vrai du propriétaire) ;
   - après un e2e, `git checkout -- .manager/reports/front-01-screens/` (l'e2e réécrit ces captures d'un ancien rapport).
