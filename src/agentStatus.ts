import { finalStates } from "./types";
import type { Catalog, Run } from "./types";

// Why the chosen agent will likely not run, from the catalog and from its last finished mission.
// The catalog does not carry usage limits: the last run's own error is the only real source.
export function agentWarning(
  agent: string,
  catalog: Catalog | null,
  runs: Run[],
): string | null {
  if (!catalog || !agent || agent === "auto") return null;
  const a = catalog.agents.find((x) => x.id === agent || x.name === agent);
  if (!a) return null;
  if (!a.installed) return `${a.name} n’est pas détecté sur cette machine.`;
  if (!a.compatible)
    return `${a.name} est indisponible${a.reason ? ` : ${a.reason}` : ""}.`;
  if (a.probe?.session === false)
    return `${a.name} : dernière session refusée (${a.probe.error || "cause non précisée"}).`;
  if (a.probe?.inference === false)
    return `${a.name} : dernier prompt refusé (${a.probe.inferenceError || "cause non précisée"}).`;
  const last = runs
    .filter((r) => r.agent === a.id && finalStates.has(r.state))
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
  if (last?.state === "failed" && /^Limite d’usage/.test(last.error || ""))
    return `Dernière mission ${a.name} : ${last.error}`;
  return null;
}
