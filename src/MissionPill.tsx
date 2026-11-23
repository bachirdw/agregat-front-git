import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Icon } from "./Icon";
import { NotifyOwner } from "./NotifyOwner";
import type { Attachment } from "./types";
import {
  AttachButton,
  FileChips,
  filesText,
  useAttachedFiles,
} from "./AttachFiles";

// Controls while a mission runs. For an agent mission (`canQueue`): a chat field in the composer's
// place, always visible, to write to the agent while it works, with the stop button beside the send
// button. For a workflow: only a floating stop button. With `send`, the message leaves at once; it
// resolves to null when the back took it, or to a line saying the text was kept for a resume
// instead. Without `send` (older callers), the text is queued for afterwards.
// joindre-23-11 (contrat joindre-01 du back) : « + » joint des fichiers à la réponse ou au message ; ils
// partent par POST /api/files (simple pièce jointe, jamais rangés dans l'espace d'un Skill) puis par leur id.
export function MissionPill({
  busy,
  canQueue,
  queued,
  stop,
  queue,
  send,
  waiting = false,
  answer,
}: {
  busy: boolean;
  canQueue: boolean;
  queued: number;
  stop: () => void;
  queue: (text: string) => void;
  send?: (text: string, files: Attachment[]) => Promise<string | null>;
  waiting?: boolean;
  // meme-affichage-21-11 : l'agent attend une réponse en texte libre ; le champ y répond directement
  // (avant, le texte partait en simple message et le propriétaire le retapait dans le formulaire).
  answer?: (text: string, files: Attachment[]) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const attached = useAttachedFiles();
  const { files, uploading } = attached;
  const [sending, setSending] = useState(false);
  const [line, setLine] = useState("");
  const [failure, setFailure] = useState("");
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim() || filesText(files);
    if (!text || sending || uploading) return;
    // Sans `send` (file d'attente pour une reprise), aucun fichier ne peut suivre.
    if (!answer && !send && files.length) return;
    if (answer) {
      setSending(true);
      setFailure("");
      setLine("");
      try {
        await answer(text, files);
        setDraft("");
        attached.clear();
      } catch (error) {
        setFailure(
          `Réponse non envoyée : ${(error as Error).message || "erreur réseau"}`,
        );
      } finally {
        setSending(false);
      }
      return;
    }
    if (!send) {
      queue(text);
      setDraft("");
      return;
    }
    setSending(true);
    setFailure("");
    setLine("");
    try {
      const fallback = await send(text, files);
      setDraft("");
      attached.clear();
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
  const sendLabel = answer
    ? "Envoyer la réponse"
    : send
      ? "Envoyer à l’agent"
      : "Mettre en file";
  return (
    <div className="mission-pill-wrap mission-chat-wrap">
      <form className="mission-chat" onSubmit={(e) => void submit(e)}>
        <textarea
          id="mission-queue-field"
          aria-label={
            answer
              ? "Répondre à la question de l’agent"
              : "Écrire à l’agent pendant la mission"
          }
          rows={1}
          value={draft}
          placeholder={
            answer
              ? "Répondre à l’agent…"
              : "Écrire à l’agent pendant qu’il travaille…"
          }
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
        />
        {send && waiting && !answer && (
          <small className="mission-queue-note">
            L’agent attend votre réponse ci-dessus ; ce message lui sera remis
            ensuite
          </small>
        )}
        {(failure || attached.error) && (
          <small className="mission-queue-error" role="alert">
            {failure || attached.error}
          </small>
        )}
        {line && (
          <small className="mission-queue-note" role="status">
            {line}
          </small>
        )}
        <FileChips attached={attached} />
        <div className="mission-chat-bottom">
          {(answer || send) && (
            <AttachButton attached={attached} disabled={sending} />
          )}
          <small>
            {uploading
              ? "Envoi du fichier…"
              : answer
                ? "Ta réponse part directement à sa question"
                : queued
                  ? `${queued} en file d’attente`
                  : send
                    ? "L’agent le reçoit sans arrêter la mission"
                    : "Envoyée après la tâche en cours"}
          </small>
          <NotifyOwner />
          {stopButton}
          <button
            type="submit"
            className="send primary"
            aria-label={sendLabel}
            title={sendLabel}
            disabled={(!draft.trim() && !files.length) || sending || uploading}
          >
            <Icon name="arrow" />
          </button>
        </div>
      </form>
    </div>
  );
}
