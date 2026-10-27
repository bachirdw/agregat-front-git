import { useState } from "react";

const COLLAPSE_LENGTH = 520;

export function PromptBubble({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > COLLAPSE_LENGTH || text.split("\n").length > 10;
  return (
    <div className={"prompt-bubble" + (long && !expanded ? " collapsed" : "")}>
      <span className="prompt-bubble-text">{text}</span>
      {long && (
        <button
          type="button"
          className="prompt-bubble-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Afficher moins" : "Afficher plus"}
        </button>
      )}
    </div>
  );
}
