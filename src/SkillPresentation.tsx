// lenteur-23-11 (idée du propriétaire) : en tête d'une conversation, la façon de travailler du Skill
// choisi, en quelques phrases venues du catalogue (`skills[].presentation`, sinon
// `packs[].presentation`). Une explication, pas une mise en garde : rien sans texte du back.
import { useState } from "react";
import { Markdown } from "./Markdown";
import type { Catalog, Run } from "./types";

export function skillPresentation(
  run: Pick<Run, "skills" | "pack">,
  catalog: Catalog | null,
): { name: string; text: string } | null {
  if (!catalog) return null;
  const skillId = Array.isArray(run.skills) ? run.skills[0] : undefined;
  const skill = skillId
    ? catalog.skills.find((s) => s.id === skillId)
    : undefined;
  if (skill?.presentation?.trim())
    return { name: skill.name, text: skill.presentation.trim() };
  // Un pack sans Skill : le back enregistre le pack résolu (`core` par défaut, sans `presentation`).
  const pack = run.pack
    ? catalog.packs.find((p) => p.id === run.pack)
    : undefined;
  if (pack?.presentation?.trim())
    return { name: pack.name, text: pack.presentation.trim() };
  return null;
}

// Ouverte au premier échange d'une conversation, repliée aux suivants (déjà lue) ; on la rouvre d'un clic.
export function SkillPresentation({
  run,
  catalog,
}: {
  run: Run;
  catalog: Catalog | null;
}) {
  const shown = skillPresentation(run, catalog);
  const [open, setOpen] = useState(!run.resumedFrom);
  if (!shown) return null;
  return (
    <details
      className="fold skill-presentation"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>Comment fonctionne {shown.name}</summary>
      <div className="skill-presentation-body">
        <Markdown text={shown.text} />
      </div>
    </details>
  );
}
