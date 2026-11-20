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
