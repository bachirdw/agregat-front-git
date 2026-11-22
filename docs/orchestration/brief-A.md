# Brief chantier A — écran Skills et menu « + » du composer

Tu es Codex, chantier **A**, dans le worktree `~/Downloads/agregat-wt-a`, branche `feat/skills-composer`.
Un chef de chantier (Claude Code) relit chaque commit, relance les tests et lit ton rapport. Il préfère une erreur
avouée à un succès inventé. Un autre Codex (chantier B, écran Consommation) travaille en même temps dans un autre
worktree : ne touche jamais à ses fichiers.

Lis d'abord `AGENTS.md` (règles du dépôt) et `docs/orchestration/plan.md`. Langue : interface et rapport en
français avec les accents ; code et identifiants en anglais.

## Objectif

Reproduire fidèlement deux maquettes, en gardant tout le comportement réel existant :

1. **Écran Skills** — maquette `docs/design/mockups/Skills et composer.html`, version lisible
   `docs/design/mockups/Skills et composer.src/template.html`, bloc `data-screen-label="Skills"` :
   en-tête (titre 28 px, sous-titre, champ « Rechercher des Skills », bouton blanc « Ajouter » avec chevron),
   menu « Ajouter » (popover 300 px, `#242427`, rayon 14), panneau « Importer depuis GitHub », onglets/filtres,
   liste à deux colonnes groupée en sections **Installés / Embarqués / En quarantaine** (et Rejetés si présent dans
   la maquette), tuile monogramme colorée selon l'état, détail repliable d'une ligne (Version, Source, Licence,
   Intégrité, Scripts, boutons d'action selon l'état : Installer, Désinstaller, Approuver et installer, Lire
   SKILL.md, Rejeter, Remettre en quarantaine).
2. **Menu « + » du composer** — maquette `docs/design/mockups/Conversation agent v5.html`, version lisible
   `docs/design/mockups/Conversation agent v5.src/template.html` (et la partie composer de « Skills et composer ») :
   bouton « + » qui tourne de 45° à l'ouverture, menu en trois groupes **Ajouter / Skills / Plugins**, coche verte
   sur un Skill choisi, « Gérer les Skills » avec le nombre en quarantaine, pastilles retirables sous le champ
   (Skill, Plugin, Fichier), raccourcis `/` (Skills), `@` (Plugins) et `#` (Fichiers) tapés dans le champ.

Les valeurs (couleurs, espacements, rayons, tailles de texte, ombres, animations) sont dans les attributs
`style` inline des templates. **Ne réinterprète pas : reproduis.** Mets ces valeurs dans `src/screen-skills.css`
(classes dédiées, préfixe `sk-` pour Skills et `cp-` pour le menu du composer) ; pas de styles inline dans le JSX
sauf valeur dynamique.

## Fichiers autorisés (et rien d'autre)

- `src/Skills.tsx` (écran Skills, déjà sorti de `Galleries.tsx` sans changement), `src/SkillDetails.tsx`,
  `src/Composer.tsx`, `src/screen-skills.css` ;
- nouveaux fichiers : `src/skills-composer*.test.tsx`, tout fichier sous `src/skills-composer/`,
  `scripts/orchestre-A-captures.mjs`, `docs/orchestration/report-A.md`, `docs/orchestration/captures-A/**` ;
- tests existants qui visent l'écran Skills ou le composer (`skills-nuit.test.tsx`, `components.test.tsx`,
  `skill-explicite.test.tsx`…) : seulement pour adapter un sélecteur ou un libellé que la maquette change. Jamais
  supprimer, désactiver (`skip`, `todo`) ou affaiblir une assertion de comportement. Liste chaque adaptation dans
  le rapport.

**Interdit** : `src/types.ts`, `src/api.ts`, `src/App.tsx`, `src/main.tsx`, `src/Galleries.tsx`, `src/Mission.tsx`,
`src/v2.css`, `src/style.css`, `package.json`, `package-lock.json`, le backend, toute autre source. Pas de nouvelle
dépendance npm. S'il te manque un type, un appel d'API ou une prop venue d'`App`, n'y touche pas : écris-le dans
le rapport (section « Demandes au chef de chantier ») et contourne localement (type local dans
`src/skills-composer/`). Prop déjà prévue : `Composer` reçoit `onManageSkills?: () => void` (ouvre la page Skills).

## Comportement réel à garder

- Tout ce que fait l'écran Skills aujourd'hui : import par adresse (dépôt, dossier, `subdir`), choix parmi des
  candidats, import de la suite, plugin décrit, compte rendu d'import, fiche de compatibilité, constats, mise à
  jour, revue / installation / rejet par l'API réelle (`request` / `act`). Les tests actuels doivent rester verts.
- États réels d'un Skill (`quarantined`, `reviewed`, `rejected`, `installed`, `active`, `available`) : fais
  correspondre chaque état à une section et à une couleur de la maquette ; écris la table de correspondance dans
  le rapport.
- Composer : le bouton « Ajouter un fichier » actuel (envoi réel vers `POST /api/files`) devient l'entrée
  « Fichiers et dossiers » ; le choix de Skills déjà présent dans le composer passe dans le groupe Skills du menu.
  **Un Skill ne s'active jamais automatiquement** : seulement par un clic ou une sélection explicite.
- Échap et un clic ailleurs ferment les menus ; navigation au clavier dans le menu ; `aria` corrects.

## Champs backend manquants

Si la maquette affiche une donnée que l'API n'a pas (ex. licence, intégrité, nombre de scripts, liste de plugins,
« Domain Pack », « Objectif », « Enregistrer en Skill ») : lis-la via **une seule fonction isolée** dans
`src/skills-composer/missing.ts` qui renvoie `undefined` tant que le back ne la fournit pas, et affiche l'élément
désactivé ou marqué « Bientôt ». **N'affiche jamais les valeurs factices de la maquette comme réelles.** Liste
chaque champ manquant dans le rapport (nom, type attendu, écran, ligne de la maquette).

## Méthode

- Tests d'abord (Vitest + Testing Library, comme les tests existants) : menu ouvert/fermé, coche d'un Skill,
  pastille retirée, raccourcis `/ @ #`, sections Installés / Embarqués / En quarantaine, ligne dépliée, actions de
  quarantaine, liste vide, recherche sans résultat.
- Commits atomiques et fréquents, préfixe `[orchestre-A]`, message en français. Avant **chaque** commit :
  `npm run build` et `npm test` verts. Jamais de push, jamais de réécriture d'historique, jamais `--no-verify`.
- `node_modules` est déjà présent dans le worktree : n'installe rien.
- Captures avant/après à 1440, 1024 et 768 px (écran Skills : liste, ligne dépliée, menu « Ajouter » ouvert,
  quarantaine ; composer : menu « + » ouvert, pastilles) dans `docs/orchestration/captures-A/`, avec un script
  `scripts/orchestre-A-captures.mjs` calqué sur `scripts/equipe-05-captures.mjs` (banc isolé : back réel en
  fixture, `AGENT_PLATFORM_NETWORK=0`, données, career-ops et Skills dans un dossier temporaire, données marquées
  FICTIF, serveur sur 127.0.0.1 arrêté à la fin). Ne vise jamais les ports 4310, 5173, 4316, 4317. Si le bac à
  sable t'empêche de lancer Chrome ou un serveur, ne contourne pas : écris-le dans le rapport, le chef de chantier
  fera les captures.

## Rapport (au fil de l'eau)

Tiens `docs/orchestration/report-A.md` à jour pendant le travail (ta session peut être coupée à tout moment), et
commite-le avec le reste. Sections :

1. **Fait** (par écran, avec les commits)
2. **Non fait** (et pourquoi)
3. **Fichiers touchés** (et tests existants adaptés, avec la raison)
4. **Champs backend manquants** (nom, type attendu, où, comment c'est affiché en attendant)
5. **Écarts avec la maquette** (assumés ou non résolus)
6. **Captures avant/après** (1440, 1024, 768 px) ou raison de leur absence
7. **Demandes au chef de chantier** (fichiers partagés, types, props)
8. **Commandes et résultats** (build, tests : nombres réels, y compris les échecs)

Quand tout est fait et commité, termine par une dernière ligne de rapport : `ÉTAT : TERMINÉ`.
