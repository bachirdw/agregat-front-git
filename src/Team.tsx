// The team of a multi-agent mother (back docs/api-delegation.md 3.1, 5 and 7 bis): its
// sub-missions and the team notebook. Every text comes from the API and is rendered as text only.
import type { CarnetNote, FamilyMember, Run, TeamVerdict } from "./types";
import { finalStates, labels, ownerStates } from "./types";

// States held by the platform before a sub-mission starts (delegation.js line()).
const heldLabels: Record<string, string> = {
  en_file: "En file",
  attend_accord: "Attend ton accord",
  attend_prerequis: "Attend un prérequis",
};
const waitLabels: Record<string, string> = {
  place: "attend une place",
  accord: "attend ton accord",
  prerequis: "attend un prérequis",
  question: "attend ta réponse",
  carte_envoi: "attend ton clic sur une carte d’envoi",
};
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

function stateLabel(state: string) {
  return heldLabels[state] || labels[state] || state || "État inconnu";
}

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
        Verdict : {verdictLabels[value] || value || "inconnu"}
        {verdict.source === "absent" ? " · aucun verdict écrit" : ""}
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

export function TeamBlock({
  run,
  openRun,
}: {
  run: Run;
  openRun?: (id: string) => void;
}) {
  const family = (Array.isArray(run.family) ? run.family : []).filter(
    (m) => m && typeof m.id === "string",
  );
  if (!family.length) return null;
  const titleOf = (id: string) =>
    text(family.find((m) => m.id === id)?.titre) || "sous-mission";
  const done = family.filter((m) => finalStates.has(text(m.state))).length;
  const waiting = family.filter(
    (m) => !finalStates.has(text(m.state)) && waitsForOwner(m),
  ).length;
  const working = family.length - done - waiting;
  return (
    <section className="card card-pad team" aria-label="Équipe">
      <div className="spread">
        <strong>Équipe</strong>
        <small role="status">
          {plural(family.length, "membre", "membres")} · {working} en cours ·{" "}
          {plural(done, "finie", "finies")} · {waiting} en attente de toi
        </small>
      </div>
      <ul className="team-members">
        {family.map((m) => {
          const title = text(m.titre) || "Sous-mission";
          const role = text(m.role);
          const wait = waitLabels[text(m.attend)];
          const reviews = (Array.isArray(m.relit) ? m.relit : []).filter(
            (id) => typeof id === "string",
          );
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
                <span className="badge">{stateLabel(text(m.state))}</span>
              </div>
              <div className="tags">
                {role && (
                  <span className="badge">
                    {roleLabels[role.toLowerCase()] || role}
                  </span>
                )}
                {text(m.agent) && (
                  <small>
                    {text(m.agent)}
                    {text(m.modele) ? ` · ${text(m.modele)}` : ""}
                  </small>
                )}
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
              </div>
              {m.verdict && typeof m.verdict === "object" && (
                <Verdict verdict={m.verdict} />
              )}
            </li>
          );
        })}
      </ul>
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
                      {roleLabels[text(note.role).toLowerCase()] ||
                        text(note.role)}
                    </span>
                  )}
                  {category && (
                    <span className="badge">
                      {categoryLabels[category] || category}
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
