export interface Agent {
  id: string;
  name: string;
  installed: boolean;
  compatible: boolean;
  simulated?: boolean;
  version?: string;
  readiness?: string;
  reason?: string;
  probe?: {
    session: boolean;
    inference?: boolean;
    models: { id: string; name: string }[];
    currentModel?: string;
    mode?: string;
    error?: string;
  };
}
export interface Skill {
  id: string;
  name: string;
  version: string;
  origin: string;
  state: string;
  active: boolean;
  installed: boolean;
  integrity: boolean;
  hash: string;
  license?: string;
  files?: number;
  findings: { level: string; message: string }[];
  source?: { url: string; sha: string };
}
export interface StepDefinition {
  id: string;
  title: string;
  kind: string;
  agent?: string;
  optional?: boolean;
  dependsOn?: string[];
  effect?: string;
}
export interface Pack {
  id: string;
  name: string;
  description: string;
  skills: { id: string }[];
  dags: {
    id: string;
    title: string;
    keywords?: string[];
    steps: StepDefinition[];
  }[];
}
export interface Catalog {
  live: boolean;
  agents: Agent[];
  packs: Pack[];
  skills: Skill[];
  meters: Record<string, { category: string; unit: string; billable: boolean }>;
  pricing: {
    currency: string;
    centsPerUnit: Record<string, number>;
    monthlyCapCents: number | null;
  };
}
export interface MissionInput {
  prompt: string;
  agent: string;
  pack: string;
  skills: string[];
  model: string;
  budgetCents: number;
  mode: "agent" | "workflow";
  workflow: string;
  attachments?: Attachment[];
}
// A file uploaded to POST /api/files; only its id is sent with a plan or run.
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}
export interface Cost {
  platformCents: number;
  currency: string;
  budgetCents: number;
  withinBudget: boolean;
  description: string;
  lines: { dimension: string; units: number; cents: number }[];
}
export interface Plan {
  agent: string;
  pack: string;
  steps: string[];
  cost: Cost;
  permissions: string[];
  simulated: boolean;
  routing: { reasons: string[]; rejected: { id: string; reason: string }[] };
  workflow: { id: string; title: string; reason: string } | null;
}
export interface Step {
  step_id: string;
  state: string;
  attempt: number;
  error?: string;
  output?: unknown;
}
export interface Permission {
  id: string;
  expiresAt?: number;
  tool: { title?: string; [key: string]: unknown };
  options: { optionId: string; name: string; kind: string }[];
}
export interface Opportunity {
  id: string;
  score: number;
  title: string;
  company: string;
  location: string;
  reasons: string[];
  sponsorship?: string;
  attribution?: string;
  fetchedAt?: string;
  source?: string;
  url?: string;
}
export interface Run {
  id: string;
  prompt: string;
  sessionId?: string | null;
  state: string;
  mode: string;
  agent: string;
  pack: string;
  model: string;
  simulated: boolean;
  createdAt: string;
  error?: string;
  resumable?: boolean;
  plan: {
    steps: string[];
    cost: Cost;
    workflow?: { title: string; steps: StepDefinition[] };
  };
  steps?: Step[];
  skillProgress?: {
    orderDeviation: boolean;
    steps: {
      pack: string;
      intent: string;
      id: string;
      title: string;
      state: "pending" | "done" | "skipped" | "failed";
      toolCallId?: string | null;
      cause?: string | null;
    }[];
  } | null;
  permissions?: Permission[];
  result?: {
    simulated: boolean;
    summary: string;
    provenance?: { data: string; analysis: string };
    evidence: unknown[];
    opportunities?: Opportunity[];
  };
  usage?: {
    platformCents: number;
    currency: string;
    byDimension: {
      dimension: string;
      category: string;
      units: number;
      platformCents: number;
      billable: boolean;
    }[];
  };
  ledger?: { ok: boolean; brokenAt?: number };
}
export interface RunEvent {
  seq: number;
  type: string;
  data: Record<string, unknown>;
  at?: string;
}
export const finalStates = new Set([
  "completed",
  "failed",
  "cancelled",
  "interrupted",
]);
export const labels: Record<string, string> = {
  queued: "En attente",
  running: "En cours",
  completed: "Terminée",
  failed: "Échec",
  cancelled: "Annulée",
  interrupted: "Interrompue",
  pending: "En attente",
  waiting_approval: "Accord requis",
  waiting_permission: "Autorisation requise",
  succeeded: "Réussie",
  skipped: "Ignorée",
  uncertain: "Incertaine · décision requise",
};
export const money = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100,
  );
export function agentStatus(a: Agent) {
  return a.simulated
    ? "Simulé · fictif"
    : !a.installed
      ? "Non installé"
      : !a.compatible
        ? "Incompatible"
        : a.probe?.session
          ? "Session validée"
          : a.probe
            ? "Authentification requise"
            : "Détecté · non testé";
}
// career-ops (agregat-back docs/api-career-ops.md). Texts are untrusted data: render as text only.
export interface CareerOffer {
  id: string;
  contractVersion?: 2;
  title: string;
  company: string;
  url: string;
  source: string;
  fetchedAt: string;
  score: number | null;
  report: Record<string, string> | null;
  simulated: boolean;
}
export interface CareerResult {
  summary?: string;
  simulated?: boolean;
  evidence?: {
    title?: string;
    company?: string;
    url?: string;
    source?: string;
  }[];
}
