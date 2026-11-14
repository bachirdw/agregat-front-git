import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

// Floating controls while a mission runs: stop it, or send a message to the agent. With `send`, the
// message leaves at once; it resolves to null when the back took it, or to a line saying the text
// was kept for a resume instead. Without `send` (older callers), the text is queued for afterwards.
export function MissionPill({
  busy,
  canQueue,
  queued,
  stop,
  queue,
  send,
  waiting = false,
}: {
  busy: boolean;
  canQueue: boolean;
  queued: number;
  stop: () => void;
  queue: (text: string) => void;
  send?: (text: string) => Promise<string | null>;
  waiting?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [line, setLine] = useState("");
  const [failure, setFailure] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  useEffect(() => {
    const close = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!send) {
      queue(text);
      setDraft("");
      setOpen(false);
      return;
    }
    setSending(true);
    setFailure("");
    setLine("");
    try {
      const fallback = await send(text);
      setDraft("");
      if (fallback) setLine(fallback);
    } catch (error) {
      setFailure(
        `Message non envoyé : ${(error as Error).message || "erreur réseau"}`,
      );
    } finally {
      setSending(false);
    }
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };
  return (
    <div className="mission-pill-wrap">
      {open && (
        <form className="mission-queue" onSubmit={(e) => void submit(e)}>
          <label htmlFor="mission-queue-field">
            Ajouter une instruction pour l’agent
          </label>
          <textarea
            id="mission-queue-field"
            ref={field}
            rows={1}
            value={draft}
            placeholder="Ex. ajoute aussi les offres en remote"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
          />
          {send && waiting && (
            <small className="mission-queue-note">
              L’agent attend votre réponse ci-dessus ; ce message lui sera remis
              ensuite
            </small>
          )}
          {failure && (
            <small className="mission-queue-error" role="alert">
              {failure}
            </small>
          )}
          {line && (
            <small className="mission-queue-note" role="status">
              {line}
            </small>
          )}
          <div>
            <small>
              {queued
                ? `${queued} en file d’attente`
                : send
                  ? "L’agent le reçoit sans arrêter la mission"
                  : "Envoyée après la tâche en cours"}
            </small>
            <button
              type="submit"
              className="primary"
              disabled={!draft.trim() || sending}
            >
              {send ? "Envoyer à l’agent" : "Mettre en file"}
            </button>
          </div>
        </form>
      )}
      <div className="mission-pill">
        {canQueue && (
          <>
            <button
              type="button"
              aria-label="Ajouter une instruction"
              title="Ajouter une instruction"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12.2 2.8a1.6 1.6 0 012.3 2.3L7 12.6l-3.2.8.8-3.2z" />
              </svg>
              {queued > 0 && <small>{queued}</small>}
            </button>
            <span className="mission-pill-sep" />
          </>
        )}
        <button
          type="button"
          aria-label="Arrêter"
          title="Arrêter"
          disabled={busy}
          onClick={stop}
        >
          <span className="mission-pill-stop" />
        </button>
      </div>
    </div>
  );
}
