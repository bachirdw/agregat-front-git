import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

// Floating controls while a mission runs: stop it, or queue an instruction for afterwards.
export function MissionPill({
  busy,
  canQueue,
  queued,
  stop,
  queue,
}: {
  busy: boolean;
  canQueue: boolean;
  queued: number;
  stop: () => void;
  queue: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
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
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    queue(text);
    setDraft("");
    setOpen(false);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };
  return (
    <div className="mission-pill-wrap">
      {open && (
        <form className="mission-queue" onSubmit={submit}>
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
          <div>
            <small>
              {queued
                ? `${queued} en file d’attente`
                : "Envoyée après la tâche en cours"}
            </small>
            <button type="submit" className="primary" disabled={!draft.trim()}>
              Mettre en file
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
