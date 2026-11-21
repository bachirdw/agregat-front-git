import { activity, describeTool } from "./Career";
import type { Run, RunEvent } from "./types";
import { finalStates, labels, money } from "./types";
import { provenanceText } from "./Mission";

export type Mark = "done" | "failed" | "running" | "pending" | "waiting";
export type TrackerItem = { id: string; title: string; mark: Mark };
// Shown in the « Étapes de la mission » section of the Activité panel.
export const trackerMarks: Record<Mark, string> = {
  done: "✓",
  failed: "✕",
  running: "•",
  pending: "○",
  waiting: "!",
};
export const stepMark = (state?: string): Mark =>
  state === "succeeded"
    ? "done"
    : state === "failed"
      ? "failed"
      : state === "waiting_approval" || state === "uncertain"
        ? "waiting"
        : state === "running"
          ? "running"
          : "pending";

// Workflow steps when the run has them, otherwise the tools the agent really called.
export function trackerItems(run: Run, events: RunEvent[]): TrackerItem[] {
  const steps = run.plan?.workflow?.steps;
  if (steps?.length)
    return steps.map((step) => ({
      id: step.id,
      title: step.title,
      mark: stepMark(run.steps?.find((s) => s.step_id === step.id)?.state),
    }));
  // Bare actions (no name, never ended) are not steps: they stay counted with the agent's internal
  // subagents in the thread (sous-agents-internes-21-11).
  return activity(events).flatMap((item) =>
    item.kind === "tool" && !item.bare
      ? [
          {
            id: item.id,
            title: describeTool(item).name,
            mark: (item.status === "failed"
              ? "failed"
              : ["pending", "in_progress"].includes(item.status)
                ? finalStates.has(run.state)
                  ? "pending"
                  : "running"
                : "done") as Mark,
          },
        ]
      : [],
  );
}
const lower = (text: string) => text[0].toLowerCase() + text.slice(1);
export function trackerPhrase(run: Run, items: TrackerItem[]) {
  const waiting = items.find((item) => item.mark === "waiting");
  if (waiting) return "Attend ton accord : " + lower(waiting.title);
  if (run.permissions?.length) return "Attend ton accord";
  if (run.pendingQuestion) return "Attend ta réponse";
  const count = `${items.length} ${items.length > 1 ? "étapes" : "étape"}`;
  if (run.state === "completed")
    return items.length ? "Mission terminée · " + count : "Mission terminée";
  if (finalStates.has(run.state))
    return `Mission ${lower(labels[run.state] || run.state)}`;
  const current = [...items].reverse().find((item) => item.mark === "running");
  return current ? "En cours : " + current.title : "Réfléchit à la suite";
}
const lastEvent = (events: RunEvent[], type: string) =>
  [...events].reverse().find((event) => event.type === type);
// One line under the result; each part appears only if the backend reported it.
export function metaLine(run: Run, events: RunEvent[]) {
  if (!finalStates.has(run.state)) return "";
  const proofs = run.result?.evidence?.length ?? 0;
  return [
    lastEvent(events, "verification") && "✓ Vérifié",
    proofs && `${proofs} ${proofs > 1 ? "preuves" : "preuve"}`,
    run.usage && money(run.usage.platformCents, run.usage.currency),
  ]
    .filter(Boolean)
    .join(" · ");
}
export function trackerDetails(run: Run, events: RunEvent[]) {
  const session = lastEvent(events, "session")?.data;
  const verification = lastEvent(events, "verification")?.data;
  const mode = (session?.modes as { current?: string } | undefined)?.current;
  const proofs = run.result?.evidence?.length;
  const rows: [string, string, string?][] = [
    ["Agent", `${run.agent} · ${run.model || "défaut"}`],
  ];
  if (session) rows.push(["Session", `ACP · mode ${mode || "non annoncé"}`]);
  if (run.browser) rows.push(["Navigateur", run.browser]);
  // Brief 02 : la provenance des données, mêmes mots qu'avant dans le fil.
  const data = provenanceText(run, events);
  if (data) rows.push(["Données", data]);
  if (proofs) rows.push(["Preuves", String(proofs)]);
  if (verification)
    rows.push([
      "Vérification",
      String(verification.scope || "Portée non précisée"),
    ]);
  rows.push([
    "Coût",
    `${run.usage ? money(run.usage.platformCents, run.usage.currency) : "Non mesuré"} · ${run.simulated ? "fictif" : "BYOA"}`,
  ]);
  if (run.ledger)
    rows.push([
      "Registre",
      run.ledger.ok ? "✓ Intègre" : "Registre altéré",
      run.ledger.ok ? "success" : "danger",
    ]);
  return rows;
}
