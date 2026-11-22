# Chantier A — Skills et menu du composer

## 1. Fait

- Lecture de `AGENTS.md`, `docs/orchestration/plan.md`, des deux templates et des skills de design Apple / Emil. Branche `feat/skills-composer`, état initial propre.
- Périmètre strict du brief ; aucun fichier du chantier B, backend ou dépendance modifié. Le rapport demandé ici remplace le chemin générique `.manager/reports/…`, hors liste autorisée.

- Commits : aucun (blocage de permissions documenté aux §2 et §8).
- Écran Skills : en-tête, recherche, Ajouter et import GitHub/local, filtres, sections, monogrammes et détails ; compatibilité/imports complexes/mises à jour réels conservés.
- Composer : menu trois groupes, coche explicite, pastilles retirables, raccourcis et clavier. Fonctions API absentes marquées Bientôt.
- 21 nouveaux tests d’interaction (9 Skills, 12 composer), plus tous les tests existants : 531 / 531 verts à la validation complète.

### Correspondance des états réels

| État API      | Section                | Tuile / texte                                                      |
| ------------- | ---------------------- | ------------------------------------------------------------------ |
| `installed`   | Installés              | vert `rgba(48,209,88,.14)` / `#30d158`                             |
| `active`      | Installés              | mêmes verts ; état « Actif » conservé                              |
| `available`   | Embarqués              | gris `rgba(120,120,128,.18)` / `#f5f5f7`                           |
| `quarantined` | En quarantaine         | orange `rgba(255,159,10,.14)` / `#ff9f0a`                          |
| `reviewed`    | En quarantaine         | orange ; « Approuvé · à installer », jamais activé automatiquement |
| `rejected`    | Rejetés (filtre dédié) | rouge `rgba(255,105,97,.12)` / `#ff6961`                           |

## 2. Non fait

- Captures et validation visuelle réelle bloquées par le bac à sable (voir §6). Script de reprise prêt, non commité.
- **Aucun commit créé** : `git add` est bloqué par le refus d’écriture de `index.lock` dans le dépôt commun. Les modifications sont toutes conservées dans ce worktree ; pas de push, pas de réécriture d’historique. La livraison ne peut donc pas être déclarée terminée selon le brief.
- Fonctions sans contrat serveur : voir §4, affichées Bientôt et désactivées. Aucun résultat factice présenté comme réel.

## 3. Fichiers touchés

- `docs/orchestration/report-A.md` : journal et bilan au fil de l’eau.
- `src/Skills.tsx`, `src/screen-skills.css` : liste groupée, recherche, détail repliable, popover Ajouter et panneau d’import.
- `src/skills-composer/missing.ts` : frontière unique des champs/capacités absents.
- `src/skills-composer-skills.test.tsx` : 9 cas écrits avant leur implémentation.
- `src/Composer.tsx`, `src/skills-composer/ComposerMenu.tsx` : menu, raccourcis, pastilles et intégration aux réglages/upload existants.
- `src/skills-composer-composer.test.tsx` : 12 cas (dont les trois raccourcis).
- `src/skill-explicite.test.tsx` : adaptation du sélecteur au menu, détail ci-dessous.
- `src/SkillDetails.tsx` : non modifié, panneaux réutilisés tels quels.
- `src/skills-nuit.test.tsx` : ouverture explicite de la ligne dans `show`, ouverture du menu Ajouter et du panneau GitHub avant saisie ; bouton renommé « Importer ». Aucune assertion métier retirée.
- `src/components.test.tsx` : ouverture explicite de la ligne « Tiers » avant la revue ; assertion empreinte et case obligatoire conservées.
- `scripts/orchestre-A-captures.mjs` et `docs/orchestration/captures-A/manifest-avant.json` : banc et preuve du blocage.

## 4. Champs backend manquants

### Inventaire des absences (frontière `readMissingField`)

| Champ / capacité attendue | Type attendu                                                | Écran et ligne du template                         | Affichage actuel                                                                                                                |
| ------------------------- | ----------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `skills.scriptCount`      | `number` (inventaire des fichiers scripts)                  | Skills, `Skills et composer.src/template.html:196` | Scripts : Bientôt ; jamais déduit du nombre total de fichiers ou des simples mentions de scripts                                |
| `skills.documentUrl`      | `string` (URL de lecture exacte)                            | Skills, ligne 201                                  | Lire SKILL.md · Bientôt pour local/embarqué sans URL ; vrai lien GitHub seulement si dépôt + SHA complet + sous-dossier fournis |
| `skills.uninstall`        | capacité + route de désinstallation                         | Skills, ligne 199                                  | Désinstaller · Bientôt, désactivé ; l’activation/désactivation réelle reste disponible                                          |
| `skills.requarantine`     | capacité + route de remise en quarantaine                   | Skills, ligne 202                                  | Remettre en quarantaine · Bientôt, désactivé                                                                                    |
| `skills.create`           | capacité + route de création                                | Skills, ligne 248                                  | Créer un Skill, désactivé avec Bientôt                                                                                          |
| `composer.plugins`        | liste `{ id, name, description }[]` et contrat de sélection | Conversation agent v5, lignes 179–183              | Ajouter un plugin · Bientôt, désactivé ; aucune pastille Plugin fictive                                                         |
| `composer.goal`           | contrat d’objectif structuré                                | Conversation agent v5, ligne 170                   | Objectif · Bientôt, désactivé                                                                                                   |
| `composer.saveSkill`      | capacité de sauvegarde d’une mission en Skill               | Conversation agent v5, ligne 172                   | Enregistrer en Skill · Bientôt, désactivé                                                                                       |
| `composer.planMode`       | booléen de plan avant action + contrat serveur              | Skills et composer, ligne 228                      | Mode plan · Bientôt, désactivé (aucune promesse de validation ajoutée au lancement actuel)                                      |

Licence et intégrité existent : `Skill.license` / `Skill.integrity`, lus réellement (pas des valeurs MIT / vérifiée de la maquette). Description idem `Skill.description`, absence dite « Description non fournie ». Domain Pack et Budget max ouvrent les réglages réels existants ; import local est réel via `{ path }`, sans sélection de dossier fictive.

## 5. Écarts avec la maquette

### Compléments et écarts fonctionnels assumés

- Les fiches de compatibilité, constats, notifications, mises à jour, versions candidates et historique restent dans le détail repliable, sans retrait des contrôles réels.
- La case de lecture de quarantaine reste obligatoire, ainsi que l’intégrité. Avec `request` fourni par App, « Approuver et installer » effectue `/review` avec l’empreinte réelle puis `/install`, jamais `/activate`, et s’arrête si la revue échoue. Les anciens appelants n’ayant que `act` gardent l’approbation seule (« Approuver après lecture »), car leur contrat ne garantit pas la propagation d’un échec.
- Sous-dossier et explication détaillée conservés dans le panneau GitHub (plus fournis que la maquette). Panneau local ajouté pour la route existante, chemin serveur saisi explicitement.
- Sous-titres de groupes ajustés pour ne pas annoncer intègre un contenu modifié, ni non revu un Skill déjà `reviewed`. Rejetés accessible au filtre dédié, comme la maquette.
- Composer : sélection unique conservée depuis l’ancien sélecteur et association Skill/pack préservée. Le retrait d’une sélection multiple déjà fournie retire uniquement la pastille visée. Les caractères de raccourci saisis restent dans le texte de l’utilisateur, sans suppression implicite.
- Menu compact de Conversation agent v5 prioritaire (lignes 118–152 : rayon 14, padding 4, lignes 24 px / texte 13 px, hauteur max 300 px), plutôt que la variante plus grande de Skills et composer. Pastilles sous le champ, conformément au brief.
- Valeurs des maquettes dans `screen-skills.css` avec préfixes sk-/cp-. Les dimensions dynamiques de la textarea sont conservées ; pas de nouveau style inline JSX.
- Vérification visuelle réelle impossible ici (serveur bloqué). Aucun niveau de fidélité pixel à pixel n’est revendiqué sans captures.

## 6. Captures avant/après

- `node scripts/orchestre-A-captures.mjs avant` : échec réel `listen EPERM: operation not permitted 127.0.0.1` à 12:10. Aucun Chrome lancé ; aucun contournement tenté ; ressources temporaires nettoyées (`cleanedUp: true` dans le manifeste).
- Captures 1440 / 1024 / 768 px absentes pour cette raison. Après non lancé, le verrou est identique. Le chef peut exécuter le script hors de cette restriction, avec `avant|apres`.
- Banc : backend réel `~/Downloads/agregat-back`, réseau désactivé (`AGENT_PLATFORM_NETWORK=0`), registre/data/career temporaires et données FICTIF, écoute sur port éphémère 127.0.0.1 vérifié hors 4310/5173/4316/4317 ; six vues prévues par largeur.

## 7. Demandes au chef de chantier

- Aucune modification de `App`, `types` ou `api` nécessaire : la prop `onManageSkills` prévue est consommée.
- Pour les fonctions « Bientôt », fournir les contrats décrits au §4 avant activation (désinstallation, remise en quarantaine, création, Plugins, objectif et mode plan).
- Faire les commits locaux après revue depuis un environnement autorisant l’écriture de `.git/worktrees/agregat-wt-a/index.lock` ; le profil actuel refuse cette écriture malgré la racine `.git` annoncée comme autorisée.
- Exécuter le banc de captures hors de ce sandbox, puis comparer visuellement aux trois largeurs. Pour les captures avant, construire le commit parent de l’implémentation en gardant le script de capture disponible séparément.

## 8. Commandes et résultats

- 12:08 — `git status --short` : propre ; `git branch --show-current` : `feat/skills-composer`.
- 12:08 — Lecture du code et des tests existants ; API `review`, `install`, `activate` confirmée dans le serveur de référence. Routes de désinstallation et de remise en quarantaine absentes de ce serveur : vérification du backend plus récent du banc en cours.

- 12:10 — `npm run build` initial : vert, 2399 modules, Vite 16,12 s ; avertissement préexistant de chunks > 500 kB.
- 12:10 — `npm test` initial (avant modification des composants) : 504 réussis, 6 échoués / 510, 35 fichiers, 122,23 s. Échecs : App (perte backend), affichage (annulation), sous-agents-app (ouvrir en grand), sous-agents (panneau équipe), swarm-11 (liste), meme-affichage (consigne). Cinq timeouts sous forte concurrence ; le dernier attend une bulle absente. Aucun de ces fichiers n’est modifié.
- 12:10 — Tests Skills écrits d’abord : 8 échecs / 8 attendus sur l’ancien rendu (pas de régions, pas de menu Ajouter, pas de ligne repliable).
- 12:12 — `node --check scripts/orchestre-A-captures.mjs` et Prettier du script : verts.
- 12:14 — Premier ciblé après implémentation : 7 réussis, 1 échoué / 8 (nom accessible du filtre « Tous 2 » sans espace). Ajout d’un libellé accessible explicite, sans changement d’assertion.

- 12:15–12:18 — Relances ciblées Skills et composer : timeouts sous contention (limite Vitest 5 s). Premier ciblé Skills + skills-nuit : 16 réussis / 21, 5 timeouts. Deux relances ont écrit au même fichier temporaire, leurs sorties se chevauchent : elles ne constituent pas une preuve fiable de validation finale. Aucun test supprimé ni assertion métier affaiblie.
- 12:18 — Compatibilité composer ciblée : 42 réussis / 44, deux timeouts (premier test des fichiers composer et skill-explicite), 150,15 s. Navigation et comportement des tests exécutés sans timeout passent.
- 12:19 — `npm test -- src/skills-composer-skills.test.tsx --maxWorkers=1 --testTimeout=30000` : 8 / 8 verts, 13,07 s. La limite de temps est passée en argument CLI, sans toucher aux tests/configuration du dépôt ; elle ne change aucune assertion.
- 12:20 — Tests d’abord pour import local réel + navigation vers cette entrée : 2 échecs attendus, 7 réussis / 9 avant implémentation, 51,30 s. Route existante `/skills/import` avec `{ path }` : panneau local ajouté (chemin saisi, restrictions contrôlées par le serveur).
- 12:21 — `npm audit --offline --json` : code 0, 0 vulnérabilité signalée dans les métadonnées locales, 365 dépendances ; pas de consultation du registre en ligne. Aucune dépendance ajoutée, versions et licences existantes non modifiées.
- 12:22 — Audit statique : marges héritées de `.page`, hauteur de barre, fond et hover neutralisés uniquement dans l’écran Skills. Composer : retrait ciblé d’une pastille parmi plusieurs, repli clavier si groupe Plugins sans action et fermeture des anciens réglages à l’ouverture du + corrigés, tests ajoutés d’abord.

### Adaptations supplémentaires de tests existants

- `components.test.tsx`, cas bouton + : ouverture réelle du menu et libellé « Fichiers et dossiers » au lieu de « Ajouter un fichier » ; assertions upload/pastille/retrait/type intactes.
- `skill-explicite.test.tsx` : sélecteur natif Skill remplacé par le menu et ses `menuitemcheckbox`, choix et désélection par clic. Les assertions pack/workflow, absence d’activation automatique, Skill inactif désactivé et résumé restent ; libellé « À activer dans Skills » adapté.

- 12:23 — `tsc --noEmit` puis premier build de validation : échec réel TS2769 dans l’adaptation du test components (`exact` n’existe pas dans ByRoleOptions). Retrait de cette option inutile : une chaîne `name` est déjà comparée exactement. Aucun changement d’assertion.
- 12:24 — `npm run build` relancé : vert, Vite 15,81 s (2401 modules), seul avertissement de chunks volumineux déjà présent.
- 12:24 — `git diff --check` : vert. Retrait de la restriction nouvelle sur le retrait d’une pièce jointe en mode `disabled` : le comportement antérieur reste disponible.
- 12:24 — Suite complète lancée avec un worker et délai 30 s par test, sans mutation de configuration ni suppression d’assertion ; résultat à consigner à la fin.

- 12:27 — Suite complète `npm test -- --maxWorkers=1 --testTimeout=30000` : **531 / 531 tests verts, 37 / 37 fichiers**, 242,76 s. Tous les tests initiaux en échec sont verts avec ce budget d’exécution, sans modifier ces fichiers. Build vert avant commit ; aucune mutation backend, donc pas de tests backend requis.

- 12:36 — Constat du blocage de la tentative de commit atomique après build et 531 tests verts : `git diff --check && git add [fichiers autorisés] && git commit -m '[orchestre-A] Reproduire Skills et le menu du composer'`. **Échec de `git add`**, code 128 : `fatal: Unable to create '/Users/diaw/Downloads/agregat-front/.git/worktrees/agregat-wt-a/index.lock': Operation not permitted`. La commande `git commit` n’a donc pas été exécutée ; **aucun commit créé**. Aucun contournement du sandbox ni réécriture d’historique tenté. Tous les changements sont dans le worktree, aucun fichier n’est perdu.

ÉTAT : BLOQUÉ — code prêt, build et 531 tests verts ; commits et captures empêchés par les permissions du bac à sable.
