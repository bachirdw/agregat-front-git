import type { Attachment, MissionInput, RunEvent } from "./types";
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
    throw new ApiError(
      "API locale inaccessible. Vérifiez que le backend est démarré.",
      0,
    );
  }
  if ([502, 503, 504].includes(response.status))
    throw new ApiError(
      "API locale inaccessible. Vérifiez que le backend est démarré.",
      response.status,
    );
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
  return data as T;
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
export async function uploadFile(file: File): Promise<Attachment> {
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
      method: "POST",
      headers: {
        "x-platform-request": "1",
        "x-file-name": encodeURIComponent(file.name),
        "content-type": type,
      },
      body: file,
    });
  } catch {
    throw new ApiError(
      "API locale inaccessible. Vérifiez que le backend est démarré.",
      0,
    );
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
  const { attachments, ...rest } = input;
  return attachments?.length
    ? { ...rest, attachments: attachments.map((a) => a.id) }
    : rest;
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
  source.onopen = () => handlers.connection(true);
  source.onerror = () => {
    if (!closed) handlers.connection(false);
  };
  source.addEventListener("update", (raw) => {
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
    closed = true;
    source.close();
    handlers.end();
  });
  return () => {
    closed = true;
    source.close();
  };
}
