// Adapté de desplega-ai/agent-swarm (MIT, © desplega.sh) : apps/ui/src/components/shared/task-status-icon.tsx
// Adapté de desplega-ai/agent-swarm (MIT, © desplega.sh) : apps/ui/src/lib/status-labels.ts
// Adapté de desplega-ai/agent-swarm (MIT, © desplega.sh) : apps/ui/src/components/shared/transcript/transcript.tsx
// Adapté de desplega-ai/agent-swarm (MIT, © desplega.sh) : apps/ui/src/pages/tasks/[id]/lineage/lineage-tree.ts
// Adapté de desplega-ai/agent-swarm (MIT, © desplega.sh) : apps/ui/src/lib/utils.ts
// Adapté de desplega-ai/agent-swarm (MIT, © desplega.sh) : apps/ui/src/components/sessions-v2/sidebar/session-row.tsx
//
// One state table for the « Équipe » block: state → variant → class, one French label per state, the
// « confié à agent · état · durée » line and « 8 members then +N autres ». Pure functions, no React.
// Every value read here comes from the API and may be missing or mistyped: nothing throws.
import { labels } from "./types";

export type Variante =
  | "attente"
  | "encours"
  | "te_demande"
  | "fini"
  | "echec"
  | "annule"
  | "inconnu";

/**
 * Every member state the « Équipe » block renders: run states (types.ts `labels`) and the states held by
 * the platform before a sub-mission starts (Team.tsx `heldLabels`, delegation.js line()). A state missing
 * here is `inconnu`, never guessed (swarm: `taskStatusVariant` returns null for it).
 */
const ETAT_VARIANTE: Record<string, Variante> = {
  // Held by the platform before starting
  en_file: "attente",
  attend_prerequis: "attente",
  attend_accord: "te_demande",
  // Run states
  queued: "attente",
  pending: "attente",
  running: "encours",
  waiting_approval: "te_demande",
  waiting_permission: "te_demande",
  awaiting_owner: "te_demande",
  // « Incertaine · décision requise »: the owner decides.
  uncertain: "te_demande",
  completed: "fini",
  succeeded: "fini",
  failed: "echec",
  cancelled: "annule",
  interrupted: "annule",
  skipped: "annule",
};

/** States after which nothing more happens (types.ts `finalStates` plus the two step-only ones). */
const FINAUX = new Set([
  "completed",
  "failed",
  "cancelled",
  "interrupted",
  "succeeded",
  "skipped",
]);

/** `attend` values that wait for the owner, and those held by the platform (Team.tsx ownerWaits / heldWaits). */
const ATTEND_PROPRIETAIRE = new Set(["accord", "question", "carte_envoi"]);
const ATTEND_PLATEFORME = new Set(["place", "prerequis"]);

const texte = (value: unknown) => (typeof value === "string" ? value : "");
// Own keys only: a state such as `__proto__` or `constructor` must read as unknown, not as Object.prototype.
const propre = (table: object, cle: string) =>
  Object.prototype.hasOwnProperty.call(table, cle);

/**
 * Variant of a member. A final state wins over `attend` (a finished member waits for nothing); otherwise an
 * owner wait wins, then a platform wait, then the state itself.
 */
export function variantOf(state: unknown, attend?: unknown): Variante {
  const s = texte(state);
  const a = texte(attend);
  const v: Variante = propre(ETAT_VARIANTE, s) ? ETAT_VARIANTE[s] : "inconnu";
  if (FINAUX.has(s)) return v;
  if (ATTEND_PROPRIETAIRE.has(a)) return "te_demande";
  if (v === "te_demande") return "te_demande";
  if (ATTEND_PLATEFORME.has(a)) return "attente";
  return v;
}

/**
 * Class per variant, to create in src/v2.css (swarm: `RING_TONE` / `TASK_STATUS_TEXT`, Tailwind tokens).
 * The label stays written next to the dot: color is never the only signal.
 */
export const CLASSE_ETAT: Record<Variante, string> = {
  attente: "etat etat-attente",
  encours: "etat etat-encours",
  te_demande: "etat etat-te-demande",
  fini: "etat etat-fini",
  echec: "etat etat-echec",
  annule: "etat etat-annule",
  inconnu: "etat etat-inconnu",
};

/** States held by the platform before a sub-mission starts (delegation.js line()). */
export const heldLabels: Record<string, string> = {
  en_file: "En file",
  attend_accord: "Attend ton accord",
  attend_prerequis: "Attend un prérequis",
};

/**
 * The one label table of the block (swarm: `STATUS_LABELS`): the run labels of types.ts, the same words as
 * the rest of the interface, plus the states held by the platform.
 */
const LIBELLES: Record<string, string> = { ...labels, ...heldLabels };

/**
 * French label of a state. Unlike swarm (which humanizes `foo_bar` into « Foo bar »), an unknown value reads
 * « État inconnu »: the raw value is never shown. `hasOwn` keeps `constructor`, `__proto__`… unknown.
 */
export function labelOf(state: unknown): string {
  const s = texte(state);
  return propre(LIBELLES, s) ? LIBELLES[s] : "État inconnu";
}

/**
 * « 45 s », « 4 min 12 s », « 1 h 05 » (swarm `formatDuration`: whole seconds, rounded down; hours drop the
 * seconds). An invalid or negative value gives "" so the caller leaves the duration out.
 */
export function formatDuree(ms: unknown): string {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return "";
  const secondes = Math.floor(ms / 1000);
  const minutes = Math.floor(secondes / 60);
  const heures = Math.floor(minutes / 60);
  if (heures > 0) return `${heures} h ${String(minutes % 60).padStart(2, "0")}`;
  if (minutes > 0) return `${minutes} min ${secondes % 60} s`;
  return `${secondes} s`;
}

const heure = (value: unknown) => {
  const t = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(t) ? t : Number.NaN;
};

/** Fields of a member read here (all optional, see back docs/api-equipe-vue.md). */
export interface MembreVu {
  agent?: unknown;
  state?: unknown;
  attend?: unknown;
  debut?: unknown;
  fin?: unknown;
  dureeMs?: unknown;
}

/**
 * Run time of a finished member: `dureeMs` from the back, else `fin − debut` (swarm: acceptedAt → finishedAt,
 * only when both parse). `null` for a member still running or never started.
 */
export function dureeOf(m: MembreVu): number | null {
  if (
    typeof m.dureeMs === "number" &&
    Number.isFinite(m.dureeMs) &&
    m.dureeMs >= 0
  )
    return m.dureeMs;
  const ecart = heure(m.fin) - heure(m.debut);
  return Number.isFinite(ecart) ? Math.max(0, ecart) : null;
}

/**
 * « confié à agent · état · durée » (swarm `ChildAgentStatus` + `DelegationCard`: « Delegated to Lead ·
 * Completed · 1m 23s »). The duration is left out when unknown.
 */
export function ligneConfie(m: MembreVu): string {
  const agent = texte(m.agent) || "un agent";
  const duree = dureeOf(m);
  const temps = duree === null ? "" : formatDuree(duree);
  return `confié à ${agent} · ${labelOf(m.state)}${temps ? ` · ${temps}` : ""}`;
}

/** Members drawn before « +N autres » (swarm `WIDE_LIMIT`). */
export const LIMITE_MEMBRES = 8;

/**
 * The members to draw: the first `LIMITE_MEMBRES` plus `extra` the reader asked for (swarm
 * `visibleChildren`, without its focused-path child: Relay has no focused path).
 */
export function membresVisibles<T>(
  membres: readonly T[],
  extra = 0,
): { visibles: T[]; caches: number } {
  const liste = Array.isArray(membres) ? membres : [];
  const limite =
    LIMITE_MEMBRES +
    (Number.isFinite(extra) && extra > 0 ? Math.floor(extra) : 0);
  if (liste.length <= limite) return { visibles: liste.slice(), caches: 0 };
  return { visibles: liste.slice(0, limite), caches: liste.length - limite };
}

/** « +1 autre », « +2 autres »; "" when nothing is hidden. */
export function libelleAutres(caches: number): string {
  if (!Number.isFinite(caches) || caches <= 0) return "";
  return `+${caches} ${caches > 1 ? "autres" : "autre"}`;
}

/**
 * Members sorted by `debut` (oldest first); members not started yet keep their order and come last. Stable.
 */
export function trierParDebut<T extends { debut?: unknown }>(
  membres: readonly T[],
): T[] {
  const liste = Array.isArray(membres) ? membres : [];
  return liste
    .map((m, i) => ({ m, i, t: heure(m?.debut) }))
    .sort((x, y) => {
      const a = Number.isFinite(x.t),
        b = Number.isFinite(y.t);
      if (a && b && x.t !== y.t) return x.t - y.t;
      if (a !== b) return a ? -1 : 1;
      return x.i - y.i;
    })
    .map((e) => e.m);
}

/** Counted summary (swarm `summarizeLineage`, without cost: `usage` is not sent before swarm-14). */
export function resumeEquipe(membres: readonly MembreVu[]): {
  membres: number;
  agents: number;
  vivants: number;
} {
  const liste = Array.isArray(membres)
    ? membres.filter((m) => m && typeof m === "object")
    : [];
  const agents = new Set(liste.map((m) => texte(m.agent)).filter(Boolean));
  return {
    membres: liste.length,
    agents: agents.size,
    vivants: liste.filter((m) => !FINAUX.has(texte(m.state))).length,
  };
}

// ---- swarm-11 : liste des missions (une activité par ligne) et détails de la ligne brute d'un membre ----
// Règle `activityOf` de swarm (session-row.tsx, lignes 46-54) : « Needs you, else running, else failed », une
// seule marque par ligne.

/** Mother of a sub-mission row (`famille.mere`), or "" for a mission of its own. */
export function mereDe(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  const famille = (row as { famille?: unknown }).famille;
  if (!famille || typeof famille !== "object") return "";
  return texte((famille as { mere?: unknown }).mere);
}

/**
 * The rows the left list shows: every row except a sub-mission whose mother is in the same answer (the back's
 * `?racines=1` rule: a sub-mission whose mother is gone stays listed, so it can still be opened).
 */
export function missionsDeLaListe<T extends { id: string }>(
  rows: readonly T[],
): T[] {
  const liste = Array.isArray(rows)
    ? rows.filter((r) => r && typeof r === "object")
    : [];
  const ids = new Set(liste.map((r) => r.id));
  return liste.filter((r) => {
    const mere = mereDe(r);
    return !mere || !ids.has(mere);
  });
}

export interface ResumeListe {
  membres: number;
  enCours: number;
  teDemande: number;
  /** Members `failed` only (cancelled or interrupted alone is not a failure of the row). */
  echecs: number;
}

const nombre = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
const ENCORE_PROPRIETAIRE = new Set([
  "awaiting_owner",
  "waiting_permission",
  "attend_accord",
]);

/**
 * Team summary of a mother row, `null` for a mission without a team. The back's `equipe` wins when it is on the
 * row; otherwise it is counted from the sub-mission rows present in the same answer. The failures come from those
 * rows when there are some (`failed` only), else from `equipe.echecs` (which also counts cancelled members).
 */
export function resumeListe(
  run: { id: string; equipe?: unknown },
  rows: readonly unknown[],
): ResumeListe | null {
  const enfants = (Array.isArray(rows) ? rows : []).filter(
    (r) => mereDe(r) === run.id && run.id !== "",
  ) as { state?: unknown }[];
  const echecsVus = enfants.filter((r) => texte(r.state) === "failed").length;
  const eq =
    run.equipe && typeof run.equipe === "object"
      ? (run.equipe as Record<string, unknown>)
      : null;
  if (eq && nombre(eq.membres) > 0)
    return {
      membres: nombre(eq.membres),
      enCours: nombre(eq.enCours),
      teDemande: nombre(eq.teDemande),
      echecs: enfants.length ? echecsVus : nombre(eq.echecs),
    };
  if (!enfants.length) return null;
  return {
    membres: enfants.length,
    enCours: enfants.filter((r) => !FINAUX.has(texte(r.state))).length,
    teDemande: enfants.filter((r) => ENCORE_PROPRIETAIRE.has(texte(r.state)))
      .length,
    echecs: echecsVus,
  };
}

export type ActiviteListe = "te_demande" | "encours" | "echec" | null;

/** One activity per row: the owner is asked, else something runs, else a failure, else none. */
export function activiteListe(
  run: { state?: unknown },
  resume: ResumeListe,
): ActiviteListe {
  const etat = texte(run.state);
  if (ENCORE_PROPRIETAIRE.has(etat) || resume.teDemande > 0)
    return "te_demande";
  if (!FINAUX.has(etat) || resume.enCours > 0) return "encours";
  if (etat === "failed" || resume.echecs > 0) return "echec";
  return null;
}

/** Dot class of the row (existing `.dot.<state>` colors of style.css). */
export const POINT_ACTIVITE: Record<Exclude<ActiviteListe, null>, string> = {
  te_demande: "awaiting_owner",
  encours: "running",
  echec: "failed",
};

/**
 * « 3 membres · 1 te demande », « 3 membres · 2 en cours », « 3 membres · 1 échec », « 3 membres ». When only the
 * mother herself carries the activity (no member counted), the word comes without a number.
 */
export function texteResume(
  resume: ResumeListe,
  activite: ActiviteListe,
): string {
  const membres = `${resume.membres} ${resume.membres > 1 ? "membres" : "membre"}`;
  const n =
    activite === "te_demande"
      ? resume.teDemande
      : activite === "encours"
        ? resume.enCours
        : activite === "echec"
          ? resume.echecs
          : 0;
  const mot =
    activite === "te_demande"
      ? n > 1
        ? "te demandent"
        : "te demande"
      : activite === "encours"
        ? "en cours"
        : activite === "echec"
          ? n > 1
            ? "échecs"
            : "échec"
          : "";
  if (!mot) return membres;
  return `${membres} · ${n > 0 ? `${n} ` : ""}${mot}`;
}

/**
 * Copies `motif` and `agentPrevu` from each sub-mission's own row (`famille`) onto the open mother's
 * `family[]` members: `family[]` never carries them. Returns the same run when nothing is added.
 */
export function avecDetailsDesLignes<
  R extends { family?: { id: string; motif?: string; agentPrevu?: string }[] },
>(run: R, rows: readonly unknown[]): R {
  const family = Array.isArray(run.family) ? run.family : null;
  if (!family || !family.length || !Array.isArray(rows)) return run;
  const parId = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const id = (r as { id?: unknown }).id;
    const famille = (r as { famille?: unknown }).famille;
    if (typeof id === "string" && famille && typeof famille === "object")
      parId.set(id, famille as Record<string, unknown>);
  }
  let change = false;
  const suite = family.map((m) => {
    const f = m && typeof m.id === "string" ? parId.get(m.id) : undefined;
    if (!f) return m;
    const motif = texte(f.motif);
    const agentPrevu = texte(f.agentPrevu);
    if (!motif && !agentPrevu) return m;
    change = true;
    return {
      ...m,
      ...(motif ? { motif } : {}),
      ...(agentPrevu ? { agentPrevu } : {}),
    };
  });
  return change ? { ...run, family: suite } : run;
}

/** « 12 345 jetons » from an announced `usage`, "" when no total is announced. */
export function texteJetons(usage: unknown): string {
  if (!usage || typeof usage !== "object") return "";
  const jetons = (usage as { jetons?: unknown }).jetons;
  if (!jetons || typeof jetons !== "object") return "";
  const total = (jetons as { total?: unknown }).total;
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0)
    return "";
  const n = Math.round(total);
  return `${new Intl.NumberFormat("fr-FR").format(n)} ${n > 1 ? "jetons" : "jeton"}`;
}
