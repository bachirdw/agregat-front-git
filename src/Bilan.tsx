import { Markdown } from "./Markdown";
import { withoutResultEnvelope } from "./envelope";

// The back appends its own lines (verification, Bilan, send, questions…) after the agent's answer
// in `result.summary` (orchestrator/index.js, career-ops/truth.js). They are split from the answer
// here, read-only: the words stay the back's; only their place on the page changes.
const platformLine = [
  /^Affirmations de l[’']agent : /,
  /^Capture : texte attendu non apparu/,
  /^Envoi par la plateforme : /,
  /^Requêtes réseau d['’]envoi : /,
  /^Questions : \d+ posée\(s\), \d+ répondue\(s\)\.$/,
  /^Actions natives de l[’']agent /,
  /^Action\(s\) échouée\(s\) : /,
  /^Avertissement — /,
  /^Accord expiré sans réponse /,
  /^Session : /,
  /^Navigateur : /,
  /^Notes non vérifiées : /,
  /^Mission incomplète : /,
];
const isPlatform = (line: string) => platformLine.some((re) => re.test(line));

// Lines that must stay in sight: a send not made or unsure, a failed or incomplete mission, an
// action left undone, a question left unanswered.
export function isWarning(line: string) {
  if (/^Envoi par la plateforme : /.test(line))
    return /aucun approuvé|, dont /.test(line);
  const questions = line.match(/^Questions : (\d+) posée\(s\), (\d+) répondue/);
  if (questions) return Number(questions[2]) < Number(questions[1]);
  return [
    /^Avertissement — /,
    /action non effectuée/,
    /^Session : /,
    /^Navigateur : /,
    /^Notes non vérifiées : /,
    /^Mission incomplète : /,
    /^L[’']agent n[’']a rien exécuté/,
  ].some((re) => re.test(line));
}

export type SplitSummary = {
  answer: string;
  // Said before the answer by the back (« Avertissement — navigation non prouvée… »).
  lead: string[];
  warnings: string[];
  details: string[];
  counts: { ok: number; failed: number; mixed: number; notDone: number };
};

// Items of a Bilan list, split on the separator outside parentheses.
function items(list: string, separator: string) {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === "(") depth++;
    if (c === ")") depth = Math.max(0, depth - 1);
    if (!depth && list.startsWith(separator, i)) {
      out.push(current);
      current = "";
      i += separator.length - 1;
      continue;
    }
    current += c;
  }
  out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
}
const listOf = (line: string, label: RegExp, separator: string) => {
  const value = line.match(label)?.[1]?.replace(/\.$/, "").trim();
  if (
    !value ||
    /^(?:aucune? observée?|aucun|voir Résultats mixtes|aucune action demandée identifiable comme manquante)$/.test(
      value,
    )
  )
    return 0;
  return items(value, separator).length;
};

// With the back's own fields (`result.answer`, `result.platformNotes`), the answer and the
// platform's lines are taken as given; only the visible/folded choice is made here, by sentence.
export function splitResult(
  summary: string,
  answer?: string,
  notes?: string[],
): SplitSummary {
  if (!Array.isArray(notes) || typeof answer !== "string")
    return splitSummary(summary);
  const lines = notes.map((l) => String(l).trim()).filter(Boolean);
  const lead = lines.filter((l) => /^Avertissement — /.test(l));
  const rest = lines.filter((l) => !lead.includes(l));
  const warnings = rest.filter((l) => !l.startsWith("- ") && isWarning(l));
  const details = rest.filter((l) => !warnings.includes(l));
  return {
    // A private or missing answer: what the summary says in its place (« Réponse disponible… »).
    answer: answer.trim() || splitSummary(summary).answer,
    lead,
    warnings,
    details,
    counts: countLines(details),
  };
}
function countLines(details: string[]) {
  const counts = { ok: 0, failed: 0, mixed: 0, notDone: 0 };
  for (const line of details) {
    counts.ok += listOf(line, /^- Actions réussies : (.*)$/, ", ");
    counts.failed += listOf(line, /^- Actions échouées : (.*)$/, " ; ");
    counts.failed += listOf(line, /^Action\(s\) échouée\(s\) : (.*)$/, " ; ");
    counts.mixed += listOf(line, /^- Résultats mixtes : (.*)$/, " ; ");
    counts.notDone += listOf(line, /^- Non exécuté : (.*)$/, " ; ");
  }
  return counts;
}
export function splitSummary(summary: string): SplitSummary {
  const lines = summary.replace(/\s+$/, "").split("\n");
  // From the end: platform lines, and « - » lines only under a « Bilan » header.
  let start = lines.length;
  let pending = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (/^- /.test(line)) {
      pending++;
      continue;
    }
    if (line === "Bilan") {
      start = i;
      pending = 0;
      continue;
    }
    if (isPlatform(line)) {
      if (pending) break;
      start = i;
      continue;
    }
    break;
  }
  const lead: string[] = [];
  let first = 0;
  while (first < start && /^Avertissement — /.test(lines[first].trim()))
    lead.push(lines[first++].trim());
  const trailer = lines.slice(start).map((l) => l.trim());
  const warnings = trailer.filter((l) => !l.startsWith("- ") && isWarning(l));
  const details = trailer.filter((l) => !warnings.includes(l));
  const counts = countLines(details);
  return {
    answer: lines.slice(first, start).join("\n").trim(),
    lead,
    warnings,
    details,
    counts,
  };
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;
export function detailsTitle({
  ok,
  failed,
  mixed,
  notDone,
}: SplitSummary["counts"]) {
  return [
    "Détails des actions",
    ...(ok ? [plural(ok, "réussie", "réussies")] : []),
    ...(failed ? [plural(failed, "échouée", "échouées")] : []),
    ...(mixed ? [plural(mixed, "mixte", "mixtes")] : []),
    ...(notDone ? [plural(notDone, "non exécutée", "non exécutées")] : []),
  ].join(" · ");
}

// The agent's answer first; the platform's warnings in sight; the Bilan folded.
export function AgentAnswer({
  text,
  answer: given,
  notes,
}: {
  text: string;
  answer?: string;
  notes?: string[];
}) {
  const split = splitResult(text, given, notes);
  const { lead, warnings, details, counts } = split;
  // An answer left as the agent's JSON result (the back could not read it) shows its summary.
  const answer = withoutResultEnvelope(split.answer, true);
  return (
    <div className="agent-answer">
      {lead.map((line) => (
        <p className="answer-warning" role="alert" key={line}>
          {line}
        </p>
      ))}
      {answer && <Markdown text={answer} />}
      {warnings.map((line) => (
        <p className="answer-warning" role="alert" key={line}>
          {line}
        </p>
      ))}
      {details.length > 0 && (
        <details className="fold action-details">
          <summary>{detailsTitle(counts)}</summary>
          <ul>
            {details
              .filter((line) => line !== "Bilan")
              .map((line, i) => (
                <li key={i}>{line.replace(/^- /, "")}</li>
              ))}
          </ul>
        </details>
      )}
    </div>
  );
}
