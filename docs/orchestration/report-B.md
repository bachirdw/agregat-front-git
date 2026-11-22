# Chantier B — Consommation

## 1. Fait

- Première livraison enregistrée par le chef de chantier dans **`93bb5f0`**, après les refus initiaux de verrou Git conservés dans le journal. Captures avant/après également réalisées par le chef aux trois largeurs. Branche conservée : `feat/consommation`, base initiale `b9cbe19`.
- 12:08 — Lecture de `AGENTS.md`, du plan d’orchestration, des deux skills de design, de la maquette lisible, des types et de l’écran existant. Aucun fichier partagé modifié.
- Travail parallèle limité au périmètre B : tests de comportement et banc de captures ; implémentation de l’écran et journal par l’agent principal.
- Journal centralisé ici conformément au brief et à sa liste exclusive de fichiers autorisés (pas de second rapport dans `.manager`).
- 12:11 — Tests d’abord : 13 cas FICTIFS écrits et exécutés sur l’écran précédent ; 12 rouges, 1 vert (liste vide).
- 12:15 — Premier écran implémenté : onglets, contrôles 7/30 jours et regroupement, structure graphique/légende, missions repliables avec sous-agents/étapes et notes réelles, « Tout afficher », Aperçu et tarifs. Aucun token ni quota factice dans l’application.
- Coûts : `run.usage` mesuré ; `plan.cost` seulement avec le libellé « Estimation ». La somme de l’Aperçu est explicitement limitée aux coûts disponibles, jamais présentée comme mensuelle.
- 12:37 — Correction des notes quand `family` est absent : erreurs et relances réelles des sous-runs trouvés via `famille`, titre de l’enfant associé à chaque note, cause dédupliquée quand reçue aussi dans `family`. Deux tests de régression ajoutés avant la correction.

## 2. Non fait

- Les blocages initiaux de commit/captures ont été pris en charge par le chef de chantier. Sa consigne pour l’aller-retour 1 est de laisser les corrections dans le worktree, **sans aucune tentative de commit**.
- Correction responsive et validation de l’aller-retour 1 terminées. Les nouvelles dimensions en navigateur pourront être contrôlées par le chef avec le banc enrichi ; les mesures en navigateur n’ont pas été exécutées dans ce bac à sable.

## 3. Fichiers touchés

- `docs/orchestration/report-B.md` : journal de chantier.
- `src/Consumption.tsx`, `src/screen-consumption.css`, `src/consumption/model.ts`, `src/consumption/missing.ts`, les deux nouveaux fichiers `src/consommation*.test.tsx`, `scripts/orchestre-B-captures.mjs`, les deux manifestes de captures B ; détail ci-dessous. Aucun fichier du chantier A ou partagé interdit modifié.
- `src/components.test.tsx` : seul le test « compte missions et sous-missions à part, et chaque tarif une fois » est adapté : clic Aperçu pour les compteurs/tarifs, retour Statistiques et dépliage de la mère pour voir « Portail FICTIF ». Le préfixe ancien « Sous-mission : » disparaît conformément à la ligne de sous-agent de la maquette ; les assertions de comptage/déduplication et de présence sont conservées.
- `src/consommation.test.tsx` : 21 nouveaux tests ; `src/consommation-notes.test.tsx` : 2 régressions sur les notes enfant. Aucun `skip`, `todo`, test retiré ou assertion de comportement affaiblie.
- `src/consumption/missing.ts` : contrats locaux absents ; `src/consumption/model.ts` : transformations des données disponibles ; `src/Consumption.tsx` et `src/screen-consumption.css` : rendu et valeurs de la maquette.
- `scripts/orchestre-B-captures.mjs` et les deux manifestes dans `docs/orchestration/captures-B/` : banc isolé et preuves des refus de serveur.

## 4. Champs backend manquants

Toutes les lectures de tokens et quotas passent par `src/consumption/missing.ts` : réponses vides (`[]`) ou absentes (`undefined`). Les types sont locaux au chantier.

| Nom proposé / type attendu | Niveau | Affichage | En attendant |
| --- | --- | --- | --- |
| `dailyTokenUsage: { date: string; segments: { key: string; label: string; tokens: number }[] }[]`, selon période et regroupement | Jour / fonction / agent / modèle | Barres empilées, infobulle, total et parts de légende | État vide « Bientôt », catégories de fonction conservées sans valeurs |
| `tokens: { input?: number; output?: number; cache?: number; total?: number }` | Mission, sous-agent, étape | Colonne Tokens, Entrée, Sortie, Cache | « Bientôt » par champ, jamais déduction entrée/sortie depuis le total |
| `providerLimits: { plan?: string; windows: { label: string; percent: number }[] }` | Fournisseur / fenêtre de quota | Abonnement et jauges dans Aperçu, y compris seuil 100 % | Nom réel du catalogue, « abonnement : Bientôt » et limites non transmises ; aucune jauge inventée |
| Tokens agrégés sur 7 jours et proportion en cache | Toutes missions / période | Premier indicateur Aperçu | « Bientôt », compteur réel des missions/sous-missions séparé |
| Tokens de chaque mission sur la période sélectionnée | Mission / période | « Part 7 j » / « Part 30 j » | « Bientôt » ; ne pas diviser des tokens cumulés par un total journalier |
| Total plateforme mensuel issu du ledger, daté et exhaustif | Mois | Suivi du plafond mensuel | Plafond configuré réel, consommation mensuelle « Bientôt » |
| Modèle effectivement servi et attribution de fonction | Sous-agent / charge | Futur regroupement par modèle/fonction | Pas de modèle déduit de `run.model` (modèle demandé seulement) |
| Numéro de phase workflow et nombre d’outils par étape | Étape | Détail workflow | Phase « — » ; outils « Bientôt ». `family[].etape.numero` et `outils` sont affichés quand réellement transmis |

Le type frontend `MemberUsage` peut contenir des tokens/coûts **annoncés** par l’agent : ils ne sont volontairement pas assimilés aux mesures demandées. Le backend local lu est antérieur aux contrats `family` présents dans les types frontend.

Points d’adaptation supplémentaires : `getOverviewTokens(runs, 7): TokenUsage | undefined`, `getRunPeriodTokens(run, period): number | undefined`, `getMonthlyPlatformUsage(catalog): { platformCents: number; currency: string; month: string } | undefined`. Tous renvoient `undefined` actuellement. Le mois est une période de ledger, pas une somme filtrée par date de création de mission.

## 5. Écarts avec la maquette

- Les chiffres et noms de missions de démonstration ne seront pas repris en production. Les champs absents afficheront « Bientôt ».
- Coût estimé annoté, tarifs réels conservés dans un détail repliable de l’Aperçu, registre réel accessible dans un détail de mission : ajouts nécessaires pour conserver le comportement existant.
- Les missions sont initialement repliées ; leur ouverture demande à `App` le détail réel avec `onSelect(id)`. Les sous-missions rattachées apparaissent sous leur mère ; les orphelines restent visibles.
- 12:19 — Relecture croisée : corrections des espacements des barres (18 / 4 px), du `box-sizing` hérité (880 px de contenu + 64 px de marge intérieure, graphique 160 + 8 px), de la palette « Inconnu » (gris), du survol hérité, de l’accessibilité des infobulles et de la validation des dates de reprise. Le catalogue n’est pas présenté comme une preuve de connexion à un compte ; les démonstrateurs sont identifiés.
- À la livraison initiale, comparaison visuelle impossible dans le bac à sable ; les captures réalisées ensuite par le chef ont été examinées pour l’aller-retour 1 (voir section dédiée).
- La barre d’application existante (48 px) est réservée **hors** de l’écran ; les 48 px internes de la maquette sont conservés. Aucune réserve supplémentaire dans l’intégration à Settings. Animations de la source reprises (0,2 s / 0,18 s, translation de 4 px), désactivées en mouvement réduit.

## 6. Captures avant/après

- 12:10 — AVANT tenté après build vert. Échec réel : `Error: listen EPERM: operation not permitted 127.0.0.1`. Chrome n’a pas été lancé, aucun contournement. Serveur fermé et dossier temporaire supprimé dans `finally`.
- Erreur complète : `captures-B/avant-manifest.json`. Script prêt pour les captures APRÈS : Aperçu, Statistiques, mission dépliée, liste vide × 1440, 1024, 768 px. État AVANT : les onglets et les missions dépliables n’existaient pas ; le script documente les substitutions disponibles.
- 12:19 — APRÈS tenté sur build vert : même refus `listen EPERM` sur `127.0.0.1` (code 1), conservé dans `captures-B/apres-manifest.json`. Aucune capture produite, aucun Chrome lancé, ressources temporaires supprimées.
- Après la livraison initiale : le chef a réalisé les captures avant/après à 1440, 1024 et 768 px et les a enregistrées dans `93bb5f0`, avec le sélecteur `.cs-mission-toggle` corrigé. Les captures Statistiques, mission dépliée et Aperçu à 768/1024 ont servi à l’aller-retour 1. Les fichiers du chef sont conservés ; aucune nouvelle capture prétendument vérifiée n’est ajoutée ici.

## 7. Demandes au chef de chantier

- Exposer un agrégat mensuel du ledger (devise/période/exhaustivité) : la liste de missions est limitée et ne contient pas `usage`, seul le détail le fournit aujourd’hui. La date de création d’une mission n’est pas la date de ses charges.
- Fournir les champs du tableau ci-dessus et confirmer la disponibilité du contrat `family` sur le backend déployé. Les types/props/API partagés n’ont pas été modifiés.
- Captures et premier commit pris en charge par le chef (`93bb5f0`). Pour le contrôle visuel après correction responsive, le banc enrichi vérifiera aussi les dimensions réelles à 768/1024 lors de sa prochaine exécution autorisée.
- Les corrections de l’aller-retour 1 restent dans le worktree, conformément à la nouvelle consigne du chef ; aucune tentative de commit.

## 8. Commandes et résultats

- 12:08 — `git status --short` : worktree propre au départ.
- Lectures via `cat`, `sed`, `rg` : maquette, règles, types, tests, backend (lecture seule).
- Une recherche groupée a été interrompue par le glob inexistant `src/format*` (zsh, code 1). Aucun effet sur les fichiers ; lectures suivantes ciblées.
- Aucun ajout de dépendance ; aucun appel fournisseur ; aucun serveur de production contacté.
- 12:10 — Build AVANT : vert, Vite 11,64 s ; avertissement de bundle > 500 kB existant.
- 12:11 — `npx vitest run src/consommation.test.tsx --reporter=dot` AVANT : 12 échecs / 1 réussite, 13 tests, 12,25 s.
- 12:14 — Premier `npm run build` après tests : échec TypeScript (10 options `exact` non supportées par `getByRole` dans les nouveaux tests). Correction des sélecteurs en cours.
- 12:14 — Tests ciblés après implémentation : 12 réussis / 1 échec, 13 tests, 43,71 s. L’échec est un matcher de montant insécable (`2,50 €`), le montant rendu est correct ; correction du matcher en cours.
- `node --check scripts/orchestre-B-captures.mjs` : vert. Prettier exécuté uniquement sur les fichiers du chantier.
- Lecture d’une configuration Vitest séparée : `vitest.config.ts` absent (code 1) ; configuration réelle intégrée au projet, aucun fichier créé pour cela.
- 12:18 — Nouveaux tests portés à 21 : tokens annoncés ignorés, déduplication family/liste, durée absente/invalide/inversée, coût zéro mesuré, navigation clavier et recalcul des hauteurs/parts. Les 10 erreurs TS de sélecteur et le matcher d’espace insécable sont corrigés sans retirer d’assertion.
- 12:18 — Ciblés : 18 réussites, 3 timeouts à 5 s, 21 tests, 84,23 s. Aucun échec d’assertion ; la relance parallèle a été arrêtée (SIGINT, code 130) pour réserver la validation à une seule suite. Charge concurrente possible, non démontrée.
- 12:19 — `npm run build` : vert (TypeScript et Vite, 6,82 s Vite), avertissement de chunks > 500 kB conservé.
- 12:19 — `npm audit --offline --ignore-scripts` : code 0, « found 0 vulnerabilities ». Audit hors ligne (ne garantit pas la fraîcheur du registre) ; aucune dépendance ni licence ajoutée/modifiée.
- 12:19–12:22 — `npm test` complet : **39 échecs / 492 réussites, 531 tests, 17 fichiers en échec / 19 verts**, 175,72 s. Plusieurs délais de 5 s sont dépassés dans Consommation et des tests hors périmètre (`App`, sous-agents, activité…), avec aussi des erreurs de sélection consécutives à ces délais ; aucune modification de ces tests hors périmètre. Sortie complète : `/tmp/orchestre-B-tests-first.log`.
- 12:23–12:27 — Relance complète via `npm test -- --maxWorkers=1` : **530 réussites / 1 échec, 531 tests, 35 fichiers verts / 1 en échec**, 249,84 s. Les 21 tests Consommation sont verts. Seul échec : délai de 5 s dépassé dans `equipe.test.tsx` (7,809 s). Sortie : `/tmp/orchestre-B-tests-serial.log`.
- 12:26 — La relance séquentielle dépasse également 5 s dans un test préexistant hors périmètre (`equipe.test.tsx`, « allumé : la requête porte multiAgent… », 7,809 s). Pas de correction de source hors périmètre ni d’assertion retirée. Le résultat complet est attendu avant décision sur le budget de temps du runner.
- 12:34–12:35 — `npm test -- --maxWorkers=1 --testTimeout=20000` : **531 tests verts, 36 fichiers verts**, 37,53 s, code 0. Budget d’exécution de 20 s du runner pour cette machine, sans changer les assertions, les fichiers de tests existants hors Consommation ni la configuration du dépôt. Sortie : `/tmp/orchestre-B-tests-budget.log`.
- 12:35 — Avant le premier commit : `npm run build` vert (Vite 1,04 s, avertissement de taille conservé), `git diff --check` vert. Sources identiques à celles des 531 tests verts.
- 12:35 — `git add [les sept fichiers du premier ensemble] && git commit -m '[orchestre-B] Reproduire l’écran Consommation avec les données disponibles'` : **échec avant staging, code 128**, création d’`index.lock` refusée (`Operation not permitted`). Le commit n’a donc jamais été exécuté. Pas de demande d’élévation ni de modification manuelle du dépôt Git.
- 12:36 — `npx vitest run src/consommation-notes.test.tsx --maxWorkers=1 --testTimeout=20000` avant correction : **2 échecs attendus / 2 tests**, 859 ms. Sortie : `/tmp/orchestre-B-notes-red.log`.
- 12:37 — Après correction : `npx vitest run src/consommation-notes.test.tsx src/consommation.test.tsx --maxWorkers=1 --testTimeout=20000` : **23 tests verts, 2 fichiers verts**, 1,80 s.
- 12:37 — `npm run build` final : vert (TypeScript et Vite, 627 ms Vite ; avertissement de taille conservé). `git diff --check` et `node --check scripts/orchestre-B-captures.mjs` : verts.
- 12:37–12:38 — **`npm test` final sans option : 533 tests verts, 37 fichiers verts, 12,04 s, code 0**, sur les sources finales. Les dépassements de délai antérieurs sont conservés plus haut ; aucun délai configuré dans le dépôt n’a été modifié. Sortie complète : `/tmp/orchestre-B-tests-final.log`.
- 12:38 — Périmètre final vérifié par `git status --short` et `git diff --stat` : uniquement fichiers autorisés. Aucun serveur/Chrome démarré avec succès ; tous les bancs ont exécuté leur nettoyage. Aucun processus de test laissé actif.

- `git diff --check` et syntaxe du banc : verts. Tentative de lecture des processus via `ps` refusée par le bac à sable (`operation not permitted`), aucun contournement.

## Aller-retour 1

- 12:52 — Retour reçu : première livraison commitée par le chef (`93bb5f0`), captures avant/après présentes à 1440, 1024 et 768 px. Sa correction du sélecteur `.cs-mission-toggle` dans le banc est conservée. Worktree propre au début de ce retour.
- Captures examinées : Statistiques, mission dépliée et Aperçu à 768 et 1024 px. À 768 px, le contenu fait environ 478 px après la barre latérale et les marges ; le `min-width: 560px` du tableau impose environ 82 px de débordement. À 1024 px, les tableaux et l’Aperçu tiennent dans environ 734 px ; les trois indicateurs de l’Aperçu et les comptes restent lisibles.
- Test de régression écrit avant correction : repères de colonnes repliables sur les en-têtes **et** les cellules, titres complets accessibles malgré l’ellipse, durée et outils conservés. jsdom ne calcule pas les dimensions ; la règle de repli sera décrite ici et les mesures pourront être vérifiées par le banc de captures.
- 12:54 — Test d’abord : `npx vitest run src/consommation-responsive.test.tsx` rouge, **1 échec / 1 test**, 4,63 s (classe de repli absente, échec attendu).
- 12:55 — Correction dans `src/Consumption.tsx` et `src/screen-consumption.css` : suppression de la largeur minimale de 560 px et du défilement horizontal ; les grilles utilisent toute la largeur disponible, avec les titres tronqués par ellipse et leur texte complet en infobulle. Aucun masquage global du débordement.
- Repli par **largeur du contenu**, via `container-name: cs-content` / `container-type: inline-size`, pour prendre en compte la barre latérale et l’intégration dans Settings :
  - À **680 px ou moins**, `Part 7 j / 30 j` porte `cs-col-share` sur en-tête et cellule, puis est masquée ; grille mission `16px minmax(0,1fr) 70px 80px 64px`, espaces de 8 px. Durée reste visible.
  - À **520 px ou moins**, `Cache` porte `cs-col-cache` sur en-tête et cellule, puis est masquée ; retrait du détail réduit de 52 à 30 px ; grille détail `minmax(0,1fr) 70px 70px 60px`, espaces de 8 px. Nom tronqué et agent sur une seconde ligne, avec noms complets dans les attributs `title`. Entrée, Sortie et Outils restent visibles.
  - Avec les **478 px** de contenu de la capture 768, cela laisse **208 px** au titre de mission et **224 px** à l’identité du sous-agent. Avec les **734 px** de contenu de la capture 1024, aucune colonne n’est masquée et les espacements de la maquette sont conservés.
- Aperçu vérifié sur les deux captures : disposition existante conservée (3 indicateurs à 1024, 2 puis 1 à 768). Les indicateurs reçoivent `min-width:0`, une borne minimale limitée à la largeur disponible et le retour à la ligne des textes/montants longs ; noms et descriptions de comptes peuvent couper les mots très longs. Le registre dépliable passe en une colonne dans un contenu étroit.
- `scripts/orchestre-B-captures.mjs` enrichi, sans changer le sélecteur corrigé par le chef : avant chaque capture APRÈS à 1024 et 768, vérifie `scrollWidth <= clientWidth + 1` et les rectangles des tableaux/détails/indicateurs/comptes dans les limites du contenu, puis vérifie le masquage des colonnes selon les seuils. Les mesures sont enregistrées dans `layoutChecks` du manifeste lors de sa prochaine exécution. Non exécuté ici : le refus de serveur déjà constaté n’est pas contourné et les captures du chef ne sont pas écrasées.
- 12:55 — Tests ciblés : `npx vitest run src/consommation-responsive.test.tsx src/consommation.test.tsx src/consommation-notes.test.tsx` : **24 tests verts, 3 fichiers verts**, 1,43 s. Syntaxe du banc et `git diff --check` verts.
- 12:56 — `npm run build` : **vert** (TypeScript et Vite, 650 ms Vite ; avertissement de chunks > 500 kB déjà connu). **`npm test` complet sans option : 534 tests verts, 38 fichiers verts, 11,23 s, code 0**. Sorties : `/tmp/orchestre-B-retour-1-build.log` et `/tmp/orchestre-B-retour-1-tests.log`.
- Fichiers de cet aller-retour : `src/Consumption.tsx`, `src/screen-consumption.css`, nouveau `src/consommation-responsive.test.tsx`, `scripts/orchestre-B-captures.mjs`, `docs/orchestration/report-B.md`. Aucun test existant adapté dans cet aller-retour, aucune assertion retirée ou désactivée.
- Aucun commit tenté dans cet aller-retour, aucun serveur/Chrome relancé, aucune dépendance ajoutée.

ÉTAT : TERMINÉ
