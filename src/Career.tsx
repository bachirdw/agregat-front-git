import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "./api";
import { Markdown } from "./Markdown";
import { finalStates } from "./types";
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
// Short label while the agent works: a running tool means execution, otherwise it is thinking.
export function waitingLabel(items: Item[]): string | null {
  const last = items.at(-1);
  if (last?.kind === "tool")
    return ["pending", "in_progress"].includes(last.status)
      ? "Exécution…"
      : "Réflexion…";
  // Streaming text needs no indicator; a thought shows it inside its own block.
  return last?.kind === "text" || last?.kind === "thought"
    ? null
    : "Réflexion…";
}
function Waiting({ label }: { label: string }) {
  return (
    <p className="waiting" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  );
}
// Reasoning stays folded by default, even once finished.
function Thought({ text, thinking }: { text: string; thinking: boolean }) {
  return (
    <details className="fold">
      <summary>
        {thinking ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Réflexion…
          </>
        ) : (
          "Réflexion"
        )}
      </summary>
      <p>{text}</p>
    </details>
  );
}
const statusLabel: Record<string, string> = {
  pending: "en attente",
  in_progress: "en cours",
  completed: "terminé",
  failed: "échec",
};
export function AgentActivity({
  events,
  running = false,
}: {
  events: RunEvent[];
  running?: boolean;
}) {
  const items = useMemo(() => activity(events), [events]);
  const label = running ? waitingLabel(items) : null;
  if (!items.length) return label ? <Waiting label={label} /> : null;
  return (
    <>
      <ol
        className="activity"
        aria-label="Activité de l’agent"
        aria-live="polite"
      >
        {items.map((item, index) =>
          item.kind === "tool" ? (
            <li key={item.id} className={"activity-tool " + item.status}>
              <span className="dot" aria-hidden="true" />
              <code>{item.title}</code>
              <small>{statusLabel[item.status] || item.status}</small>
            </li>
          ) : item.kind === "thought" ? (
            <li key={item.id} className="activity-thought">
              <Thought
                text={item.text}
                thinking={running && index === items.length - 1}
              />
            </li>
          ) : (
            <li key={item.id} className="activity-text">
              <p>{item.text}</p>
            </li>
          ),
        )}
      </ol>
      {label && <Waiting label={label} />}
    </>
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
    <section className="card career" aria-label="Résultat career-ops">
      <div className="card-pad">
        <small>career-ops · espace privé</small>
        <h2>Réponse de l’agent</h2>
        {result?.summary ? (
          <div className="career-summary">
            <Markdown text={result.summary} />
          </div>
        ) : (
          !error && <p>Chargement…</p>
        )}
        {error && <p className="danger">{error}</p>}
      </div>
      {offers && (
        <details className="career-offers">
          <summary>Toutes vos offres enregistrées · {offers.length}</summary>
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
        </details>
      )}
    </section>
  );
}

// One career-ops conversation = the runs sharing an agent session, oldest first (Claude-Code-like).
export function sessionThread(run: Run, runs: Run[]): Run[] {
  const same = run.sessionId
    ? runs.filter(
        (r) => r.sessionId === run.sessionId && r.createdAt <= run.createdAt,
      )
    : [];
  const all = same.some((r) => r.id === run.id) ? same : [...same, run];
  return [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
function Turn({ run, live }: { run: Run; live?: RunEvent[] }) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const done = run.state === "completed";
  const running = !finalStates.has(run.state);
  useEffect(() => {
    const abort = new AbortController();
    api<{ prompt: string }>(
      `/career/runs/${run.id}/input`,
      undefined,
      abort.signal,
    )
      .then((r) => setPrompt(r.prompt))
      .catch(() => !abort.signal.aborted && setPrompt(run.prompt));
    if (done)
      api<CareerResult>(
        `/career/runs/${run.id}/result`,
        undefined,
        abort.signal,
      )
        .then((r) => setAnswer(r.summary || ""))
        .catch(() => !abort.signal.aborted && setAnswer(null));
    return () => abort.abort();
  }, [run.id, done, run.prompt]);
  return (
    <>
      <div className="prompt-bubble">{prompt ?? "…"}</div>
      <div className="agent-turn">
        {live && !done && <AgentActivity events={live} running={running} />}
        {live && done && <UsedTools events={live} />}
        {done && answer !== null && <Markdown text={answer} />}
        {!live && running && <Waiting label="Réflexion…" />}
        {["failed", "cancelled", "interrupted"].includes(run.state) && (
          <p className="danger">{run.error || "Tour interrompu."}</p>
        )}
      </div>
    </>
  );
}
export function CareerThread({
  run,
  runs,
  events,
  children,
}: {
  run: Run;
  runs: Run[];
  events: RunEvent[];
  children: ReactNode;
}) {
  const turns = sessionThread(run, runs);
  return (
    <div className="career-thread">
      {turns.map((t) => (
        <Turn key={t.id} run={t} live={t.id === run.id ? events : undefined} />
      ))}
      <CareerOffers done={run.state === "completed"} />
      <details className="tech-details">
        <summary>Détails techniques (coût, journal brut)</summary>
        {children}
      </details>
    </div>
  );
}
function CareerOffers({ done }: { done: boolean }) {
  const [offers, setOffers] = useState<CareerOffer[] | null>(null);
  useEffect(() => {
    if (!done) return;
    const abort = new AbortController();
    api<{ opportunities: CareerOffer[] }>(
      "/career/offers",
      undefined,
      abort.signal,
    )
      .then((o) =>
        setOffers(
          [...o.opportunities].sort(
            (a, b) => (b.score ?? -1) - (a.score ?? -1),
          ),
        ),
      )
      .catch(() => {});
    return () => abort.abort();
  }, [done]);
  if (!offers?.length) return null;
  return (
    <details className="career-offers card">
      <summary>Toutes vos offres enregistrées · {offers.length}</summary>
      <ol className="offer-lines">
        {offers.map((o) => (
          <li key={o.id}>
            <strong>{o.score ?? "–"}/5</strong> {o.title} — {o.company} ·{" "}
            {o.source}{" "}
            <a href={o.url} target="_blank" rel="noopener noreferrer">
              ↗
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}

// Finished turn: only the answer stays visible; tool calls fold into one line (Claude-Code-like).
function UsedTools({ events }: { events: RunEvent[] }) {
  const tools = activity(events).filter((i) => i.kind === "tool");
  if (!tools.length) return null;
  return (
    <details className="used-tools">
      <summary>{tools.length} outils utilisés</summary>
      <ol>
        {tools.map((t) => (
          <li key={t.id}>
            <code>{t.kind === "tool" ? t.title : ""}</code>
          </li>
        ))}
      </ol>
    </details>
  );
}
