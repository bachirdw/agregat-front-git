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

export function TeamBlock({
  run,
  openRun,
  onOpenSide,
  onCancel,
  busy = false,
}: {
  run: Run;
  openRun?: (id: string) => void;
  // reponse-04 (panneau Activité) : voir un membre à côté du fil (vue scindée), arrêter un membre en
  // cours (route ordinaire d'annulation d'une mission). Absents : rien n'est ajouté.
  onOpenSide?: (id: string) => void;
  onCancel?: (id: string) => void;
  busy?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
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
  const done = family.filter((m) => finalStates.has(text(m.state))).length;
  const waiting = family.filter(
    (m) => !finalStates.has(text(m.state)) && waitsForOwner(m),
  ).length;
  // Held by the platform before starting (a free place or a prerequisite): not working yet.
  const held = family.filter(
    (m) =>
      !finalStates.has(text(m.state)) &&
      !waitsForOwner(m) &&
      (heldStates.has(text(m.state)) || heldWaits.has(text(m.attend))),
  ).length;
  const working = family.length - done - waiting - held;
  return (
    <section className="card card-pad team" aria-label="Équipe">
      <div className="spread">
        <strong>Équipe</strong>
        <small role="status">
          {plural(family.length, "membre", "membres")} · {working} en cours ·{" "}
          {held > 0 && `${held} en attente d’une place ou d’un prérequis · `}
          {plural(done, "finie", "finies")} · {waiting} en attente de toi
        </small>
      </div>
      <p className="team-chef">
        Chef : {text(run.agent) || "agent inconnu"} ·{" "}
        <span className={CLASSE_ETAT[variantOf(run.state)]}>
          {labelOf(run.state)}
        </span>
      </p>
      <ul className="team-members">
        {visibles.map((m) => {
          const title = text(m.titre) || "Sous-mission";
          const state = text(m.state);
          const final = finalStates.has(state);
          const duration = dureeOf(m);
          const elapsed = final
            ? duration === null
              ? ""
              : formatDuree(duration)
            : seconds(m.depuis);
          const lastTool = final ? "" : text(m.dernierOutil);
          const idle = seconds(m.inactiveDepuis);
          const result = state === "completed" ? text(m.resultat) : "";
          const failed =
            final &&
            state !== "completed" &&
            !!m.cause &&
            typeof m.cause === "object";
          const role = text(m.role);
          const wait = own(waitLabels, text(m.attend));
          const reviews = (Array.isArray(m.relit) ? m.relit : []).filter(
            (id) => typeof id === "string",
          );
          // Read on the sub-mission's own row (App.tsx), never in `family[]`: plain text, no cause.
          const motif = text(m.motif);
          const planned = text(m.agentPrevu);
          const fallback =
            planned && text(m.agent) && planned !== text(m.agent);
          const tokens = texteJetons(m.usage);
          return (
            <li key={m.id} aria-label={title}>
              <div className="spread">
                {openRun ? (
                  <button
                    type="button"
                    className="team-open"
                    aria-label={`Ouvrir la sous-mission ${title}`}
                    onClick={() => openRun(m.id)}
                  >
                    {title}
                  </button>
                ) : (
                  <strong>{title}</strong>
                )}
                <span
                  className={
                    "badge " + CLASSE_ETAT[variantOf(m.state, m.attend)]
                  }
                >
                  {labelOf(m.state)}
                </span>
              </div>
              {motif && <p className="team-motif">{motif}</p>}
              <div className="tags">
                {role && (
                  <span className="badge">
                    {own(roleLabels, role.toLowerCase()) || role}
                  </span>
                )}
                {text(m.agent) && (
                  <small>
                    {fallback
                      ? `lancé sur ${text(m.agent)} (${planned} indisponible)`
                      : text(m.agent)}
                    {text(m.modele) ? ` · ${text(m.modele)}` : ""}
                  </small>
                )}
                {tokens && <small className="team-jetons">{tokens}</small>}
                {wait && (
                  <small
                    className={ownerWaits.has(text(m.attend)) ? "warning" : ""}
                  >
                    {wait}
                  </small>
                )}
                {text(m.continue) && (
                  <small>suite de « {titleOf(text(m.continue))} »</small>
                )}
                {reviews.length > 0 && (
                  <small>
                    relit {reviews.map((id) => `« ${titleOf(id)} »`).join(", ")}
                  </small>
                )}
                {elapsed && (
                  <small className="team-duree">
                    {final ? `durée ${elapsed}` : `depuis ${elapsed}`}
                  </small>
                )}
                {lastTool && (
                  <small className="team-action">
                    dernière action {lastTool}
                    {idle ? ` il y a ${idle}` : ""}
                  </small>
                )}
              </div>
              {(onOpenSide || (onCancel && !final)) && (
                <div className="team-actions">
                  {onOpenSide && (
                    <button
                      type="button"
                      aria-label={`Voir à côté ${title}`}
                      onClick={() => onOpenSide(m.id)}
                    >
                      Voir à côté
                    </button>
                  )}
                  {onCancel && !final && (
                    <button
                      type="button"
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
              {m.verdict && typeof m.verdict === "object" && (
                <Verdict verdict={m.verdict} />
              )}
              {result && (
                <details className="team-pli">
                  <summary>Résultat</summary>
                  <p>{result}</p>
                </details>
              )}
              {failed && <Failure member={m} />}
            </li>
          );
        })}
      </ul>
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

export function CarnetBlock({ run }: { run: Run }) {
  const total = Number(run.carnet?.total) || 0;
  if (total <= 0) return null;
  const notes: CarnetNote[] = (
    Array.isArray(run.carnet?.notes) ? run.carnet!.notes! : []
  ).filter((note) => note && typeof note === "object");
  return (
    <section className="card card-pad team-carnet" aria-label="Carnet d’équipe">
      <div className="spread">
        <strong>Carnet d’équipe</strong>
        <small>
          {notes.length && notes.length < total
            ? `${plural(notes.length, "note affichée", "notes affichées")} sur ${total}`
            : plural(total, "note", "notes")}
        </small>
      </div>
      {notes.length > 0 ? (
        <ol className="team-notes">
          {notes.map((note, i) => {
            const category = text(note.categorie);
            const at = text(note.a);
            return (
              <li key={note.n ?? i}>
                <div className="tags">
                  <strong>{text(note.auteur) || "membre"}</strong>
                  {text(note.role) && (
                    <span className="badge">
                      {own(roleLabels, text(note.role).toLowerCase()) ||
                        text(note.role)}
                    </span>
                  )}
                  {category && (
                    <span className="badge">
                      {own(categoryLabels, category) || category}
                    </span>
                  )}
                  {at && hour(at) && <time dateTime={at}>{hour(at)}</time>}
                </div>
                <p>{text(note.texte)}</p>
              </li>
            );
          })}
        </ol>
      ) : (
        <small>Texte des notes non transmis par la plateforme.</small>
      )}
    </section>
  );
}
