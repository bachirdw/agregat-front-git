import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { CareerOffer, CareerResult, Run, RunEvent } from "./types";

// Claude-Code-like activity feed built from ACP session updates (tool calls and agent text).
type Item =
  | { kind: "tool"; id: string; title: string; status: string; at?: string }
  | { kind: "text"; id: string; text: string; at?: string }
  | { kind: "thought"; id: string; text: string; at?: string };
export function activity(events: RunEvent[]): Item[] {
  const items: Item[] = [];
  const tools = new Map<string, Extract<Item, { kind: "tool" }>>();
  for (const e of events) {
    if (e.type !== "agent" || !e.data || typeof e.data !== "object") continue;
    const u = e.data as Record<string, unknown>;
    const update = u.sessionUpdate as string | undefined;
    if (update === "tool_call" || update === "tool_call_update") {
      const id = String(u.toolCallId ?? e.seq);
      const known = tools.get(id);
      if (known) {
        if (u.status) known.status = String(u.status);
        if (u.title) known.title = String(u.title);
      } else {
        const item = {
          kind: "tool" as const,
          id,
          title: String(u.title ?? u.kind ?? "Outil"),
          status: String(u.status ?? "pending"),
          at: e.at,
        };
        tools.set(id, item);
        items.push(item);
      }
      continue;
    }
    const content = u.content as { type?: string; text?: string } | undefined;
    if (
      (update === "agent_message_chunk" || update === "agent_thought_chunk") &&
      content?.type === "text" &&
      content.text
    ) {
      const kind = update === "agent_message_chunk" ? "text" : "thought";
      const last = items.at(-1);
      if (last && last.kind === kind) last.text += content.text;
      else
        items.push({
          kind,
          id: `${kind}-${e.seq}`,
          text: content.text,
          at: e.at,
        });
    }
  }
  return items;
}
const statusLabel: Record<string, string> = {
  pending: "en attente",
  in_progress: "en cours",
  completed: "terminé",
  failed: "échec",
};
export function AgentActivity({ events }: { events: RunEvent[] }) {
  const items = useMemo(() => activity(events), [events]);
  if (!items.length) return null;
  return (
    <ol
      className="activity"
      aria-label="Activité de l’agent"
      aria-live="polite"
    >
      {items.map((item) =>
        item.kind === "tool" ? (
          <li key={item.id} className={"activity-tool " + item.status}>
            <span className="dot" aria-hidden="true" />
            <code>{item.title}</code>
            <small>{statusLabel[item.status] || item.status}</small>
          </li>
        ) : (
          <li key={item.id} className={"activity-" + item.kind}>
            {item.kind === "thought" && <small>Réflexion</small>}
            <p>{item.text}</p>
          </li>
        ),
      )}
    </ol>
  );
}

const sections: Record<string, string> = {
  G: "Inconnues et preuves",
  H: "Prochaine action",
};
export function CareerResults({ run }: { run: Run }) {
  const [offers, setOffers] = useState<CareerOffer[] | null>(null);
  const [result, setResult] = useState<CareerResult | null>(null);
  const [error, setError] = useState("");
  const done = run.state === "completed";
  useEffect(() => {
    if (!done) return;
    const abort = new AbortController();
    Promise.all([
      api<{ opportunities: CareerOffer[] }>(
        "/career/offers",
        undefined,
        abort.signal,
      ),
      api<CareerResult>(
        `/career/runs/${run.id}/result`,
        undefined,
        abort.signal,
      ).catch(() => null),
    ])
      .then(([o, r]) => {
        setOffers(
          [...o.opportunities].sort(
            (a, b) => (b.score ?? -1) - (a.score ?? -1),
          ),
        );
        setResult(r);
      })
      .catch((e) => !abort.signal.aborted && setError((e as Error).message));
    return () => abort.abort();
  }, [run.id, done]);
  if (!done) return null;
  return (
    <section className="card career" aria-label="Offres career-ops">
      <div className="card-pad">
        <small>career-ops · espace privé</small>
        <h2>Offres trouvées</h2>
        {result?.summary && <p className="career-summary">{result.summary}</p>}
        {error && <p className="danger">{error}</p>}
        {offers && !offers.length && (
          <p>Aucune offre enregistrée pour l’instant.</p>
        )}
      </div>
      {offers && offers.length > 0 && (
        <ol className="offers">
          {offers.map((o) => (
            <li key={o.id} className="offer">
              <div className="offer-head">
                <span
                  className="score"
                  aria-label={`Note ${o.score ?? "non évaluée"} sur 5`}
                >
                  {o.score ?? "–"}
                  <small>/5</small>
                </span>
                <span>
                  <strong>{o.title}</strong>
                  <small>
                    {o.company} · {o.source}
                    {o.simulated ? " · FICTIF" : ""}
                  </small>
                </span>
                <a href={o.url} target="_blank" rel="noopener noreferrer">
                  Voir l’offre ↗
                </a>
              </div>
              {o.report && (
                <details>
                  <summary>Rapport A–H</summary>
                  <dl>
                    {Object.entries(o.report).map(([key, text]) => (
                      <div key={key}>
                        <dt>
                          {key}
                          {sections[key] ? ` · ${sections[key]}` : ""}
                        </dt>
                        <dd>{text}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
