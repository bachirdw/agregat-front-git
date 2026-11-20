# swarm-09 — notes du copieur (Interface 1 : états, membres, chef)

Copieur, 21/11/2026 (01 h 45 heure locale). Swarm lu en lecture seule dans
`/Users/diaw/Downloads/agent-repos-agregat/desplega-ai__agent-swarm`, rien n'en a été exécuté. Arbre de l'interface,
base `0937088`. Seul fichier porté : `status.ts` (TypeScript, fonctions pures, sans React ni dépendance).

## 1. Copié (origine → portage)

| Origine (swarm, `apps/ui/src/…`)                                                    | Lignes  | Porté dans `status.ts`                                    |
| ----------------------------------------------------------------------------------- | ------- | --------------------------------------------------------- |
| `components/shared/task-status-icon.tsx` `STATUS_VARIANT`                           | 42-65   | `ETAT_VARIANTE` (états de Relay, pas ceux de swarm)       |
| idem `taskStatusVariant()`                                                          | 67-69   | `variantOf(state, attend)` (rend `inconnu`, pas `null`)   |
| idem `RING_TONE`, `TASK_STATUS_TEXT`, `GLYPH_TONE`                                  | 71-120  | `CLASSE_ETAT` (noms de classes à créer dans `src/v2.css`) |
| `lib/status-labels.ts` `STATUS_LABELS` + `statusLabel()`                            | 1-57    | `LIBELLES` + `labelOf(state)`                             |
| `lib/utils.ts` `formatDuration()` (appelé par transcript)                           | 166-174 | `formatDuree(ms)`                                         |
| `components/shared/transcript/transcript.tsx` `ChildAgentStatus` + `DelegationCard` | 396-455 | `dureeOf(m)`, `ligneConfie(m)`                            |
| `pages/tasks/[id]/lineage/lineage-tree.ts` `WIDE_LIMIT`                             | 22      | `LIMITE_MEMBRES = 8`                                      |
| idem `visibleChildren()`                                                            | 96-107  | `membresVisibles(membres, extra)` + `libelleAutres(n)`    |
| idem `summarizeLineage()`                                                           | 109-124 | `resumeEquipe(membres)`                                   |
| (ajout, demandé par le plan : membres triés par `debut`)                            | —       | `trierParDebut(membres)`                                  |

Table état → variante (états réellement rendus, voir § 5) :

| Variante     | États                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `attente`    | `queued`, `pending`, `en_file`, `attend_prerequis` ; ou `attend` = `place`/`prerequis`                                                     |
| `encours`    | `running`                                                                                                                                  |
| `te_demande` | `awaiting_owner`, `waiting_permission`, `waiting_approval`, `attend_accord`, `uncertain` ; ou `attend` = `accord`/`question`/`carte_envoi` |
| `fini`       | `completed`, `succeeded`                                                                                                                   |
| `echec`      | `failed`                                                                                                                                   |
| `annule`     | `cancelled`, `interrupted`, `skipped`                                                                                                      |
| `inconnu`    | tout le reste, chaîne vide, valeur non textuelle, `__proto__`, `constructor`…                                                              |

Ordre des cas de `variantOf` : état final d'abord (un membre fini n'attend rien), puis attente du propriétaire (par
`attend` ou par l'état), puis attente de la plateforme (`attend`), puis l'état seul. C'est l'ordre des compteurs de
`TeamBlock` (`finalStates` → `waitsForOwner` → `heldStates`/`heldWaits`), pour que pastille et compteur disent la même
chose.

## 2. Écarté, et pourquoi

- Tout le dessin SVG de `task-status-icon.tsx` (anneau, tirets, glyphes, `ProgressRing`, lignes 122-334) : le plan
  demande une pastille en CSS ; le codeur dessine un point (classe `etat-…`), pas l'icône de swarm.
- Surface `inverse` de `RING_TONE` : pas d'infobulle inversée dans Relay.
- Libellés d'agents et de services de `STATUS_LABELS` (`idle`, `busy`, `healthy`…) et états de tâches swarm
  (`backlog`, `offered`, `superseded`, `aborted_limit`…) : Relay ne les rend pas dans le bloc Équipe.
- `statusLabel()` humanise une valeur inconnue (`foo_bar` → « Foo bar ») : remplacé par « État inconnu » (exigence
  du plan : jamais la valeur brute).
- `visibleChildren` garde en plus « l'enfant sur le chemin ciblé » (`pathIds`) : Relay n'a pas de chemin ciblé.
- `summarizeLineage.costUsd` : `usage` n'est pas envoyé avant swarm-14 (contrat swarm-07, ligne 56).
- `AgentAvatar`, `Link`, `ChevronRight`, `cn`, `parseUTCDate`, `taskListTitle`, `resumeLabel` : React/routeur/swarm.
- `formatDurationMs` (`lib/format-duration-ms.ts`) et ses millisecondes : la ligne de délégation de swarm emploie
  `formatDuration` (secondes entières), c'est celle-là qui est portée.

## 3. Pièges lus dans le code de swarm

- `taskStatusVariant` rend `null` pour un état inconnu et l'icône retombe sur `pending` : un état imprévu y passe
  pour « pas commencé ». Ici `inconnu` a sa propre classe.
- `STATUS_VARIANT[status]` sur un objet littéral : `__proto__` ou `constructor` rendraient un objet. Le portage ne lit
  que les clés propres (`propre()`), vérifié à l'essai.
- `ChildAgentStatus` ne montre la durée que si début et fin se lisent (`Number.isFinite(end - start)`) et la borne à
  0 (`Math.max(0, …)`) : repris dans `dureeOf`. Durée inconnue → rien d'écrit, pas « 0 s ».
- `formatDuration` arrondit vers le bas et laisse tomber les secondes au-delà d'une heure (« 1h 5m ») : repris, avec
  minutes sur deux chiffres (« 1 h 05 ») comme le plan. Pas de jours : 25 h → « 25 h 01 ».
- Le point « en cours » tourne dans swarm (`animate-[spin_3s…] motion-reduce:animate-none`) : à éteindre sous
  `prefers-reduced-motion` (le dépôt a déjà deux blocs `@media (prefers-reduced-motion: reduce)` dans `src/v2.css`).
- La couleur n'est jamais seule (swarm : le libellé est écrit à côté, `label` sert de nom accessible) : garder le
  libellé écrit.

## 4. Écarts entre le plan et ce que j'ai trouvé

- Toutes les lignes citées sont justes, sauf transcript : `ChildAgentStatus` commence ligne 396 (commentaire) / 397
  (fonction), `DelegationCard` finit ligne 452 ; 453 est vide et 454-455 ouvrent le commentaire de `ChildLine`
  (écarté).
- `lineage-tree.ts:96-124` ne contient pas `WIDE_LIMIT` (ligne 22) ni `TERMINAL_STATUSES` (importé) : lus à part.
- La durée vient de `lib/utils.ts:166-174` (`formatDuration`), non cité par le plan.
- `TeamVerdict.complet` (plan, fichiers à modifier) n'est PAS dans le contrat swarm-07 (`docs/api-equipe-vue.md`) :
  le back ne l'envoie pas. Le codeur doit le traiter comme facultatif ; « sans point précis » n'apparaîtra qu'avec un
  back qui l'ajoute (ou à le déduire : verdict non approuvé sans `bloquants` lisibles — à trancher par le manager).
- Pas de champ « chef » dans le contrat : le chef est la mère elle-même (`run.agent`, `run.state` de `Run`). En-tête
  proposé : `Chef : ${run.agent || "agent inconnu"} · ${labelOf(run.state)}`.
- `Team.tsx` `stateLabel()` rend aujourd'hui la valeur brute pour un état inconnu (`|| state ||`) : `labelOf` corrige
  cela ; un test existant qui attendrait la valeur brute changerait (aucun trouvé dans `src/equipe.test.tsx`).

## 5. Ce que le codeur doit savoir

- **États rendus** : `src/types.ts` `labels` (queued, running, completed, failed, cancelled, interrupted, pending,
  waiting_approval, waiting_permission, awaiting_owner, succeeded, skipped, uncertain) et `src/Team.tsx`
  `heldLabels` (en_file, attend_accord, attend_prerequis). `attend` ∈ place, accord, prerequis, question,
  carte_envoi, ou `null`. Le contrat compte `failed`, `cancelled`, `interrupted` comme échecs dans `equipe` ; la
  pastille, elle, sépare `echec` (failed) et `annule` (cancelled, interrupted).
- **Une seule table de libellés** : `LIBELLES` est une copie de `labels` + `heldLabels`. Une fois installé en
  `src/status.ts`, importer `labels` depuis `./types` et y ajouter `heldLabels` (supprimer la copie), puis faire
  appeler `labelOf` par `Team.tsx` à la place de `stateLabel`. Les libellés du test existant (« Terminée », « En
  cours », « Attend votre réponse ») ne bougent pas.
- **Champs neufs de `FamilyMember`** (tous facultatifs, envoyés seulement avec `GET /api/runs/:id?equipe=1`) :
  `pourquoi?: string` ; `debut?: string | null` ; `fin?: string | null` ; `dureeMs?: number` (membre fini seulement) ;
  `depuis?: number` et `inactiveDepuis?: number` (SECONDES, pas ms : `formatDuree(inactiveDepuis * 1000)`) ;
  `outils?: number` ; `dernierOutil?: string | null` (80 car.) ; `resultat?: string` (600 car., absent si vide ou
  mission privée) ; `cause?: { type: "limite_usage" | "erreur"; message?: string; reprise: string | null }` ;
  `usage?: unknown` (swarm-14). `modele` est désormais envoyé (`''` sans modèle) : le test « aucun Modèle » de
  `equipe.test.tsx` reste valable tant que l'écran n'écrit pas le mot. `TeamVerdict.complet?: boolean` (voir § 4).
- **L'interface doit demander `?equipe=1`** sur `GET /api/runs/:id` pour recevoir ces champs. Constaté à la base
  `0937088` : aucun appel ne le fait (`src/App.tsx` lignes 286, 312, 502, 519, 542 : `api<Run>("/runs/" + id)`). Or
  `src/App.tsx` n'est PAS dans les fichiers à modifier du lot : sans décision du manager (ajouter `App.tsx` au lot, ou
  un autre lot), aucun champ neuf n'arrivera à l'écran ; le rendu restera celui d'aujourd'hui.
- **Ligne « confié à »** : `ligneConfie(m)` → « confié à agent-a · Terminée · 4 min 12 s » ; sans durée connue :
  « confié à agent-a · En cours » ; sans agent : « confié à un agent · … ». Deuxième ligne proposée pour un membre en
  cours : `dernière action ${dernierOutil} il y a ${formatDuree(inactiveDepuis * 1000)}` (rien si l'un manque).
- **Échec** : « Échec après ${formatDuree(dureeOf(m))} : ${cause.message} » ; `cause.type === "limite_usage"` et
  `cause.reprise` → « réessayer à ${heure locale de reprise} ». Pli `<details open>` pour un échec, fermé pour un
  `resultat`. `resultat` et `cause.message` en texte brut (jamais de Markdown, jamais `dangerouslySetInnerHTML`).
- **+N autres** : `membresVisibles(trierParDebut(family))` → 8 visibles ; `libelleAutres(caches)` → « +2 autres »
  (« +1 autre » au singulier, `""` si rien n'est caché). `extra` permet un bouton « voir plus » (swarm :
  `SHOW_MORE_STEP = WIDE_LIMIT * 3`, `page.tsx:24`). Les compteurs de l'en-tête portent sur TOUS les membres.
- **Tri** : `trierParDebut` met d'abord les membres démarrés (plus ancien d'abord), puis ceux sans `debut` lisible
  dans leur ordre d'arrivée. Sans aucun `debut`, l'ordre d'aujourd'hui est gardé (tri stable).
- **Robustesse** : toutes les fonctions acceptent `unknown` et ne lèvent pas ; `formatDuree` rend `""` pour une
  valeur négative, `NaN` ou non numérique.

## 6. Classes à créer dans `src/v2.css` (proposition)

Variables existantes (`src/style.css`, redéfinies en mode sombre) : `--muted`, `--accent`, `--accentText`, `--green`,
`--greenFill`, `--orange`, `--orangeFill`, `--red`, `--fill2`, `--sep`. Pas de `--redFill` ni d'`--accentFill`.

| Classe             | Couleur du point et du libellé     | Fond éventuel (badge)                             | Équivalent swarm                                                            |
| ------------------ | ---------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| `.etat-attente`    | `var(--muted)`, point creux        | `var(--fill2)`                                    | pending                                                                     |
| `.etat-encours`    | `var(--accentText)`, point animé   | `var(--fill2)`                                    | active (ambre chez swarm ; l'orange est déjà pris ici par « attend ton … ») |
| `.etat-te-demande` | `var(--orange)`                    | `var(--orangeFill)` (comme `.badge.warning`)      | waiting / review                                                            |
| `.etat-fini`       | `var(--green)`                     | `var(--greenFill)` (comme `.badge.success`)       | done                                                                        |
| `.etat-echec`      | `var(--red)`                       | `color-mix(in srgb, var(--red) 14%, transparent)` | failed                                                                      |
| `.etat-annule`     | `var(--muted)`, point barré        | `var(--fill2)`                                    | cancelled                                                                   |
| `.etat-inconnu`    | `var(--muted)`, point en pointillé | `var(--fill2)`                                    | (aucun)                                                                     |

Base `.etat` : pastille de 8 px (`::before`, `border-radius: 50%`, `background: currentColor`) suivie du libellé.
Animation de `.etat-encours::before` (pulsation d'opacité) coupée dans `@media (prefers-reduced-motion: reduce)`.
Contraste en sombre : les jetons ci-dessus sont déjà relevés en mode sombre (`--green: #32d74b`, `--red: #ff6961`…) ;
à vérifier à l'écran par le manager.

## 7. Vérifié / non vérifié

- `npx tsc --ignoreConfig --noEmit --strict --target es2022 --moduleResolution bundler --module esnext
.manager/portage/swarm-09/status.ts` : code 0. Sans `--ignoreConfig`, tsc 5.x refuse (TS5112 : un `tsconfig.json`
  est présent) ; c'est la seule différence avec la commande du brief.
- `npx prettier --check` du fichier : conforme.
- Essai des fonctions (compilé dans un dossier temporaire du portage, supprimé ensuite) : « 45 s », « 4 min 12 s »,
  « 1 h 05 » ; `__proto__`/`constructor` → `inconnu` / « État inconnu » ; 10 membres → 8 + « +2 autres » ; tri par
  `debut` stable.
- Non vérifié : rendu à l’écran, contraste réel (aucun écran lancé, aucune commande npm).
