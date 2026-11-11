# transcription-11-11 — Fil de l'agent « à la Claude Code » et Bilan replié

Rapport écrit le 11/11/2026 à 19:29. Worktree `~/Downloads/agregat-front-cto`, branche `transcription-11-11`
(partie de `envoi-question`). Commits locaux, rien de poussé ni de fusionné. Aucun changement côté back.

## Demande
1. Montrer dans la page d'une mission, en direct et dans l'ordre, ce que fait l'agent : messages, réflexion,
   appels d'outils sur une ligne compacte (état, nom lisible, argument principal, durée), dépliables, regroupés.
2. Dans la réponse finale, replier les listes d'actions (réussies / échouées / non exécutées) et les détails
   techniques dans « Détails des actions » avec les compteurs ; la réponse de l'agent reste en premier ; les
   avertissements importants restent visibles.

## Ce qui existait déjà (lu avant de coder)
`Career.tsx` avait déjà `AgentActivity` (texte, réflexion repliée, `ToolLine` dépliable avec pastille,
durée, paramètres et résultat, `ToolGroup` pour les appels consécutifs, échecs visibles sous un groupe
replié, indicateur « Réflexion… / Exécution… »). Le travail adapte cet existant ; le style visuel est gardé.

Le « Bilan » n'est pas un champ structuré : le back l'ajoute en texte à la fin de `result.summary`
(`packages/orchestrator/index.js` l. 1395-1560, `packages/career-ops/truth.js` `formatCareerBilan`,
`browser-proof.js`, `skill-router.js` `formatSkillBilan`). Le front le sépare donc par ses lignes.

## Ce qui a été fait
### Fil de l'agent (`src/Career.tsx`)
- Nom de l'outil : `_meta.claudeCode.toolName` (adaptateur Claude) est lu ; `mcp__platform__browser_navigate`
  devient `browser_navigate`. Avant, un outil natif `Write` dont le titre est « Write output/x.json »
  s'affichait `json` (découpe sur le point) : il s'affiche maintenant `Write` + `output/x.json`.
- Argument principal (`mainArgument`) : `url`, `command` (+ `args`), `file_path`, `path`, `pattern`,
  `query`… ; `fields` → « 3 champs ». Sinon, ancien affichage `clé: valeur`.
- Sortie : un `rawOutput` MCP `[{type:"text", text}]` est affiché comme son texte (JSON indenté), plus comme
  l'enveloppe JSON du bloc.
- Groupes : l'intitulé donne les outils (« browser_snapshot ×2 · browser_click »). Replié, le groupe laisse
  visibles l'appel en cours (pastille qui tourne) et les échecs : la dernière ligne montre ce qui est en cours.
- Un message de l'agent du type « Voici le bilan final. { …JSON… } » ne garde que son texte
  (`withoutResultEnvelope`) ; avant, seul un message réduit au JSON était masqué (vu sur 8028c9c6).
- Mission `core` (`src/Mission.tsx`) : le fil est rendu hors du bloc « Exécution » (qui se replie en fin
  de mission) ; en fin de mission, le texte déjà présent dans la réponse n'est pas répété. Prop `transcript`
  (défaut `true`) ; `App.tsx` passe `transcript={false}` au `RunView` des détails techniques career-ops,
  qui garde son fil dans le journal comme avant (pas de doublon dans la page).

### Réponse finale (`src/Bilan.tsx`, nouveau)
- `splitSummary` lit la fin de `result.summary` depuis le bas : lignes de la plateforme connues
  (« Affirmations de l’agent », « Capture : », « Bilan » + lignes « - », « Envoi par la plateforme »,
  « Requêtes réseau d'envoi », « Questions », « Actions natives », « Action(s) échouée(s) »,
  « Avertissement — », « Accord expiré », « Session : », « Navigateur : », « Notes non vérifiées »,
  « Mission incomplète »). Les tirets de la réponse de l'agent restent dans la réponse (une ligne « - »
  n'est rattachée au Bilan que sous un en-tête « Bilan »).
- `AgentAnswer` : réponse de l'agent (Markdown) d'abord ; puis avertissements visibles (`role="alert"`) ;
  puis `<details>` « Détails des actions · N réussies · N échouées · N mixtes · N non exécutées » replié.
- Avertissements visibles : « Avertissement — … » (y compris celui que le back met en tête), « Envoi par la
  plateforme : aucun approuvé » ou avec « dont » (sans effet, incertaine, refusé, sans issue connue),
  « action non effectuée » (accord expiré), « Questions : N posée(s), M répondue(s) » si M < N,
  « Session : », « Navigateur : », « Notes non vérifiées », « Mission incomplète », « L’agent n’a rien exécuté ».
  Les cartes d'accord et les questions en attente sont des composants à part (`OwnerRequests`, carte
  d'approbation de `RunView`) : non touchés, toujours visibles.
- Utilisé dans la synthèse `core` (`RunView`) et dans chaque tour du fil career-ops (`Turn`).
- Fil career-ops : si `/career/runs/:id/result` échoue et que la mission a un `result.summary`, celui-ci
  est affiché avec la mention « Résultat privé illisible : réponse enregistrée sur la mission. »
  (sur 4313, les résultats privés de 5 missions career-ops terminées répondent ENOENT ; avant, la page
  affichait le message ENOENT brut avec un chemin et aucune réponse).

## Fichiers
- `src/Bilan.tsx` (nouveau), `src/Career.tsx`, `src/Mission.tsx`, `src/App.tsx`, `src/v2.css`
- `src/transcription.test.tsx` (nouveau, 12 tests)

## Vérifications (résultats exacts)
- `npx vitest run` : `Test Files 13 passed (13)`, `Tests 178 passed (178)` (166 avant + 12 nouveaux ;
  aucun test existant modifié).
- `npm run build` (= `tsc --noEmit && vite build`) : `✓ built in 754ms`, seul avertissement : taille de
  morceaux > 500 kB (préexistant, mermaid/elk).
- `npx prettier --check src` : OK.
- Rendu réel sur http://127.0.0.1:5176 (Vite du worktree, API 4313), dans le panneau navigateur :
  - career-ops 8028c9c6 (sombre) : groupes nommés (« career_read ×4 » avec son échec visible), dépliage
    d'un `browser_navigate` (paramètres + sortie JSON indentée), enveloppe JSON absente du fil, réponse
    complète, « Détails des actions · 8 réussies · 1 mixte » replié puis déplié, mention du repli.
  - core 110f4791 (sombre, puis clair à 375 px) : fil visible sous « Exécution » replié, lignes
    `browser_fillForm 3 champs`, `browser_upload pieces-jointes/…pdf`, synthèse + « Détails des actions »
    replié ; `scrollWidth` = 375 (pas de défilement horizontal). Intitulé de groupe tronqué sur téléphone :
    corrigé (libellé sur une ligne, noms d'outils coupés par « … »).
  - career-ops 8f365fd4 (encore « running » au début de la session, terminée pendant le contrôle) :
    vue terminée seulement.
  Thème remis en sombre et taille du panneau rétablie après les contrôles.

## Non vérifié
- Une mission **en cours** dans le navigateur (aucune n'a été lancée, consigne) : la ligne en cours sous un
  groupe replié et l'indicateur sont couverts par les tests seulement.
- Bloc de réflexion avec de vraies données : aucun `agent_thought_chunk` dans les missions de 4313 (Claude
  ne les envoie pas ici) ; le rendu existant est couvert par les tests de `conversation.test.tsx`.
- Avertissements visibles sur une vraie mission : aucune mission de 4313 n'en porte (tous les envois
  approuvés) ; couverts par les tests avec les phrases exactes du back.
- `npm run test:e2e` non lancé (build + scénarios navigateur sur d'autres ports).
- Missions Codex / Gemini réelles : formes couvertes par les tests existants seulement.

## Manques côté API (constatés, non contournés)
1. Le Bilan n'existe qu'en texte libre dans `result.summary` : le front le reconnaît par ses phrases. Un
   champ structuré (`result.bilan = { succeeded, failed, mixed, notDone, lines, warnings }`) éviterait
   qu'un changement de formulation côté back casse le repli. Les phrases reconnues sont listées dans
   `src/Bilan.tsx`.
2. Le résultat privé career-ops (`/career/runs/:id/result`) est écrit avant les lignes « Envoi par la
   plateforme », « Questions », « Actions natives », « Session », « Navigateur » (index.js l. 1481 vs
   l. 1509-1545) : la vue career-ops ne voit donc pas l'avertissement « Envoi par la plateforme : aucun
   approuvé » ni une question restée sans réponse. Vu sur 8f365fd4 (ligne présente dans `/api/runs/:id`,
   absente du résultat privé).
3. Sur 4313, `/career/runs/:id/result` répond ENOENT pour 5 missions terminées (chemin dans le dossier
   temporaire d'une autre session) : le message brut, chemin compris, était montré à l'utilisateur.
4. Pas de nom lisible ni de catégorie d'outil dans les événements : `kind` vaut `other` pour tous les outils
   de la plateforme ; le nom vient de `_meta.claudeCode.toolName` (propre à l'adaptateur Claude) ou du titre.
5. `ToolSearch` : le résultat utile n'arrive que dans `_meta.claudeCode.toolResponse` (le `rawOutput` final
   vaut parfois « No matching deferred tools found » alors que la recherche suivante trouve) ; non affiché.
6. Quand l'agent termine par un JSON invalide (8f365fd4 : retour à la ligne brut dans une chaîne), le back
   garde tout le texte comme `summary`, bloc ```json compris ; le front l'affiche tel quel.

---

## Suite du 11/11 (19:52-19:58) — back relancé sur 5071103

### Fait (commit `52227b7`)
- **`result.answer` / `result.platformNotes`** (`src/Bilan.tsx` `splitResult`, `src/types.ts`) : quand les deux
  champs existent, la réponse et les lignes de la plateforme sont prises telles quelles ; seul le choix
  « visible / replié » se fait par phrase sur chaque ligne de `platformNotes`. Une ligne inconnue du front
  reste du côté plateforme (repliée). `answer` vide (privée) → texte du résumé à sa place. Repli par phrases
  inchangé pour les anciennes missions et le résultat privé career-ops. Utilisé dans la synthèse core, les
  tours de `SessionHistory` et le repli du fil career-ops.
- **Codex** (`src/Career.tsx`), formes lues sur f831e62b et f7271831 (4313) :
  - commandes `kind: "execute"` avec `rawInput.command` → « Commande » + la commande ; sortie prise dans
    `_meta.terminal_output_delta.data` (le `rawOutput` final n'est que `{ exit_code }`) ; code de sortie non
    nul ajouté à la sortie ;
  - outils MCP : `kind: "execute"` + `_meta.is_mcp_tool_call` → comptés « actions » (plus « commandes ») ;
    résultat `{ result: { content: [{type:"text"}] } }` déballé ;
  - titres « Read file '…' » (avant : nom `md'`), « List files in '…' », « Search for '…' in … »,
    « Open page », « Web search: … » (avant : l'entrée brute `type: webSearch, id: …` en argument).
- **Enveloppe JSON** déplacée dans `src/envelope.ts` (réexportée par `Career.tsx`) : JSON avec retours à la
  ligne bruts toléré ; tant que la réponse n'est pas montrée à part (mission en cours, **question en attente**),
  le résumé de l'enveloppe reste dans le fil au lieu d'être retiré, avec la question qu'elle porte
  (« **Question de l’agent :** … »). Avant, une réponse Codex en JSON pur disparaissait du fil pendant l'attente.
  Une réponse finale restée en JSON (`result.answer` = l'enveloppe) affiche son résumé.

### Vérifications
- `npx vitest run` : `Test Files 13 passed (13)`, `Tests 185 passed (185)` (7 nouveaux).
- `npm run build` : `✓ built in 675ms` ; `prettier --check src` : OK.
- 5176 + 4313 : conversation Codex f831e62b → f7271831 (2 tours, career-ops) : tour 1 terminé (réponse,
  question de l'agent, « Envoi par la plateforme : aucun approuvé » visible, « Détails des actions ·
  4 réussies · 2 non exécutées » replié) ; tour 2 **en cours** observé en direct : groupe « Exécute 4 actions »
  avec la ligne en cours visible sous le groupe replié et « Exécution… » ; noms et arguments de toutes les
  lignes Codex relus (Read file, List files in, Search for, Web search, Open page, Commande, career_*).
  Réflexion Codex (`agent_thought_chunk`) présente et repliée.

### Non vérifié
- Une mission **réellement en attente** d'une question en prose : aucune sur 4313 pendant le contrôle
  (`pendingQuestion` toujours `null`) ; couvert par un test (`CareerThread`, état `awaiting_owner`,
  question `prose`, réponse JSON au-dessus du formulaire).
- Les champs `answer` / `platformNotes` d'une mission **core** réelle : seule la mission Codex f831e62b
  (career-ops, finie 19:52) les porte ; rendu core couvert par les tests.

### Manque côté back (nouveau)
7. f831e62b : la réponse Codex est un JSON **valide** dont `question` est une **chaîne**
   (`"question": "Confirmez-vous …"`), pas `{ message }`. Le back ne l'a ni posée (aucun événement
   `question`, `pendingQuestion` nul) ni déballée : `result.answer` et le résumé privé contiennent tout le
   JSON. Le front affiche son résumé et la question, mais la question n'a pas été transmise comme telle
   (le propriétaire a répondu en relançant un tour).
