import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "./api";
import { Markdown } from "./Markdown";
import { finalStates } from "./types";
import type { CareerOffer, CareerResult, Run, RunEvent } from "./types";

// Claude-Code-like activity feed built from ACP session updates (tool calls and agent text).
type Tool = {
  kind: "tool";
  id: string;
  title: string;
  status: string;
  input?: unknown;
  output?: string;
  at?: string;
};
type Item =
  | Tool
  | { kind: "text"; id: string; text: string; at?: string }
  | { kind: "thought"; id: string; text: string; at?: string };
// Tool result as sent by the agent: rawOutput, else the text of its content blocks.
function toolOutput(u: Record<string, unknown>): string | undefined {
  if (u.rawOutput !== undefined && u.rawOutput !== null)
    return typeof u.rawOutput === "string"
      ? u.rawOutput
      : JSON.stringify(u.rawOutput, null, 2);
  const blocks = Array.isArray(u.content) ? u.content : [];
  const text = blocks
    .map((b: { content?: { text?: string }; text?: string }) =>
      String(b?.content?.text ?? b?.text ?? ""),
    )
    .filter(Boolean)
    .join("\n");
  return text || undefined;
}
export function activity(events: RunEvent[]): Item[] {
  const items: Item[] = [];
  const tools = new Map<string, Tool>();
  for (const e of events) {
    if (e.type !== "agent" || !e.data || typeof e.data !== "object") continue;
    const u = e.data as Record<string, unknown>;
    const update = u.sessionUpdate as string | undefined;
    if (update === "tool_call" || update === "tool_call_update") {
      const id = String(u.toolCallId ?? e.seq);
      let tool = tools.get(id);
      if (!tool) {
        tool = {
          kind: "tool",
          id,
          title: String(u.title ?? u.kind ?? "Outil"),
          status: "pending",
          at: e.at,
        };
        tools.set(id, tool);
        items.push(tool);
      }
      if (u.status) tool.status = String(u.status);
      if (u.title) tool.title = String(u.title);
      if (u.rawInput !== undefined) tool.input = u.rawInput;
      tool.output = toolOutput(u) ?? tool.output;
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
const active = (status: string) => ["pending", "in_progress"].includes(status);
// Short label while the agent works: a running tool means execution, otherwise it is thinking.
export function waitingLabel(items: Item[]): string | null {
  const last = items.at(-1);
  if (last?.kind === "tool")
    return active(last.status) ? "Exécution…" : "Réflexion…";
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
function StatusIcon({ status }: { status: string }) {
  if (active(status))
    return <span className="spinner" role="img" aria-label="en cours" />;
  return status === "failed" ? (
    <span className="tool-icon failed" role="img" aria-label="échec">
      ✗
    </span>
  ) : (
    <span className="tool-icon done" role="img" aria-label="réussi">
      ✓
    </span>
  );
}
// "browser_click(selector: …)" (Gemini) or "mcp.platform.browser_extract" + rawInput (Codex).
export function describeTool(tool: Tool) {
  const call = tool.title.match(/^([\w.-]+)\(([\s\S]*)\)$/);
  if (call)
    return {
      name: call[1].split(".").pop()!,
      summary: call[2],
      params: tool.input === undefined ? call[2] : undefined,
    };
  const colon = tool.title.indexOf(": ");
  const named = colon > 0 && colon < 40;
  const args =
    (tool.input as { arguments?: unknown } | undefined)?.arguments ??
    tool.input;
  return {
    name: named ? tool.title.slice(0, colon) : tool.title.split(".").pop()!,
    summary: named
      ? tool.title.slice(colon + 2)
      : args && typeof args === "object"
        ? Object.entries(args)
            .map(
              ([k, v]) =>
                `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`,
            )
            .join(", ")
        : "",
    params: undefined,
  };
}
function ToolLine({ tool }: { tool: Tool }) {
  const { name, summary, params } = describeTool(tool);
  const input =
    tool.input === undefined ? params : JSON.stringify(tool.input, null, 2);
  return (
    <details className={"fold tool " + tool.status}>
      <summary>
        <StatusIcon status={tool.status} />
        <code>{name}</code>
        {summary && <span className="tool-summary">{summary}</span>}
      </summary>
      <div className="tool-details">
        {input && (
          <>
            <small>Paramètres</small>
            <pre>{input}</pre>
          </>
        )}
        <small>Résultat</small>
        <pre>
          {tool.output ??
            (active(tool.status) ? "En cours…" : "Aucun résultat transmis.")}
        </pre>
      </div>
    </details>
  );
}
// Consecutive actions fold under one line; a failure stays visible while folded.
function ToolGroup({ tools }: { tools: Tool[] }) {
  const [open, setOpen] = useState(false);
  const failed = tools.filter((t) => t.status === "failed");
  const status = tools.some((t) => active(t.status))
    ? "in_progress"
    : failed.length
      ? "failed"
      : "completed";
  return (
    <>
      <details
        className={"fold tool-group " + status}
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary>
          <StatusIcon status={status} />
          {tools.length} actions
          {failed.length > 0 && ` · ${failed.length} en échec`}
        </summary>
        <ol>
          {tools.map((t) => (
            <li key={t.id}>
              <ToolLine tool={t} />
            </li>
          ))}
        </ol>
      </details>
      {!open && failed.length > 0 && (
        <ol className="tool-failures">
          {failed.map((t) => (
            <li key={t.id}>
              <ToolLine tool={t} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
type Block = Exclude<Item, Tool> | { kind: "tools"; id: string; tools: Tool[] };
function blocks(items: Item[]): Block[] {
  const out: Block[] = [];
  for (const item of items) {
    const last = out.at(-1);
    if (item.kind !== "tool") out.push(item);
    else if (last?.kind === "tools") last.tools.push(item);
    else out.push({ kind: "tools", id: `tools-${item.id}`, tools: [item] });
  }
  return out;
}
// `final`: the run is over and its answer is shown apart, so only the folded steps remain.
export function AgentActivity({
  events,
  running = false,
  final = false,
}: {
  events: RunEvent[];
  running?: boolean;
  final?: boolean;
}) {
  const items = useMemo(() => activity(events), [events]);
  const shown = useMemo(
    () => blocks(final ? items.filter((i) => i.kind !== "text") : items),
    [items, final],
  );
  const label = running ? waitingLabel(items) : null;
  if (!shown.length) return label ? <Waiting label={label} /> : null;
  return (
    <>
      <ol
        className="activity"
        aria-label="Activité de l’agent"
        aria-live="polite"
      >
        {shown.map((block, index) => (
          <li key={block.id} className={"activity-" + block.kind}>
            {block.kind === "tools" ? (
              block.tools.length === 1 ? (
                <ToolLine tool={block.tools[0]} />
              ) : (
                <ToolGroup tools={block.tools} />
              )
            ) : block.kind === "thought" ? (
              <Thought
                text={block.text}
                thinking={running && index === shown.length - 1}
              />
            ) : (
              <p>{block.text}</p>
            )}
          </li>
        ))}
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
        {live && done && <AgentActivity events={live} final />}
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
  busy = false,
  stop,
  children,
}: {
  run: Run;
  runs: Run[];
  events: RunEvent[];
  busy?: boolean;
  stop?: () => void;
  children: ReactNode;
}) {
  const turns = sessionThread(run, runs);
  return (
    <div className="career-thread">
      {turns.map((t) => (
        <Turn key={t.id} run={t} live={t.id === run.id ? events : undefined} />
      ))}
      {stop && !finalStates.has(run.state) && (
        <button className="stop-button" disabled={busy} onClick={stop}>
          <span aria-hidden="true">■</span> Stop
        </button>
      )}
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
