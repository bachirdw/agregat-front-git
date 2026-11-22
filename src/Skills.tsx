import { useState } from "react";
import type { Catalog, Skill, SkillImportAnswer } from "./types";
import { ApiError } from "./api";
import {
  CompatibilityPanel,
  FindingLine,
  stateLabel,
  UpdatePanel,
  type SkillRequest,
} from "./SkillDetails";
// orchestre-22-11 : écran Skills sorti de Galleries.tsx (chantier A, maquette « Skills et composer »).
// What the import column shows: the back's answer, plus `notice` (a refusal that asks to choose: a
// step, not an error) and `detail` (the raw text of a technical failure, folded).
type ImportView = SkillImportAnswer & { notice?: string; detail?: string };
// Essai réel du 22/11 : un clone qui échoue rend la commande git brute (chemins temporaires locaux).
function plainImportError(message: string) {
  if (/^Command failed: git\b|\bgit\b[^\n]*\bclone\b/.test(message))
    return {
      error:
        "Le téléchargement du dépôt depuis GitHub a échoué (réseau lent ou coupé, ou délai dépassé) : réessayez dans un moment.",
      detail: message,
    };
  return { error: message };
}
const skillLabels: Record<string, string> = {
  quarantined: "Quarantaine · revue requise",
  reviewed: "Revu · à installer",
  rejected: "Rejeté",
  installed: "Installé · inactif",
  active: "Actif",
  available: "Disponible",
};
function SkillCard({
  skill,
  busy,
  act,
  request,
}: {
  skill: Skill;
  busy: boolean;
  act: (path: string, body: unknown) => Promise<void>;
  request: SkillRequest;
}) {
  const [reviewed, setReviewed] = useState(false);
  const notice = skill.notification;
  const base = "/skills/" + skill.id;
  return (
    <article className="card skill-card">
      <div className="card-pad">
        <div className="spread">
          <h2>{skill.name}</h2>
          <span
            className={
              "badge " + (skill.state === "quarantined" ? "warning" : "")
            }
          >
            {skillLabels[skill.state] || skill.state}
          </span>
        </div>
        {notice && (
          <span
            className={
              "badge skill-notice " +
              (notice.type === "mise-a-jour" ? "update" : "warning")
            }
            title={notice.texte}
          >
            {notice.type === "mise-a-jour"
              ? "Mise à jour conseillée"
              : "Problème connu"}
          </span>
        )}
        <small>
          v{skill.version} ·{" "}
          {skill.origin === "third-party" ? "Import tiers" : "Embarqué"}
        </small>
        <small>
          {skill.license
            ? "Licence : " + skill.license
            : "Licence non annoncée"}
          {skill.files !== undefined && ` · ${skill.files} fichier(s)`}
        </small>
        {skill.source && (
          <p className="mono">
            {skill.source.url} {skill.source.sha && "@ " + skill.source.sha}
          </p>
        )}
        <small className={skill.integrity ? "success" : "danger"}>
          {skill.integrity
            ? "Intégrité vérifiée"
            : "Contenu modifié · réimporter ou réinstaller après revue"}
        </small>
        {skill.findings?.map((f, i) => (
          <FindingLine key={i} finding={f} />
        ))}
        <CompatibilityPanel skill={skill} />
        <UpdatePanel skill={skill} busy={busy} request={request} />
        {skill.state === "quarantined" && (
          <>
            <p>
              Le contenu des fichiers n’est pas affiché ici. Consultez le dépôt
              et sa révision exacte avant d’approuver.
            </p>
            <p className="mono">Empreinte : {skill.hash}</p>
            <label className="check">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              J’ai lu les fichiers à cette révision et vérifié les alertes.
            </label>
            <div className="actions">
              <button
                className="primary"
                disabled={busy || !reviewed || !skill.integrity}
                onClick={() =>
                  void act(base + "/review", {
                    approved: true,
                    hash: skill.hash,
                  })
                }
              >
                Approuver après lecture
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void act(base + "/review", {
                    approved: false,
                    hash: skill.hash,
                  })
                }
              >
                Rejeter
              </button>
            </div>
          </>
        )}
        {(skill.origin !== "third-party" && !skill.installed) ||
        skill.state === "reviewed" ? (
          <button
            className="primary"
            disabled={busy}
            onClick={() => void act(base + "/install", {})}
          >
            Installer
          </button>
        ) : null}
        {skill.installed &&
          !skill.integrity &&
          skill.origin !== "third-party" && (
            <button
              disabled={busy}
              onClick={() => void act(base + "/install", {})}
            >
              Réinstaller après revue
            </button>
          )}
        {skill.installed && skill.integrity && (
          <button
            disabled={busy}
            onClick={() =>
              void act(base + "/activate", { active: !skill.active })
            }
          >
            {skill.active ? "Désactiver" : "Activer"}
          </button>
        )}
      </div>
    </article>
  );
}
// skills-nuit-22-11 : compte rendu d'un import, ou refus d'un dépôt à plusieurs Skills (une case par
// candidat, 30 au plus par appel) ou d'un plugin (agents et serveurs MCP décrits, jamais lancés).
function ImportOutcome({
  outcome,
  chosen,
  setChosen,
  busy,
  importSkills,
  known,
}: {
  outcome: ImportView;
  chosen: string[];
  setChosen: (paths: string[]) => void;
  busy: boolean;
  importSkills: (extra?: Record<string, unknown>) => Promise<void>;
  // Skills already in the registry, by id, with their state.
  known: Map<string, string>;
}) {
  const candidates = outcome.candidats ?? [];
  const plugin = outcome.plugin;
  const remaining = outcome.restants ?? [];
  const toggle = (path: string, on: boolean) =>
    setChosen(on ? [...chosen, path] : chosen.filter((p) => p !== path));
  return (
    <div className="card card-pad import-outcome" aria-live="polite">
      {outcome.error && (
        <p className="danger" role="alert">
          {outcome.error}
        </p>
      )}
      {outcome.detail && (
        <details className="import-detail">
          <summary>Détail technique</summary>
          <p className="mono">{outcome.detail}</p>
        </details>
      )}
      {outcome.notice && <p className="import-step">{outcome.notice}</p>}
      {outcome.message && <p role="status">{outcome.message}</p>}
      {(outcome.rapport ?? []).length > 0 && (
        <ul className="import-report">
          {outcome.rapport!.map((r, i) => (
            <li key={i}>
              {r.id || r.chemin || r.demande} · {r.statut}
              {r.raison ? ` : ${r.raison}` : ""}
            </li>
          ))}
        </ul>
      )}
      {plugin && (
        <div className="import-plugin">
          <strong>Plugin « {plugin.nom || "sans nom"} »</strong>
          {plugin.description && <small>{plugin.description}</small>}
          {(plugin.skills?.length ?? 0) > 0 && (
            <small>{plugin.skills!.length} Skill(s) dans le plugin</small>
          )}
          {(plugin.agents ?? []).map((a) => (
            <small key={"a" + a.nom}>
              Agent {a.nom}
              {a.description ? ` (${a.description})` : ""} · non lancé
            </small>
          ))}
          {(plugin.mcp ?? []).map((m) => (
            <small key={"m" + m.nom}>
              Serveur MCP {m.nom}
              {m.transport ? ` (${m.transport})` : ""} · non lancé
            </small>
          ))}
          {/* Refusal that describes a plugin (not yet imported): it can be imported whole. */}
          {outcome.importes === undefined && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => void importSkills({ plugin: true })}
            >
              Importer le plugin
            </button>
          )}
        </div>
      )}
      {candidates.length > 0 && (
        <fieldset className="import-candidates">
          <legend>Choisissez les Skills à importer (30 au plus)</legend>
          {candidates.map((c) => (
            <label key={c.chemin} className="check">
              <input
                type="checkbox"
                disabled={!c.id || !!c.erreur}
                checked={chosen.includes(c.chemin)}
                onChange={(e) => toggle(c.chemin, e.target.checked)}
              />
              <span>
                <strong>{c.id || c.chemin}</strong>
                {c.id && known.has(c.id)
                  ? ` · déjà importé (${stateLabel(known.get(c.id)!)})`
                  : ""}
                {c.erreur ? ` · non importable : ${c.erreur}` : ""}
                {c.description && (
                  <small className="import-desc"> · {c.description}</small>
                )}
              </span>
            </label>
          ))}
          {outcome.tronque && (
            <small>
              Recherche tronquée : collez l’adresse d’un dossier plus précis.
            </small>
          )}
          <button
            className="primary"
            disabled={busy || !chosen.length || chosen.length > 30}
            onClick={() => void importSkills({ choix: chosen })}
          >
            Importer la sélection ({chosen.length})
          </button>
        </fieldset>
      )}
      {remaining.length > 0 && (
        <button
          disabled={busy}
          onClick={() => void importSkills({ choix: remaining.slice(0, 30) })}
        >
          Importer la suite ({remaining.length} restants)
        </button>
      )}
    </div>
  );
}
export function Skills({
  catalog,
  busy,
  act,
  request,
}: {
  catalog: Catalog;
  busy: boolean;
  act: (path: string, body: unknown) => Promise<void>;
  // skills-nuit-22-11 : returns the back's answer (report, candidates of a refusal…); without it
  // (older callers), the actions go through `act`.
  request?: SkillRequest;
}) {
  const [git, setGit] = useState(""),
    [subdir, setSubdir] = useState(""),
    [filter, setFilter] = useState("Tous");
  const send: SkillRequest =
    request ?? ((path, body) => act(path, body).then(() => undefined));
  // The last import: the back's answer, or its refusal with candidates or a plugin to choose from.
  const [outcome, setOutcome] = useState<ImportView | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  // A clone of the repository can take minutes (22/11: 40 s, then more than 2 min).
  const [pending, setPending] = useState(false);
  const known = new Map(catalog.skills.map((s) => [s.id, s.state]));
  const target = { git: git.trim(), subdir: subdir.trim() || "." };
  const importSkills = async (extra: Record<string, unknown> = {}) => {
    setPending(true);
    try {
      const answer = (await send("/skills/import", {
        ...target,
        ...extra,
      })) as SkillImportAnswer | undefined;
      setOutcome(
        answer && typeof answer === "object" && !Array.isArray(answer)
          ? answer
          : null,
      );
      setChosen([]);
    } catch (e) {
      const data = (e as ApiError).data as SkillImportAnswer | undefined;
      const message = e instanceof Error ? e.message : String(e);
      const body = data && typeof data === "object" ? data : {};
      if ((body.candidats?.length ?? 0) > 0 || body.plugin) {
        // A repository with several Skills, or a plugin: the owner chooses, nothing went wrong.
        setOutcome({ ...body, error: undefined, notice: message });
        setChosen([]);
      } else
        // A failure keeps the candidates and the selection, ready to be sent again.
        setOutcome((old) => ({
          ...body,
          candidats: old?.candidats,
          plugin: old?.plugin,
          restants: body.restants ?? old?.restants,
          notice: old?.notice,
          tronque: old?.tronque,
          ...plainImportError(message),
        }));
    } finally {
      setPending(false);
    }
  };
  const visible = catalog.skills.filter(
    (s) =>
      filter === "Tous" ||
      (filter === "Installés"
        ? s.installed
        : filter === "Quarantaine"
          ? s.state === "quarantined"
          : s.state === "rejected"),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Skills</h1>
          <p>
            Méthodes métier portables. Un Skill tiers reste en quarantaine
            jusqu’à votre revue ; l’installation n’exécute aucun script.
          </p>
        </div>
      </div>
      <div className="skills-layout">
        <div>
          <form
            className="card card-pad import-form"
            onSubmit={(e) => {
              e.preventDefault();
              void importSkills();
            }}
          >
            <strong>Importer depuis GitHub</strong>
            <small className="import-help">
              Collez l’adresse telle quelle, copiée depuis GitHub : le dépôt, un
              dossier (…/tree/main/skills/nom), un fichier SKILL.md
              (…/blob/…/SKILL.md) ou un lien figé sur un commit. Le sous-dossier
              est facultatif : laissez-le vide (ou « . ») si l’adresse vise déjà
              le dossier.
            </small>
            <label>
              Dépôt GitHub
              <input
                required
                type="url"
                aria-label="Dépôt GitHub"
                placeholder="https://github.com/owner/repo"
                value={git}
                onChange={(e) => setGit(e.target.value)}
              />
            </label>
            <label>
              Sous-dossier
              <input
                aria-label="Sous-dossier"
                placeholder=".agents/skills/career-ops"
                value={subdir}
                onChange={(e) => setSubdir(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy || !git.trim()}>
              Importer en quarantaine
            </button>
          </form>
          {pending && (
            <p className="import-pending" role="status">
              Téléchargement du dépôt depuis GitHub et lecture de ses Skills…
              Cela peut prendre une à deux minutes.
            </p>
          )}
          {outcome && (
            <ImportOutcome
              outcome={outcome}
              chosen={chosen}
              setChosen={setChosen}
              busy={busy || pending}
              importSkills={importSkills}
              known={known}
            />
          )}
          <div className="segmented skill-filters">
            {["Tous", "Installés", "Quarantaine", "Rejetés"].map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <small>{catalog.skills.length} Skills au catalogue réel</small>
        </div>
        <div className="stack">
          {visible.map((s) => (
            <SkillCard
              key={s.id + s.hash + s.state}
              skill={s}
              busy={busy}
              act={act}
              request={send}
            />
          ))}
          {!visible.length && (
            <p className="empty">Aucun Skill dans cette catégorie.</p>
          )}
        </div>
      </div>
    </>
  );
}
