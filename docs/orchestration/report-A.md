# Chantier A — Skills et menu du composer

## 1. Fait

- Lecture de `AGENTS.md`, `docs/orchestration/plan.md`, des deux templates et des skills de design Apple / Emil. Branche `feat/skills-composer`, état initial propre.
- Périmètre strict du brief ; aucun fichier du chantier B, backend ou dépendance modifié. Le rapport demandé ici remplace le chemin générique `.manager/reports/…`, hors liste autorisée.

- Version initiale commise par le chef de chantier : `d30337b`. Corrections de l’aller-retour 1 laissées sans commit, à sa demande.
- Écran Skills : en-tête, recherche, Ajouter et import GitHub/local, filtres, sections, monogrammes et détails ; compatibilité/imports complexes/mises à jour réels conservés.
- Composer : menu trois groupes, coche explicite, pastilles retirables, raccourcis et clavier. Fonctions API absentes marquées Bientôt.
- Validation initiale : 531 / 531 tests verts. Après aller-retour 1 : **535 / 535 tests verts**, build vert ; 9 nouveaux tests Skills et 16 nouveaux tests composer au total. Détails et commandes exactes dans « Aller-retour 1 ».

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

- Nouvelles captures et validation visuelle dans ce sandbox impossibles (voir §6). Le chef relancera le script corrigé ; aucune écoute réseau ni tentative de lancement de Chrome à cet aller-retour.
- Aucun commit de l’aller-retour 1 par l’agent, conformément à la consigne ; le chef prend en charge les commits. Le blocage Git de la première livraison reste consigné dans l’historique §8.
- Fonctions sans contrat serveur : voir §4, affichées Bientôt et désactivées. Aucun résultat factice présenté comme réel.

## 3. Fichiers touchés

- `docs/orchestration/report-A.md` : journal et bilan au fil de l’eau.
- `src/Skills.tsx`, `src/screen-skills.css` : liste groupée, recherche, détail repliable, popover Ajouter et panneau d’import.
- `src/skills-composer/missing.ts` : frontière unique des champs/capacités absents.
- `src/skills-composer-skills.test.tsx` : 9 cas écrits avant leur implémentation.
- `src/Composer.tsx`, `src/skills-composer/ComposerMenu.tsx` : menu, raccourcis, pastilles et intégration aux réglages/upload existants.
- `src/skills-composer-composer.test.tsx` : 16 cas après l’aller-retour 1, dont les trois raccourcis (désormais @ → Agent), l’ordre des pastilles, l’aide et l’accès clavier à Gérer les Skills après une longue liste.
- `src/skill-explicite.test.tsx` : adaptation du sélecteur au menu, détail ci-dessous.
- `src/SkillDetails.tsx` : non modifié, panneaux réutilisés tels quels.
- `src/skills-nuit.test.tsx` : ouverture explicite de la ligne dans `show`, ouverture du menu Ajouter et du panneau GitHub avant saisie ; bouton renommé « Importer ». Aucune assertion métier retirée.
- `src/components.test.tsx` : ouverture explicite de la ligne « Tiers » avant la revue ; assertion empreinte et case obligatoire conservées.
- `scripts/orchestre-A-captures.mjs` : banc isolé ; captures et manifestes avant/après ajoutés par le chef en `d30337b` (non modifiés ici).

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
- Menu compact de Conversation agent v5 prioritaire (lignes 118–152 : rayon 14, padding 4, lignes 24 px / texte 13 px, hauteur max 300 px), plutôt que la variante plus grande de Skills et composer. Pastilles dans la boîte, au-dessus du champ (corrigé à l’aller-retour 1 selon les deux maquettes ; la première version suivait la formulation erronée du brief).
- Valeurs des maquettes dans `screen-skills.css` avec préfixes sk-/cp-. Les dimensions dynamiques de la textarea sont conservées ; pas de nouveau style inline JSX.
- Vérification visuelle réelle impossible ici (serveur bloqué). Aucun niveau de fidélité pixel à pixel n’est revendiqué sans captures.

## 6. Captures avant/après

- `node scripts/orchestre-A-captures.mjs avant` : échec réel `listen EPERM: operation not permitted 127.0.0.1` à 12:10. Aucun Chrome lancé ; aucun contournement tenté ; ressources temporaires nettoyées (`cleanedUp: true` dans le manifeste).
- Le chef a ensuite produit et commité des captures avant/après à 1440 px : quatre images avant et cinq après sont présentes, sans les pastilles. Son exécution s’est arrêtée sur l’upload du fichier (manifestes avant/après en erreur). Les largeurs 1024 / 768 px restent à produire par lui avec le script corrigé. Aucun de ces fichiers de capture existants n’est modifié à cet aller-retour.
- Banc : backend réel `~/Downloads/agregat-back`, réseau désactivé (`AGENT_PLATFORM_NETWORK=0`), registre/data/career temporaires et données FICTIF, écoute sur port éphémère 127.0.0.1 vérifié hors 4310/5173/4316/4317 ; six vues prévues par largeur.

## 7. Demandes au chef de chantier

- Aucune modification de `App`, `types` ou `api` nécessaire : la prop `onManageSkills` prévue est consommée.
- Pour les fonctions « Bientôt », fournir les contrats décrits au §4 avant activation (désinstallation, remise en quarantaine, création, Plugins, objectif et mode plan).
- Le chef a pris en charge les commits (`d30337b` pour la version initiale) ; modifications de l’aller-retour 1 laissées dans le worktree pour sa revue.
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

État historique de la première livraison : commits et captures bloqués dans ce sandbox ; travail ensuite commité par le chef en `d30337b`.

## Aller-retour 1

- 12:52 — Retour du chef lu ; état initial propre sur `d30337b`. Aucun commit ne sera tenté, conformément à la nouvelle consigne.
- Corrections en cours : pastilles au-dessus du texte dans la boîte ; `@` vers le choix d’agent réel ; placeholder et aide de la maquette ; accès Gérer les Skills ; banc tolérant à l’échec d’upload.
- Les builds et tests finaux, ainsi que les échecs intermédiaires, seront consignés ci-dessous. Aucun serveur ou Chrome ne sera lancé.

### Corrections réalisées

1. **Pastilles** : la rangée `.cp-chips` (Skill, fichier réel, état d’upload ou erreur) est dans le formulaire `.cp-composer`, avant la textarea. Test de l’ordre DOM et du parent commun, retraits existants conservés.
2. **`@` → agents** : ouvre les plis existants du composer puis donne le focus au sélecteur Agent réel. Sa sélection conserve le texte, réinitialise le modèle comme avant, ne choisit aucun Skill et ne lance pas de mission. Les réglages des sessions existantes restent fixes. Les Plugins restent uniquement dans le menu + ; `/` et `#` conservent leurs groupes.
3. **Placeholder et aide** : texte exact de Skills et composer, ligne 146, sur le brouillon. La hauteur initiale actuelle de trois lignes à l’accueil reste conservée (voir l’échec et la correction dans le journal). Aide à gauche sous la boîte : `/ Skills`, `@ agents`, `# fichiers`, styles des lignes 158–159 (gap 4px 16px, retrait 4px, texte 12px #7c7c82, symboles #a1a1a6), espacement de 14px du conteneur de référence. Aide reliée à la textarea par `aria-describedby`. Les états répondre / travailler / session close gardent leurs libellés contextuels existants.
4. **Gérer les Skills** : entrée présente à la fin du groupe Skills, nombre réel « N en quarantaine » (y compris 0), `/` à droite, callback `onManageSkills` conservé. Le menu garde sa hauteur maximale 300px et son défilement vertical ; les flèches/Début/Fin déplacent le focus et font défiler l’entrée. Test avec 40 Skills et activation du callback.
5. **Captures tolérantes** : le script vérifie la vraie pastille du Skill sélectionné avant l’upload. L’upload optionnel est isolé dans `attachFixture` ; `manifest.attachments` consigne la largeur, le fichier, les statuts HTTP, erreurs réseau et message/timeout UI. Un échec d’upload conserve la pastille Skill, prend la capture et laisse la boucle continuer aux trois largeurs. `selectedSkills` atteste aussi la sélection réelle ; ancien sélecteur pris en charge pour les captures avant. Aucun état de fichier simulé. Syntaxe seule vérifiée ici : le fonctionnement effectif des 18 captures après reste à observer lors de l’exécution du chef.

### Écart assumé : accord avant exécution

La phrase de droite « Rien n’est exécuté sans votre accord. » est **omise**. Vérification en lecture seule : `src/App.tsx:1272` relie `onPlan` à `launch`, `src/App.tsx:561–576` envoie directement `POST /runs`, sans étape de confirmation du plan. Le backend (`packages/orchestrator/index.js:609,679–681`) calcule son plan puis programme l’exécution ; en mode propriétaire, les permissions hors `send` peuvent être automatiques (`:1238–1248`). Le clic d’envoi lance donc déjà la mission ; une promesse générale de confirmation de toute exécution serait trompeuse. Aucun backend ni fichier partagé modifié.

### Fichiers de cet aller-retour

- `src/Composer.tsx`, `src/skills-composer/ComposerMenu.tsx`, `src/screen-skills.css`.
- `src/skills-composer-composer.test.tsx` : nouveaux tests et adaptation de ses cas @ (aucun test existant hors de ce fichier modifié à cet aller-retour).
- `scripts/orchestre-A-captures.mjs`, `docs/orchestration/report-A.md`.
- Aucun type/API partagé, backend, dépendance ou fichier du chantier B touché.

### Journal des commandes et résultats

- 12:53 — Tests d’abord : ciblé composer **4 échoués / 15**, 11 réussis, 4,25 s : les nouveaux cas détectent @ vers Plugins, pastilles après la textarea, aide/placeholder absents, absence de défilement explicite vers le focus.
- 12:54 — Après correction, ciblé composer : **15 / 15 verts**, 6,13 s.
- 12:55 — Test d’abord du compteur zéro, filtré via `-t` (aucun `skip` dans le code) : 1 échec attendu, 15 cas non exécutés par le filtre ; affichage de « 0 en quarantaine » ensuite corrigé.
- 12:55 — `node --check scripts/orchestre-A-captures.mjs` et `git diff --check` : verts. Aucun appel du script de captures, aucun serveur ni Chrome lancé.
- 12:55 — Build et suite complète lancés ; résultats finaux à consigner ci-dessous.

- 12:56 — Premier build final : **vert**, 2401 modules, Vite 0,708 s ; avertissement préexistant de chunks >500 kB.
- 12:56 — Première suite complète : **534 réussis / 535, 1 échec** dans `front-anim.test.tsx` : j’avais aussi passé l’accueil à deux lignes, comme l’attribut `rows` de la maquette, alors que le comportement réel testé est trois lignes. Cette modification non nécessaire au retour a été annulée ; **aucune assertion existante modifiée ou affaiblie**. Placeholder, aide et pastilles restent corrigés. Écart de hauteur initiale déjà existant conservé : accueil trois lignes, conversation une ligne ; redimensionnement dynamique inchangé.

- 12:57 — Validation finale : `npm run build` **vert**, 2401 modules, Vite 0,823 s (avertissement de chunks volumineux déjà présent).
- 12:57 — `npm test -- --maxWorkers=1 --testTimeout=30000` : **535 / 535 tests verts, 37 / 37 fichiers**, 28,49 s. Les assertions de comportement existantes sont inchangées.
- 12:57 — `node --check scripts/orchestre-A-captures.mjs` et `git diff --check` : **verts**. Changements limités aux six fichiers listés pour cet aller-retour ; aucun commit tenté, aucun serveur/Chrome lancé. Le chef relancera les captures et committera.

ÉTAT : TERMINÉ
