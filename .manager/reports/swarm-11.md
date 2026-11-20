# swarm-11 — Interface 2 : liste des missions, accord court, état des agents (codeur)

Codeur, 21/11/2026, 04:31 → 04:37 (heure lue par `date`). Arbre `/Users/diaw/Downloads/agregat-front-swarm-11`,
branche `swarm-11`, base `42ebff5`, portage `c116a9f` (`.manager/portage/swarm-11/NOTES.md`).

## Fait

- **Liste (a)** — `src/App.tsx` : la liste lit toujours `GET /runs` (inchangé, précision 1). Rendu :
  `conversations(missionsDeLaListe(runs))`. `missionsDeLaListe` retire une ligne qui porte `famille.mere` quand sa mère
  est dans la même réponse (règle de `?racines=1` du back : une sous-mission orpheline reste listée, pour rester
  ouvrable). Pour chaque ligne, `resumeListe(r, runs)` : `equipe` du back s'il est sur la ligne (nombres valides,
  `membres > 0`), sinon compté sur les sous-missions présentes ; `null` = mission sans équipe → ligne d'aujourd'hui,
  octet pour octet (test). Les échecs : `failed` seulement, comptés sur les lignes des sous-missions quand elles sont là,
  sinon `equipe.echecs` du back (qui compte aussi les annulés : limite écrite plus bas).
  `activiteListe` : te demande (mère `awaiting_owner`/`waiting_permission`/`attend_accord` ou `teDemande > 0`), sinon
  en cours (mère non finale ou `enCours > 0`), sinon échec (mère `failed` ou `echecs > 0`), sinon rien. Une seule
  pastille (`<i class="dot …">`, couleurs existantes de `style.css` : `awaiting_owner`, `running`, `failed`) et le texte
  « 3 membres · 1 te demande » (`texteResume` : « te demandent », « échecs », mot sans nombre quand seule la mère porte
  l'activité). Sur une ligne de mère, pas de libellé d'état caché ni de « À vous » : le nom accessible dit exactement ce
  qui est dessiné ; sans activité, le libellé `sr-only` d'aujourd'hui reste (« Terminée »).
- **Accord court (b)** — `src/Composer.tsx` : une phrase visible (« Ton agent pourra se faire aider par d’autres
  agents, chacun sur ton abonnement. »), puis `<details className="team-accord-plus"><summary>En savoir plus</summary>`
  contenant le `<small id={teamHelp}>` d'avant, texte entier et inchangé (test : égalité mot pour mot avec le texte de
  la base, espaces normalisés). `aria-describedby` vise toujours le texte complet ; un seul élément trouvé par
  `/confier des parties du travail/`.
- **Choix de l'agent (c)** — `src/agentStatus.ts` : `agentStateLabel(a)` (clés propres : « limite d’usage jusqu’à
  HH:MM » d'après `jusqua` en heure locale, « limite d’usage » si l'heure est illisible, « connexion refusée »,
  « connexion à réessayer », « non installé », « adaptateur absent », « mode réel éteint », « simulé » ; `pret` et
  inconnu : rien), `agentUnavailable`, `agentsInOrder` (tri stable : `limite`, `connexion_refusee`, `non_installe`,
  `adaptateur_absent`, `mode_reel_eteint` en fin). Dans le composeur : option « Nom · libellé », sinon « · indisponible »
  d'aujourd'hui ; la désactivation d'aujourd'hui est gardée telle quelle, aucune désactivation neuve (un agent sous
  limite reste choisissable) ; le défaut reste « auto ». `agentWarning` inchangé.
- **Bloc Équipe (d)** — `src/Team.tsx` : motif sous le titre (`<p className="team-motif">`, texte brut) ; « lancé sur X
  (Y indisponible) » quand `agentPrevu` diffère de `agent`, sans cause ; « 12 345 jetons » (`texteJetons`) seulement si
  `usage.jetons.total` est un nombre ≥ 0. `motif`/`agentPrevu` sont copiés dans `family[]` par App.tsx
  (`avecDetailsDesLignes(run, runs)` passé à `RunView`) depuis `famille` de la ligne brute de la sous-mission ; rend le
  même objet quand rien n'est à ajouter. Aucune lecture neuve.
- **Types** (`src/types.ts`) : `Agent.etat/raison/jusqua/modelesLimites`, `Run.equipe` (`TeamSummary`),
  `Run.famille` (`RunLink`), `FamilyMember.motif/agentPrevu`, `FamilyMember.usage` typé `MemberUsage | null` (forme du
  plan 3.2 : `{ tours, jetons: { entree, sortie, total } | null, cout }`). Tous facultatifs.
- **CSS** (`src/v2.css`) : 5 classes neuves en fin de fichier, aucune règle existante modifiée (`git diff --numstat` :
  23 ajouts, 0 retrait).
- `src/status.ts` : ajouts seulement en fin de fichier, plus une ligne d'en-tête de licence en tête
  (`session-row.tsx`).

## Autres lecteurs de `runs` (vérifiés un par un, tous gardent la liste entière)

- Compteur `waiting` (« N missions attendent votre réponse ») : compte toujours toutes les lignes, sous-missions
  comprises (test « le compteur compte encore une sous-mission qui attend »). Une sous-mission qui attend fait donc
  monter le compteur alors que sa ligne n'est plus listée ; sa mère montre « te demande ».
- `<Consumption runs={runs}>` : inchangé (reçoit `runs` entier).
- `<CareerThread runs={runs}>`, `<SessionHistory run={run} runs={runs}>` : inchangés.
- `agentWarning(input.agent, catalog, runs)` : inchangé (une limite vue sur une sous-mission reste lue).
- `syncList` : inchangé (met à jour l'état d'une ligne par son id, sous-missions comprises).
- `conversations()` (Career.tsx) : non modifié ; il reçoit la liste filtrée.

## Écarts au plan

- Pas de `?racines=1` (décision du manager) : filtre dans l'interface.
- `agentPrevu`/`motif` ne sont pas « sur un membre » côté back : lus sur la ligne brute de la sous-mission puis copiés
  sur le membre par l'interface.
- « Agent non proposé par défaut » : compris comme « pas en tête de liste, défaut `auto` » ; l'option reste active.
- Jetons : `usage` n'arrive pas encore (swarm-14) ; rendu testé avec une valeur fictive.
- Pas de capture (consigne du manager).

## Limites connues

- La borne de 200 lignes du back compte aussi les sous-missions : avec de grosses équipes, moins de 200 missions sont
  listées, et une sous-mission dont la mère est au-delà de la borne apparaît dans la liste (orpheline gardée).
- Sans les lignes des sous-missions dans la réponse, `equipe.echecs` du back compte aussi annulés et interrompus :
  la pastille « échec » pourrait alors venir d'annulations seules.

## Tests

- `src/swarm-11.test.tsx` (neuf) : 18 tests, 18 réussis — liste (sous-mission retirée, résumé calculé et une seule
  pastille, trois priorités avec `equipe` du back, annulé seul sans échec, ligne sans équipe octet pour octet, compteur
  inchangé, ouvrir une mère montre le bloc Équipe avec motif en texte brut et « lancé sur … », aucune lecture par id
  d'une sous-mission) ; fonctions pures (orphelin gardé, valeurs mal typées, préférence `equipe`, priorité, textes) ;
  composeur (phrase visible, pli fermé, texte entier mot pour mot) ; agents (limite avec l'heure locale 23:27 en fin de
  liste et active, défaut `auto`, sans `etat` = rendu d'aujourd'hui, clés propres, `agentWarning` inchangé) ; bloc
  Équipe (jetons seulement si annoncés, agent prévu identique ou motif vide = rien, `avecDetailsDesLignes`).
- Contrôles négatifs (copie sous `.manager/reports/swarm-11-preuves/`, remise, dossier supprimé) : sans
  `missionsDeLaListe` → 1 rouge ; sans `avecDetailsDesLignes` → 1 rouge ; sans `agentsInOrder` → 1 rouge ; sans la
  priorité « te demande » → 3 rouges. Code remis, arbre vérifié.
- Tests existants : aucun modifié (`etat-liste.test.tsx`, `App.test.tsx`, `equipe.test.tsx` intacts et verts ;
  `swarm-09-relecture.test.tsx` vert : toujours 5 lectures `api<Run>("/runs/" + …)`).
- `npm test` : 19 fichiers, 331 / 331 réussis (référence base : 18 fichiers, 313 / 313 ; +1 fichier, +18 tests).
- `npm run build` (`tsc --noEmit && vite build`) : code 0 (avertissement de taille de morceau > 500 kB, déjà là).
- `npx prettier --check src` : « All matched files use Prettier code style! ».

## Points à trancher par le manager

1. Compteur « N missions attendent votre réponse » : il compte encore les sous-missions (gardé comme demandé). Le
   garder ou ne compter que les lignes listées ?
2. Sous-mission orpheline (mère hors des 200 lignes) gardée dans la liste : conforme à `?racines=1`, à confirmer.
3. `agentWarning` ne lit pas encore `etat` (inchangé, pour ne pas toucher `affichage.test.tsx`) : l'alerte sous le
   composeur ne dit une limite que d'après la dernière mission finie.

## Relecture indépendante

Relecteur, 21/11/2026, 04:38 → 04:42 (heure lue par `date`). Base `42ebff5`, commits relus `c116a9f`, `5a349a4`,
`d3e2f39`, `412d70a`.

### Contrôles faits (par commande)

- Périmètre : `src/App.tsx`, `src/Composer.tsx`, `src/Team.tsx`, `src/agentStatus.ts`, `src/status.ts`, `src/types.ts`,
  `src/v2.css`, `src/swarm-11.test.tsx`, portage et rapport. `src/Career.tsx` non touché. Aucun test existant modifié
  (`git diff 42ebff5..HEAD --stat -- 'src/*.test.tsx'` : seul `swarm-11.test.tsx`, neuf).
- Texte d'accord : bloc `<small id={teamHelp}>` de la base et de HEAD extraits et normalisés (espaces) : identiques
  (`cmp`). `aria-describedby` vise ce bloc, dans le pli ; une seule occurrence (test du codeur).
- `src/v2.css` : 23 ajouts, 0 retrait ; couleurs par `var(--muted)` ; pastilles par les classes `.dot.*` existantes.
- Lectures par id : `api<Run>` 6 fois dans `App.tsx` à la base comme à HEAD (dont 4 sous la forme `("/runs/" +`).
- Aucun nom d'agent, de modèle, de Skill ni de site dans les lignes ajoutées de `src/` (grep). En-tête de licence
  `session-row.tsx` ajouté à `src/status.ts`.
- Fidélité à swarm : `activityOf` (session-row.tsx 46-54) relu : même ordre « needs, running, failed, null ».
- Rendu : `motif`, `agentPrevu`, titres passent par du texte React (pas de `dangerouslySetInnerHTML`) ; libellés
  d'état lus par clé propre (`__proto__`, `constructor` → rien).

### Constats

- Mineur, laissé : `jusqua` passé (catalogue lu avant la fin de la limite, page restée ouverte) : le libellé garde
  l'heure passée (« limite d’usage jusqu’à 10:00 ») et l'agent reste en fin de liste jusqu'à la relecture du
  catalogue. Pas faux (c'est l'heure annoncée), à trancher.
- Mineur, laissé : le comptage de repli (sans `equipe` du back) ne suit pas une mère reprise (`resumedFrom`) : les
  sous-missions de la première exécution ne sont pas comptées sur la ligne de la reprise. Le back envoie `equipe`
  (qui compte les exécutions reprises), donc sans effet avec un back à jour.
- Mineur, laissé : `turns` (« N tours ») et `continued` de `conversations()` sont calculés sur la liste filtrée ; une
  chaîne de reprises faite seulement de sous-missions disparaît entière (voulu) ; aucune chaîne de missions de premier
  niveau n'est changée.
- Mineur, laissé : un agent `compatible: false` qui porte un `etat` connu montre son état à la place de
  « · indisponible » (l'option reste désactivée comme avant).
- Mineur, laissé : seul `famille.motif` (la note) est montré ; une sous-mission privée, qui n'a que `pourquoi`, ne
  montre pas de motif.
- Aucun bloquant, aucun majeur.

### Contrôles négatifs (copies sous `.manager/reports/swarm-11-preuves/`, remises vérifiées par `cmp`, dossier supprimé)

- Garde des compteurs (`nombre`) remplacée par `Math.floor(Number(v)) || 0` : 1 rouge, dans la relecture seulement
  (les tests du codeur restaient verts : test ajouté).
- Priorité inversée (échec avant en cours) + filtre `missionsDeLaListe` retiré de la liste : 4 rouges.

### Tests ajoutés (`src/swarm-11-relecture.test.tsx`, 4 tests)

- Compteurs `equipe` mal typés sur une vraie ligne (`NaN`, `"2"`, négatif ; `membres: "3"`) : pas de « NaN », pas
  d'activité inventée, ligne d'avant quand `membres` n'est pas un nombre.
- Sous-mission ouverte depuis le bloc Équipe : lue par son id, la liste garde la mère seule.
- Agent sous limite déjà choisi : reste la valeur du sélecteur, libellé sans heure si `jusqua` illisible, aucun
  `onChange` déclenché.
- Motif de 36 000 caractères fait de `<script>`, clé `__proto__` dans `famille` : texte brut, aucune pollution.

### Totaux

- `npm test` : 20 fichiers, 335 / 335 réussis (331 + 4).
- `npm run build` : code 0. `npx prettier --check src` : « All matched files use Prettier code style! ».
- Pas de capture (consigne du manager).

### Points à trancher par le manager

1. Libellé d'une limite dont `jusqua` est passé (garder l'heure, ou « limite d’usage » sans heure).
2. Montrer `pourquoi` (libellé fixe) quand `motif` manque (sous-mission privée).
3. Les trois points du codeur (compteur, orpheline, `agentWarning`) restent ouverts.

Verdict : `bon_a_integrer`.
