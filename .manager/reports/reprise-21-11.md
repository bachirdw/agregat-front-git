# Note de reprise (21/11/2026, avant compactage de la discussion)

À lire en premier par la session qui reprend. Détails : `reponse-04.md`, `sous-agents-19-11.md`, `activity-panel-03.md`.

## Où est le code
- Front : worktree `~/Downloads/agregat-front/.claude/worktrees/bold-goldstine-171eb9`, branche
  `claude/bold-goldstine-171eb9`, poussée sur `origin` le 21/11 (accord du propriétaire : « tu peux pousser pour qu'on
  puisse voir le rendu »). `main` local et distant : `7b2716c` (inchangé).
- Back : rien modifié dans les arbres du manager (lecture seule). Branche **locale** `reponse-04-format` (`c6aa540`),
  dans `~/Downloads/agregat-back-reponse-04`, partie de `swarm-20-11` (`e7f4964`) ; **non poussée, non intégrée**.
  Son `node_modules` est un lien vers `../agregat-back-swarm/node_modules`.

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

## État des vérifications (21/11, 11:05)
- `npm test` : 26 fichiers, 392/392.
- `npm run build` : OK.
- `prettier` : OK.
- E2E contre `~/Downloads/agregat-back-swarm` : 17/18.
- Captures avant/après : `.manager/reports/reponse-04/`.

## Reste à faire
1. E2E « défilement FICTIF » rouge : après une remontée de 65 px, le composeur ne passe pas en compact
   (`onScroll` dans `App.tsx`). À diagnostiquer.
2. Refaire les captures « après » : celles du commit `4fffd89` montrent la ligne méta dépliée par le défaut de clé,
   corrigé depuis (`90f9a98`).
3. Questions au propriétaire :
   - refondre aussi le fil career-ops sur `RunTurn` ?
   - intégrer `reponse-04-format` dans le back ?
   - garder la vue scindée ?
4. Commandes utiles :
   - `npm run build && node scripts/reponse-04-captures.mjs apres` ;
   - `AGENT_PLATFORM_BACKEND_DIR=$HOME/Downloads/agregat-back-swarm nice -n 10 node --test --test-concurrency=1 tests/e2e.test.mjs` ;
   - après un e2e, `git checkout -- .manager/reports/front-01-screens/` (l'e2e réécrit ces captures d'un ancien rapport).
