// joindre-23-11 : fichiers joints à une réponse ou à un message pendant la mission (contrat joindre-01 du
// back). Envoyés par POST /api/files comme simple pièce jointe (jamais rangés dans l'espace d'un Skill),
// puis transmis par leur id. Partagé par le champ de chat et la carte de question.
import { useRef, useState } from "react";
import { Icon } from "./Icon";
import { uploadFile } from "./api";
import type { Attachment } from "./types";

export function useAttachedFiles() {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const add = async (list: FileList) => {
    setUploading(true);
    setError("");
    try {
      for (const file of [...list]) {
        const sent = await uploadFile(file);
        setFiles((old) => [...old, sent]);
      }
    } catch (e) {
      setError(
        `Fichier non joint : ${(e as Error).message || "erreur réseau"}`,
      );
    } finally {
      setUploading(false);
    }
  };
  const remove = (id: string) =>
    setFiles((old) => old.filter((f) => f.id !== id));
  const clear = () => setFiles([]);
  return { files, uploading, error, setError, add, remove, clear };
}
export type AttachedFiles = ReturnType<typeof useAttachedFiles>;

// Un fichier seul part avec son nom pour texte, jamais avec des mots prêtés au propriétaire.
export const filesText = (files: Attachment[]) =>
  files.length ? `Fichier joint : ${files.map((f) => f.name).join(", ")}` : "";

export function AttachButton({
  attached,
  disabled,
  label = "Joindre un fichier",
  inputLabel = "Fichier à joindre pendant la mission",
  className = "mission-attach",
  children,
}: {
  attached: AttachedFiles;
  disabled?: boolean;
  label?: string;
  inputLabel?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={children ? undefined : label}
        title={`${label} (PDF, DOCX, Markdown, texte)`}
        disabled={disabled || attached.uploading}
        onClick={() => ref.current?.click()}
      >
        <Icon name="plus" />
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        hidden
        multiple
        accept=".pdf,.docx,.md,.markdown,.txt"
        aria-label={inputLabel}
        onChange={(e) => {
          if (e.target.files?.length) void attached.add(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}

export function FileChips({ attached }: { attached: AttachedFiles }) {
  if (!attached.files.length) return null;
  return (
    <ul className="mission-files" aria-label="Fichiers joints">
      {attached.files.map((file) => (
        <li key={file.id}>
          <span>{file.name}</span>
          <button
            type="button"
            aria-label={`Retirer ${file.name}`}
            onClick={() => attached.remove(file.id)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
