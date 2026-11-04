# Brief skill-chip-01 · pastille de skill + lueur

## Constat
src/v2.css reprend déjà la maquette (variables --layer/--layer-shadow/--soft/--g1..3, sidebar flottante, bulles translucides, lueur, Tracker, MissionPill, Paramètres). Il manque :
1. La pastille de skill au-dessus de la réponse de l'agent.
2. La lueur : les 3 blobs utilisent tous v2-drift à la même durée (14 s / 6 s). La maquette donne à chacun sa trajectoire et sa durée : 14/16/12 s au repos, 6/7/5 s en mission.

## 1. Pastille de skill
### src/Career.tsx — sous describeTool :
```tsx
// Nom du skill/outil en cours, visible ~1,6 s au début de chaque appel ; masqué pendant une demande d'accord.
export function SkillChip({ events, run }: { events: RunEvent[]; run: Run }) {
  const tool = useMemo(
    () => [...activity(events)].reverse().find((i): i is Tool => i.kind === "tool" && active(i.status)),
    [events],
  );
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!tool) return setShown(null);
    setShown(tool.id);
    const timer = window.setTimeout(() => setShown(null), 1600);
    return () => window.clearTimeout(timer);
  }, [tool?.id]);
  if (!tool || shown !== tool.id || run.permissions?.length) return null;
  return (
    <div className="skill-chip" role="status">
      <i aria-hidden="true" />
      {describeTool(tool).name}
    </div>
  );
}
```
Dans Turn, juste avant <div className="agent-turn"> :
```tsx
{live && running && <SkillChip events={live} run={run} />}
```
### src/v2.css — section « Fil de conversation » :
```css
.skill-chip {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
  height: 22px; margin: 0 0 -2px 6px; padding: 0 10px; border-radius: 11px;
  background: var(--layer); box-shadow: var(--layer-shadow); backdrop-filter: blur(14px);
  font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 11px; color: var(--muted);
  animation: rise 0.25s ease-out;
}
.skill-chip i { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); animation: dotp 1.1s infinite; }
```
Ajouter `.skill-chip, .skill-chip i` au bloc prefers-reduced-motion (animation: none) et `.skill-chip` au bloc prefers-reduced-transparency (backdrop-filter: none). Vérifier que --accent existe dans style.css ; sinon utiliser la variable d'accent du projet et le noter.
### Tests
- tool_call in_progress titré career_read(...) → role=status contenant « career_read ».
- Après 1600 ms (vi.advanceTimersByTime) → disparue.
- run.permissions non vide → absente.
- Nouvel appel d'outil → réapparaît avec le nouveau nom.
- Run terminé → aucune pastille.

## 2. Lueur : trois trajectoires (src/v2.css)
Remplacer @keyframes v2-drift et compléter, en gardant positions et dégradés :
```css
.glow i:nth-child(1) { animation-name: v2-drift-a; animation-duration: 14s; }
.glow i:nth-child(2) { animation-name: v2-drift-b; animation-duration: 16s; animation-direction: normal; }
.glow i:nth-child(3) { animation-name: v2-drift-c; animation-duration: 12s; animation-delay: 0s; }
.run-active .glow i:nth-child(1) { animation-duration: 6s; }
.run-active .glow i:nth-child(2) { animation-duration: 7s; }
.run-active .glow i:nth-child(3) { animation-duration: 5s; }
@keyframes v2-drift-a { 50% { transform: translate(8%, 10%) scale(1.15); } }
@keyframes v2-drift-b { 50% { transform: translate(-10%, 8%) scale(1.1); } }
@keyframes v2-drift-c { 50% { transform: translate(6%, -12%) scale(1.2); } }
```
Mettre à jour le test CSS qui vérifie v2-drift s'il existe.
