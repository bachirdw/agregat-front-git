# Brief Claude Code · pastille de skill + lueur (agregat-front)

Prompt à coller dans Claude Code, à la racine de `agregat-front` :

> Lis `AGENTS.md`, puis applique ce brief (id `skill-chip-01`). Écris d'abord les tests (rouge), puis le code (vert). Commits locaux préfixés `[skill-chip-01]`, sans push. Rapport dans `.manager/reports/skill-chip-01.md`. N'ajoute aucune dépendance et ne change rien d'autre que ce qui est listé.

## Constat (lecture du dépôt, branche main)

`src/v2.css` reprend déjà la maquette : variables `--layer`/`--layer-shadow`/`--soft`/`--g1..3`, sidebar flottante, bulles translucides, lueur, `Tracker.tsx` (carte Suivi), pastille de mission, Paramètres. Il manque deux choses :

1. **La pastille de skill** au-dessus de la réponse de l'agent. Elle n'existe pas.
2. **La lueur** : les trois blobs utilisent tous la même animation `v2-drift`, à la même durée (14 s, puis 6 s en mission). Dans la maquette, chacun a sa trajectoire et sa durée : 14/16/12 s au repos et 6/7/5 s en mission. C'est ce qui fait la différence de mouvement.

## 1. Pastille de skill

### `src/Career.tsx`
Ajouter sous `describeTool` :

```tsx
// Nom du skill/outil en cours, visible ~1,6 s au début de chaque appel ; masqué pendant une demande d'accord.
function SkillChip({ events, run }: { events: RunEvent[]; run: Run }) {
  const tool = useMemo(
    () =>
      [...activity(events)]
        .reverse()
        .find((i): i is Tool => i.kind === "tool" && active(i.status)),
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

Dans `Turn`, juste avant `<div className="agent-turn">` :

```tsx
{live && running && <SkillChip events={live} run={run} />}
```

### `src/v2.css` (dans la section « Fil de conversation »)

```css
.skill-chip {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  margin: 0 0 -2px 6px;
  padding: 0 10px;
  border-radius: 11px;
  background: var(--layer);
  box-shadow: var(--layer-shadow);
  backdrop-filter: blur(14px);
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 11px;
  color: var(--muted);
  animation: rise 0.25s ease-out;
}
.skill-chip i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  animation: dotp 1.1s infinite;
}
```
Ajouter `.skill-chip, .skill-chip i` au bloc `prefers-reduced-motion` (`animation: none`) et `.skill-chip` au bloc `prefers-reduced-transparency` (`backdrop-filter: none`).
À vérifier : que `--accent` existe dans `style.css`. Sinon, utiliser la variable d'accent du projet.

### Tests (`src/front-anim.test.tsx` ou `src/conversation.test.tsx`)
- Un `tool_call` `in_progress` avec le titre `career_read(...)` affiche `role=status` contenant `career_read`.
- Après 1600 ms (`vi.advanceTimersByTime`), la pastille disparaît.
- Avec `run.permissions` non vide, elle ne s'affiche pas.
- Un nouvel appel d'outil la fait réapparaître avec le nouveau nom.
- Run terminé : aucune pastille.

## 2. Lueur : trois trajectoires

Dans `src/v2.css`, remplacer `@keyframes v2-drift` et compléter les blobs :

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
Garder les positions et dégradés existants. Mettre à jour le test CSS qui vérifie `v2-drift`, s'il existe.

## Vérification
`npm test`, `npm run build`, puis `npm run dev`. Lancer une mission avec outils : la pastille doit apparaître au-dessus de la carte agent à chaque nouvel outil, puis disparaître. La lueur doit accélérer quand la mission tourne. Comparer avec `Conversation agent - Standalone.html`.
