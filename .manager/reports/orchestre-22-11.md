# orchestre-22-11 — deux Codex en parallèle (Skills + composer, Consommation)

Chef de chantier : Claude Code (worktree `new-session-1f8da9`). Plan : `docs/orchestration/plan.md`, briefs
`brief-A.md` / `brief-B.md`, rapports `report-A.md` / `report-B.md`, journal `docs/orchestration/log.md`.

## Livré sur `main` (local, non poussé) — `b9cbe19..7b605ab`

- **Skills** (`src/Skills.tsx`, `src/screen-skills.css`) : maquette « Skills et composer » — recherche, menu
  « Ajouter » (GitHub, dossier local), filtres, sections Installés / Embarqués / En quarantaine (+ Rejetés au
  filtre), tuiles monogrammes, détail repliable (version, source, licence, intégrité réelles). Comportement réel
  gardé (candidats, plugin, compatibilité, mises à jour). « Approuver et installer » = `/review` par empreinte puis
  `/install`, jamais `/activate`.
- **Menu « + » du composer** (`src/Composer.tsx`, `src/skills-composer/ComposerMenu.tsx`) : maquette
  « Conversation agent v5 » — groupes Ajouter / Skills / Plugins, coche explicite (aucun Skill automatique),
  pastilles dans la boîte au-dessus du texte, raccourcis `/` Skills, `@` agents, `#` fichiers, ligne d'aide,
  « Gérer les Skills » → page Skills.
- **Consommation** (`src/Consumption.tsx`, `src/consumption/`, `src/screen-consumption.css`) : Aperçu /
  Statistiques, période 7/30 j, regroupement fonction/agent/modèle, barres empilées, missions dépliables par
  sous-agent avec notes réelles (erreurs, relances), comptes fournisseurs, plafond réel ; repli des colonnes à
  1024 / 768 px.
- Préparation : Skills et Consommation sortis de `Galleries.tsx`, une feuille CSS par chantier, prop
  `Composer.onManageSkills`, maquettes dans `docs/design/mockups/` (export + template décodé).
- E2E : sélecteurs alignés sur les nouveaux écrans.

## Vérifications (réelles)

- `npm run build` vert ; `vitest` **559/559** (40 fichiers) sur `main`.
- E2E : **17/18** avec `~/Downloads/agregat-back` (échec « question de l'agent » préexistant : la fixture
  `fake-acp.js` de ce back n'a plus `askQuestion` ; la référence `b9cbe19` donnait 16/18) ; **18/18** avec
  `AGENT_PLATFORM_BACKEND_DIR=~/Downloads/agregat-back-reponse-04`.
- Captures avant/après 1440 / 1024 / 768 : `docs/orchestration/captures-A/`, `captures-B/` (bancs isolés,
  données FICTIF). Pièce jointe indisponible dans le banc A (« Espace hors des racines autorisées »), même chose
  avant.

## Incidents

- Codex lancé en `-s workspace-write` (+ `--add-dir` du `.git` commun) : il n'a pu ni commiter (`index.lock`
  refusé) ni écouter un port (captures). Les commits et les captures ont été faits par le chef de chantier ; les
  messages de commit le disent.
- Deux écarts du premier rendu A venaient de mon brief (pastilles « sous le champ », `@` = plugins) : corrigés à
  l'aller-retour 1.

## Champs backend manquants (consolidés ; affichés « Bientôt » ou désactivés, jamais inventés)

| Domaine | Champ / capacité | Type attendu |
|---|---|---|
| Statut de Skill | inventaire des scripts | `scriptCount: number` |
| Statut de Skill | URL de lecture de SKILL.md (local/embarqué) | `documentUrl: string` |
| Statut de Skill | désinstaller, remettre en quarantaine, créer un Skill | routes + capacités |
| Composer | plugins sélectionnables par mission | `{ id, name, description }[]` + contrat de sélection |
| Composer | objectif, mode plan, enregistrer la mission en Skill | contrats serveur |
| Consommation | tokens par jour × fonction / agent / modèle | `{ date, segments: { key, label, tokens }[] }[]` |
| Consommation / sous-agent | tokens entrée / sortie / cache / total par mission, sous-agent, étape | `{ input?, output?, cache?, total? }` |
| Consommation | tokens agrégés sur la période + part en cache ; part d'une mission sur la période | `number` |
| Consommation | total plateforme mensuel issu du registre | `{ platformCents, currency, month }` |
| Sous-agent | modèle réellement servi, fonction (principal, sous-agent, vérification, titres) | `string` |
| Sous-agent | numéro de phase et nombre d'outils par étape | `number` |
| Limites fournisseur | abonnement et fenêtres de quota | `{ plan?, windows: { label, percent }[] }` |

## Temps Codex

- A : 12:07–12:37 (30 min) + aller-retour 12:51–12:58 (7 min) = **37 min**.
- B : 12:07–12:39 (32 min) + aller-retour 12:51–12:57 (6 min) = **38 min**.
