import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Icon } from "./Icon";

// Controls while a mission runs. For an agent mission (`canQueue`): a chat field in the composer's
// place, always visible, to write to the agent while it works, with the stop button beside the send
// button. For a workflow: only a floating stop button. With `send`, the message leaves at once; it
// resolves to null when the back took it, or to a line saying the text was kept for a resume
// instead. Without `send` (older callers), the text is queued for afterwards.
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
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [line, setLine] = useState("");
  const [failure, setFailure] = useState("");
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!send) {
      queue(text);
      setDraft("");
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
  const stopButton = (
    <button
      type="button"
      className="mission-stop"
      aria-label="Arrêter"
      title="Arrêter"
      disabled={busy}
      onClick={stop}
    >
      <span className="mission-pill-stop" />
    </button>
  );
  if (!canQueue)
    return (
      <div className="mission-pill-wrap">
        <div className="mission-pill">{stopButton}</div>
      </div>
    );
  const sendLabel = send ? "Envoyer à l’agent" : "Mettre en file";
  return (
    <div className="mission-pill-wrap mission-chat-wrap">
      <form className="mission-chat" onSubmit={(e) => void submit(e)}>
        <textarea
          id="mission-queue-field"
          aria-label="Écrire à l’agent pendant la mission"
          rows={1}
          value={draft}
          placeholder="Écrire à l’agent pendant qu’il travaille…"
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
        <div className="mission-chat-bottom">
          <small>
            {queued
              ? `${queued} en file d’attente`
              : send
                ? "L’agent le reçoit sans arrêter la mission"
                : "Envoyée après la tâche en cours"}
          </small>
          {stopButton}
          <button
            type="submit"
            className="send primary"
            aria-label={sendLabel}
            title={sendLabel}
            disabled={!draft.trim() || sending}
          >
            <Icon name="arrow" />
          </button>
        </div>
      </form>
    </div>
  );
}
