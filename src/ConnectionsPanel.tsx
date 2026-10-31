import { useState } from "react";
import type { Catalog, Run, RunEvent } from "./types";
import { labels, money } from "./types";

export type ActivityRow = {
  key: string;
  at?: string;
  label: string;
  status: string;
  tone: "running" | "completed" | "failed" | "";
};

const toolName = (title: unknown) =>
  (String(title ?? "").split(/[\s(]/)[0] || "outil").replace(
    /^(mcp__platform__|mcp\.platform\.)/,
    "",
  );

const toolTones: Record<string, [string, ActivityRow["tone"]]> = {
  pending: ["En cours", "running"],
  in_progress: ["En cours", "running"],
  completed: ["Terminé", "completed"],
  failed: ["Échec", "failed"],
};

// Turns the run's raw events into one line per thing the agent did; updates close their line.
export function activityRows(events: RunEvent[], run?: Run | null) {
  const rows: ActivityRow[] = [];
  const open = new Map<string, ActivityRow>();
  const add = (row: Omit<ActivityRow, "key">, key: string) => {
    const next = { ...row, key };
    rows.push(next);
    return next;
  };
  for (const event of events) {
    const data = event.data ?? {};
    const key = String(event.seq);
    const info = (label: string, status = "Noté") =>
      add({ at: event.at, label, status, tone: "" }, key);
    if (event.type === "agent") {
      const id = String(data.toolCallId ?? "");
      if (data.sessionUpdate === "tool_call") {
        const [status, tone] = toolTones[String(data.status)] ?? [
          "En cours",
          "running",
        ];
        open.set(
          id,
          add(
            {
              at: event.at,
              label: "Outil : " + toolName(data.title),
              status,
              tone,
            },
            key,
          ),
        );
      } else if (data.sessionUpdate === "tool_call_update") {
        const row = open.get(id);
        const tone = toolTones[String(data.status)];
        if (row && tone) [row.status, row.tone] = tone;
      }
    } else if (event.type === "session") info("Session de l’agent ouverte");
    else if (event.type === "session_reset")
      info("Session précédente introuvable : nouvelle session", "Signalé");
    else if (event.type === "state") {
      const state = String(data.state);
      add(
        {
          at: event.at,
          label: "Mission",
          status: labels[state] || state,
          tone:
            state === "completed"
              ? "completed"
              : ["failed", "cancelled", "interrupted"].includes(state)
                ? "failed"
                : "running",
        },
        key,
      );
    } else if (event.type === "permission_auto")
      info("Accord automatique : " + toolName(data.capability), "Accordé");
    else if (event.type === "permission") {
      const tool = data.tool as { title?: unknown } | undefined;
      open.set(
        "permission:" + data.id,
        add(
          {
            at: event.at,
            label: "Accord demandé : " + String(tool?.title ?? "outil"),
            status: "Attend ton clic",
            tone: "running",
          },
          key,
        ),
      );
    } else if (event.type === "permission_resolved") {
      const row = open.get("permission:" + data.id);
      if (row) {
        row.status =
          data.reason === "expired"
            ? "Expiré sans réponse"
            : data.optionId
              ? "Répondu"
              : "Arrêté";
        row.tone = data.reason === "expired" ? "failed" : "completed";
      }
    } else if (event.type === "browser_evidence")
      info(
        "Page lue : " + String(data.title || data.url || "sans titre"),
        "Lu",
      );
    else if (event.type === "browser_fallback")
      info("Chrome isolé utilisé à la place de ton Chrome");
    else if (event.type === "tool_stalled")
      add(
        {
          at: event.at,
          label: "Outil sans mise à jour",
          status: "Bloqué",
          tone: "failed",
        },
        key,
      );
    else if (event.type === "agent_silent")
      info("Agent silencieux", "Surveillé");
    else if (event.type === "budget_exceeded")
      add(
        {
          at: event.at,
          label: "Budget dépassé",
          status: "Bloqué",
          tone: "failed",
        },
        key,
      );
    else if (event.type === "verification")
      info(String(data.scope || "Résultat vérifié"), "Vérifié");
  }
  if (run?.error)
    rows.push({
      key: "error",
      at: run.finishedAt,
      label: run.error,
      status: "Cause",
      tone: "failed",
    });
  return rows.reverse();
}

const clock = (at?: string) =>
  at
    ? new Date(at).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

export function ConnectionsPanel({
  catalog,
  events,
  run,
}: {
  catalog: Catalog | null;
  events: RunEvent[];
  run: Run | null;
}) {
  const [open, setOpen] = useState(true);
  const rows = run ? activityRows(events, run) : [];
  const agents = catalog?.agents.filter((agent) => !agent.simulated) ?? [];
  const isReady = (agent: (typeof agents)[number]) =>
    agent.installed && agent.compatible && !agent.probe?.error;
  const readyCount = agents.filter(isReady).length;
  return (
    <section className="connections-panel" aria-label="Connexions locales">
      <div className="panel-card">
        <button
          type="button"
          className="panel-heading"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <strong>Connexions locales</strong>
          <small>
            {readyCount} {readyCount > 1 ? "prêts" : "prêt"}
          </small>
          <span className="panel-chevron" aria-hidden="true">
            ›
          </span>
        </button>
        {open && (
          <>
            <div className="connection-agents">
              {agents.map((agent) => {
                const ready = isReady(agent);
                return (
                  <span
                    key={agent.id}
                    title={
                      ready
                        ? "Prêt"
                        : agent.reason || agent.probe?.error || "Non prêt"
                    }
                  >
                    <i className={"dot " + (ready ? "completed" : "")} />
                    {agent.name}
                  </span>
                );
              })}
            </div>
            {rows.length ? (
              <div className="activity-scroll">
                <table className="activity">
                  <thead>
                    <tr>
                      <th>Heure</th>
                      <th>Événement</th>
                      <th>État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key}>
                        <td>{clock(row.at)}</td>
                        <td>{row.label}</td>
                        <td className={"activity-" + row.tone}>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <small>
                {run
                  ? "L’agent n’a encore rien fait."
                  : "Ouvre ou lance une mission pour voir ce que fait l’agent."}
              </small>
            )}
          </>
        )}
      </div>
      {run && (
        <dl className="panel-card panel-cost" aria-label="Coût">
          <strong>Coût</strong>
          <dt>Plateforme</dt>
          <dd>
            {run.usage
              ? money(run.usage.platformCents, run.usage.currency)
              : "Non mesuré"}
          </dd>
          <dt>Agent</dt>
          <dd title={run.agent}>
            {run.agent} · {run.simulated ? "fictif" : "BYOA"}
          </dd>
          <dt>Registre</dt>
          <dd
            className={run.ledger ? (run.ledger.ok ? "success" : "danger") : ""}
          >
            {run.ledger
              ? run.ledger.ok
                ? "✓ Intègre"
                : "Registre altéré"
              : "Non disponible"}
          </dd>
        </dl>
      )}
    </section>
  );
}
