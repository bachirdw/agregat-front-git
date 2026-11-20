import { finalStates } from "./types";
import type { Agent, Catalog, Run } from "./types";

// Why the chosen agent will likely not run, from the catalog and from its last finished mission.
// The catalog does not carry usage limits: the last run's own error is the only real source.
// A usage limit ends: once the hour the agent gave has passed, the old failure says nothing about
// now (seen on 11/11: « réessayer à Nov 6th » still shown five days later). Without a readable hour,
// a limit older than a day is no longer shown.
const DAY_MS = 24 * 60 * 60 * 1000;
export function limitStillHolds(run: Run, now: number): boolean {
  const said = /réessayer à (.+?)\. Choisir/.exec(run.error || "")?.[1];
  const retryAt = said
    ? Date.parse(said.replace(/(\d)(?:st|nd|rd|th)\b/g, "$1"))
    : NaN;
  if (Number.isFinite(retryAt)) return now < retryAt;
  const failedAt = Date.parse(run.finishedAt || run.createdAt);
  return !Number.isFinite(failedAt) || now - failedAt < DAY_MS;
}

export function agentWarning(
  agent: string,
  catalog: Catalog | null,
  runs: Run[],
  now: number = Date.now(),
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
  if (
    last?.state === "failed" &&
    /^Limite d’usage/.test(last.error || "") &&
    limitStillHolds(last, now)
  )
    return `Dernière mission ${a.name} : ${last.error}`;
  return null;
}

// ---- swarm-11 : état réel d'un agent dans le choix de l'agent (back docs/api-agents-etat.md) ----
// Read by own key only; an agent without `etat` (older back) gets no label and keeps its place.
const STATE_LABELS: Record<string, string> = {
  simule: "simulé",
  non_installe: "non installé",
  adaptateur_absent: "adaptateur absent",
  mode_reel_eteint: "mode réel éteint",
  connexion_refusee: "connexion refusée",
  a_reessayer: "connexion à réessayer",
};
// States in which the agent will most likely not run now: listed last, still selectable.
const UNAVAILABLE = new Set([
  "non_installe",
  "adaptateur_absent",
  "mode_reel_eteint",
  "limite",
  "connexion_refusee",
]);
const stateOf = (a: Agent) => (typeof a.etat === "string" ? a.etat : "");

/** « limite d’usage jusqu’à 23:27 » (local hour of `jusqua`), « connexion refusée »…; "" without a known `etat`. */
export function agentStateLabel(a: Agent): string {
  const etat = stateOf(a);
  if (etat === "limite") {
    const t = typeof a.jusqua === "string" ? Date.parse(a.jusqua) : NaN;
    return Number.isFinite(t)
      ? `limite d’usage jusqu’à ${new Date(t).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "limite d’usage";
  }
  return Object.prototype.hasOwnProperty.call(STATE_LABELS, etat)
    ? STATE_LABELS[etat]
    : "";
}

export function agentUnavailable(a: Agent): boolean {
  return UNAVAILABLE.has(stateOf(a));
}

/** Agents in catalog order, the unavailable ones moved last (stable). Nothing is removed. */
export function agentsInOrder(agents: readonly Agent[] | undefined): Agent[] {
  const list = Array.isArray(agents)
    ? agents.filter((a) => a && typeof a === "object")
    : [];
  return [
    ...list.filter((a) => !agentUnavailable(a)),
    ...list.filter(agentUnavailable),
  ];
}
