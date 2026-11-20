# Portage swarm-11 — Interface 2 : liste des missions, accord court, état des agents

Copieur, 21/11/2026 (04:26). Base `42ebff5`. Pas de code porté (le plan le dit) : ce fichier donne la règle de
priorité « une activité par ligne », les libellés d'origine, et l'état réel du front et des contrats du back pour le
codeur. Swarm lu en lecture seule (rien exécuté) : `/Users/diaw/Downloads/agent-repos-agregat/desplega-ai__agent-swarm`.
Contrats lus dans `/Users/diaw/Downloads/agregat-back-swarm` (code intégré jusqu'à swarm-08, commit `d3574af`).

## 1. Ce qui est copié de swarm (règle et libellés)

### 1.1 `apps/ui/src/components/sessions-v2/sidebar/session-row.tsx` — une activité par ligne

Lignes du plan confirmées : 46-54 (type et règle), 64 (premier cas de `ActivityMark`), 151 (libellé accessible).

- Ligne 46 : `export type Activity = "needs" | "running" | "failed" | null;` → trois activités ou aucune.
- Ligne 48 (commentaire, cité tel quel) : « The activity slot: Needs you, else running (the server's rule: the latest
  status is not terminal), else failed. » → « La case d'activité : te demande, sinon en cours (règle du serveur : le
  dernier état n'est pas final), sinon échec. »
- Lignes 49-54, `activityOf(session)` — **la règle de priorité**, dans cet ordre, la première qui vaut gagne :
  1. `session.needsYou` → `"needs"` ;
  2. `!TERMINAL_STATUSES.has(session.latestStatus)` → `"running"` ;
  3. `session.latestStatus === "failed"` → `"failed"` ;
  4. sinon `null` (aucune pastille : fini avec succès, annulé…).
  `TERMINAL_STATUSES` (`apps/ui/src/lib/task-activity.ts:3-9`) = `completed, failed, cancelled, superseded, skipped`.
  Équivalent Relay : `finalStates` de `src/types.ts` (`completed, failed, cancelled, interrupted`).
- Lignes 56-62 (commentaires, pièges) : « Running turns slowly, as everywhere » → « En cours tourne lentement, comme
  partout » ; « In a narrow sidebar row … "Needs you" turns into its amber dot, as on a tab, so the title keeps its room
  and the row never grows past the sidebar. » → « Dans une ligne étroite, « te demande » devient sa pastille ambre, pour
  que le titre garde sa place et que la ligne ne dépasse jamais la barre latérale. »
- Lignes 63-83, `ActivityMark` : ligne 64 `if (activity === "needs")` → badge « Needs you » (et, ligne 70, un point
  `role="img" aria-label="Needs you"` quand la ligne est étroite) ; ligne 76 `"running"` → icône `label="Running"` ;
  ligne 79 `"failed"` → icône `label="Failed"` ; sinon `null`. **Une seule marque par ligne.**
- Lignes 380-387 (piège de mise en page) : « an activity mark or a wake time hides the group label » → une marque
  d'activité masque le libellé secondaire ; le titre garde au moins 45 % (`min-w-[45%]`, ligne 373).
- Lignes 139-163, `rowLabel` (nom accessible de la ligne) ; ligne 151 : `activity === "needs" && "Needs you"`.
  **Piège** : lignes 152-153 ajoutent « Running » et « Failed » d'après `latestStatus`, indépendamment de `activity` :
  le nom accessible peut donc dire « Needs you. Running » alors qu'une seule marque est dessinée. À ne pas reproduire
  tel quel si le test exige une seule activité ; dans Relay le libellé écrit de l'état (`<small>` de la ligne) existe déjà.

Libellés d'origine et traduction proposée (vocabulaire déjà employé dans Relay) :

| Swarm (fichier:ligne)                         | Sens                       | Relay                                  |
| --------------------------------------------- | -------------------------- | -------------------------------------- |
| « Needs you » (session-row.tsx:67, 70, 151)   | le propriétaire doit agir  | « te demande » (plan) ; existant « À vous » |
| « Running » (session-row.tsx:77, 152)         | en cours                   | « en cours » (`labels.running` = « En cours ») |
| « Failed » (session-row.tsx:80, 153)          | échec                      | « échec » (`labels.failed` = « Échec ») |
| « Unread » (session-row.tsx:150)              | non lu                     | écarté (Relay n'a pas de non-lu)       |
| « 1 task » / « N tasks » (session-row.tsx:206)| compteur de la chaîne      | modèle du « 3 membres »                |

### 1.2 `apps/ui/src/pages/approval-requests/components/request-header.tsx` — une ligne, le détail dans le corps

- Ligne 152 (confirmée) : commentaire de `ApproversLine` : « "Needs an answer from [TY Taras]": each approver is a
  chip, the ID in its tooltip. » → « « Attend une réponse de … » : une ligne courte, le détail (l'identifiant) dans
  l'infobulle. » Les phrases d'en-tête de `approverParts` (`apps/ui/src/lib/approval-format.ts:294-301`) : « Anyone on
  the team can answer », « Needs N of M: », « Needs an answer from », « Needs every approver: », « Any one of … can
  answer ».
- Lignes 216-240 (confirmées ; la fin du composant est à 264) : `ResolutionBanner`, commentaire ligne 216 « The outcome,
  first thing on a resolved request: who, when, and why. » → « L'issue, en premier : qui, quand et pourquoi. » Forme :
  un titre d'une ligne (`config.title`, ligne 254 : « Approved », « Rejected », « Timed out », « Cancelled »), une ligne
  de détail (lignes 230-236 : « No answer within … », « No answer before the deadline », « by … »), puis **la raison
  détaillée dans le corps** : `request.resolutionReason`, lignes 261-263 (**écart** : au-delà de la plage 216-240 citée).
- Lignes 127-133 (hors plage citée, même idée) : demande en attente en une ligne : « Waiting for more approvals · … » ou
  « Waiting for an answer », plus « · <temps restant> ».
- Application au lot (b) : une phrase visible ; le texte complet du contrat dans le pli « En savoir plus ».

Écarté de swarm : Tailwind, `motion`, `HoverCard`, glisser-déposer, sélection, non-lu, réveil (« snooze »), avatars,
partage, groupes de sources, raccourcis clavier — rien de cela n'existe dans Relay ni n'est demandé par le lot.

## 2. Le front aujourd'hui (lecture seule, base `42ebff5`)

### 2.1 `src/App.tsx` — liste des missions

- État : `const [runs, setRuns] = useState<Run[]>([])`.
- La liste est lue par **deux** appels identiques `api<Run[]>("/runs")` : dans `history` (`useCallback`, « async () =>
  setRuns(await api<Run[]>("/runs")) ») et dans `load` (`Promise.all([api<Catalog>("/catalog"), api<Run[]>("/runs")])`).
  Le POST de lancement emploie aussi `"/runs"` mais avec un corps (`api<Run>("/runs", toApiInput(candidate), …)`) :
  ne pas le toucher.
- Rendu : `<div className="mission-list">` → `conversations(runs).map(({ run: r, turns }) => <button className="mission-link …">`
  avec `<i className={"dot " + r.state} />`, le titre `<span title={r.prompt}>{r.title || r.prompt}</span>`, le libellé
  `<small>{labels[r.state] || r.state}</small>` (classe `sr-only` pour un état final ou « propriétaire »),
  `<small className="owner-turn" title="À vous de répondre">À vous</small>` si `ownerStates.has(r.state)`,
  `<small className="turns">{turns} tours</small>` si `turns > 1`, `<small>fictif</small>` si `r.simulated`.
- `conversations()` est dans `src/Career.tsx` (≈ ligne 935), pas dans App.tsx : il masque un tour repris
  (`resumedFrom`, liens locaux) et garde le dernier tour de chaque `sessionId`. **Il ne filtre pas les sous-missions** :
  aujourd'hui, avec `GET /api/runs` sans paramètre, chaque sous-mission (ligne avec `famille`) est une ligne de la liste.
- Autres lecteurs de `runs` (tous touchés si la liste devient `?racines=1`) : le compteur `waiting`
  (`runs.filter((r) => ownerStates.has(r.state))`, badge « N missions attendent votre réponse ») ; `syncList` ;
  `<Consumption runs={runs}>` (page Consommation, titre « N missions ») ; `<CareerThread runs={runs}>` et
  `<SessionHistory run={run} runs={runs}>` (`sessionThread`) ; `agentWarning(input.agent, catalog, runs)` (lit la
  dernière mission finie de l'agent : sans les sous-missions, une limite vue sur une sous-mission ne serait plus lue).
- La ligne 759 du plan est l'en-tête de la mission ouverte (`<span className="badge">{labels[run.state] || run.state}</span>`),
  pas la liste ; la liste est vers les lignes 667-701.
- Garde du lot swarm-09 (`src/swarm-09-relecture.test.tsx`, « App.tsx : les 5 lectures GET d'une mission portent
  ?equipe=1 ») : exactement 5 `api<Run>("/runs/" + …` et 5 `?equipe=1` dans App.tsx. Un `api<Run[]>("/runs?racines=1")`
  ne compte pas, mais **aucune lecture `api<Run>("/runs/" + …)` neuve n'est possible** sans casser ce test (hors lot).

Où ajouter `?racines=1` : les deux `api<Run[]>("/runs")` (`history` et `load`). Ce que cela casse :

| Fichier de test (dans la liste du lot ?)       | Correspondance employée                       | Effet de `"/runs?racines=1"` |
| ---------------------------------------------- | --------------------------------------------- | ---------------------------- |
| `etat-liste.test.tsx` (oui), tests 1 et 2      | `path === "/runs"` puis repli                 | test 1 : le repli rend un objet `run` au lieu d'un tableau → `runs.filter` lève ; test 2 : le repli rend une promesse jamais résolue → la ligne n'apparaît pas. Les comptes `path === "/runs" && !body` (test 1) passent à 0 et ne prouvent plus rien. |
| `etat-liste.test.tsx` tests 3 et 4             | tout chemin hors `/catalog` → tableau         | inchangés |
| `App.test.tsx` (oui), 12 occurrences           | `path === "/runs"` (lignes ≈ 251, 292, 330, 362, 436, 486, 635, 705, 781, 826) | mêmes ruptures selon le repli de chaque test |
| `equipe.test.tsx` (oui), ligne ≈ 835           | `path === "/runs"` puis `new Promise(() => {})` | la mère n'apparaît plus |
| `orienter.test.tsx` (**non**), lignes ≈ 323, 393 | `path === "/runs"` puis repli `run`          | le repli rend un objet → `runs.filter` lève |
| `orienter-contrat.test.tsx` (**non**), ligne ≈ 155 | idem                                       | idem |

`affichage.test.tsx:442` et `equipe.test.tsx:106, 126` testent `path === "/runs" && body` (le POST) : non touchés.
**Point à trancher** : changer le chemin de la liste casse 3 tests de deux fichiers hors lot. Alternative sans casse :
garder `GET /runs` (sans paramètre) et retirer côté interface les lignes qui portent `famille.mere` dont la mère est
dans la liste (même règle que `listRuns` du back) ; cela garde aussi, dans `runs`, les lignes brutes des
sous-missions, seules à porter `agentPrevu` et `motif` (voir 3.4). Inconvénient : la limite de 200 lignes du back
compte les sous-missions.

### 2.2 `src/Composer.tsx` — accord du mode équipe et choix de l'agent

- Props : `agentWarning?: string | null` ; `const teamHelp = useId();` ; `const agent = catalog?.agents.find((a) => a.id === input.agent);`.
- Alerte d'agent : `{agentWarning && !reply && !disabled && (<p className="agent-warning" role="alert">{agentWarning}</p>)}`.
  Une deuxième `role="alert"` existe (équipe + workflow choisi). `affichage.test.tsx` (hors lot) fait
  `screen.getByRole("alert")` : une seule alerte doit rester dans son cas (agent `codex`, pas d'équipe).
- Choix de l'agent : `<Filter name="Agent" value={agent?.name || "Auto"}>` → `<select aria-label="Agent" value={input.agent}>`,
  première option `<option value="auto">Auto · selon les capacités</option>`, puis `catalog?.agents.map((a) => <option … disabled={!a.installed || !a.compatible || (!catalog.live && !a.simulated)}>{a.name}{!a.compatible ? " · indisponible" : ""}</option>)`,
  dans l'ordre du catalogue. **Rendu d'un agent indisponible aujourd'hui** : non installé, incompatible ou réel en mode
  démo → option désactivée ; seul l'incompatible porte « · indisponible ». Un agent sous limite d'usage ou à connexion
  refusée reste une option active, sans libellé ; seul `agentWarning` (texte sous le composeur) le signale, d'après la
  sonde ou la dernière mission finie. Le défaut est `agent: "auto"` (`initial` dans App.tsx) : « non proposé par
  défaut » ne peut donc vouloir dire que « pas en tête de liste » et/ou « option désactivée » — **à préciser**.
- Texte d'accord : bloc `<Filter name="Équipe" value={input.team ? "Allumée" : "Éteinte"}>` : interrupteur
  `role="switch" aria-label="Équipe d’agents" aria-describedby={teamHelp}` (allumer coche aussi `teamConsent`), case
  « Autoriser les sous-agents » quand `input.team`, puis `<small id={teamHelp}>` (commentaire « Text of the back contract
  (docs/api-delegation.md section 6), default envelope. ») avec le texte entier :
  « L’agent de ta mission pourra, s’il le juge utile, confier des parties du travail à d’autres agents qui travaillent en
  même temps. Chacun consomme ton abonnement comme une mission ordinaire : avec plusieurs agents à la fois, ta limite
  d’usage peut être atteinte plus vite. Autoriser n’oblige pas : pour une demande simple, un seul agent travaillera. Au
  plus 6 sous-missions Relay pour cette mission, 3 en même temps ; une sous-mission en échec peut en plus être reprise
  deux fois hors de cette limite ; les sous-agents internes que les agents lancent d’eux-mêmes ne sont ni comptés ni
  bornés par cette limite. Sans « Autoriser les sous-agents », ton accord te sera demandé au premier lancement. Les
  envois restent à ton clic. »
  **Écart avec `DOC` §6** : le front n'a pas « (modifiables) » après « 3 en même temps » et ajoute la phrase « Sans
  « Autoriser les sous-agents », ton accord te sera demandé au premier lancement. » (voie 3). Le lot ne doit que replier
  ce texte, sans le réécrire.
- Ce que figent les tests sur ce texte (`equipe.test.tsx`) : `screen.getByText(/confier des parties du travail/)` doit
  trouver **un seul** élément contenant aussi « en même temps », « consomme ton abonnement », « envois restent à ton
  clic » ; l'élément nommé par `aria-describedby` de l'interrupteur doit contenir, en `textContent`, « confier des
  parties du travail », « Au plus 6 sous-missions Relay pour cette mission, 3 en même temps », « limite d'usage peut
  être atteinte plus vite », « Autoriser n'oblige pas », « reprise deux fois hors de cette limite », « sous-agents
  internes », « envois restent à ton clic ». Donc : la phrase courte ne doit pas contenir « confier des parties du
  travail » ; l'`id={teamHelp}` reste sur l'élément du texte complet (un `<details>` fermé garde son contenu dans le DOM,
  `textContent` et `getByText` le lisent).

### 2.3 `src/agentStatus.ts`

- `limitStillHolds(run, now)` : lit « réessayer à (.+?)\. Choisir » dans `run.error` ; heure lisible → `now < retryAt` ;
  sinon une limite datant de moins d'un jour.
- `agentWarning(agent, catalog, runs, now = Date.now())` : `null` pour `auto` ou agent inconnu ; puis dans cet ordre :
  « X n’est pas détecté sur cette machine. » ; « X est indisponible : <reason>. » ; « X : dernière session refusée (…). » ;
  « X : dernier prompt refusé (…). » ; « Dernière mission X : <error> » (dernière mission finie de l'agent en échec
  « Limite d’usage… » encore valable). **Ne lit aucun champ `etat`/`raison`/`jusqua`.**
- Figé par `affichage.test.tsx` (hors lot), test « 8. signale un agent indisponible » : catalogue **sans** `etat` ;
  les sorties ci-dessus pour codex (limite datée, passée, non datée), gemini (`null`), opencode (« auth FICTIVE »),
  auto (`null`), succès plus récent (`null`). La signature et ces sorties doivent rester ; un agent sans `etat` = rendu
  d'aujourd'hui (le plan le demande aussi).
- Autre libellé d'état d'agent : `agentStatus(a)` dans `src/types.ts`, employé par `Galleries.tsx` et `Settings.tsx`
  (fichiers hors lot) : « Simulé · fictif », « Non installé », « Incompatible », « Session refusée · … », « Prompt
  refusé · … », « Prompt validé le … », « Session validée · prompt non testé », « Détecté · non testé ».

### 2.4 `src/types.ts`

- `Agent` : `id, name, installed, compatible, simulated?, version?, readiness?, reason?, probe?` — **pas** de `etat`,
  `raison`, `jusqua`, `modelesLimites` (à ajouter, facultatifs).
- `Run` (mission de la liste et mission ouverte, même type) : pas de `equipe`, pas de `famille` (à ajouter
  facultatifs). Déjà : `multiAgent?`, `family?: FamilyMember[]`, `activity?: { agents?, awaitingOwner? }`, `carnet?`.
- `FamilyMember` : `id, titre?, agent?, modele?, continue?, pourquoi?, debut?, fin?, dureeMs?, depuis?,
  inactiveDepuis?, outils?, dernierOutil?, resultat?, cause?: MemberCause, usage?: unknown` (commentaire « Typed only:
  not sent before swarm-14, not displayed »), `state?, attend?, pendingQuestion?, pendingPermission?, role?, relit?,
  verdict?`. **Pas** de `motif`, `agentPrevu`, `agentImpose`.
- Constantes : `finalStates` (completed, failed, cancelled, interrupted), `ownerStates` (awaiting_owner,
  waiting_permission), `labels` (dont « En cours », « Échec », « Attend votre réponse », « Autorisation requise »).

### 2.5 `src/Team.tsx` et `src/status.ts` (lot swarm-09)

- `status.ts` : `variantOf(state, attend?)` → `attente | encours | te_demande | fini | echec | annule | inconnu` (un état
  final gagne sur `attend` ; puis attente du propriétaire ; puis attente de la plateforme ; puis l'état) ;
  `CLASSE_ETAT[variante]` → classes `etat etat-<variante>` (CSS déjà dans `src/v2.css`, fichier hors lot) ;
  `labelOf(state)` → libellé français, « État inconnu » sinon ; `heldLabels` ; `formatDuree`, `dureeOf`,
  `ligneConfie` (« confié à agent · état · durée », non employée par Team.tsx), `membresVisibles` (8 + « +N autres »),
  `trierParDebut`, `resumeEquipe` (commentaire : « without cost: `usage` is not sent before swarm-14 »).
- Pour la liste : `variantOf(r.state)` donne `te_demande` pour `awaiting_owner`/`waiting_permission`, `encours` pour
  `running`, `echec` pour `failed` ; `CLASSE_ETAT` donne la classe de la pastille. Les classes `.dot.<état>` de
  `style.css` existent aussi pour la pastille actuelle.
- `Team.tsx`, `TeamBlock({ run, openRun? })` : en-tête « N membres · X en cours · [Y en attente d’une place ou d’un
  prérequis · ] Z finies · W en attente de toi » ; « Chef : <agent> · <état> » ; par membre : titre (bouton « Ouvrir la
  sous-mission … » si `openRun`), badge `CLASSE_ETAT[variantOf(m.state, m.attend)]` + `labelOf`, rôle, `agent · modele`,
  attente, « suite de « … » », « relit « … » », durée ou « depuis », « dernière action … il y a … », verdict, pli
  « Résultat », pli d'échec (`Failure` : « Échec après … : limite d’usage atteinte | erreur », message, « réessayer à
  HH:MM »). **Aujourd'hui ni `pourquoi`, ni motif, ni agent prévu, ni jetons ne sont affichés.**

### 2.6 Ce que figent les tests du lot

- `etat-liste.test.tsx` : la ligne suit l'état de la mission ouverte sans relire la liste (« En cours » → « Attend
  votre réponse » + `.owner-turn` « À vous », title « À vous de répondre », `.dot.awaiting_owner` → « Autorisation
  requise » → « En cours ») ; la liste n'est lue qu'une fois (compte des appels `path === "/runs" && !body`) ; un
  événement SSE `state` met la ligne à jour avant la relecture ; le compteur « 2 missions attendent votre réponse »
  (dans `.missions-title`, puis dans `.toolbar` quand la barre est masquée) ; compteur absent sans attente.
- `App.test.tsx` : saisie gardée avant catalogue, lancement tardif, composeur compact, dock, reconnexion, pièces
  jointes, file d'instructions, reprise, envoi direct sans plan ; les mocks de liste répondent sur `path === "/runs"`.
- `equipe.test.tsx` : corps de création (éteint = corps d'avant ; allumé = `multiAgent` + `delegation: { accepted:
  true, via: "bouton" }`) ; interrupteur et texte d'accord (voir 2.2) ; bloc Équipe (une ligne par membre, compteur,
  verdicts, suite de, modèle, ouverture, famille vide) ; carnet ; « mission sans équipe » = **instantané**
  `src/__snapshots__/equipe.test.tsx.snap` (RunView) ; swarm-09 (états, échec, durée, 8 + autres, tri, « sans aucun
  champ neuf : rendu d'aujourd'hui » avec un `not.toMatch(/durée|depuis|dernière action|Résultat|Échec après|réessayer|sans point précis|illisible|\+\d+ autres?/)`
  — un texte neuf pour motif / agent prévu / jetons ne doit apparaître que si le champ existe) ; lecture par
  `GET /runs/:id?equipe=1` (mock de la liste sur `path === "/runs"`).

## 3. Ce que le back intégré rend (champs exacts)

### 3.1 `equipe` d'une mission de la liste — `GET /api/runs` et `GET /api/runs?racines=1`

`listRuns` (`packages/orchestrator/team-view.js`) : `equipe = { membres, enCours, finis, echecs, teDemande }`, cinq
**nombres**, présent seulement sur une ligne **sans `famille`** qui a au moins une sous-mission ; absent sinon
(mission ordinaire, sous-mission, ou lecture en échec). `finis` = `completed` ; `echecs` = `failed|cancelled|interrupted` ;
`enCours` = le reste, retenus compris ; `teDemande` = membres `awaiting_owner`, `waiting_permission` ou retenus
`attend_accord` (`0` quand personne). `?racines=1` retire les lignes qui ont `famille.mere` dont la mère est encore
dans la base. Limite : 200 lignes lues **avant** le filtre. Les lignes de la liste sont les lignes brutes de la base
(plus `title`) : une sous-mission y porte tout son `famille` (`racine, mere, titre, apres?, relit?, role?,
verdictAttendu?, continue|reprend?, reprise?, dossierResultats?, pourquoi?, motif?, agentPrevu?, agentImpose?`).
Pas de `teDemande` booléen : « 1 te demande » se lit `equipe.teDemande > 0`.

### 3.2 État d'un agent — `GET /api/catalog`, `agents[]`

`publicAgents` (`apps/api/server.js`) étale `agentState(a, probe, { live })` : `etat` (toujours présent), `raison?`,
`jusqua?`, `modelesLimites?` ; les champs existants (`probe`, `reason`…) sont inchangés.

| `etat`              | `raison` (texte exact du back)                              | `jusqua` |
| ------------------- | ----------------------------------------------------------- | -------- |
| `simule` / `pret` (simulé) | absente                                              | absent   |
| `non_installe`      | « CLI non détecté »                                         | absent   |
| `adaptateur_absent` | `agent.reason` ou « Adaptateur ACP absent »                 | absent   |
| `mode_reel_eteint`  | « Mode réel désactivé »                                     | absent   |
| `limite`            | « Limite d’usage jusqu’à HH:MM » (« Limite d’usage » si heure illisible) | ISO |
| `connexion_refusee` | « Session refusée (<erreur ou auth>) » ou « Dernier prompt refusé (<erreur ou authentification>) » | absent |
| `a_reessayer`       | même texte que ci-dessus (refus de plus de 10 min)          | absent   |
| `pret`              | absente                                                     | absent   |

`modelesLimites` = `{ <id du modèle>: <jusqua ISO> }`, présent dans tous les états à partir de `limite` (pas pour
simulé, non installé, adaptateur absent, mode réel éteint) quand un modèle est sous limite. `raison` de `limite` est
formatée par le **serveur** (`toLocaleTimeString('fr-FR')`, heure locale du processus) ; « limite d’usage jusqu’à
23:27 » (minuscule, plan) se construit plutôt depuis `jusqua` dans le navigateur. Les mots « connexion refusée » ne
sont **pas** dans `raison` : ils viennent de `etat`. En mode démo (`live: false`), un agent réel a `etat:
"mode_reel_eteint"`. Les catalogues des tests actuels n'ont pas `etat` : rendu d'aujourd'hui.

### 3.3 Motif — `pourquoi`, `motif`

- `pourquoi` (valeur fixe : `parallele`, `specialite`, `regard_independant`, `contexte_trop_long`,
  `demande_proprietaire` ; libellés du back `decision.js:24-28` : « parallèle », « spécialité », « regard indépendant »,
  « contexte trop long », « demande du propriétaire ») : dans `family[]` de `GET /api/runs/:id?equipe=1` (absent sinon),
  et dans `famille.pourquoi` de la ligne brute de la sous-mission.
- `motif` (la note du chef, 10-200 caractères ; jamais écrite pour une mission privée) : **aucune route ne le met dans
  `family[]`**. Il n'est que dans `mission_suivre` (outil du chef) et dans `famille.motif` de la ligne brute de la
  sous-mission (`GET /api/runs` sans `racines`, ou `GET /api/runs/<id de la sous-mission>`).

### 3.4 Agent prévu — `agentPrevu`

`famille.agentPrevu` (identifiant de l'agent prévu, chaîne) n'est écrit que sur la **ligne en base** de la
sous-mission lancée sur un autre agent (repli swarm-08) ; l'agent réel est `agent` de la sous-mission. Selon `DOC` 9.8 :
« `agentPrevu` et `agentImpose` sont sur la ligne en base (`famille`), pas dans la ligne de `mission_suivre` ni au
Bilan ». Ni `delegation.view()` ni `withTeam()` ne le recopient : **absent de `family[]` de `GET /api/runs/:id`, avec
ou sans `?equipe=1`**, et absent de `GET /api/runs?racines=1` (la sous-mission y est retirée). La **raison** de
l'indisponibilité n'est écrite nulle part (seulement dans la réponse au chef, `note`) : « lancé sur claude (codex
indisponible) » est faisable (agent + agentPrevu), « (codex : limite d’usage jusqu’à …) » ne l'est pas.

### 3.5 Jetons — `usage`

`family[].usage` (`GET /api/runs/:id?equipe=1`) vient de `delegation.doneOf(child)?.usage` ; `doneOf` ne rend que
`envois`, `fichiers`, `echec?` : **`usage` est toujours absent** tant que swarm-14 n'est pas posé (le contrat le dit).
Le `usage` de `GET /api/runs/:id` d'une mission (`platformCents`, `byDimension`) est le compteur de la plateforme
(tours BYOA, outils observés…), pas des jetons du fournisseur ; `managed_model_tokens` n'existe qu'en mode Managed.
« Jetons annoncés quand ils existent » : aujourd'hui, rien à afficher ; le code doit seulement ne rien montrer sans
`usage` (forme exacte de `usage` non définie par le back : à typer en `unknown` et lire prudemment, ou à laisser).

## 4. Écarts entre le plan et le back intégré

1. **`agentPrevu`** : le plan le place « sur un membre » (`types.ts`, bloc Équipe) ; aucune route ne le donne dans
   `family[]`. Seules sources HTTP : la ligne brute de la sous-mission dans `GET /api/runs` **sans** `racines`, ou
   `GET /api/runs/<id>` de la sous-mission (lecture neuve interdite de fait par la garde des « 5 lectures » de
   `swarm-09-relecture.test.tsx`, hors lot). Le plan dit « Contrat touché : aucun côté back ».
2. **`motif`** : même situation (`mission_suivre` et ligne brute seulement) ; `pourquoi` est bien dans `family[]`.
3. **Jetons (`usage`)** : jamais envoyés avant swarm-14.
4. **Raison du repli** non conservée : seul l'identifiant `agentPrevu`.
5. **`?racines=1`** casse des mocks de tests hors lot (`orienter.test.tsx`, `orienter-contrat.test.tsx`) ; voir 2.1.
6. **Ligne 759** d'App.tsx = en-tête de la mission ouverte ; la liste est vers 667-701.
7. **`src/Composer.tsx:600-640`** : confirmé (texte d'accord ≈ 604-618) ; le texte du front n'est pas mot pour mot
   `DOC` §6 (« (modifiables) » absent, phrase de la voie 3 ajoutée).
8. **« liste : une mère avec `equipe` … bonne pastille pour chacune des trois priorités »** : swarm calcule l'activité
   sur la session entière (`needsYou` agrégé, dernier état). Adaptation proposée, à valider : te demande =
   `ownerStates.has(r.state) || (r.equipe?.teDemande ?? 0) > 0` ; en cours = `!finalStates.has(r.state) ||
   (r.equipe?.enCours ?? 0) > 0` ; échec = `r.state === "failed" || (r.equipe?.echecs ?? 0) > 0` ; sinon aucune.
   Attention : `equipe.echecs` compte aussi `cancelled` et `interrupted` (swarm : seulement `failed`).
9. **CSS** : `src/v2.css` n'est pas dans la liste des fichiers du lot ; réemployer les classes existantes
   (`.dot.<état>`, `etat-*` de `CLASSE_ETAT`).
10. `agentStatus` (libellé d'état) existe en deux endroits : `src/agentStatus.ts` (`agentWarning`) et
    `src/types.ts` (`agentStatus(a)`, employé par Galleries/Settings hors lot).

## 5. Non vérifié

- Aucun test ni build lancé (rôle copieur). Le rendu dans un navigateur n'est pas vu.
- Le comportement exact de `getByText` sur un `<details>` fermé dans la version de testing-library du dépôt (le DOM
  garde le contenu ; à confirmer par le test du codeur).
- Vérifié depuis : `link` devient `famille` à la création (`packages/orchestrator/index.js:1195`,
  `famille: family.link`) et la base est un JSON (`packages/storage/index.js:100`) ; la ligne brute porte donc
  `famille` entier. Pas vérifié sur une base réelle.
