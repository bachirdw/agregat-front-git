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
  // Real state of the agent (back docs/api-agents-etat.md, swarm-02), absent from an older back:
  // pret, simule, non_installe, adaptateur_absent, mode_reel_eteint, limite, connexion_refusee, a_reessayer.
  etat?: string;
  raison?: string;
  // ISO end of a usage limit (`etat: "limite"`).
  jusqua?: string;
  modelesLimites?: Record<string, string>;
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
  findings: SkillFinding[];
  source?: {
    url: string;
    sha: string;
    ref?: string | null;
    subdir?: string;
    adresse?: string;
  };
  description?: string;
  // skills-nuit-22-11 (back docs/api-skills-import.md) : fiche de compatibilité, problèmes constatés,
  // notification et mise à jour proposée. Absents tant que le back n'a rien à dire.
  compatibilite?: SkillCompatibility | null;
  problemes?: SkillProblem[];
  notification?: {
    niveau: string;
    type: "mise-a-jour" | "probleme" | string;
    texte: string;
  } | null;
  miseAJour?: SkillUpdate | null;
}
export interface SkillFinding {
  level: string;
  message: string;
  rule?: string;
  file?: string;
}
export interface SkillSource {
  fichier: string;
  ligne: number;
  extrait?: string;
  depot?: boolean;
}
export interface SkillNeed {
  type: string;
  nom: string;
  verdict: string;
  fournisseur?: string | null;
  note?: string | null;
  occurrences?: number;
  sources?: SkillSource[];
  usage?: string;
}
export interface SkillDependency {
  id: string;
  chemin?: string;
  adresse?: string;
  memeImport?: boolean;
  registre?: {
    etat: string;
    memeSource?: boolean;
    integre?: boolean;
    source?: string;
  } | null;
  sources?: SkillSource[];
  occurrences?: number;
}
export interface SkillCompatibility {
  empreinte?: string;
  licence?: { texte?: string; type?: string; fichier?: string } | null;
  plugin?: {
    nom?: string;
    description?: string;
    roles?: { nom: string; description?: string; fichier?: string }[];
  } | null;
  besoins?: SkillNeed[];
  dependances?: SkillDependency[];
  tronque?: boolean;
}
export interface SkillProblem {
  cause: string;
  n: number;
  derniere: string;
  type: string;
  aussi?: string[];
}
export interface SkillChange {
  sha: string;
  date?: string;
  titre: string;
  pertinent?: boolean;
  correspond?: string | null;
  probleme?: string | null;
  version?: string | null;
}
export interface SkillUpdate {
  source: "git" | "local" | "integre" | string;
  depot?: string | null;
  reference?: string | null;
  disponible: boolean | null;
  versionLocale?: string | null;
  versionDistante?: string | null;
  changements?: SkillChange[];
  tronque?: boolean;
  raison?: string;
  marche?: string;
  verifieLe?: string;
  conseillee?: boolean;
  candidat?: {
    hash: string;
    version?: string;
    etat: string;
    sha?: string;
    importeLe?: string;
    findings?: SkillFinding[];
  } | null;
  precedentes?: { hash: string; version?: string; sha?: string }[];
}
// Réponses du back aux routes des Skills : la liste seule, ou un objet qui la porte (import par
// choix ou plugin, vérification, mise à jour).
export interface SkillImportReport {
  demande: string;
  id?: string | null;
  chemin?: string;
  adresse?: string;
  statut: string;
  raison?: string;
}
export interface SkillCandidate {
  id: string | null;
  chemin: string;
  description?: string;
  adresse?: string;
  ref?: string;
  erreur?: string;
}
export interface SkillPlugin {
  nom?: string;
  description?: string;
  skills?: string[];
  agents?: { nom: string; description?: string }[];
  mcp?: { nom: string; transport?: string; statut?: string }[];
}
export interface SkillImportAnswer {
  skills?: Skill[];
  message?: string;
  error?: string;
  importes?: number;
  refuses?: number;
  rapport?: SkillImportReport[];
  restants?: string[];
  candidats?: SkillCandidate[];
  tronque?: boolean;
  plugin?: SkillPlugin;
  marche?: string;
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
  // Consumption announced by the member's agent (plan swarm 3.2, swarm-14), not sent before swarm-14;
  // shown only as « N jetons » when `jetons.total` is a number.
  usage?: MemberUsage | null;
  // Read by the interface on the sub-mission's own row of `GET /api/runs` (`famille.motif`,
  // `famille.agentPrevu`), never sent in `family[]`: plain text only.
  motif?: string;
  agentPrevu?: string;
  // Back equipe-essai-01 (E192) : the chief chose this member's agent instead of the owner's.
  agentImpose?: boolean;
  // A run state, or a state held by the platform: en_file, attend_accord, attend_prerequis.
  state?: string;
  attend?: string | null;
  pendingQuestion?: unknown;
  pendingPermission?: unknown;
  role?: string;
  relit?: string[];
  verdict?: TeamVerdict;
  // equipe-05 (maquette « Panneau equipe v6 », contrat du back equipe-v6-01, en cours) : étape du membre,
  // `numero` = 1 + plus longue chaîne de prérequis dans la famille, `libelle` seulement si le chef l'a
  // donné. Absente (cycle, relation hors famille, back plus ancien) : une seule liste. La raison de la
  // tâche est `motif` (déjà là, copié aussi dans family[] par ce lot).
  etape?: { numero?: number; libelle?: string };
}
export interface MemberUsage {
  tours?: number;
  jetons?: { entree?: number; sortie?: number; total?: number } | null;
  cout?: { montant?: number; devise?: string } | null;
}
// Summary of a mother's team on a row of `GET /api/runs` (back docs/api-equipe-vue.md, swarm-07).
export interface TeamSummary {
  // equipe-05 : même phrase que `decoupage` de la mère (contrat equipe-v6-01).
  decoupage?: string;
  membres?: number;
  enCours?: number;
  finis?: number;
  echecs?: number;
  teDemande?: number;
}
// Link of a sub-mission to its mother, on its own row of `GET /api/runs` (back `famille`).
export interface RunLink {
  racine?: string;
  mere?: string;
  titre?: string;
  pourquoi?: string;
  motif?: string;
  agentPrevu?: string;
  agentImpose?: boolean;
}
export interface CarnetNote {
  n?: number;
  auteur?: string;
  role?: string;
  categorie?: string;
  texte?: string;
  a?: string;
  // equipe-05 (contrat du back equipe-v6-01, en cours) : note structurée, champs facultatifs donnés par
  // l'agent (`titre` 1-120, `situation` 1-600, `regle` 1-600) ; sans eux, le texte est découpé par
  // `noteParts` (Team.tsx). `lecon` : la note est devenue une leçon durable (même id que `lecon_gardee`).
  titre?: string;
  situation?: string;
  regle?: string;
  lecon?: { id?: string } | null;
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
  // Ids of the files joined to the mission (back: uuids only, no name).
  attachments?: unknown[];
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
  // Dossier de la mission (absolu) : les fichiers produits y sont affichés en chemin relatif.
  cwd?: string;
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
  // activity-panel-03 : fields the back does not send yet. Each panel section stays hidden while
  // its field is absent; nothing is ever filled with an example.
  funnel?: RunFunnel;
  documents?: RunDocument[];
  // Back docs/api-delegation.md (contacts-13-11): a mother carries `estMere` from its first launch,
  // and the owner's agreement once given.
  estMere?: boolean;
  delegation?: {
    accepted: boolean;
    via?: "bouton" | "prompt" | "carte" | "api";
    total?: number;
    parallel?: number;
    acceptedAt?: string;
  };
  // Multi-agent mother: its sub-missions and the team notebook, absent otherwise.
  multiAgent?: boolean;
  family?: FamilyMember[];
  activity?: { agents?: number; awaitingOwner?: number };
  // Rows of `GET /api/runs` only: the team summary of a mother, the link of a sub-mission.
  equipe?: TeamSummary;
  famille?: RunLink;
  // Private space: `total` only.
  carnet?: { total?: number; notes?: CarnetNote[] };
  // equipe-05 (contrat du back equipe-v6-01, en cours) : une phrase du chef qui explique le découpage en
  // sous-agents (1-300). Absente : rien n'est affiché.
  decoupage?: string;
}
// Application counters of the mission; each one is shown only when the back reports it.
export interface RunFunnel {
  found?: number;
  kept?: number;
  letters?: number;
  sent?: number;
}
export interface RunDocument {
  id: string;
  name: string;
  url?: string;
}
// Outside the run: no endpoint yet (agenda, scheduled tasks).
export interface AgendaItem {
  id: string;
  at: string;
  title: string;
  detail?: string;
}
export interface Schedule {
  id: string;
  name: string;
  recurring: boolean;
  next?: string;
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
// « 21/11/2026 à 11:09 » from an ISO date; an unreadable one is kept as given.
function dateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString("fr-FR")} à ${date.toLocaleTimeString(
    "fr-FR",
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}
// The back's detection state (agent-runtime `readiness`), said simply; an unknown value loses its dashes.
const readinessLabels: Record<string, string> = {
  "test-reproductible": "agent de démonstration",
  "non-détecté": "non détecté",
  "handshake-requis": "connexion vérifiée au premier lancement",
  "adaptateur-manquant": "adaptateur manquant",
  "version-illisible": "version illisible",
};
export const readinessLabel = (value: string) =>
  readinessLabels[value] ?? value.replace(/-/g, " ");
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
                  ? `Prompt validé le ${dateTime(a.probe.inferenceAt)}`
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
