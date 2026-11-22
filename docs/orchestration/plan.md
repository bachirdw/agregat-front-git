# Orchestration 06 — deux Codex en parallèle (22/11/2026)

Chef de chantier : Claude Code (session `new-session-1f8da9`). Journal des interventions : [log.md](log.md).

## Maquettes (source de vérité, lecture seule)

| Fichier | Écran | Lisible ici |
|---|---|---|
| `docs/design/mockups/Skills et composer.html` | Skills (deux colonnes, Installés / Embarqués / En quarantaine, détail repliable, menu « Ajouter » + import GitHub) et composer | `Skills et composer.src/template.html` |
| `docs/design/mockups/Conversation agent v5.html` | Discussion : menu « + » (Ajouter / Skills / Plugins, pastilles retirables, raccourcis `/` `@` `#`) | `Conversation agent v5.src/template.html` |
| `docs/design/mockups/Consommation.html` | Aperçu / Statistiques, barres empilées, missions dépliables par sous-agent | `Consommation.src/template.html` |

Les `.html` sont les exports autonomes de Claude Design (à ouvrir dans un navigateur). Les `template.html` en sont
le contenu décodé : balisage avec les `style` inline, puis la logique et les données factices de la maquette
(`class Component extends DCLogic`). Les fichiers `.js` du moteur et de React n'ont pas été gardés.

## Préparation faite sur `main` avant le lancement (fichiers partagés)

- `src/Galleries.tsx` contenait Agents, Skills, Packs et Consommation : Skills a été déplacé (sans aucune
  modification) dans `src/Skills.tsx` et Consommation dans `src/Consumption.tsx`. Galleries les ré-exporte, donc
  les appelants et les tests ne changent pas.
- Une feuille CSS par chantier, chargée après `v2.css` dans `src/main.tsx` : `src/screen-skills.css` (A) et
  `src/screen-consumption.css` (B).
- `Composer` reçoit une prop optionnelle `onManageSkills`, que `App` branche sur `go("skills")` (« Gérer les
  Skills » du menu « + »).

## Répartition

| Chantier | Branche | Worktree | Périmètre | Fichiers autorisés |
|---|---|---|---|---|
| A | `feat/skills-composer` | `~/Downloads/agregat-wt-a` | Écran Skills + menu « + » du composer | `src/Skills.tsx`, `src/SkillDetails.tsx`, `src/Composer.tsx`, `src/screen-skills.css` ; nouveaux fichiers `src/skills-composer*.test.tsx`, `src/skills-composer/**`, `scripts/orchestre-A-captures.mjs`, `docs/orchestration/report-A.md`, `docs/orchestration/captures-A/**` ; tests existants qui visent Skills ou le composer : adaptation du balisage seulement (listée dans le rapport) |
| B | `feat/consommation` | `~/Downloads/agregat-wt-b` | Écran Consommation | `src/Consumption.tsx`, `src/screen-consumption.css` ; nouveaux fichiers `src/consommation*.test.tsx`, `src/consumption/**`, `scripts/orchestre-B-captures.mjs`, `docs/orchestration/report-B.md`, `docs/orchestration/captures-B/**` ; tests existants qui visent Consommation : adaptation du balisage seulement |

**Interdits aux deux** (le chef de chantier les modifie sur `main`) : `src/types.ts`, `src/api.ts`, `src/App.tsx`,
`src/main.tsx`, `src/Galleries.tsx`, `src/Mission.tsx`, `src/v2.css`, `src/style.css`, `package.json`,
`package-lock.json`, toute autre source, le backend (`~/Downloads/agregat-back*`).

## Constats de lecture qui orientent les briefs

- Le back actuel ne mesure **aucun token** (pas de champ tokens, ni par fonction, ni par modèle, ni par jour) :
  le graphique en barres empilées de la maquette Consommation n'a pas de donnée réelle aujourd'hui.
- L'écran Skills actuel fait déjà de vraies choses (import par adresse avec choix des candidats, plugins décrits,
  fiche de compatibilité, mise à jour, revue / installation / rejet) : A change la présentation, pas le
  comportement ; les tests `skills-nuit.test.tsx` et `components.test.tsx` doivent rester verts.
- Règle produit (propriétaire, 21/11) : un Skill ne s'active jamais tout seul ; le choisir dans le menu « + »
  reste une action explicite.
- AGENTS.md : aucune donnée factice de la maquette ne doit apparaître comme réelle. Un champ que le back n'a pas
  passe par une fonction isolée qui le rend absent, et l'interface l'affiche « Bientôt » ou désactivé.

## Ordre de fusion

A puis B, en rebase sur `main` (pas de commit de fusion), tests et build relancés après chaque fusion.
