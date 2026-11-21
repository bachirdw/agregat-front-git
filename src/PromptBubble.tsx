import { useState } from "react";

// reponse-04 : bulle à droite, tronquée à ~170 caractères, « Afficher tout » / « Réduire » en gris.
const COLLAPSE_LENGTH = 170;

export function PromptBubble({
  text,
  attachments = 0,
}: {
  text: string;
  // Files joined to the mission: the back keeps their ids only, so the count, never a name.
  attachments?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > COLLAPSE_LENGTH;
  return (
    <div className={"prompt-bubble" + (long && !expanded ? " collapsed" : "")}>
      <span className="prompt-bubble-text">
        {long && !expanded
          ? text.slice(0, COLLAPSE_LENGTH).trimEnd() + "…"
          : text}
      </span>
      {long && (
        <button
          type="button"
          className="prompt-bubble-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Réduire" : "Afficher tout"}
        </button>
      )}
      {attachments > 0 && (
        <small className="prompt-attachments">
          {attachments > 1
            ? `${attachments} fichiers joints`
            : "1 fichier joint"}
        </small>
      )}
    </div>
  );
}
