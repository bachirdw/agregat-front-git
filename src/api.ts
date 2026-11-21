import type { Attachment, MissionInput, RunEvent } from "./types";
import { money } from "./types";
export const API_UNREACHABLE =
  "API locale inaccessible. Vérifiez que le backend est démarré.";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      signal,
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-platform-request": "1",
            },
            body: JSON.stringify(body),
          }),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(API_UNREACHABLE, 0);
  }
  if ([502, 503, 504].includes(response.status))
    throw new ApiError(API_UNREACHABLE, response.status);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("Réponse illisible du serveur local.", response.status);
  }
  if (!response.ok)
    throw new ApiError(
      plainBackError(data.error) || `Erreur HTTP ${response.status}`,
      response.status,
    );
  return data as T;
}
// fichiers-21-11 : un fichier produit par une mission (GET /api/runs/:id/file, agregat-back
// docs/api-fichiers.md). Un back sans cette route répond « Route introuvable » : dit simplement.
export const FILES_UNSUPPORTED =
  "Ouverture des fichiers pas encore disponible sur ce serveur (back à mettre à jour).";
export function runFileUrl(runId: string, path: string, download = false) {
  return (
    `/api/runs/${encodeURIComponent(runId)}/file?path=${encodeURIComponent(path)}` +
    (download ? "&download=1" : "")
  );
}
export async function fetchRunFile(
  runId: string,
  path: string,
  download = false,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(runFileUrl(runId, path, download));
  } catch {
    throw new ApiError(API_UNREACHABLE, 0);
  }
  if ([502, 503, 504].includes(response.status))
    throw new ApiError(API_UNREACHABLE, response.status);
  if (!response.ok) {
    let message = "";
    try {
      const data = (await response.json()) as { error?: unknown };
      if (typeof data.error === "string") message = data.error;
    } catch {
      // Corps illisible : le statut suffit.
    }
    if (message === "Route introuvable")
      throw new ApiError(FILES_UNSUPPORTED, response.status);
    throw new ApiError(
      message || `Erreur HTTP ${response.status}`,
      response.status,
    );
  }
  return response;
}
// Known back messages written for developers, said to the owner; any other text is kept.
function plainBackError(text: unknown) {
  if (typeof text !== "string") return "";
  const budget = text.match(
    /^Budget insuffisant : estimation (\d+) c > budget (\d+) c$/,
  );
  if (budget)
    return `Budget insuffisant : cette mission est estimée à ${money(Number(budget[1]))}, au-dessus de ton budget de ${money(Number(budget[2]))}. Augmente le budget dans les réglages (bouton sous le champ de saisie).`;
  return text;
}
export const ATTACHMENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
};
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_COUNT = 8;
// Browsers often leave file.type empty for .md: the extension decides, as the backend requires an exact type.
export function attachmentType(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return ATTACHMENT_TYPES[ext] ?? null;
}
// POST /api/files takes raw bytes (not multipart), see agregat-back/docs/api-attachments.md.
// e174-01 (back) : la pièce jointe n'est qu'une pièce jointe ; avec `skill === "career-ops"` (Skill
// career-ops choisi dans la conversation), l'en-tête `x-skill: career-ops` en fait le nouveau cv.md.
export async function uploadFile(
  file: File,
  signal?: AbortSignal,
  skill?: string,
): Promise<Attachment> {
  const type = attachmentType(file);
  if (!type)
    throw new ApiError(
      "Type refusé : PDF, DOCX, Markdown ou texte seulement.",
      400,
    );
  if (!file.size) throw new ApiError("Fichier vide.", 400);
  if (file.size > ATTACHMENT_MAX_BYTES)
    throw new ApiError("Fichier trop volumineux (10 Mo maximum).", 413);
  let response: Response;
  try {
    response = await fetch("/api/files", {
      signal,
      method: "POST",
      headers: {
        "x-platform-request": "1",
        "x-file-name": encodeURIComponent(file.name),
        "content-type": type,
        ...(skill === "career-ops" ? { "x-skill": "career-ops" } : {}),
      },
      body: file,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(API_UNREACHABLE, 0);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("Réponse illisible du serveur local.", response.status);
  }
  if (!response.ok)
    throw new ApiError(
      data.error || `Erreur HTTP ${response.status}`,
      response.status,
    );
  return data as Attachment;
}
// The API takes attachment ids only; names and sizes stay in the interface.
export function toApiInput(input: MissionInput) {
  const { attachments, browserDomains, ...rest } = input;
  const domains = (browserDomains || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  const { team, teamConsent, ...settings } = rest;
  const base =
    browserDomains === undefined
      ? settings
      : { ...settings, browserDomains: domains };
  // Switch on: `multiAgent`; consent ticked (way 1) adds the owner's consent with the platform's
  // default envelope, unticked leaves it to the platform's card (way 3).
  // Off: nothing added, the request stays the one sent before the team existed.
  const payload = team
    ? teamConsent
      ? {
          ...base,
          multiAgent: true,
          delegation: { accepted: true, via: "bouton" },
        }
      : { ...base, multiAgent: true }
    : base;
  return attachments?.length
    ? { ...payload, attachments: attachments.map((a) => a.id) }
    : payload;
}
// Owner message to the running agent. "sent": the back took it (202). "fallback": the mission can
// no longer receive it (409), the route is missing (404, older back) or the answer is not the
// contract's; the caller keeps the text for a resume. Other errors are thrown (network, 400…).
export type OwnerSend =
  | { outcome: "sent"; id: string; state: "pending" | "delivered" }
  | { outcome: "fallback"; reason: "ended" | "unsupported" };
export async function sendOwnerMessage(
  runId: string,
  text: string,
  request: typeof api = api,
): Promise<OwnerSend> {
  let response: unknown;
  try {
    response = await request<unknown>(
      `/runs/${encodeURIComponent(runId)}/message`,
      { text },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 409)
      return { outcome: "fallback", reason: "ended" };
    if (error instanceof ApiError && error.status === 404)
      return { outcome: "fallback", reason: "unsupported" };
    throw error;
  }
  const answer = response as { id?: unknown; state?: unknown } | null;
  if (
    answer &&
    typeof answer.id === "string" &&
    answer.id &&
    (answer.state === "pending" || answer.state === "delivered")
  )
    return { outcome: "sent", id: answer.id, state: answer.state };
  return { outcome: "fallback", reason: "unsupported" };
}
// EventSource carries Last-Event-ID on native reconnect. The explicit cursor also permits reopening.
export function watchRun(
  id: string,
  handlers: {
    update: (event: RunEvent) => void;
    end: () => void;
    connection: (connected: boolean) => void;
  },
  after = 0,
  create: (url: string) => EventSource = (url) => new EventSource(url),
) {
  let sequence = after,
    closed = false;
  const source = create(
    `/api/runs/${encodeURIComponent(id)}/events?after=${after}`,
  );
  source.onopen = () => {
    if (!closed) handlers.connection(true);
  };
  source.onerror = () => {
    if (!closed) handlers.connection(false);
  };
  source.addEventListener("update", (raw) => {
    if (closed) return;
    try {
      const event = JSON.parse((raw as MessageEvent).data) as RunEvent;
      if (
        !Number.isSafeInteger(event.seq) ||
        event.seq <= sequence ||
        typeof event.type !== "string" ||
        !event.data
      )
        return;
      sequence = event.seq;
      handlers.connection(true);
      handlers.update(event);
    } catch {
      handlers.connection(false);
    }
  });
  source.addEventListener("end", () => {
    if (closed) return;
    closed = true;
    source.close();
    handlers.end();
  });
  return () => {
    closed = true;
    source.close();
  };
}

const isTextChunk = (event: RunEvent) =>
  event.type === "agent" &&
  ["agent_message_chunk", "agent_thought_chunk"].includes(
    String(event.data?.sessionUpdate),
  );

const chunkText = (event: RunEvent) => {
  const content = event.data?.content as
    | { type?: string; text?: string }
    | undefined;
  return isTextChunk(event) && content?.type === "text" && content.text
    ? content.text
    : "";
};

// Long missions stream thousands of text chunks: consecutive ones are merged, so the text stays
// whole while the list stays short. Only events without text are dropped when a limit is reached.
export function appendEvent(
  old: RunEvent[],
  event: RunEvent,
  { maxText = 500, maxEvents = 5000 } = {},
) {
  const last = old.at(-1);
  const text = chunkText(event);
  if (
    last &&
    text &&
    chunkText(last) &&
    last.data.sessionUpdate === event.data.sessionUpdate
  )
    // The first chunk keeps its seq: the activity feed uses it as a stable block key.
    return [
      ...old.slice(0, -1),
      {
        ...last,
        data: {
          ...last.data,
          content: {
            ...(last.data.content as object),
            text: chunkText(last) + text,
          },
        },
      },
    ];
  const next = [...old, event];
  const isEmptyChunk = (e: RunEvent) => isTextChunk(e) && !chunkText(e);
  if (next.filter(isEmptyChunk).length > maxText)
    next.splice(next.findIndex(isEmptyChunk), 1);
  if (next.length > maxEvents) {
    const oldest = next.findIndex((e) => !chunkText(e));
    next.splice(Math.max(oldest, 0), 1);
  }
  return next;
}
