// The team of a multi-agent mother (back docs/api-delegation.md 3.1, 5 and 7 bis): its
// sub-missions and the team notebook. Every text comes from the API and is rendered as text only.
import { useState } from "react";
import type { CarnetNote, FamilyMember, Run, TeamVerdict } from "./types";
import { finalStates, ownerStates } from "./types";
import {
  CLASSE_ETAT,
  dureeOf,
  formatDuree,
  labelOf,
  libelleAutres,
  membresVisibles,
  texteJetons,
  trierParDebut,
  variantOf,
} from "./status";

const waitLabels: Record<string, string> = {
  place: "attend une place",
  accord: "attend ton accord",
  prerequis: "attend un prérequis",
  question: "attend ta réponse",
  carte_envoi: "attend ton clic sur une carte d’envoi",
};
const heldStates = new Set(["en_file", "attend_prerequis"]);
const heldWaits = new Set(["place", "prerequis"]);
// What the owner has to do himself.
const ownerWaits = new Set(["accord", "question", "carte_envoi"]);
const roleLabels: Record<string, string> = {
  chercheur: "chercheur",
  redacteur: "rédacteur",
  developpeur: "développeur",
  verificateur: "vérificateur",
};
const verdictLabels: Record<string, string> = {
  approuve: "approuvé",
  a_corriger: "à corriger",
  rejete: "rejeté",
};
const categoryLabels: Record<string, string> = {
  methode: "méthode",
  decouverte: "découverte",
  decision: "décision",
  piege: "piège",
  question: "question",
};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;
// Own keys only: a value such as `__proto__` written by an agent reads as unknown, never as Object.prototype.
const own = (table: Record<string, string>, key: string) =>
  Object.prototype.hasOwnProperty.call(table, key) ? table[key] : "";

function waitsForOwner(member: FamilyMember) {
  return (
    ownerWaits.has(text(member.attend)) ||
    ownerStates.has(text(member.state)) ||
    text(member.state) === "attend_accord"
  );
}

function Verdict({ verdict }: { verdict: TeamVerdict }) {
  const value = text(verdict.valeur);
  const blocking = (verdict.bloquants || []).filter(
    (b) => b && (text(b.ou) || text(b.pourquoi)),
  );
  const remarks = (verdict.remarques || []).filter((r) => text(r));
  // Back api-verdicts.md section 3: decided on `source` and `complet` only, never on the number of
  // blocking points; the source `absent` wins over « sans point précis ».
  const unreadable = verdict.source === "absent";
  const imprecise = !unreadable && verdict.complet === false;
  return (
    <div className="team-verdict">
      <span
        className={
          "badge " +
          (value === "approuve"
            ? "success"
            : value === "rejete"
              ? "danger"
              : "warning")
        }
      >
        Verdict :{" "}
        {unreadable
          ? "illisible"
          : own(verdictLabels, value) || value || "inconnu"}
        {unreadable
          ? " · aucun verdict écrit"
          : imprecise
            ? " · sans point précis"
            : ""}
      </span>
      {(blocking.length > 0 || remarks.length > 0) && (
        <details>
          <summary>
            {blocking.length
              ? plural(blocking.length, "point bloquant", "points bloquants")
              : plural(remarks.length, "remarque", "remarques")}
          </summary>
          {blocking.length > 0 && (
            <ul>
              {blocking.map((b, i) => (
                <li key={i}>
                  {text(b.ou) && <strong>{text(b.ou)}</strong>}
                  {text(b.ou) && text(b.pourquoi) ? " : " : ""}
                  {text(b.pourquoi)}
                </li>
              ))}
            </ul>
          )}
          {remarks.length > 0 && (
            <>
              {blocking.length > 0 && <small>Remarques</small>}
              <ul>
                {remarks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}
        </details>
      )}
    </div>
  );
}

// A duration sent in seconds (`depuis`, `inactiveDepuis`); "" when missing or invalid.
const seconds = (value: unknown) =>
  typeof value === "number" ? formatDuree(value * 1000) : "";

// « Échec après 4 min 12 s : limite d’usage », the agent's message and « réessayer à … » (back
// api-equipe-vue.md `cause`). Open by default: a failure is what the owner has to read.
function Failure({ member }: { member: FamilyMember }) {
  const cause = member.cause!;
  const duration = dureeOf(member);
  const after = duration === null ? "" : formatDuree(duration);
  const usageLimit = text(cause.type) === "limite_usage";
  const message = text(cause.message);
  // Only a valid hour: a raw or unreadable `reprise` is left out, never shown as is.
  const retry = hour(text(cause.reprise));
  // Stopped by the owner (or the chief): not a failure of the member.
  if (member.state === "cancelled")
    return (
      <details className="team-pli" open>
        <summary>{after ? `Arrêtée après ${after}` : "Arrêtée"}</summary>
        {message && <p>{message}</p>}
      </details>
    );
  return (
    <details className="team-pli team-echec" open>
      <summary>
        {after ? `Échec après ${after}` : "Échec"} :{" "}
        {usageLimit ? "limite d’usage atteinte" : "erreur"}
      </summary>
      {message && <p>{message}</p>}
      {retry && <p>réessayer à {retry}</p>}
    </details>
  );
}

// equipe-05 : raison d'une tâche à partir du code `pourquoi` du chef (back docs/api-delegation.md,
// `mission_lancer`) quand le chef n'a pas écrit de `motif`.
const reasonLabels: Record<string, string> = {
  parallele: "Menée en même temps que d’autres tâches pour gagner du temps.",
  specialite: "Confiée à un agent spécialisé dans ce type de tâche.",
  regard_independant:
    "Un regard indépendant sur le travail des autres membres.",
  contexte_trop_long:
    "Séparée pour ne pas surcharger le contexte de l’agent principal.",
  demande_proprietaire: "Lancée parce que tu as demandé des sous-agents.",
};
const capital = (value: string) =>
  value ? value[0].toUpperCase() + value.slice(1) : value;
const failedStates = new Set(["failed", "interrupted"]);
function TeamRow({
  member,
  open,
  toggle,
  titleOf,
  openRun,
  onOpenSide,
  onCancel,
  busy,
}: {
  member: FamilyMember;
  open: boolean;
  toggle: () => void;
  titleOf: (id: string) => string;
  openRun?: (id: string) => void;
  onOpenSide?: (id: string) => void;
  onCancel?: (id: string) => void;
  busy: boolean;
}) {
  const m = member;
  const title = text(m.titre) || "Sous-mission";
  const state = text(m.state);
  const final = finalStates.has(state);
  const role = text(m.role);
  const agent = text(m.agent);
  const model = text(m.modele);
  const duration = dureeOf(m);
  const elapsed = final
    ? duration === null
      ? ""
      : formatDuree(duration)
    : seconds(m.depuis);
  const wait = own(waitLabels, text(m.attend));
  // Une seule table d'états (swarm-09, status.ts) : la pastille en prend la couleur, et le libellé reste
  // écrit (lecteur d'écran toujours ; à l'écran dès que l'état n'est ni « terminé » ni « en cours »).
  const variant = variantOf(m.state, m.attend);
  const label = labelOf(m.state);
  const said =
    variant === "fini" || variant === "encours" || (wait && variant !== "echec")
      ? ""
      : label;
  const sub = [
    role ? capital(own(roleLabels, role.toLowerCase()) || role) : "",
    [agent, model].filter(Boolean).join(" "),
    elapsed ? (final ? elapsed : `depuis ${elapsed}`) : "",
    said,
  ].filter(Boolean);
  const reviews = (Array.isArray(m.relit) ? m.relit : []).filter(
    (id) => typeof id === "string",
  );
  const reason = text(m.motif) || own(reasonLabels, text(m.pourquoi)) || "";
  const planned = text(m.agentPrevu);
  const fallback = planned && agent && planned !== agent;
  const jetons = texteJetons(m.usage).replace(/ jetons?$/, "");
  const lastTool = final ? "" : text(m.dernierOutil);
  const idle = seconds(m.inactiveDepuis);
  const result = state === "completed" ? text(m.resultat) : "";
  const failed =
    final && state !== "completed" && !!m.cause && typeof m.cause === "object";
  const show = onOpenSide ?? openRun;
  const detailId = `team-detail-${m.id}`;
  return (
    <li className={"team-row" + (open ? " open" : "")} aria-label={title}>
      <button
        type="button"
        className="team-row-head"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={toggle}
      >
        <span className={"team-dot " + CLASSE_ETAT[variant]}>
          <span className="sr-only">{label}</span>
        </span>
        <span className="team-row-title">{title}</span>
        <Chevron />
        <span />
        <span className="team-row-sub">
          {sub.join(" · ")}
          {wait && (
            <span className={ownerWaits.has(text(m.attend)) ? "warning" : ""}>
              {sub.length ? " · " : ""}
              {wait}
            </span>
          )}
        </span>
      </button>
      {open && (
        <div
          id={detailId}
          className="team-row-body"
          role="group"
          aria-label={`Détail de ${title}`}
        >
          {reason && (
            <p
              className={
                "team-reason" + (reason === text(m.motif) ? " team-motif" : "")
              }
            >
              {reason}
            </p>
          )}
          {text(m.continue) && (
            <p className="team-reason">
              Suite de « {titleOf(text(m.continue))} ».
            </p>
          )}
          {reviews.length > 0 && (
            <p className="team-reason">
              Relit {reviews.map((id) => `« ${titleOf(id)} »`).join(", ")}.
            </p>
          )}
          <dl className="team-kv">
            {agent && (
              <>
                <dt>Modèle</dt>
                <dd>
                  {fallback
                    ? `lancé sur ${agent} (${planned} indisponible)`
                    : agent}
                  {model ? ` · ${model}` : ""}
                </dd>
              </>
            )}
            {jetons && (
              <>
                <dt>Jetons</dt>
                <dd className="num team-jetons">{jetons}</dd>
              </>
            )}
            {lastTool && (
              <>
                <dt>Dernière action</dt>
                <dd>
                  {lastTool}
                  {idle ? `, il y a ${idle}` : ""}
                </dd>
              </>
            )}
          </dl>
          {m.verdict && typeof m.verdict === "object" && (
            <Verdict verdict={m.verdict} />
          )}
          {failed && <Failure member={m} />}
          {result && !show && (
            <details className="team-pli">
              <summary>Résultat</summary>
              <p>{result}</p>
            </details>
          )}
          {(show || (onCancel && !final)) && (
            <div className="team-actions">
              {show && (
                <button
                  type="button"
                  className="team-button"
                  aria-label={`${final ? "Voir le résultat de" : "Suivre"} ${title}`}
                  onClick={() => show(m.id)}
                >
                  {final ? "Voir le résultat" : "Suivre en direct"}
                </button>
              )}
              {onCancel && !final && (
                <button
                  type="button"
                  className="team-button"
                  aria-label={`Arrêter ${title}`}
                  disabled={busy}
                  onClick={() => onCancel(m.id)}
                >
                  <span className="stop-square" aria-hidden="true" />
                  Arrêter
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Chevron() {
  return (
    <svg
      className="team-chevron"
      width="8"
      height="8"
      viewBox="0 0 10 10"
      aria-hidden="true"
    >
      <path
        d="M3.5 2l3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Étapes du découpage (`etape` du back, contrat equipe-v6-01) : groupes dans l'ordre de leur numéro,
// « 1. En parallèle » quand le chef a donné un libellé, « Étape 1 » sinon ; un membre sans étape, quand
// d'autres en ont une, va dans un dernier groupe. Sans aucune étape : une seule liste, sans titre.
const numeroOf = (m: FamilyMember) => {
  const n = m.etape && typeof m.etape === "object" ? m.etape.numero : undefined;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 ? n : null;
};
function phasesOf(members: FamilyMember[]) {
  // Le back calcule `etape.numero` pour tout membre : un titre d'étape n'a de sens qu'avec au moins deux
  // étapes, ou un libellé donné par le chef.
  const numeros = new Set(
    members.map(numeroOf).filter((n): n is number => n !== null),
  );
  const labelled = members.some(
    (m) => numeroOf(m) !== null && !!text(m.etape?.libelle).trim(),
  );
  if (numeros.size === 0 || (numeros.size === 1 && !labelled))
    return [{ label: "", members }];
  const groups = new Map<number, { label: string; members: FamilyMember[] }>();
  const rest: FamilyMember[] = [];
  for (const m of members) {
    const numero = numeroOf(m);
    if (numero === null) {
      rest.push(m);
      continue;
    }
    const group = groups.get(numero) ?? { label: "", members: [] };
    const libelle = text(m.etape!.libelle).trim();
    if (!group.label && libelle) group.label = `${numero}. ${libelle}`;
    group.members.push(m);
    groups.set(numero, group);
  }
  const ordered = [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([numero, g]) => ({ ...g, label: g.label || `Étape ${numero}` }));
  return rest.length
    ? [...ordered, { label: "Autres tâches", members: rest }]
    : ordered;
}

export function TeamBlock({
  run,
  openRun,
  onOpenSide,
  onCancel,
  busy = false,
}: {
  run: Run;
  openRun?: (id: string) => void;
  // reponse-04 (panneau Activité) : « Voir le résultat » ouvre un membre à côté du fil (vue scindée) ;
  // « Arrêter » passe par la route ordinaire d'annulation d'une mission. Absents : rien n'est ajouté.
  onOpenSide?: (id: string) => void;
  onCancel?: (id: string) => void;
  busy?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  // Une seule ligne ouverte à la fois (maquette v6).
  const [openId, setOpenId] = useState<string | null>(null);
  const family = (Array.isArray(run.family) ? run.family : []).filter(
    (m) => m && typeof m.id === "string",
  );
  if (!family.length) return null;
  // Oldest start first, members not started yet after them; without any `debut`, the order received.
  const { visibles, caches } = membresVisibles(
    trierParDebut(family),
    showAll ? family.length : 0,
  );
  const titleOf = (id: string) =>
    text(family.find((m) => m.id === id)?.titre) || "sous-mission";
  const done = family.filter((m) => text(m.state) === "completed").length;
  const failed = family.filter((m) => failedStates.has(text(m.state))).length;
  const stopped = family.filter((m) => text(m.state) === "cancelled").length;
  const open = family.filter((m) => !finalStates.has(text(m.state)));
  const waiting = open.filter(waitsForOwner).length;
  // Retenu par la plateforme avant de démarrer (une place, un prérequis) : ne travaille pas encore.
  const held = open.filter(
    (m) =>
      !waitsForOwner(m) &&
      (heldStates.has(text(m.state)) || heldWaits.has(text(m.attend))),
  ).length;
  const working = open.length - waiting - held;
  const counts = [
    working > 0 && { tone: "info", text: `${working} en cours` },
    waiting > 0 && { tone: "warning", text: `${waiting} en attente de toi` },
    held > 0 && {
      tone: "",
      text: `${held} en attente d’une place ou d’un prérequis`,
    },
    done > 0 && {
      tone: "success",
      text: plural(done, "terminée", "terminées"),
    },
    failed > 0 && { tone: "danger", text: `${failed} en échec` },
    stopped > 0 && { tone: "", text: plural(stopped, "arrêtée", "arrêtées") },
  ].filter((c): c is { tone: string; text: string } => !!c);
  const summary = text(run.decoupage) || text(run.equipe?.decoupage);
  return (
    <section className="team" aria-label="Équipe">
      <div className="team-head">
        <strong>Équipe</strong>
        <small role="status">
          {counts.map((c, i) => (
            <span key={c.text} className={c.tone || undefined}>
              {i > 0 ? " · " : ""}
              {c.text}
            </span>
          ))}
        </small>
      </div>
      {summary && <p className="team-plan">{summary}</p>}
      {phasesOf(visibles).map((phase, i) => (
        <div className="team-phase" key={phase.label || i}>
          {phase.label && (
            <div className="team-phase-head" aria-hidden="true">
              {phase.label}
            </div>
          )}
          <ul className="team-list" aria-label={phase.label || "Sous-agents"}>
            {phase.members.map((m) => (
              <TeamRow
                key={m.id}
                member={m}
                open={openId === m.id}
                toggle={() => setOpenId(openId === m.id ? null : m.id)}
                titleOf={titleOf}
                openRun={openRun}
                onOpenSide={onOpenSide}
                onCancel={onCancel}
                busy={busy}
              />
            ))}
          </ul>
        </div>
      ))}
      {caches > 0 && (
        <button
          type="button"
          className="team-more"
          onClick={() => setShowAll(true)}
        >
          {libelleAutres(caches)}
        </button>
      )}
    </section>
  );
}

function hour(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// Une note du carnet en trois parties (maquette v6). Format du back (`titre`, `situation`, `regle`, contrat equipe-v6-01) pris tel
// quel ; sinon le texte : la forme des leçons du back (docs/api-lecons.md : « ligne 1 le titre, ligne 2
// la règle ») donne la règle à « Ce qu'il faut faire » ; dans la ligne 1, la première phrase est le
// titre et le reste « Ce qui s'est passé ». Un titre trop long est raccourci, et la ligne entière
// passe alors dans « Ce qui s'est passé » : rien n'est perdu.
const TITLE_MAX = 160;
export function noteParts(note: CarnetNote): {
  title: string;
  what: string;
  fix: string;
} {
  if (text(note.titre).trim())
    return {
      title: text(note.titre).trim(),
      what: text(note.situation).trim(),
      fix: text(note.regle).trim(),
    };
  const lines = text(note.texte)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const first = lines[0] ?? "";
  const fix = lines.slice(1).join("\n");
  const sentence = first.match(/^(.+?[.!?…])\s+(\S[\s\S]*)$/);
  let title = sentence ? sentence[1] : first;
  let what = sentence ? sentence[2] : "";
  if (title.length > TITLE_MAX) {
    const cut = title.slice(0, TITLE_MAX);
    title =
      cut.slice(
        0,
        cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : TITLE_MAX,
      ) + "…";
    what = first;
  }
  return { title, what, fix };
}
// Catégories des leçons durables du back (méthode, piège) : « Ce que l'équipe a appris ».
const learnedCategories = new Set(["piege", "methode"]);

function NoteRow({
  note,
  open,
  toggle,
}: {
  note: CarnetNote;
  open: boolean;
  toggle: () => void;
}) {
  const { title, what, fix } = noteParts(note);
  const category = text(note.categorie);
  const at = text(note.a);
  const who = [
    text(note.auteur) || "membre",
    learnedCategories.has(category)
      ? ""
      : own(categoryLabels, category) || category,
  ].filter(Boolean);
  const mark = category === "piege" ? "!" : category === "methode" ? "✓" : "·";
  // Devenue leçon durable (même id que l'événement `lecon_gardee`) : dit note par note.
  const kept =
    !!note.lecon && typeof note.lecon === "object" && !!text(note.lecon.id);
  const body = !!(what || fix);
  const head = (
    <>
      <span
        className={"team-note-mark " + (category || "note")}
        aria-hidden="true"
      >
        {mark}
      </span>
      <span className="team-row-title">
        {category && (
          <span className="sr-only">
            {own(categoryLabels, category) || category} :{" "}
          </span>
        )}
        {title || "Note sans texte"}
      </span>
      {body ? <Chevron /> : <span />}
      <span />
      <span className="team-row-sub team-who">
        <span className="team-who-name">{who.join(" · ")}</span>
        {at && hour(at) && (
          <span className="team-who-time">
            {who.length ? " · " : ""}
            <time dateTime={at}>{hour(at)}</time>
          </span>
        )}
        {kept && (
          <span className="team-who-time team-kept">
            {" · "}gardée en mémoire
          </span>
        )}
      </span>
    </>
  );
  return (
    <li className={"team-row" + (open ? " open" : "")}>
      {body ? (
        <button
          type="button"
          className="team-row-head"
          aria-expanded={open}
          onClick={toggle}
        >
          {head}
        </button>
      ) : (
        <div className="team-row-head">{head}</div>
      )}
      {open && body && (
        <div className="team-row-body team-note-body">
          {what && (
            <div>
              <span>Ce qui s’est passé</span>
              <p>{what}</p>
            </div>
          )}
          {fix && (
            <div>
              <span>Ce qu’il faut faire</span>
              <p>{fix}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// « Ce que l'équipe a appris » (remplace le carnet en paragraphes) : les pièges et les méthodes du
// carnet ; les autres notes (décisions, découvertes, questions) restent lisibles, repliées à part.
// `lessonsKept` : leçons que le back a gardées pour la suite (événements `lecon_gardee`) ; la ligne
// d'aide ne dit « gardées en mémoire » que dans ce cas (le back ne relie pas encore une note à sa leçon).
export function CarnetBlock({
  run,
  lessonsKept = 0,
}: {
  run: Run;
  lessonsKept?: number;
}) {
  const [openN, setOpenN] = useState<string | null>(null);
  const total = Number(run.carnet?.total) || 0;
  if (total <= 0) return null;
  const notes: CarnetNote[] = (
    Array.isArray(run.carnet?.notes) ? run.carnet!.notes! : []
  ).filter((note) => note && typeof note === "object");
  const keyOf = (note: CarnetNote, i: number) => String(note.n ?? `i${i}`);
  const learned = notes.filter(
    (note) => learnedCategories.has(text(note.categorie)) || !!text(note.titre),
  );
  const others = notes.filter((note) => !learned.includes(note));
  const row = (note: CarnetNote, i: number) => {
    const key = keyOf(note, i);
    return (
      <NoteRow
        key={key}
        note={note}
        open={openN === key}
        toggle={() => setOpenN(openN === key ? null : key)}
      />
    );
  };
  return (
    <section className="team team-carnet" aria-label="Ce que l’équipe a appris">
      <div className="team-head">
        <strong>Ce que l’équipe a appris</strong>
        <small>
          {notes.length === 0
            ? plural(total, "note", "notes")
            : notes.length < total
              ? `${notes.length} sur ${total} notes`
              : learned.length || ""}
        </small>
      </div>
      <p className="team-help">
        Obstacles rencontrés et contournés.
        {lessonsKept > 0 &&
          ` ${plural(lessonsKept, "leçon gardée", "leçons gardées")} en mémoire pour les prochaines missions.`}
      </p>
      {notes.length === 0 && (
        <small>Texte des notes non transmis par la plateforme.</small>
      )}
      {learned.length > 0 && (
        <ul className="team-list" aria-label="Obstacles et méthodes">
          {learned.map((note) => row(note, notes.indexOf(note)))}
        </ul>
      )}
      {notes.length > 0 && learned.length === 0 && (
        <small>Aucun obstacle ni méthode noté pour l’instant.</small>
      )}
      {others.length > 0 && (
        <details className="team-others">
          <summary>Autres notes du carnet · {others.length}</summary>
          <ul className="team-list" aria-label="Autres notes du carnet">
            {others.map((note) => row(note, notes.indexOf(note)))}
          </ul>
        </details>
      )}
    </section>
  );
}
