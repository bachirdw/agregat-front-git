// The agent's final message is often the JSON result the platform parses (`{ summary, … }`).
// Raw line breaks and tabs inside strings, as some agents write them, are escaped before parsing.
function looseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    let out = "";
    let inString = false;
    for (let i = 0; i < body.length; i++) {
      const c = body[i];
      if (inString && c === "\\") {
        out += c + (body[++i] ?? "");
        continue;
      }
      if (c === '"') inString = !inString;
      out +=
        inString && c === "\n"
          ? "\\n"
          : inString && c === "\r"
            ? "\\r"
            : inString && c === "\t"
              ? "\\t"
              : c;
    }
    try {
      return JSON.parse(out);
    } catch {
      return undefined;
    }
  }
}
// The summary of the agent's JSON result, or null when the text is not one.
// A question the agent put in its result is kept with it, in its own words: the back asks only an
// object `{ message }` (a plain string, seen with Codex on 11/11, is never asked).
export function envelopeSummary(text: string): string | null {
  const body = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  if (!body.startsWith("{")) return null;
  const value = looseJson(body) as
    | { summary?: unknown; question?: unknown }
    | undefined;
  if (typeof value?.summary !== "string") return null;
  const q = value.question as { message?: unknown } | string | null | undefined;
  const question =
    typeof q === "string" ? q : typeof q?.message === "string" ? q.message : "";
  return question.trim()
    ? `${value.summary.trim()}\n\n**Question de l’agent :** ${question.trim()}`
    : value.summary;
}
export function isResultEnvelope(text: string) {
  return envelopeSummary(text) !== null;
}
// Text said before a final JSON result in the same message (« Voici le bilan. {…} »): the JSON
// is the platform's to read; its summary is shown as the answer.
// `keepSummary`: while the answer is not shown apart (mission running, waiting for the owner's
// answer to a question), the envelope's summary is the agent's answer and stays in the thread.
export function withoutResultEnvelope(text: string, keepSummary = false) {
  const keep = (before: string, summary: string) =>
    [before.trimEnd(), keepSummary ? summary.trim() : ""]
      .filter(Boolean)
      .join("\n\n");
  const whole = envelopeSummary(text);
  if (whole !== null) return keep("", whole);
  for (const marker of ["```json", "```", "\n{"]) {
    let at = text.indexOf(marker);
    while (at > 0) {
      const summary = envelopeSummary(text.slice(at));
      if (summary !== null) return keep(text.slice(0, at), summary);
      at = text.indexOf(marker, at + 1);
    }
  }
  return text;
}
