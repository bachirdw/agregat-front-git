import { useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Icon } from "./Icon";
import { NotifyOwner } from "./NotifyOwner";
import { uploadFile } from "./api";
import type { Attachment } from "./types";

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
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addFiles = async (list: FileList) => {
    setUploading(true);
    setFailure("");
    try {
      for (const file of [...list]) {
        const sent = await uploadFile(file);
        setFiles((old) => [...old, sent]);
      }
    } catch (error) {
      setFailure(
        `Fichier non joint : ${(error as Error).message || "erreur réseau"}`,
      );
    } finally {
      setUploading(false);
    }
  };
  const [sending, setSending] = useState(false);
  const [line, setLine] = useState("");
  const [failure, setFailure] = useState("");
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    // Un fichier seul part avec son nom pour texte, jamais avec des mots prêtés au propriétaire.
    const text =
      draft.trim() ||
      (files.length
        ? `Fichier joint : ${files.map((f) => f.name).join(", ")}`
        : "");
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
        setFiles([]);
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
      setFiles([]);
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
        {files.length > 0 && (
          <ul className="mission-files" aria-label="Fichiers joints">
            {files.map((file) => (
              <li key={file.id}>
                <span>{file.name}</span>
                <button
                  type="button"
                  aria-label={`Retirer ${file.name}`}
                  onClick={() =>
                    setFiles((old) => old.filter((f) => f.id !== file.id))
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mission-chat-bottom">
          {(answer || send) && (
            <>
              <button
                type="button"
                className="mission-attach"
                aria-label="Joindre un fichier"
                title="Joindre un fichier (PDF, DOCX, Markdown, texte)"
                disabled={uploading || sending}
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="plus" />
              </button>
              <input
                ref={fileRef}
                type="file"
                hidden
                multiple
                accept=".pdf,.docx,.md,.markdown,.txt"
                aria-label="Fichier à joindre pendant la mission"
                onChange={(e) => {
                  if (e.target.files?.length) void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </>
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
