// Journal of a mission (one line per thing the agent did), shown by the Activité panel
// (ActivityPanel.tsx, « Connexions pendant la mission »). The old panel component is gone.
import type { Run, RunEvent } from "./types";
import { labels } from "./types";

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

// sous-agents-19-11 : events of a mother (back docs/api-delegation.md §5).
const delegationVia: Record<string, string> = {
  bouton: "case cochée",
  prompt: "demande dans le prompt",
  carte: "carte d’accord",
  api: "requête",
};
const heldStates: Record<string, string> = {
  en_file: "En file",
  attend_accord: "Attend ton accord",
};
const childTone = (state: string): ActivityRow["tone"] =>
  state === "completed"
    ? "completed"
    : ["failed", "cancelled", "interrupted"].includes(state)
      ? "failed"
      : "running";

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
      info(
        data.lost === false
          ? "Session précédente non rechargée : nouvelle session"
          : "Session précédente introuvable : nouvelle session",
        "Signalé",
      );
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
    } else if (
      event.type === "permission_auto" &&
      toolName(data.capability) === "browser.send"
    )
      // libelles-14-11 : an owner-mode network write of the page outside a final send click
      // (tracker, telemetry, intermediate step), with its host when the back recorded it.
      info(
        "Écriture réseau de la page" +
          (typeof data.host === "string" && data.host ? " : " + data.host : ""),
        "Accordé",
      );
    else if (event.type === "permission_auto")
      info("Accord automatique : " + toolName(data.capability), "Accordé");
    else if (event.type === "send_grant")
      info("Accord de mission donné : envois suivants sans demande", "Accordé");
    else if (event.type === "send_auto") {
      const target = (data.target ?? {}) as Record<string, unknown>;
      const raw = String(target.path ?? "").split(/[?#]/)[0];
      const path = raw && !raw.startsWith("/") ? "/" + raw : raw;
      info(
        "Envoi accordé par l’accord de mission" +
          (target.method || target.host || path
            ? " : " +
              `${String(target.method ?? "")} ${String(target.host ?? "")}${path}`.trim()
            : "") +
          (data.label ? ` · « ${String(data.label)} »` : ""),
        "Accordé",
      );
    } else if (event.type === "permission") {
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
    else if (event.type === "delegation_accepted")
      info(
        `Sous-agents autorisés (${delegationVia[String(data.via)] ?? "accord"})` +
          (Number.isFinite(data.total) && Number.isFinite(data.parallel)
            ? ` : ${data.total} au plus, ${data.parallel} en même temps`
            : ""),
        "Accordé",
      );
    else if (event.type === "delegation_declined")
      info("Sous-agents refusés : un seul agent mène la mission", "Refusé");
    else if (event.type === "child_launched")
      open.set(
        "child:" + String(data.childId),
        add(
          {
            at: event.at,
            label: "Sous-agent lancé : " + String(data.titre || "sans titre"),
            status: "Lancé",
            tone: "running",
          },
          key,
        ),
      );
    else if (event.type === "child_state" || event.type === "child_done") {
      const row = open.get("child:" + String(data.childId));
      const state = typeof data.state === "string" ? data.state : "";
      if (row && state) {
        row.status = heldStates[state] ?? labels[state] ?? state;
        row.tone = childTone(state);
      }
    } else if (event.type === "delegation_envelope_reached")
      info("Enveloppe des sous-agents atteinte", "Signalé");
    else if (event.type === "delegation_extended")
      info("Enveloppe des sous-agents étendue", "Accordé");
    else if (event.type === "lecon_gardee")
      info("Leçon gardée pour les prochaines missions", "Gardée");
    else if (event.type === "family_waiting")
      add(
        {
          at: event.at,
          label: "La mission attend la fin de ses sous-agents",
          status: "Attente",
          tone: "running",
        },
        key,
      );
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
