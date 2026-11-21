import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { api, appendEvent, watchRun } from "./api";
import { Markdown } from "./Markdown";
import { AgentAnswer } from "./Bilan";
import { isResultEnvelope, withoutResultEnvelope } from "./envelope";
export {
  envelopeSummary,
  isResultEnvelope,
  withoutResultEnvelope,
} from "./envelope";
import { PromptBubble } from "./PromptBubble";
import { finalStates, labels, money, ownerStates } from "./types";
import type {
  CareerOffer,
  CareerResult,
  OwnerMessage,
  Run,
  RunEvent,
} from "./types";
import {
  ownerText,
  ownerTextsVersion,
  reuseOwnerText,
  subscribeOwnerTexts,
} from "./ownerMessages";
import { SkillSteps } from "./SkillSteps";
import { resumedFromLinks } from "./resumeLinks";
import {
  MISSION_GRANT_NOTICE,
  missionGrantActive,
  OwnerRequests,
} from "./OwnerRequests";
import type { Act } from "./OwnerRequests";

// Claude-Code-like activity feed built from ACP session updates (tool calls and agent text).
export type Tool = {
  kind: "tool";
  id: string;
  title: string;
  status: string;
  // ACP kind: "execute" is a terminal command, the rest are tool actions.
  callKind?: string;
  // Name of the tool as the Claude adapter reports it (`_meta.claudeCode.toolName`).
  toolName?: string;
  // Codex marks its MCP calls `kind: "execute"` with `_meta.is_mcp_tool_call`: not terminal commands.
  mcp?: boolean;
  // File named by the call (`locations[0].path`), for Codex's reads and edits.
  location?: string;
  // Terminal output streamed by Codex (`_meta.terminal_output_delta.data`), and its exit code.
  terminal?: string;
  exitCode?: number;
  // Failed before any start event: the agent refused the call itself.
  refused?: boolean;
  input?: unknown;
  output?: string;
  at?: string;
  endAt?: string;
};
// Message the owner sent while the mission ran (`owner_message`): one item per message id.
export type Owner = {
  kind: "owner";
  id: string;
  messageId: string;
  at?: string;
  state: OwnerMessage["state"];
  via: OwnerMessage["via"];
  deliveredAt: string | null;
  text?: string;
};
// fil-21-11 : question de l'agent au propriétaire (événement `question`, docs/api-questions.md) et sa
// fermeture (`answer`). Rendues seulement avec `activity(events, { exchanges: true })` : le fil d'une
// mission les garde une fois la question fermée (avant, elles disparaissaient avec le formulaire).
export type AskedQuestion = {
  kind: "question";
  id: string;
  questionId: string;
  message: string;
  schema?: unknown;
  at?: string;
};
export type OwnerAnswer = {
  kind: "answer";
  id: string;
  questionId: string;
  action: string;
  content?: Record<string, unknown>;
  at?: string;
};
export type Item =
  | Tool
  | Owner
  | AskedQuestion
  | OwnerAnswer
  | { kind: "text"; id: string; text: string; at?: string }
  | { kind: "thought"; id: string; text: string; at?: string };
// Événements qui ouvrent un nouveau tour de l'agent : le texte qui suit n'est pas collé au précédent
// (« …Bon lancement 🚀Le système me signale… » sur la capture du propriétaire, 21/11).
const TURN_BOUNDARIES = new Set([
  "question",
  "answer",
  "verdict_turn",
  "verification",
  "state",
]);
// A JSON text is shown indented; any other text as sent.
function pretty(text: string) {
  const body = text.trim();
  if (!/^[[{]/.test(body)) return text;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return text;
  }
}
// Tool result as sent by the agent: rawOutput, else the text of its content blocks. An MCP result
// (`[{ type: "text", text }]`) is shown as its text, not as the JSON of its envelope.
function toolOutput(u: Record<string, unknown>): string | undefined {
  if (u.rawOutput !== undefined && u.rawOutput !== null) {
    if (typeof u.rawOutput === "string") return u.rawOutput;
    if (
      Array.isArray(u.rawOutput) &&
      u.rawOutput.length &&
      u.rawOutput.every(
        (b) => b?.type === "text" && typeof b?.text === "string",
      )
    )
      return u.rawOutput
        .map((b: { text: string }) => pretty(b.text))
        .join("\n");
    const raw = u.rawOutput as {
      result?: { content?: unknown };
      content?: unknown;
      exit_code?: unknown;
    };
    // Codex: an MCP result `{ result: { content: [{ type: "text", text }] } }`.
    const content = raw?.result?.content ?? raw?.content;
    if (
      Array.isArray(content) &&
      content.length &&
      content.every((b) => b?.type === "text" && typeof b?.text === "string")
    )
      return content.map((b: { text: string }) => pretty(b.text)).join("\n");
    // Codex: a command's result is only its exit code; its output came as terminal deltas.
    if (
      raw &&
      typeof raw === "object" &&
      Object.keys(raw).every((k) => ["exit_code", "exitCode"].includes(k))
    )
      return undefined;
    return JSON.stringify(u.rawOutput, null, 2);
  }
  const blocks = Array.isArray(u.content) ? u.content : [];
  const text = blocks
    .map((b: { content?: { text?: string }; text?: string }) =>
      String(b?.content?.text ?? b?.text ?? ""),
    )
    .filter(Boolean)
    .join("\n");
  return text || undefined;
}
export function activity(
  events: RunEvent[],
  { exchanges = false }: { exchanges?: boolean } = {},
): Item[] {
  const items: Item[] = [];
  const tools = new Map<string, Tool>();
  const owners = new Map<string, Owner>();
  const exchanged = new Set<string>();
  // Vrai après un changement de tour : le prochain texte ouvre un nouveau bloc.
  let cut = false;
  for (const e of events) {
    if (TURN_BOUNDARIES.has(e.type)) cut = true;
    if (
      exchanges &&
      (e.type === "question" || e.type === "answer") &&
      e.data &&
      typeof e.data === "object"
    ) {
      const d = e.data as {
        id?: unknown;
        message?: unknown;
        requestedSchema?: unknown;
        action?: unknown;
        content?: unknown;
      };
      if (typeof d.id !== "string" || !d.id) continue;
      const key = `${e.type}-${d.id}`;
      if (exchanged.has(key)) continue;
      if (
        e.type === "question" &&
        typeof d.message === "string" &&
        d.message.trim()
      ) {
        exchanged.add(key);
        items.push({
          kind: "question",
          id: key,
          questionId: d.id,
          message: d.message,
          schema: d.requestedSchema,
          at: e.at,
        });
      }
      if (e.type === "answer" && typeof d.action === "string") {
        exchanged.add(key);
        items.push({
          kind: "answer",
          id: key,
          questionId: d.id,
          action: d.action,
          content:
            d.content && typeof d.content === "object"
              ? (d.content as Record<string, unknown>)
              : undefined,
          at: e.at,
        });
      }
      continue;
    }
    // The first event of a message places it (emitted at reception); later ones update it.
    if (e.type === "owner_message" && e.data && typeof e.data === "object") {
      const m = e.data as Partial<OwnerMessage>;
      if (typeof m.id !== "string" || !m.id) continue;
      let owner = owners.get(m.id);
      if (!owner) {
        owner = {
          kind: "owner",
          id: `owner-${m.id}`,
          messageId: m.id,
          state: "pending",
          via: null,
          deliveredAt: null,
        };
        owners.set(m.id, owner);
        items.push(owner);
      }
      if (typeof m.at === "string") owner.at = m.at;
      if (
        m.state === "pending" ||
        m.state === "delivered" ||
        m.state === "undelivered"
      )
        owner.state = m.state;
      owner.via = m.via ?? null;
      owner.deliveredAt =
        typeof m.deliveredAt === "string" ? m.deliveredAt : null;
      if (typeof m.text === "string" && m.text) owner.text = m.text;
      continue;
    }
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
          title: String(
            u.title ??
              (u.status === "failed"
                ? "Appel d’outil refusé"
                : (u.kind ?? "Outil")),
          ),
          status: "pending",
          callKind: u.kind ? String(u.kind) : undefined,
          refused: update === "tool_call_update" && u.status === "failed",
          at: e.at,
        };
        tools.set(id, tool);
        items.push(tool);
      }
      const meta = (u._meta as { claudeCode?: { toolName?: unknown } })
        ?.claudeCode?.toolName;
      if (typeof meta === "string" && meta) tool.toolName = meta;
      const codex = u._meta as
        | {
            is_mcp_tool_call?: unknown;
            terminal_output_delta?: { data?: unknown };
            terminal_exit?: { exit_code?: unknown };
          }
        | undefined;
      if (codex?.is_mcp_tool_call === true) tool.mcp = true;
      const delta = codex?.terminal_output_delta?.data;
      if (typeof delta === "string")
        tool.terminal = (tool.terminal ?? "") + delta;
      const exit =
        codex?.terminal_exit?.exit_code ??
        (u.rawOutput as { exit_code?: unknown } | undefined)?.exit_code;
      if (typeof exit === "number") tool.exitCode = exit;
      const where = Array.isArray(u.locations)
        ? (u.locations[0] as { path?: unknown } | undefined)?.path
        : undefined;
      if (typeof where === "string" && where) tool.location = where;
      if (u.status) tool.status = String(u.status);
      if (u.status && !active(String(u.status))) tool.endAt = e.at;
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
      if (last && last.kind === kind && !cut) last.text += content.text;
      else
        items.push({
          kind,
          id: `${kind}-${e.seq}`,
          text: content.text,
          at: e.at,
        });
      cut = false;
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
export function Waiting({ label }: { label: string }) {
  return (
    <p className="waiting" role="status">
      <span className="thinking-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
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
// Gemini names a call after its tool: mcp_<server>_<tool>__call_<n> or <tool>__call_<n>.
export function toolNameFromId(id: string): string | null {
  const name = id.match(/^(.+?)__call_/)?.[1];
  return name ? name.replace(/^mcp_[^_]+_/, "") : null;
}
// Readable cause of a failed call; Gemini wraps the MCP error text in its function response.
export function failureCause(output?: string): string | undefined {
  if (!output) return undefined;
  const wrapped = output.match(/with response: (\[[\s\S]*\])\s*$/);
  if (wrapped)
    try {
      const responses = JSON.parse(wrapped[1]) as {
        functionResponse?: {
          response?: {
            content?: { text?: string }[];
            error?: unknown;
            output?: unknown;
          };
        };
      }[];
      const text = responses
        .flatMap((r) => {
          const response = r.functionResponse?.response;
          return [
            ...(response?.content ?? []).map((c) => c.text ?? ""),
            response?.error ? String(response.error) : "",
          ];
        })
        .filter(Boolean)
        .join("\n");
      if (text) return text;
    } catch {
      /* Not the wrapped shape: show the output as sent. */
    }
  return output;
}
// "mcp__platform__browser_click" (Claude) → "browser_click".
export function shortToolName(name: string) {
  return name.replace(/^mcp__[^_]+(?:_[^_]+)*?__/, "");
}
// The one argument that tells what a call does (URL, file, command…), as Claude Code shows it.
const mainKeys = [
  "url",
  "command",
  "cmd",
  "file_path",
  "filePath",
  "notebook_path",
  "path",
  "pattern",
  "query",
];
export function mainArgument(input: unknown): string | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return undefined;
  const args = input as Record<string, unknown>;
  for (const key of mainKeys) {
    const value = args[key];
    if (typeof value === "string" && value) {
      const extra = args.args;
      return Array.isArray(extra) && extra.every((a) => typeof a === "string")
        ? [value, ...extra].join(" ")
        : value;
    }
    if (Array.isArray(value) && value.every((a) => typeof a === "string"))
      return value.join(" ");
  }
  if (Array.isArray(args.fields))
    return `${args.fields.length} champ${args.fields.length > 1 ? "s" : ""}`;
  return undefined;
}
export function describeTool(tool: Tool) {
  if (tool.refused)
    return {
      name: toolNameFromId(tool.id) ?? "outil inconnu",
      summary: "",
      params: undefined,
    };
  const call = tool.title.match(/^([\w.-]+)\(([\s\S]*)\)$/);
  if (call)
    return {
      name: call[1].split(".").pop()!,
      summary: call[2],
      params: tool.input === undefined ? call[2] : undefined,
    };
  // Codex's own tools: a command (`kind: "execute"`, rawInput.command) or a file action
  // (« Read file '…' » with `locations`).
  if (!tool.mcp && !tool.toolName) {
    const command = (tool.input as { command?: unknown } | undefined)?.command;
    if (tool.callKind === "execute" && command !== undefined)
      return {
        name: "Commande",
        summary: Array.isArray(command) ? command.join(" ") : String(command),
        params: undefined,
      };
    // « Read file '…' », « List files in 'output' », « Search for 'x' in AGENTS.md ».
    const quoted = tool.title.match(/^([^'"\n]+?)\s+'([\s\S]*)'(.*)$/);
    if (quoted)
      return {
        name: quoted[1],
        summary: tool.location ?? (quoted[2] + quoted[3]).trim(),
        params: undefined,
      };
    if (tool.location)
      return { name: tool.title, summary: tool.location, params: undefined };
    // « Web search » ({ type: "webSearch", query }): its query, never the whole input.
    if (
      typeof (tool.input as { type?: unknown } | undefined)?.type === "string"
    )
      return {
        name: tool.title.split(": ")[0],
        summary:
          mainArgument(tool.input) ??
          tool.title.split(": ").slice(1).join(": "),
        params: undefined,
      };
  }
  if (tool.toolName) {
    const name = shortToolName(tool.toolName);
    const rest = tool.title.startsWith(tool.toolName + " ")
      ? tool.title.slice(tool.toolName.length + 1)
      : tool.title === tool.toolName
        ? ""
        : tool.title;
    return {
      name,
      summary: mainArgument(tool.input) ?? rest,
      params: undefined,
    };
  }
  const fromId = toolNameFromId(tool.id);
  if (fromId && fromId !== tool.title)
    return { name: fromId, summary: tool.title, params: undefined };
  const colon = tool.title.indexOf(": ");
  const named = colon > 0 && colon < 40;
  const args =
    (tool.input as { arguments?: unknown } | undefined)?.arguments ??
    tool.input;
  return {
    name: named
      ? tool.title.slice(0, colon)
      : shortToolName(tool.title.split(".").pop()!),
    summary: named
      ? tool.title.slice(colon + 2)
      : (mainArgument(args) ??
        (args && typeof args === "object"
          ? Object.entries(args)
              .map(
                ([k, v]) =>
                  `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`,
              )
              .join(", ")
          : "")),
    params: undefined,
  };
}
// One format for a call and for its group, so that both stay comparable.
function formatDuration(ms: number) {
  if (ms < 100) return "< 0,1 s";
  if (ms < 60000) return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
export type Wait = { start: number; end: number };
// Times the mission waited for the owner: from `state` awaiting_owner (or waiting_permission) to
// the next `state` or to the `answer`; a wait still open ends at `end` (end of the run), else now.
export function ownerWaits(events: RunEvent[], end?: string): Wait[] {
  const waits: Wait[] = [];
  let open: number | null = null;
  const close = (at: number) => {
    if (open !== null && Number.isFinite(at) && at >= open)
      waits.push({ start: open, end: at });
    open = null;
  };
  for (const e of [...events].sort((a, b) => a.seq - b.seq)) {
    const at = Date.parse(e.at || "");
    if (e.type === "state") {
      const owner = ownerStates.has(String(e.data?.state));
      if (owner && open === null) open = Number.isFinite(at) ? at : null;
      else if (!owner) close(at);
    } else if (e.type === "answer") close(at);
  }
  if (open !== null) {
    const last = Date.parse(end || "");
    close(Number.isFinite(last) ? last : Date.now());
  }
  return waits;
}
// Time between the first and last update, less the owner's waits; nothing is shown when the
// times are unknown.
function span(
  starts: (string | undefined)[],
  ends: (string | undefined)[],
  waits: Wait[] = [],
) {
  const start = Math.min(...starts.map((t) => Date.parse(t || "")));
  const end = Math.max(...ends.map((t) => Date.parse(t || "")));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return null;
  const waited = waits.reduce(
    (sum, w) =>
      sum + Math.max(0, Math.min(end, w.end) - Math.max(start, w.start)),
    0,
  );
  // Entirely spent waiting for the owner (e.g. a click held behind the send card): say so rather
  // than a misleading "< 0,1 s".
  if (waited > 0 && end - start - waited < 100)
    return `attente : ${formatDuration(waited)}`;
  return formatDuration(end - start - waited);
}
export function toolDuration(tool: Tool, waits: Wait[] = []) {
  return span([tool.at], [tool.endAt], waits);
}
// reponse-04 : durée de toutes les actions d'une réponse (« A exécuté N actions · 4 min 12 s »).
export function actionsDuration(tools: Tool[], waits: Wait[] = []) {
  return tools.length
    ? span(
        tools.map((t) => t.at),
        tools.map((t) => t.endAt),
        waits,
      )
    : null;
}
export const isActiveTool = (tool: Tool) => active(tool.status);
// skill-chip-01 : nom du skill ou de l'outil en cours, visible ~1,6 s au début de chaque appel ;
// masqué pendant une demande d'accord et une fois la mission finie.
export function SkillChip({ events, run }: { events: RunEvent[]; run: Run }) {
  const tool = useMemo(
    () =>
      [...activity(events)]
        .reverse()
        .find((i): i is Tool => i.kind === "tool" && active(i.status)),
    [events],
  );
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!tool) {
      setShown(null);
      return;
    }
    setShown(tool.id);
    const timer = window.setTimeout(() => setShown(null), 1600);
    return () => window.clearTimeout(timer);
  }, [tool?.id]);
  if (
    !tool ||
    shown !== tool.id ||
    finalStates.has(run.state) ||
    run.permissions?.length
  )
    return null;
  return (
    <div className="skill-chip" role="status">
      <i aria-hidden="true" />
      {shortToolName(describeTool(tool).name)}
    </div>
  );
}
// The agent's question to the owner (Claude's AskUserQuestion): its time is the owner's wait.
const asksOwner = (tool: Tool) =>
  tool.toolName === "AskUserQuestion" ||
  /^Asking for your input/i.test(tool.title);
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="tool-copy"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? "Copié" : "Copier"}
    </button>
  );
}
// What the call gave back: its result, else the terminal output (Codex), with a non-zero exit code.
function toolResult(tool: Tool) {
  const output = tool.output ?? tool.terminal;
  if (tool.exitCode && output !== undefined)
    return `${output.replace(/\n$/, "")}\n(code de sortie ${tool.exitCode})`;
  return (
    output ?? (tool.exitCode ? `Code de sortie ${tool.exitCode}` : undefined)
  );
}
function ToolLine({ tool, waits = [] }: { tool: Tool; waits?: Wait[] }) {
  const { name, summary, params } = describeTool(tool);
  const waited = asksOwner(tool) ? toolDuration(tool) : null;
  const duration = waited ? `attente : ${waited}` : toolDuration(tool, waits);
  const output = toolResult(tool);
  const cause = tool.status === "failed" ? failureCause(output) : undefined;
  const input =
    tool.input === undefined ? params : JSON.stringify(tool.input, null, 2);
  return (
    <details className={"fold tool " + tool.status}>
      <summary>
        <StatusIcon status={tool.status} />
        <code>{name}</code>
        {summary && <span className="tool-summary">{summary}</span>}
        {duration && <small className="tool-duration">{duration}</small>}
        {cause && (
          <span className="tool-cause">
            {tool.refused ? "Appel d’outil refusé : " : "Échec : "}
            {cause}
          </span>
        )}
      </summary>
      <div className="tool-details">
        {input && (
          <>
            <small>Paramètres</small>
            <div className="tool-input">
              <pre>{input}</pre>
              <CopyButton text={input} />
            </div>
          </>
        )}
        <small>Résultat</small>
        <pre>
          {output ??
            (active(tool.status) ? "En cours…" : "Aucun résultat transmis.")}
        </pre>
      </div>
    </details>
  );
}
// Consecutive actions fold under one line; a failure stays visible while folded.
function ToolGroup({ tools, waits }: { tools: Tool[]; waits: Wait[] }) {
  const [open, setOpen] = useState(false);
  const failed = tools.filter((t) => t.status === "failed");
  const status = tools.some((t) => active(t.status))
    ? "in_progress"
    : failed.length
      ? "failed"
      : "completed";
  const duration =
    status !== "in_progress"
      ? span(
          tools.map((t) => t.at),
          tools.map((t) => t.endAt),
          waits,
        )
      : null;
  const noun = tools.every((t) => t.callKind === "execute" && !t.mcp)
    ? "commandes"
    : "actions";
  // Which tools, in order of first use: « browser_snapshot ×2 · browser_click ».
  const counts = new Map<string, number>();
  for (const t of tools) {
    const name = describeTool(t).name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const names = [...counts]
    .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
    .join(" · ");
  // While folded, the running call and the failures stay in sight.
  const visible = tools.filter(
    (t) => t.status === "failed" || active(t.status),
  );
  return (
    <>
      <details
        className={"fold tool-group " + status}
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary>
          <StatusIcon status={status} />
          <span className="tool-group-label">
            {status === "in_progress" ? "Exécute" : "A exécuté"} {tools.length}{" "}
            {noun}
            {failed.length > 0 &&
              ` · ${failed.length} ${failed.length > 1 ? "erreurs" : "erreur"}`}
            {duration && ` · ${duration}`}
          </span>
          <span className="tool-group-names">{names}</span>
        </summary>
        <ol>
          {tools.map((t) => (
            <li key={t.id}>
              <ToolLine tool={t} waits={waits} />
            </li>
          ))}
        </ol>
      </details>
      {!open && visible.length > 0 && (
        <ol className="tool-failures">
          {visible.map((t) => (
            <li key={t.id}>
              <ToolLine tool={t} waits={waits} />
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
const clock = (iso: string | null) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";
};
export function ownerStatus(message: {
  state: OwnerMessage["state"];
  via: OwnerMessage["via"];
  deliveredAt: string | null;
}) {
  if (message.state === "undelivered")
    return "Non remis : la mission s’est terminée avant";
  if (message.state === "pending")
    return "En attente : l’agent le recevra à la prochaine occasion";
  const when = message.via
    ? {
        steering: " pendant son tour",
        turn_end: " à la fin de son tour",
        with_answer: " avec votre réponse",
      }[message.via]
    : "";
  const at = clock(message.deliveredAt);
  return `Remis à l’agent${when ?? ""}${at ? ` · ${at}` : ""}`;
}
// The owner's message in the feed: its text (from the event, else the one this page sent) and state.
export function OwnerBubble({ message }: { message: Owner }) {
  const text = message.text ?? ownerText(message.messageId);
  return (
    <div className={"owner-message " + message.state}>
      <small className="owner-message-head">Vous, pendant la mission</small>
      <div className="prompt-bubble">
        <span className="prompt-bubble-text">
          {text ?? "Message envoyé pendant la mission (texte non conservé)"}
        </span>
      </div>
      <small className="owner-message-state">
        {ownerStatus(message)}
        {message.state === "undelivered" && text && (
          <>
            {" · "}
            <button
              type="button"
              className="owner-message-reuse"
              onClick={() => reuseOwnerText(text)}
            >
              Reprendre le texte
            </button>
          </>
        )}
      </small>
    </div>
  );
}
// `final`: the run is over and its answer is shown apart: only the text absent from `answer` remains.
export function AgentActivity({
  events,
  running = false,
  final = false,
  answer,
}: {
  events: RunEvent[];
  running?: boolean;
  final?: boolean;
  answer?: string | null;
}) {
  const items = useMemo(
    () =>
      activity(events)
        .map((i) =>
          i.kind === "text"
            ? { ...i, text: withoutResultEnvelope(i.text, !final) }
            : i,
        )
        .filter((i) => i.kind !== "text" || i.text.trim()),
    [events, final],
  );
  const shown = useMemo(
    () =>
      blocks(
        final
          ? items.filter(
              (i) =>
                i.kind !== "text" ||
                (answer != null && !answer.includes(i.text.trim())),
            )
          : items,
      ),
    [items, final, answer],
  );
  const waits = useMemo(() => ownerWaits(events), [events]);
  // Re-render when this page learns the text of a message it sent (private mission).
  useSyncExternalStore(subscribeOwnerTexts, ownerTextsVersion);
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
                <ToolLine tool={block.tools[0]} waits={waits} />
              ) : (
                <ToolGroup tools={block.tools} waits={waits} />
              )
            ) : block.kind === "owner" ? (
              <OwnerBubble message={block} />
            ) : block.kind === "thought" ? (
              <Thought
                text={block.text}
                thinking={running && index === shown.length - 1}
              />
            ) : block.kind === "text" ? (
              <>
                <Markdown text={block.text} />
                {running && index === shown.length - 1 && (
                  <span className="stream-caret" aria-hidden="true" />
                )}
              </>
            ) : null}
          </li>
        ))}
      </ol>
      {label && <Waiting label={label} />}
    </>
  );
}

const sections: Record<string, string> = {
  G: "Légitimité de l’annonce",
  H: "Réponses de candidature",
};
export function CareerResults({ run }: { run: Run }) {
  const [offers, setOffers] = useState<CareerOffer[] | null>(null);
  const [result, setResult] = useState<CareerResult | null>(null);
  const [error, setError] = useState("");
  const done = run.state === "completed";
  useEffect(() => {
    if (!done) return;
    const abort = new AbortController();
    setOffers(null);
    setResult(null);
    setError("");
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
      ).catch((e) => {
        if (!abort.signal.aborted) setError((e as Error).message);
        return null;
      }),
    ])
      .then(([o, r]) => {
        if (abort.signal.aborted) return;
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
        {result &&
          (result.summary ? (
            <div className="career-summary">
              <Markdown text={result.summary} />
            </div>
          ) : (
            <p>Aucun résumé disponible.</p>
          ))}
        {!result && !error && <p>Chargement…</p>}
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
                    <summary>Rapport A–G (H si applicable)</summary>
                    <dl>
                      {Object.entries(o.report).map(([key, text]) => (
                        <div key={key}>
                          <dt>
                            {key}
                            {key === "H" && !o.contractVersion
                              ? " · Bloc historique"
                              : sections[key]
                                ? ` · ${sections[key]}`
                                : ""}
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
export function sessionThread(
  run: Run,
  runs: Run[],
  links: Record<string, string> = resumedFromLinks(),
): Run[] {
  // `resumedFrom` still links the turns when the agent had to open a new session.
  const chain = new Map([[run.id, run]]);
  const parentOf = (r: Run) => r.resumedFrom || links[r.id];
  let parent = parentOf(run);
  while (parent && !chain.has(parent)) {
    const previous = runs.find((r) => r.id === parent);
    if (!previous) break;
    chain.set(previous.id, previous);
    parent = parentOf(previous);
  }
  const sessions = new Set(
    [...chain.values()].map((r) => r.sessionId).filter(Boolean),
  );
  for (const r of runs)
    if (sessions.has(r.sessionId) && r.createdAt <= run.createdAt)
      chain.set(r.id, chain.get(r.id) ?? r);
  return [...chain.values()].sort((a, b) =>
    (a.createdAt || "").localeCompare(b.createdAt || ""),
  );
}
// The sidebar lists conversations: a turn continued by a later one (resume link or shared agent
// session) is shown through that later turn, with the number of turns.
export function conversations(
  runs: Run[],
  links: Record<string, string> = resumedFromLinks(),
): { run: Run; turns: number }[] {
  const continued = new Set(
    runs.map((r) => r.resumedFrom || links[r.id]).filter(Boolean),
  );
  const latest = new Map<string, Run>();
  for (const r of runs)
    if (r.sessionId) {
      const known = latest.get(r.sessionId);
      if (!known || (known.createdAt || "") < (r.createdAt || ""))
        latest.set(r.sessionId, r);
    }
  return runs
    .filter(
      (r) =>
        !continued.has(r.id) && (!r.sessionId || latest.get(r.sessionId) === r),
    )
    .map((r) => ({ run: r, turns: sessionThread(r, runs, links).length }));
}
// Steps of a past turn, read from its journal the first time they are opened.
function PastSteps({ run, answer }: { run: Run; answer: string | null }) {
  const [opened, setOpened] = useState(false);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "done" | "failed">(
    "loading",
  );
  useEffect(() => {
    if (!opened) return;
    setEvents([]);
    setStatus("loading");
    const close = watchRun(run.id, {
      connection: (ok) => {
        if (ok) return;
        close();
        setStatus("failed");
      },
      update: (event) => setEvents((old) => appendEvent(old, event)),
      end: () => setStatus("done"),
    });
    return close;
  }, [opened, run.id]);
  return (
    <details
      className="fold past-steps"
      onToggle={(e) => {
        if (e.currentTarget.open) setOpened(true);
      }}
    >
      <summary>Détail de ce tour</summary>
      {status === "loading" && <Waiting label="Chargement…" />}
      {status === "failed" && (
        <p className="danger" role="alert">
          Impossible de charger le détail de ce tour.
        </p>
      )}
      {status === "done" && !events.length && (
        <p className="muted">Aucune étape enregistrée.</p>
      )}
      <AgentActivity events={events} final answer={answer ?? ""} />
    </details>
  );
}
function Turn({
  run,
  live,
  immediatePrompt,
  source = "career",
}: {
  run: Run;
  live?: RunEvent[];
  immediatePrompt?: string;
  source?: "career" | "run";
}) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState("");
  // The private result could not be read: the mission's own summary is shown instead.
  const [fallback, setFallback] = useState(false);
  // The back's split of a public result (`answer`, `platformNotes`), when it has one.
  const [split, setSplit] = useState<{ answer?: string; notes?: string[] }>({});
  const done = run.state === "completed";
  const running = !finalStates.has(run.state);
  useEffect(() => {
    const abort = new AbortController();
    setPrompt(null);
    setAnswer(null);
    setAnswerError("");
    setFallback(false);
    setSplit({});
    if (source === "run") {
      setPrompt(run.prompt);
      if (done)
        api<Run>(`/runs/${run.id}`, undefined, abort.signal)
          .then((r) => {
            if (abort.signal.aborted) return;
            setAnswer(r.result?.summary || "");
            setSplit({
              answer: r.result?.answer,
              notes: r.result?.platformNotes,
            });
          })
          .catch((e) => {
            if (!abort.signal.aborted) setAnswerError((e as Error).message);
          });
      return () => abort.abort();
    }
    api<{ prompt: string }>(
      `/career/runs/${run.id}/input`,
      undefined,
      abort.signal,
    )
      .then((r) => {
        if (!abort.signal.aborted) setPrompt(r.prompt);
      })
      .catch(() => !abort.signal.aborted && setPrompt(run.prompt));
    if (done)
      api<CareerResult>(
        `/career/runs/${run.id}/result`,
        undefined,
        abort.signal,
      )
        .then((r) => {
          if (!abort.signal.aborted) setAnswer(r.summary || "");
        })
        .catch((e) => {
          if (abort.signal.aborted) return;
          if (run.result?.summary) {
            setAnswer(run.result.summary);
            setSplit({
              answer: run.result.answer,
              notes: run.result.platformNotes,
            });
            setFallback(true);
          } else setAnswerError((e as Error).message);
        });
    return () => abort.abort();
  }, [run.id, done, run.prompt, source, run.result?.summary]);
  return (
    <>
      <PromptBubble text={prompt ?? immediatePrompt ?? "…"} />
      <div className="agent-turn">
        {live && !done && <AgentActivity events={live} running={running} />}
        {live && done && (
          <AgentActivity
            events={live}
            final
            answer={answerError ? "" : answer}
          />
        )}
        {done && answer !== null && (
          <AgentAnswer
            text={answer}
            answer={split.answer}
            notes={split.notes}
          />
        )}
        {fallback && (
          <p className="muted answer-source">
            Résultat privé illisible : réponse enregistrée sur la mission.
          </p>
        )}
        {done && answerError && (
          <p className="danger" role="alert">
            {answerError}
          </p>
        )}
        {!live && running && <Waiting label="Réflexion…" />}
        {["failed", "cancelled", "interrupted"].includes(run.state) && (
          <p className="danger">{run.error || "Tour interrompu."}</p>
        )}
        {!live && !running && <PastSteps run={run} answer={answer} />}
      </div>
    </>
  );
}
// Earlier turns of a resumable conversation, above the current run's own view.
export function SessionHistory({ run, runs }: { run: Run; runs: Run[] }) {
  const turns = sessionThread(run, runs).filter((t) => t.id !== run.id);
  if (!turns.length) return null;
  return (
    <div className="career-thread">
      {turns.map((t) => (
        <Turn key={t.id} run={t} source="run" />
      ))}
    </div>
  );
}
// The last silence notice, unless the mission is over or waits for the owner, or the agent has
// spoken (or the state, or a question, has moved) since.
export function activeSilence(events: RunEvent[], state: string) {
  if (finalStates.has(state) || ownerStates.has(state)) return undefined;
  const silent = [...events]
    .reverse()
    .find((event) => event.type === "agent_silent" && !event.data?.stopped);
  if (!silent) return undefined;
  const later = events.some(
    (event) =>
      event.seq > silent.seq &&
      ["agent", "state", "question"].includes(event.type),
  );
  return later ? undefined : silent;
}
export function CareerThread({
  run,
  runs,
  events,
  immediatePrompt,
  busy = false,
  connection,
  stop,
  resume,
  act,
  children,
}: {
  run: Run;
  runs: Run[];
  events: RunEvent[];
  immediatePrompt?: string;
  busy?: boolean;
  connection?: string;
  stop?: () => void;
  resume?: () => void;
  // Answers the owner's requests (send agreement, agent's question) from the thread itself.
  act?: Act;
  children: ReactNode;
}) {
  const turns = sessionThread(run, runs);
  const silent = activeSilence(events, run.state);
  const browserFallback = events.some(
    (event) => event.type === "browser_fallback",
  );
  return (
    <div className="career-thread">
      {turns.map((t) => (
        <Turn
          key={t.id}
          run={t}
          live={t.id === run.id ? events : undefined}
          immediatePrompt={t.id === run.id ? immediatePrompt : undefined}
        />
      ))}
      {silent && (
        <p className="career-warning" role="status">
          Agent silencieux depuis{" "}
          {Math.max(
            1,
            Math.ceil(Number(silent.data?.elapsedMs || 60000) / 60000),
          )}{" "}
          min. Vous pouvez arrêter la mission.
        </p>
      )}
      {browserFallback && (
        <p className="career-warning" role="status">
          Navigateur : Chrome isolé, non connecté à vos comptes (extension
          Playwriter indisponible).
        </p>
      )}
      {missionGrantActive(events, run.state) && (
        <p className="career-warning" role="status">
          {MISSION_GRANT_NOTICE}
        </p>
      )}
      {act && <OwnerRequests run={run} busy={busy} act={act} />}
      {stop && !finalStates.has(run.state) && (
        <button className="stop-button" disabled={busy} onClick={stop}>
          <span aria-hidden="true">■</span> Stop
        </button>
      )}
      <div className="conversation-status" role="status">
        <span
          className={
            finalStates.has(run.state) && run.state !== "completed"
              ? "danger"
              : ""
          }
        >
          {labels[run.state] || run.state}
        </span>
        {connection?.includes("perdue") && (
          <small className="danger">{connection}</small>
        )}
        {run.usage && (
          <small>{money(run.usage.platformCents, run.usage.currency)}</small>
        )}
        {resume &&
          ((run.resumable && finalStates.has(run.state)) ||
            (run.mode === "workflow" &&
              ["failed", "cancelled", "interrupted"].includes(run.state))) && (
            <button type="button" onClick={resume} disabled={busy}>
              Reprendre
            </button>
          )}
      </div>
      <CareerOffers done={run.state === "completed"} />
      <SkillSteps progress={run.skillProgress} />
      <details className="tech-details">
        <summary>Détails techniques (coût, journal brut)</summary>
        {children}
      </details>
    </div>
  );
}
function CareerOffers({ done }: { done: boolean }) {
  const [offers, setOffers] = useState<CareerOffer[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!done) return;
    const abort = new AbortController();
    setOffers(null);
    setError("");
    api<{ opportunities: CareerOffer[] }>(
      "/career/offers",
      undefined,
      abort.signal,
    )
      .then((o) => {
        if (!abort.signal.aborted)
          setOffers(
            [...o.opportunities].sort(
              (a, b) => (b.score ?? -1) - (a.score ?? -1),
            ),
          );
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError((e as Error).message);
      });
    return () => abort.abort();
  }, [done]);
  if (!done) return null;
  if (error)
    return (
      <p className="danger" role="alert">
        {error}
      </p>
    );
  if (!offers?.length) return null;
  return (
    <details className="career-offers card">
      <summary>Toutes vos offres enregistrées · {offers.length}</summary>
      <ol className="offer-lines">
        {offers.map((o) => (
          <li key={o.id} className="offer">
            <strong>{o.score ?? "–"}/5</strong> {o.title} — {o.company} ·{" "}
            {o.source} {o.simulated ? "· FICTIF " : ""}
            <a href={o.url} target="_blank" rel="noopener noreferrer">
              ↗
            </a>
            {o.report && (
              <details>
                <summary>Rapport A–G (H si applicable)</summary>
                <dl>
                  {Object.entries(o.report).map(([key, text]) => (
                    <div key={key}>
                      <dt>
                        {key}
                        {key === "H" && !o.contractVersion
                          ? " · Bloc historique"
                          : sections[key]
                            ? ` · ${sections[key]}`
                            : ""}
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
  );
}

// Finished turn: only the answer stays visible; tool calls fold into one line (Claude-Code-like).
