import type { Catalog, MissionInput } from "./types";

// sans-demo-22-11 : décision du propriétaire (22/11, 15:15) — plus aucune démonstration fictive dans le front.
// En mode propriétaire (`catalog.ownerMode`, même règle que le lot serveur sans-demo-01), ce que le catalogue
// marque comme démonstration n'est plus proposé ni envoyé : pack `dataMode: "fixture"` (et ses workflows),
// agent `simulated: true`, navigateur `fixture`. Aucun nom codé en dur. Hors mode propriétaire (bancs de test),
// le catalogue reste entier.
export type Demo = {
  packs: Set<string>;
  workflows: Set<string>;
  agents: Set<string>;
};
export const aucuneDemo = (): Demo => ({
  packs: new Set(),
  workflows: new Set(),
  agents: new Set(),
});

export function catalogueSansDemo(catalog: Catalog): {
  catalog: Catalog;
  demo: Demo;
} {
  const demo = aucuneDemo();
  if (catalog.ownerMode !== true) return { catalog, demo };
  const packs = (catalog.packs ?? []).filter((p) => {
    if (p.dataMode !== "fixture") return true;
    demo.packs.add(p.id);
    for (const w of p.dags ?? []) demo.workflows.add(w.id);
    return false;
  });
  // Un workflow aussi offert par un pack réel reste permis.
  for (const p of packs)
    for (const w of p.dags ?? []) demo.workflows.delete(w.id);
  const agents = (catalog.agents ?? []).filter((a) => {
    if (!a.simulated) return true;
    demo.agents.add(a.id);
    return false;
  });
  return { catalog: { ...catalog, packs, agents }, demo };
}

// Ce qui part dans `POST /api/runs` : jamais de pack, workflow, agent ou navigateur de démonstration.
export function entreeSansDemo(
  input: MissionInput,
  demo: Demo,
  ownerMode: boolean,
): MissionInput {
  if (!ownerMode) return input;
  return {
    ...input,
    pack: demo.packs.has(input.pack) ? "auto" : input.pack,
    workflow: demo.workflows.has(input.workflow) ? "auto" : input.workflow,
    agent: demo.agents.has(input.agent) ? "auto" : input.agent,
    browser: input.browser === "fixture" ? "auto" : input.browser,
  };
}
