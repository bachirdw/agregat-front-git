# Brief Claude Code · conversation-02 : remplacer la vue « Exécution » par le tour de conversation de la maquette

Référence visuelle : `design_handoff_conversation_agent/Conversation agent - Standalone.html` (captures 02 à 04 dans `screenshots/`).

## Constat
Pour les missions **hors career-ops**, `App.tsx` (bloc `page === "mission"`, branche `else`) rend `<RunView>` de `src/Mission.tsx`. Résultat dans le fil :
- une rangée de badges (« ✓ Plan validé », « En cours », « Agent réel · claude · modèle… », « Provenance… », « Session ACP… ») qui passent sur 3 ou 4 lignes ;
- une grosse carte « Exécution » avec barre de progression, « L'agent travaille avec les outils du pack. », « Réflexion… » et « Journal en direct » ;
- la carte `UsageCard` (coût 0,00 €, agent, registre) affichée **à chaque mission**.

La maquette n'affiche qu'une bulle utilisateur et **une** carte agent (`.agent-turn`), comme les missions career-ops avec `Turn`. Coût, agent, session, provenance et registre sont déjà dans la carte Suivi (`Tracker.tsx`, « Détails techniques ») et dans la ligne `meta-line`.

## À faire

### 1. Nouveau composant `RunTurn` dans `src/Mission.tsx`
Même rôle que `RunView`, rendu compact :

```
<div className="agent-turn">
  <AgentActivity events={events} running={!finalStates.has(run.state)} />   // intro, « Réflexion… » à 3 points, lignes d'outils repliables : déjà stylés en v2
  {workflow steps}        → une ligne repliable « Étape i/n · <titre de l'étape en cours> », dépliée = liste ✓ ✕ • ○ (mêmes classes que .tool-group > ol)
  {approvals/permissions} → bandeau .inline-approval (voir CSS) : titre court + boutons pill existants (mêmes appels act(...) qu'aujourd'hui, mêmes options allow_once/reject_once/reject_always, compte à rebours conservé en <small>)
  {run.error}             → une ligne <p className="danger"> (« Mission incomplète : … » ou labels[run.state] + run.error)
  {run.result}            → <Markdown text={run.result.summary} /> ; tableau d'offres et preuves dans un <details className="fold"> « Voir les N offres » / « Preuves · N », repliés
  {resumable}             → bouton pill « Reprendre »
</div>
```
Règles :
- **Aucun badge** dans le fil. Supprimer de l'affichage : rangée `.spread` de badges, `<progress>`, « L'agent travaille avec les outils du pack. », `UsageCard`.
- Le journal brut (`event-log`) va dans `Tracker` › Détails techniques, sous la grille clé/valeur, replié (`<details>` « Journal brut · N entrées »).
- La provenance (`dataModeLabel`, `browserEvidenceConfirmed`, portée de vérification) devient une ligne dans `trackerDetails()` : `["Données", <même texte qu'aujourd'hui>]`. Ne pas élargir le texte : mêmes mots que le backend.
- « Données fictives » reste visible dans le fil quand `run.result.simulated` est vrai : `<small className="warning">Données fictives</small>` sous la synthèse (règle AGENTS.md).
- Le bouton « Arrêter la mission » reste masqué en `.run-active` : la `MissionPill` s'en charge déjà.
- Garder `RunView` exporté (tests, `CareerThread` › Détails techniques), mais `App.tsx` rend `RunTurn` dans la branche hors career-ops.

### 2. Pastille de skill
Si `skill-chip-01` est fait, afficher `<SkillChip>` juste avant `.agent-turn` dans `RunTurn`. Sinon, appliquer d'abord `BRIEF-skill-chip-01.md`.

### 3. CSS (`src/v2.css`)
```css
.inline-approval {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px 8px;
  padding: 7px 8px 7px 12px; border-radius: 12px;
  background: color-mix(in srgb, var(--orange) 11%, transparent);
  font-size: 12.5px; animation: rise .2s ease-out;
}
.inline-approval > span { flex: 1; min-width: 0; }
.inline-approval > i { width: 6px; height: 6px; border-radius: 50%; background: var(--orange); animation: dotp 1.1s infinite; }
.inline-approval button { height: 24px; padding: 0 10px; border-radius: 12px; font-size: 12px; background: var(--fill); }
.inline-approval button.primary { background: var(--accent); color: #fff; font-weight: 500; }
.inline-approval small { flex-basis: 100%; font-size: 11px; color: var(--muted); }
.agent-turn { display: flex; flex-direction: column; gap: 8px; }
```
Le JSON `p.tool` affiché aujourd'hui en `<pre>` passe dans un `<details className="fold">` « Détails de la demande », replié.

### 4. Tests (rouge → vert)
- Run hors career-ops `running` : aucun élément `.badge` dans `.thread`, pas de `progress`, pas de région « Consommation de la mission ». Un seul `.agent-turn`.
- Permission en attente : les boutons des options s'affichent dans `.agent-turn` et appellent `act("/permissions/<id>", { optionId })`.
- Étape `waiting_approval` : « Approuver » et « Refuser » appellent le même endpoint qu'avant.
- `trackerDetails` contient la ligne « Données ».
- Run `completed` avec `result.simulated` : « Données fictives » est visible.
- Adapter les tests existants qui cherchaient les badges ou `UsageCard` dans le fil, et noter chacun dans le rapport.

## Discipline
Id `conversation-02`, commits locaux `[conversation-02]`, rapport `.manager/reports/conversation-02.md`, captures avant/après en sombre (mission en cours, accord en attente, mission terminée) dans `.manager/reports/conversation-02/`. `npm test` et `npm run build` verts. Aucune dépendance nouvelle.
