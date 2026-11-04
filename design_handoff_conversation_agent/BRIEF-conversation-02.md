# Brief conversation-02 · remplacer la vue « Exécution » par le tour compact

## Constat
Hors career-ops, App.tsx (page === "mission", branche else) rend <RunView> (src/Mission.tsx) : rangée de badges sur 3-4 lignes, grosse carte « Exécution » (progress, « L'agent travaille avec les outils du pack. », « Réflexion… », « Journal en direct »), UsageCard à chaque mission. La maquette n'affiche qu'une bulle utilisateur et UNE carte .agent-turn, comme Turn pour career-ops. Coût, agent, session, registre sont déjà dans Tracker (Détails techniques) et meta-line.

## 1. Nouveau composant RunTurn dans src/Mission.tsx
```
<div className="agent-turn">
  <AgentActivity events={events} running={!finalStates.has(run.state)} />
  {étapes workflow}  → une ligne repliable « Étape i/n · <titre en cours> » ; dépliée = liste ✓ ✕ • ○ (mêmes classes que .tool-group > ol)
  {approbations / permissions} → bandeau .inline-approval : titre court + boutons pill ; MÊMES appels act(...) qu'aujourd'hui, mêmes options allow_once/reject_once/reject_always, compte à rebours conservé en <small>
  {run.error}  → une ligne <p className="danger"> (« Mission incomplète : … » ou labels[run.state] + run.error)
  {run.result} → <Markdown text={run.result.summary} /> ; tableau d'offres et preuves dans des <details className="fold"> repliés (« Voir les N offres », « Preuves · N »)
  {resumable}  → bouton pill « Reprendre »
</div>
```
Règles :
- Aucun badge dans le fil. Retirer de l'affichage : rangée .spread de badges, <progress>, « L'agent travaille avec les outils du pack. », UsageCard.
- Le journal brut (event-log) va dans Tracker › Détails techniques, sous la grille, replié (<details> « Journal brut · N entrées »).
- La provenance (dataModeLabel, browserEvidenceConfirmed, portée de vérification) devient une ligne de trackerDetails() : ["Données", <même texte qu'aujourd'hui>]. Mêmes mots que le backend, jamais plus large.
- Si run.result.simulated : <small className="warning">Données fictives</small> sous la synthèse (règle AGENTS.md).
- « Arrêter la mission » reste masqué en .run-active (MissionPill s'en charge).
- RunView reste exporté (tests, CareerThread › Détails techniques) ; App.tsx rend RunTurn dans la branche hors career-ops.
- Le JSON p.tool affiché en <pre> passe dans un <details className="fold"> « Détails de la demande », replié.

## 2. Pastille de skill
Afficher <SkillChip events={events} run={run} /> juste avant .agent-turn dans RunTurn quand la mission tourne.

## 3. CSS (src/v2.css)
```css
.inline-approval { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 8px; padding: 7px 8px 7px 12px; border-radius: 12px; background: color-mix(in srgb, var(--orange) 11%, transparent); font-size: 12.5px; animation: rise .2s ease-out; }
.inline-approval > span { flex: 1; min-width: 0; }
.inline-approval > i { width: 6px; height: 6px; border-radius: 50%; background: var(--orange); animation: dotp 1.1s infinite; }
.inline-approval button { height: 24px; padding: 0 10px; border-radius: 12px; font-size: 12px; background: var(--fill); }
.inline-approval button.primary { background: var(--accent); color: #fff; font-weight: 500; }
.inline-approval small { flex-basis: 100%; font-size: 11px; color: var(--muted); }
.agent-turn { display: flex; flex-direction: column; gap: 8px; }
```

## 4. Tests (rouge → vert)
- Run hors career-ops running : aucun .badge dans .thread, pas de progress, pas de région « Consommation de la mission », un seul .agent-turn.
- Permission en attente : boutons dans .agent-turn, appellent act("/permissions/<id>", { optionId }).
- Étape waiting_approval : « Approuver » / « Refuser » appellent le même endpoint qu'avant.
- trackerDetails contient la ligne « Données ».
- Run completed avec result.simulated : « Données fictives » visible.
- Adapter les tests existants qui cherchaient badges ou UsageCard dans le fil, et lister chacun dans le rapport.

## Discipline
Commits [conversation-02], rapport .manager/reports/conversation-02.md, captures avant/après en sombre (en cours, accord en attente, terminée) dans .manager/reports/conversation-02/. npm test et npm run build verts. Aucune dépendance nouvelle.
