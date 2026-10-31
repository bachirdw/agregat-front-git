import { activity, describeTool } from "./Career";
import type { Run, RunEvent } from "./types";
import { finalStates, labels, money } from "./types";

type Mark = "done" | "failed" | "running" | "pending" | "waiting";
export type TrackerItem = { id: string; title: string; mark: Mark };
const marks: Record<Mark, string> = {
  done: "✓",
  failed: "✕",
  running: "•",
  pending: "○",
  waiting: "!",
};
const stepMark = (state?: string): Mark =>
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
  return activity(events).flatMap((item) =>
    item.kind === "tool"
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
  const count = `${items.length} ${items.length > 1 ? "étapes" : "étape"}`;
  if (run.state === "completed") return "Mission terminée · " + count;
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
export function Tracker({
  run,
  events,
  open,
  details,
  setOpen,
  setDetails,
}: {
  run: Run;
  events: RunEvent[];
  open: boolean;
  details: boolean;
  setOpen: (open: boolean) => void;
  setDetails: (details: boolean) => void;
}) {
  const items = trackerItems(run, events);
  const done = items.filter((item) => item.mark === "done").length;
  const live = !finalStates.has(run.state);
  const tone = live
    ? "running"
    : run.state === "completed"
      ? "completed"
      : "failed";
  return (
    <section className="tracker" aria-label="Suivi de la mission">
      <button
        type="button"
        className="tracker-head"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className={"tracker-dot " + tone} />
        <span title={labels[run.state] || run.state}>
          {trackerPhrase(run, items)}
        </span>
        {items.length > 0 && (
          <small>
            {done}/{items.length}
          </small>
        )}
        <b className="tracker-chevron" aria-hidden="true">
          ›
        </b>
      </button>
      {open && (
        <div className="tracker-body">
          {items.map((item) => (
            <div className={"tracker-item " + item.mark} key={item.id}>
              <span aria-hidden="true">{marks[item.mark]}</span>
              <span title={item.title}>{item.title}</span>
            </div>
          ))}
          <button
            type="button"
            className="tracker-more"
            aria-expanded={details}
            onClick={() => setDetails(!details)}
          >
            <b className="tracker-chevron" aria-hidden="true">
              ›
            </b>
            Détails techniques
          </button>
          {details && (
            <dl>
              {trackerDetails(run, events).map(([key, value, tone]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd className={tone} title={value}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
}
