# front-01 — Nouveau frontend « agre agent » fidèle à la maquette, branché sur le backend réel

Rapport : `.manager/reports/front-01.md`. Commits `[front-01]`.

## Lis d'abord
1. `AGENTS.md`, puis ouvre `design/maquette.html` (sers-le avec `python3 -m http.server` sur 127.0.0.1) et
   parcours tous les écrans ; regarde `design/screens/*.png` (21 captures : accueil, missions, plan, exécution,
   accord, agents, skills, domain packs, consommation, filtres, thème sombre, mobile).
2. Les Skills `apple-design` et `emil-design-eng` (chemins dans AGENTS.md).
3. Le backend : `~/Downloads/agregat-back/README.md`, `apps/api/server.js` (toutes les routes),
   `apps/web/app.js` (comportement actuel à conserver), `packages/orchestrator/index.js` (forme du plan),
   `packages/workflow-engine/index.js` (états d'étapes), `packages/billing/index.js` (coûts).

## Contrat d'API réel (127.0.0.1:4310)
- `GET /api/catalog` → `{ live, agents[] (id, name, installed, compatible, version, readiness, reason, probe{session,
  inference, models[], currentModel, mode}), packs[] (id, name, description, skills, dags[] (id,title,keywords,steps)),
  skills[] (id, name, version, origin, state, active, integrity, findings[]), meters, pricing }`
- `POST /api/plan` body `{ prompt, agent ('auto'|id), pack ('auto'|id), skills[], model, budgetCents, mode
  ('agent'|'workflow'), workflow ('auto'|id) }` → `{ agent, pack, steps[], cost{platformCents, lines[], withinBudget,
  description}, permissions[], simulated, routing{reasons[], rejected[]}, models, workflow{id,title,reason} }`
- `POST /api/runs` (même corps) → run ; `GET /api/runs` → liste ; `GET /api/runs/:id` → run + `usage{byDimension}`
  + `ledger{ok}` + `permissions[]` (id, tool{title,…}, options[]) + `steps[]` (step_id, state, attempt, error, output)
  + `plan.workflow.steps[]` ; `result{simulated, provenance{data,analysis}, summary, evidence[], opportunities[]}`.
- `GET /api/runs/:id/events` : SSE `event: update` (data `{seq,type,data}` ; types : state, workflow, step,
  agent, session, permission, permission_resolved, verification, budget_exceeded, …) puis `event: end` ;
  reprise avec `Last-Event-ID`.
- `POST /api/runs/:id/cancel`, `POST /api/runs/:id/resume`, `POST /api/runs/:id/steps/:stepId` `{approved}` ou
  `{action:'retry'|'done'|'fail'}`, `POST /api/permissions/:id` `{optionId}`.
- `POST /api/skills/import` `{git, subdir}`, `/api/skills/:id/review` `{approved}`, `/install`, `/activate` `{active}`.
- Toute requête POST exige `content-type: application/json` et `x-platform-request: 1`.
- **Le backend refuse les Host/Origin étrangers** (`apps/api/server.js`). Solution attendue : en
  développement, proxy Vite vers 127.0.0.1:4310 qui réécrit Host et retire/réécrit Origin ; en production,
  le backend sert le `dist/` du frontend (ajoute une option backend `AGENT_PLATFORM_WEB_DIR` minimale, testée,
  sans affaiblir les contrôles Host/Origin ni CSP).

## À construire
- **Stack** : Vite + React + TypeScript, CSS maison (variables, thème clair/sombre) — pas de framework UI
  lourd. Rendu Markdown sûr des textes d'agents (contenu non fiable : aucun HTML brut exécuté, liens
  `rel=noopener`), tableaux, blocs de code, schémas Mermaid si présents.
- **Écrans** fidèles à la maquette : barre latérale (missions réelles depuis `/api/runs`, connexions locales
  depuis `/api/catalog`), accueil + suggestions, composeur avec pastilles de filtres (Agent, Modèle,
  Skills, Pack, Mode, Workflow, Navigateur si pertinent, Budget), carte Plan, chronologie d'exécution en direct
  (SSE), cartes d'accord (permissions et étapes `approval`), résultats (offres avec score, raisons, sponsoring,
  source citée, lien), badges de provenance, carte de consommation, erreurs lisibles, reprise de workflow,
  galerie Agents (+ onglet Modèles), Skills (import GitHub, quarantaine, revue), Domain Packs, Consommation.
- Ce qui n'existe pas dans l'API (ex. conversation de suivi « Répondre ou ajuster », comparaison de deux agents,
  « Se connecter » d'un agent, consommation globale) : soit implémenté côté backend avec tests, soit affiché
  désactivé avec « bientôt ». Liste précise dans le rapport.
- Accessibilité (clavier, contrastes, `prefers-reduced-motion`), responsive mobile, thème sombre.

## Tests (priorité forte)
- Vitest + Testing Library pour les composants et le client API (SSE, erreurs, reprise).
- E2E avec `playwright-core` et le Chrome système (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
  headless, profil jetable) contre le VRAI backend en mode démonstration (agent `fixture`, sans réseau :
  `AGENT_PLATFORM_NETWORK=0`) : plan → lancement → étapes en direct → résultats ; approbation du workflow
  `application-draft` ; refus pour budget ; thème sombre ; mobile.
- Captures de ton rendu comparées à `design/screens/` (mêmes écrans) dans `.manager/reports/front-01-screens/`.

## Fin
Rapport : écrans faits / partiels / absents, ce qui est branché sur l'API réelle, tests avant → après,
commandes de démarrage (dev et production), points ouverts.
