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
    at?: string;
    sessionAt?: string | null;
    inferenceAt?: string | null;
    session: boolean;
    inference?: boolean | null;
    inferenceError?: string | null;
    models: { id: string; name: string }[];
    currentModel?: string;
    mode?: string;
    modes?: string[];
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
  agentMode?: string;
  browser?: "auto" | "fixture" | "isolated" | "playwriter";
  browserDomains?: string;
  budgetCents: number;
  mode: "agent" | "workflow";
  workflow: string;
  attachments?: Attachment[];
  // « Équipe d’agents » switch, interface only: toApiInput turns it into `multiAgent` + `delegation`.
  team?: boolean;
  // « Autoriser les sous-agents » (way 1 of the contract), separate from the mode: unticked, no
  // `delegation` key is sent and the platform asks by its card at the first launch (way 3).
  teamConsent?: boolean;
}
// Team of a mother mission (`GET /api/runs/:id`, back docs/api-delegation.md 3.1, 5, 7 bis). Every
// field may be missing; texts are data, rendered as text only.
export interface TeamVerdict {
  valeur?: string;
  bloquants?: { ou?: string; pourquoi?: string }[];
  remarques?: string[];
  source?: string;
  // Back api-verdicts.md (swarm-04): present only when false (no precise blocking point).
  complet?: false;
}
// Failure of a finished member without success (back api-equipe-vue.md, swarm-07). `message` is absent
// when empty or private; `reprise` is the « réessayer à … » hour, or null.
export interface MemberCause {
  type?: "limite_usage" | "erreur" | string;
  message?: string;
  reprise?: string | null;
}
export interface FamilyMember {
  id: string;
  titre?: string;
  agent?: string;
  // Sent only by `GET /api/runs/:id?equipe=1` (back api-equipe-vue.md, swarm-07); absent otherwise.
  modele?: string;
  continue?: string;
  pourquoi?: string;
  debut?: string | null;
  fin?: string | null;
  dureeMs?: number;
  // Seconds, not milliseconds.
  depuis?: number;
  inactiveDepuis?: number;
  outils?: number;
  dernierOutil?: string | null;
  // Text reported by an agent: rendered as plain text only.
  resultat?: string;
  cause?: MemberCause;
  // Typed only: not sent before swarm-14, not displayed.
  usage?: unknown;
  // A run state, or a state held by the platform: en_file, attend_accord, attend_prerequis.
  state?: string;
  attend?: string | null;
  pendingQuestion?: unknown;
  pendingPermission?: unknown;
  role?: string;
  relit?: string[];
  verdict?: TeamVerdict;
}
export interface CarnetNote {
  n?: number;
  auteur?: string;
  role?: string;
  categorie?: string;
  texte?: string;
  a?: string;
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
  dataMode?: "fixture" | "live" | "user" | "unverified";
  browser?: string;
  agentMode?: string;
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
  // null: no ceiling (a final send in owner mode waits for the owner).
  expiresAt?: number | null;
  actionClass?: string | null;
  capability?: string;
  askedAt?: string;
  tool: { title?: string; [key: string]: unknown };
  options: { optionId: string; name: string; kind: string }[];
}
// One field of an ACP elicitation schema (flat, see docs/api-questions.md).
export interface QuestionField {
  type: "string" | "number" | "integer" | "boolean" | "array";
  title?: string;
  description?: string;
  enum?: string[];
  oneOf?: { const: string; title?: string }[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  examples?: string[];
  items?: { enum?: string[]; anyOf?: { const: string; title?: string }[] };
  minItems?: number;
  maxItems?: number;
}
export interface Question {
  id: string;
  kind: "form" | "prose";
  message: string;
  options?: string[];
  requestedSchema: {
    type: "object";
    properties: Record<string, QuestionField>;
    required?: string[];
  };
  toolCallId: string | null;
  askedAt: string;
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
  title?: string;
  finishedAt?: string;
  sessionId?: string | null;
  resumedFrom?: string | null;
  skills?: string[];
  skillsSnapshot?: { id: string }[];
  state: string;
  mode: string;
  agent: string;
  pack: string;
  model: string;
  browser?: string;
  agentMode?: string;
  simulated: boolean;
  dataMode?: "fixture" | "live" | "user" | "unverified";
  browserDomains?: string[];
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
  pendingQuestion?: Question | null;
  result?: {
    simulated: boolean;
    summary: string;
    // Since the back of 11/11 (19:51): the agent's answer alone ("" when private or not found) and
    // the lines the platform wrote after it, in order. Absent from older runs.
    answer?: string;
    platformNotes?: string[];
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
  // Browser reads kept for the mission (back: missionReads, at most 400): navigations and
  // readable captures, origin + path only. No per-read marker says a read came from a previous run.
  missionProof?: { reads?: MissionRead[]; sourceRead?: boolean } | null;
  // Multi-agent mother: its sub-missions and the team notebook, absent otherwise.
  multiAgent?: boolean;
  family?: FamilyMember[];
  activity?: { agents?: number; awaitingOwner?: number };
  // Private space: `total` only.
  carnet?: { total?: number; notes?: CarnetNote[] };
}
export interface MissionRead {
  capability: string;
  url?: string;
  requestedUrl?: string;
  sourceId?: string;
  provider?: string;
  loading?: boolean;
  readable?: boolean;
  observedAt?: string;
}
export interface RunEvent {
  seq: number;
  type: string;
  data: Record<string, unknown>;
  at?: string;
}
// Owner message typed while the mission runs (`POST /api/runs/:id/message`), re-sent on every state
// change as the `owner_message` event. `text` is absent for a private mission.
export interface OwnerMessage {
  id: string;
  at: string;
  state: "pending" | "delivered" | "undelivered";
  via: "steering" | "turn_end" | "with_answer" | null;
  deliveredAt: string | null;
  text?: string;
}
export const finalStates = new Set([
  "completed",
  "failed",
  "cancelled",
  "interrupted",
]);
// States in which the mission waits for the owner (agent question or final send approval).
export const ownerStates = new Set(["awaiting_owner", "waiting_permission"]);
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
  awaiting_owner: "Attend votre réponse",
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
        : a.probe && !a.probe.session
          ? `Session refusée${a.probe.error ? ` · ${a.probe.error}` : ""}`
          : a.probe?.inference === false
            ? `Prompt refusé${a.probe.inferenceError ? ` · ${a.probe.inferenceError}` : ""}`
            : a.probe?.session
              ? a.probe.inference === true
                ? a.probe.inferenceAt
                  ? `Prompt validé le ${a.probe.inferenceAt}`
                  : "Prompt validé historiquement · date inconnue"
                : "Session validée · prompt non testé"
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
