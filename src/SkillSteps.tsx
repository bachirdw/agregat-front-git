import type { Run } from "./types";

const states = {
  pending: "Non exécutée",
  done: "Faite",
  skipped: "Ignorée",
  failed: "Échouée",
};

export function SkillSteps({ progress }: { progress: Run["skillProgress"] }) {
  if (!progress?.steps.length) return null;
  return (
    <details className="skill-steps card card-pad">
      <summary>Étapes du Skill</summary>
      <ol>
        {progress.steps.map((step) => (
          <li key={`${step.pack}:${step.intent}:${step.id}`}>
            <strong>{step.title}</strong> · {states[step.state]}
            {step.cause && <small className="danger"> · {step.cause}</small>}
            {step.toolCallId && <small> · appel {step.toolCallId}</small>}
          </li>
        ))}
      </ol>
      <small>
        {progress.orderDeviation
          ? "Écart d’ordre constaté"
          : "Aucun écart d’ordre constaté"}
      </small>
    </details>
  );
}
