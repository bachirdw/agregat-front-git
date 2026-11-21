// skills-nuit-22-11 : ce que le back dit d'un Skill depuis la nuit du 21 au 22/11
// (agregat-back docs/api-skills-import.md : skills-install-01/02, fiche-02, skills-maj-01).
// Tout est rendu en texte ; rien n'est lancé sans clic, et chaque nouvelle version attend sa revue.
import { useState } from "react";
import { ApiError } from "./api";
import { safeLink } from "./Markdown";
import type {
  Skill,
  SkillFinding,
  SkillImportAnswer,
  SkillNeed,
  SkillSource,
} from "./types";

export type SkillRequest = (path: string, body: unknown) => Promise<unknown>;

const stateLabels: Record<string, string> = {
  quarantined: "en quarantaine",
  reviewed: "approuvé, pas encore installé",
  rejected: "refusé à la revue",
  installed: "installé",
  active: "actif",
  available: "disponible",
};
export const stateLabel = (state: string) => stateLabels[state] ?? state;

// Un constat `info` est une information : ni orange ni rouge (demande du manager du back, 22/11).
export function FindingLine({ finding }: { finding: SkillFinding }) {
  const level =
    finding.level === "danger"
      ? "danger"
      : finding.level === "warning"
        ? "warning"
        : "info";
  const word =
    level === "danger" ? "Danger" : level === "warning" ? "Attention" : "Info";
  return (
    <p className={"finding " + level}>
      {word} · {finding.message}
    </p>
  );
}

const where = (sources?: SkillSource[]) =>
  (sources ?? [])
    .map(
      (s) =>
        `${s.fichier}, ligne ${s.ligne}${s.depot ? " (racine du dépôt)" : ""}`,
    )
    .join(" ; ");
const needKinds: Record<string, string> = {
  outil: "Outils",
  mcp: "Serveurs MCP",
  cle: "Clés",
  service: "Services",
  script: "Scripts",
  fichier: "Fichiers cités",
};
function NeedRow({ need }: { need: SkillNeed }) {
  const at = where(need.sources);
  return (
    <li className="compat-need">
      <span className="compat-name">{need.nom}</span>
      <span className="compat-verdict">{need.verdict}</span>
      {(need.fournisseur || need.note) && (
        <small>
          {[need.fournisseur, need.note].filter(Boolean).join(" · ")}
        </small>
      )}
      {at && (
        <small className="compat-where">
          Vu dans : {at}
          {need.occurrences && need.occurrences > (need.sources?.length ?? 0)
            ? ` (${need.occurrences} mentions)`
            : ""}
        </small>
      )}
    </li>
  );
}

export function CompatibilityPanel({ skill }: { skill: Skill }) {
  const card = skill.compatibilite;
  if (!card) return null;
  const needs = card.besoins ?? [];
  const kinds = [...new Set(needs.map((n) => n.type))];
  const deps = card.dependances ?? [];
  return (
    <details className="skill-fold">
      <summary>Compatibilité</summary>
      <section className="compat" aria-label={`Compatibilité de ${skill.name}`}>
        {card.licence?.texte && <p>Licence : {card.licence.texte}</p>}
        {kinds.map((kind) => (
          <div key={kind}>
            <strong>{needKinds[kind] ?? kind}</strong>
            <ul>
              {needs
                .filter((n) => n.type === kind)
                .map((n, i) => (
                  <NeedRow key={n.nom + i} need={n} />
                ))}
            </ul>
          </div>
        ))}
        {card.tronque && (
          <small>Liste tronquée : seuls les 200 premiers besoins.</small>
        )}
        {deps.length > 0 && (
          <div>
            <strong>Autres Skills cités</strong>
            <ul>
              {deps.map((d) => {
                const link = safeLink(d.adresse);
                const status = d.registre
                  ? d.registre.integre
                    ? `Skill intégré de Relay (état : ${stateLabel(d.registre.etat)})`
                    : d.registre.memeSource === false
                      ? `un Skill du même nom est déjà importé d’une autre source (état : ${stateLabel(d.registre.etat)}) : à vérifier`
                      : `déjà importé (état : ${stateLabel(d.registre.etat)})`
                  : "à importer aussi";
                return (
                  <li key={d.id} className="compat-need">
                    {link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        {d.id} ↗
                      </a>
                    ) : (
                      <span className="compat-name">{d.id}</span>
                    )}
                    <span
                      className={
                        "compat-verdict" + (d.registre ? "" : " compat-todo")
                      }
                    >
                      {status}
                    </span>
                    {where(d.sources) && (
                      <small className="compat-where">
                        Cité dans : {where(d.sources)}
                      </small>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {card.plugin?.nom && (
          <p>
            Fait partie du plugin « {card.plugin.nom} »
            {card.plugin.roles?.length
              ? ` ; rôles proposés (jamais lancés) : ${card.plugin.roles.map((r) => r.nom).join(", ")}`
              : ""}
            .
          </p>
        )}
        <small>
          Repérage par mots dans les fichiers du Skill : à vérifier avant
          l’approbation.
        </small>
      </section>
    </details>
  );
}

const day = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};
const githubRepo = (url?: string | null) =>
  url && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/.test(url)
    ? url.replace(/\.git$/, "").replace(/\/$/, "")
    : null;
const short = (sha?: string) => (sha ? sha.slice(0, 7) : "");

// Problèmes, mise à jour proposée, nouvelle version en revue et versions précédentes.
export function UpdatePanel({
  skill,
  busy,
  request,
}: {
  skill: Skill;
  busy: boolean;
  request: SkillRequest;
}) {
  const [error, setError] = useState("");
  const [steps, setSteps] = useState("");
  const [note, setNote] = useState("");
  const [read, setRead] = useState(false);
  const update = skill.miseAJour;
  const problems = skill.problemes ?? [];
  if (skill.origin !== "third-party" && !update && !problems.length)
    return null;
  const base = "/skills/" + skill.id;
  const run = async (path: string, body: unknown) => {
    setError("");
    setSteps("");
    setNote("");
    try {
      const answer = (await request(path, body)) as SkillImportAnswer | null;
      if (answer && typeof answer.message === "string") setNote(answer.message);
    } catch (e) {
      const data = (e as ApiError).data as SkillImportAnswer | undefined;
      if (typeof data?.marche === "string") setSteps(data.marche);
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const repo = githubRepo(update?.depot ?? skill.source?.url);
  const candidate = update?.candidat;
  const open = !!skill.notification || !!candidate || problems.length > 0;
  return (
    <details className="skill-fold" open={open}>
      <summary>
        Mises à jour
        {problems.length > 0 &&
          ` · ${problems.length} problème${problems.length > 1 ? "s" : ""}`}
      </summary>
      <section
        className="skill-update"
        aria-label={`Mises à jour de ${skill.name}`}
      >
        {skill.notification?.texte && (
          <p className="finding warning">{skill.notification.texte}</p>
        )}
        {problems.length > 0 && (
          <div>
            <strong>Problèmes constatés sur cette version</strong>
            <ul>
              {problems.map((p, i) => (
                <li key={i}>
                  {p.cause} · {p.n} mission{p.n > 1 ? "s" : ""}, la dernière le{" "}
                  {day(p.derniere)}
                  {p.aussi?.length
                    ? ` (mission qui servait aussi ${p.aussi.join(", ")})`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        {update?.raison && <p>{update.raison}</p>}
        {update && (update.versionLocale || update.versionDistante) && (
          <small>
            Version en place : {update.versionLocale || "inconnue"}
            {update.versionDistante
              ? ` · disponible : ${update.versionDistante}`
              : ""}
            {update.verifieLe ? ` · vérifié le ${day(update.verifieLe)}` : ""}
          </small>
        )}
        {(update?.changements?.length ?? 0) > 0 && (
          <div>
            <strong>Changements</strong>
            <ul className="skill-changes">
              {update!.changements!.map((c) => (
                <li key={c.sha} className={c.pertinent ? "pertinent" : ""}>
                  <small>{day(c.date)}</small>{" "}
                  {repo ? (
                    <a
                      href={`${repo}/commit/${c.sha}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {c.titre} ({short(c.sha)}) ↗
                    </a>
                  ) : (
                    <span>
                      {c.titre} ({short(c.sha)})
                    </span>
                  )}
                  {c.pertinent && (
                    <small className="skill-change-why">
                      {" "}
                      · corrige :{" "}
                      {c.correspond || c.probleme || "un problème connu"}
                    </small>
                  )}
                </li>
              ))}
            </ul>
            {update!.tronque && <small>Liste tronquée (50 au plus).</small>}
          </div>
        )}
        {update?.source === "local" && update.marche && (
          <p className="skill-steps">{update.marche}</p>
        )}
        {candidate && (
          <div className="skill-candidate">
            <strong>
              Nouvelle version{candidate.version ? ` ${candidate.version}` : ""}{" "}
              · {stateLabel(candidate.etat)}
            </strong>
            {(candidate.findings ?? []).map((f, i) => (
              <FindingLine key={i} finding={f} />
            ))}
            <p className="mono">Empreinte : {candidate.hash}</p>
            {candidate.etat === "quarantined" && (
              <>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={read}
                    onChange={(e) => setRead(e.target.checked)}
                  />
                  J’ai lu les changements de cette version et vérifié les
                  alertes.
                </label>
                <div className="actions">
                  <button
                    className="primary"
                    disabled={busy || !read}
                    onClick={() =>
                      void run(base + "/review", {
                        approved: true,
                        hash: candidate.hash,
                      })
                    }
                  >
                    Approuver la nouvelle version
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(base + "/review", {
                        approved: false,
                        hash: candidate.hash,
                      })
                    }
                  >
                    Rejeter la nouvelle version
                  </button>
                </div>
              </>
            )}
            {candidate.etat === "reviewed" && (
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void run(base + "/mettre-a-jour/installer", {
                    hash: candidate.hash,
                  })
                }
              >
                Installer la mise à jour
              </button>
            )}
          </div>
        )}
        {(update?.precedentes ?? []).map((p) => (
          <button
            key={p.hash}
            disabled={busy}
            onClick={() => void run(base + "/revenir", { hash: p.hash })}
          >
            Revenir à la version {p.version || short(p.sha) || short(p.hash)}
          </button>
        ))}
        {note && <p role="status">{note}</p>}
        {error && (
          <p className="danger" role="alert">
            {error}
          </p>
        )}
        {steps && <p className="skill-steps">{steps}</p>}
        <div className="actions">
          <button
            disabled={busy}
            onClick={() => void run(base + "/verifier", {})}
          >
            Vérifier
          </button>
          {update?.disponible && update.source === "git" && !candidate && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => void run(base + "/mettre-a-jour", {})}
            >
              Mettre à jour
            </button>
          )}
        </div>
        <small>
          Une nouvelle version arrive en quarantaine et attend votre revue ;
          rien n’est installé ni activé sans votre clic.
        </small>
      </section>
    </details>
  );
}
