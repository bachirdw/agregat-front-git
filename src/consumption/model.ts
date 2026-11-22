import type { FamilyMember, Run } from "../types";
import type { Grouping } from "./missing";

export const seriesColors = ["#0a84ff", "#ff9f0a", "#30d158", "#bf5af2"];
export const functionSeries = [
  "Agent principal",
  "Sous-agents",
  "Vérification",
  "Titres et résumés",
];

export function seriesColor(grouping: Grouping, label: string, index: number) {
  const position =
    grouping === "function"
      ? functionSeries.indexOf(label)
      : grouping === "agent"
        ? ["claude", "codex", "gemini"].indexOf(label.toLowerCase())
        : ["Opus", "Sonnet", "Haiku", "Inconnu"].indexOf(label);
  if (grouping === "model" && (position === 3 || (index === 3 && position < 0)))
    return "#7c7c82";
  return seriesColors[(position < 0 ? index : position) % seriesColors.length];
}

export function compactNumber(value: number) {
  return value >= 1e6
    ? `${(value / 1e6).toFixed(2).replace(".", ",")} M`
    : value >= 1e3
      ? `${Math.round(value / 1e3)} k`
      : String(value);
}

export function percentage(value: number, total: number) {
  const percent = total ? (value / total) * 100 : 0;
  return percent > 0 && percent < 0.1
    ? "< 0,1 %"
    : `${percent.toFixed(1).replace(".", ",")} %`;
}

export function shortDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function runDuration(run: Run) {
  if (!run.finishedAt || !run.createdAt) return undefined;
  const duration = Date.parse(run.finishedAt) - Date.parse(run.createdAt);
  if (!Number.isFinite(duration) || duration < 0) return undefined;
  const seconds = Math.round(duration / 1000);
  return seconds < 60
    ? `${seconds} s`
    : `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ""}`;
}

export function missionTitle(run: Run) {
  return run.famille?.titre || run.title || run.prompt;
}

// Keep orphans visible; group descendants only when their owning mission is present.
export function ownerId(run: Run, runs: Run[]): string | undefined {
  const byId = new Map(runs.map((entry) => [entry.id, entry]));
  if (run.famille?.racine && byId.has(run.famille.racine))
    return run.famille.racine;
  let parent = run.famille?.mere;
  let owner: string | undefined;
  const seen = new Set([run.id]);
  while (parent && byId.has(parent) && !seen.has(parent)) {
    seen.add(parent);
    owner = parent;
    parent = byId.get(parent)?.famille?.mere;
  }
  return owner;
}

export interface DetailRow {
  id: string;
  phase?: number;
  name: string;
  agent?: string;
  tools?: number;
  source: Run | FamilyMember;
}

export function detailRows(run: Run, runs: Run[]): DetailRow[] {
  const members = new Map<string, FamilyMember>(
    (run.family || []).map((member) => [member.id, member]),
  );
  for (const child of runs.filter((entry) => ownerId(entry, runs) === run.id)) {
    const member = members.get(child.id);
    members.set(child.id, {
      ...member,
      id: child.id,
      titre: member?.titre || missionTitle(child),
      agent: member?.agent || child.agent,
      state: member?.state || child.state,
    });
  }
  if (members.size) {
    return [...members.values()].map((member) => ({
      id: member.id,
      phase: member.etape?.numero,
      name: member.titre || member.id,
      agent: member.agent,
      tools: member.outils,
      source: member,
    }));
  }
  const definitions = run.plan?.workflow?.steps || [];
  if (definitions.length || run.steps?.length) {
    const ids = [
      ...new Set([
        ...definitions.map((step) => step.id),
        ...(run.steps || []).map((step) => step.step_id),
      ]),
    ];
    return ids.map((id) => {
      const definition = definitions.find((step) => step.id === id);
      return {
        id,
        name: definition?.title || id,
        agent: definition?.agent || run.agent,
        source: { id },
      };
    });
  }
  return [
    { id: run.id, name: "Agent principal", agent: run.agent, source: run },
  ];
}

export function missionNotes(run: Run, runs: Run[] = []) {
  const notes: string[] = [];
  const add = (message: string | undefined, prefix = "") => {
    if (message) notes.push(prefix + message);
  };
  const addSteps = (source: Run, prefix = "") => {
    for (const step of source.steps || []) {
      if (step.attempt > 1) {
        const title =
          source.plan?.workflow?.steps.find(
            (entry) => entry.id === step.step_id,
          )?.title || step.step_id;
        add(
          `Sous-tâche relancée : ${title} (${step.attempt} tentatives).`,
          prefix,
        );
      }
      add(step.error, prefix);
    }
  };
  add(run.error);
  addSteps(run);
  const children = runs.filter((child) => ownerId(child, runs) === run.id);
  const family = new Map(
    (run.family || []).map((member) => [member.id, member]),
  );
  const ids = new Set([...family.keys(), ...children.map((child) => child.id)]);
  for (const id of ids) {
    const member = family.get(id);
    const child = children.find((entry) => entry.id === id);
    const name = member?.titre || (child && missionTitle(child)) || id;
    const prefix = `${name} : `;
    add(member?.cause?.message, prefix);
    if (member?.cause?.type === "limite_usage")
      add("Quota atteint chez le fournisseur.", prefix);
    const resume = member?.cause?.reprise;
    if (resume && Number.isFinite(Date.parse(resume))) {
      add(
        `Reprise possible : ${new Date(resume).toLocaleString("fr-FR")}`,
        prefix,
      );
    }
    if (child) {
      add(child.error, prefix);
      addSteps(child, prefix);
    }
  }
  return [...new Set(notes)];
}
