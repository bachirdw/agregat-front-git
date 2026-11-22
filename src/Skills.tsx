import { useEffect, useId, useRef, useState } from "react";
import { safeLink } from "./Markdown";
import { readMissingField } from "./skills-composer/missing";
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
// Filet pour un back ancien : depuis import-textes-01 (E195), le serveur envoie une phrase prête à afficher,
// qui peut contenir « clone » ou une adresse « …/git-… » : seule une commande git brute est réécrite.
function plainImportError(message: string) {
  if (
    /^Command failed: git\b|\bgit(?: -c \S+)* (?:clone|fetch|checkout)\b|^Cloning into\b/.test(
      message,
    )
  )
    return {
      error:
        "Le téléchargement du dépôt depuis GitHub a échoué (réseau lent ou coupé, ou délai dépassé) : réessayez dans un moment.",
      detail: message,
    };
  return { error: message };
}
type SkillGroup = "installed" | "available" | "quarantined" | "rejected";
const groupOf = (skill: Skill): SkillGroup => {
  if (skill.state === "rejected") return "rejected";
  if (["quarantined", "reviewed"].includes(skill.state)) return "quarantined";
  if (["installed", "active"].includes(skill.state) || skill.installed)
    return "installed";
  return "available";
};
const skillLabels: Record<string, string> = {
  quarantined: "Quarantaine",
  reviewed: "Approuvé · à installer",
  rejected: "Rejeté",
  installed: "Installé",
  active: "Actif",
  available: "",
};
const sections: { key: SkillGroup; title: string; sub: string }[] = [
  {
    key: "installed",
    title: "Installés",
    sub: "Disponibles dans le composer avec /",
  },
  {
    key: "available",
    title: "Embarqués",
    sub: "Disponibles à installer ; l’intégrité est indiquée dans le détail",
  },
  {
    key: "quarantined",
    title: "En quarantaine",
    sub: "Importés, en attente de votre revue ou de leur installation",
  },
  { key: "rejected", title: "Rejetés", sub: "Jamais chargés par les agents" },
];
function skillDocument(skill: Skill) {
  const source = skill.source;
  if (!source?.url || !/^[a-f0-9]{40}$/i.test(source.sha))
    return readMissingField<string>("skills.documentUrl");
  const match = source.url.match(
    /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/,
  );
  if (!match) return readMissingField<string>("skills.documentUrl");
  const segments = (source.subdir || "")
    .split("/")
    .filter((p) => p && p !== ".");
  if (segments.includes("..")) return undefined;
  return safeLink(
    `https://github.com/${match[1]}/${match[2]}/blob/${source.sha}/${[...segments, "SKILL.md"].map(encodeURIComponent).join("/")}`,
  );
}
function SkillCard({
  skill,
  busy,
  act,
  request,
  canChain,
  open,
  toggle,
}: {
  skill: Skill;
  busy: boolean;
  act: (path: string, body: unknown) => Promise<void>;
  request: SkillRequest;
  canChain: boolean;
  open: boolean;
  toggle: () => void;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const detailId = useId();
  const notice = skill.notification;
  const base = "/skills/" + encodeURIComponent(skill.id);
  const group = groupOf(skill);
  const documentUrl = skillDocument(skill);
  const scripts = readMissingField<number>("skills.scriptCount");
  const canInstall =
    skill.state === "reviewed" ||
    (group === "available" && skill.origin !== "third-party");
  const approve = async () => {
    setWorking(true);
    setError("");
    setNote("");
    try {
      await request(base + "/review", { approved: true, hash: skill.hash });
      // Only the request contract propagates failures; legacy act callers keep the two-step review.
      if (canChain) await request(base + "/install", {});
      else
        setNote(
          "Revue enregistrée. Installez le Skill une fois son approbation confirmée.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  };
  const disabled = busy || working;
  return (
    <article className={"sk-row sk-state-" + group}>
      <div className="sk-row-head">
        <button
          className="sk-row-toggle"
          type="button"
          aria-label={"Détails de " + skill.name}
          aria-expanded={open}
          aria-controls={detailId}
          onClick={toggle}
        >
          <span className="sk-monogram" aria-hidden="true">
            {skill.name.charAt(0).toUpperCase()}
          </span>
          <span className="sk-row-copy">
            <span className="sk-row-title">
              <span className="sk-name">{skill.name}</span>
              <span className="sk-state">
                {skillLabels[skill.state] ||
                  (skill.state !== "available" ? skill.state : "")}
              </span>
            </span>
            <span className="sk-description">
              {skill.description || "Description non fournie"}
            </span>
          </span>
        </button>
        {canInstall && (
          <button
            className="sk-quick-install"
            type="button"
            aria-label={"Installer " + skill.name}
            disabled={disabled}
            onClick={() => void act(base + "/install", {})}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M8 2.5v11M2.5 8h11" />
            </svg>
          </button>
        )}
        {group === "installed" && (
          <span className="sk-installed-check" aria-label="Installé">
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 8.5l3.2 3L13 4.5" />
            </svg>
          </span>
        )}
        {skill.state === "quarantined" && (
          <button
            className="sk-examine"
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={detailId}
          >
            Examiner
          </button>
        )}
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
      {open && (
        <div className="sk-detail" id={detailId}>
          <dl className="sk-meta">
            <dt>Version</dt>
            <dd>v{skill.version}</dd>
            <dt>Source</dt>
            <dd>
              {skill.source?.url ? (
                <>
                  {skill.source.url}
                  {skill.source.sha && " @ " + skill.source.sha}
                </>
              ) : skill.origin === "third-party" ? (
                "Non fournie"
              ) : (
                "Embarqué"
              )}
            </dd>
            <dt>Licence</dt>
            <dd>{skill.license || "non annoncée"}</dd>
            <dt>Intégrité</dt>
            <dd className={skill.integrity ? "sk-verified" : "sk-danger"}>
              {skill.integrity
                ? "vérifiée"
                : "Contenu modifié · réimporter ou réinstaller après revue"}
            </dd>
            <dt>Scripts</dt>
            <dd>
              {scripts === undefined
                ? "Bientôt"
                : scripts + " · jamais exécutés à l’installation"}
            </dd>
            {skill.files !== undefined && (
              <>
                <dt>Fichiers</dt>
                <dd>{skill.files}</dd>
              </>
            )}
          </dl>
          {skill.findings?.map((f, i) => (
            <FindingLine key={i} finding={f} />
          ))}
          <CompatibilityPanel skill={skill} />
          <UpdatePanel skill={skill} busy={disabled} request={request} />
          {skill.state === "quarantined" && (
            <>
              <p>
                Le contenu des fichiers n’est pas affiché ici. Consultez le
                dépôt et sa révision exacte avant d’approuver.
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
              <div className="sk-actions">
                <button
                  className="sk-action sk-primary"
                  disabled={disabled || !reviewed || !skill.integrity}
                  onClick={() => void approve()}
                >
                  {canChain
                    ? "Approuver et installer"
                    : "Approuver après lecture"}
                </button>
                {documentUrl ? (
                  <a
                    className="sk-action"
                    href={documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Lire SKILL.md
                  </a>
                ) : (
                  <button className="sk-action" disabled>
                    Lire SKILL.md · Bientôt
                  </button>
                )}
                <button
                  className="sk-action sk-danger"
                  disabled={disabled}
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
          <div className="sk-actions">
            {canInstall && (
              <button
                className="sk-action sk-primary"
                disabled={disabled}
                onClick={() => void act(base + "/install", {})}
              >
                Installer
              </button>
            )}
            {skill.installed &&
              !skill.integrity &&
              skill.origin !== "third-party" && (
                <button
                  className="sk-action"
                  disabled={disabled}
                  onClick={() => void act(base + "/install", {})}
                >
                  Réinstaller après revue
                </button>
              )}
            {skill.installed && (
              <button
                className="sk-action sk-danger"
                disabled={!readMissingField<boolean>("skills.uninstall")}
                title="Bientôt : désinstallation non fournie par l’API"
              >
                Désinstaller · Bientôt
              </button>
            )}
            {skill.installed && skill.integrity && (
              <button
                className="sk-action"
                disabled={disabled}
                onClick={() =>
                  void act(base + "/activate", { active: !skill.active })
                }
              >
                {skill.active ? "Désactiver" : "Activer"}
              </button>
            )}
            {skill.state === "rejected" && (
              <button
                className="sk-action"
                disabled={!readMissingField<boolean>("skills.requarantine")}
              >
                Remettre en quarantaine · Bientôt
              </button>
            )}
          </div>
          {working && <p role="status">Revue et installation en cours…</p>}
          {note && <p role="status">{note}</p>}
          {error && (
            <p className="sk-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
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
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importKind, setImportKind] = useState<"git" | "local">("git");
  const [localPath, setLocalPath] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const addRoot = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const addMenu = useRef<HTMLDivElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const addMenuId = useId();
  const closeAdd = (restore = false) => {
    setAddOpen(false);
    if (restore) addButton.current?.focus();
  };
  useEffect(() => {
    if (!addOpen) return;
    addMenu.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (!addRoot.current?.contains(event.target as Node)) setAddOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAdd(true);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [addOpen]);
  useEffect(() => {
    if (importOpen) importInput.current?.focus();
  }, [importOpen, importKind]);
  const send: SkillRequest =
    request ?? ((path, body) => act(path, body).then(() => undefined));
  // The last import: the back's answer, or its refusal with candidates or a plugin to choose from.
  const [outcome, setOutcome] = useState<ImportView | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  // A clone of the repository can take minutes (22/11: 40 s, then more than 2 min).
  const [pending, setPending] = useState(false);
  const known = new Map(catalog.skills.map((s) => [s.id, s.state]));
  const target =
    importKind === "git"
      ? { git: git.trim(), subdir: subdir.trim() || "." }
      : { path: localPath.trim() };
  const importReady = importKind === "git" ? !!git.trim() : !!localPath.trim();
  const openImport = (kind: "git" | "local") => {
    closeAdd();
    setImportKind(kind);
    setImportOpen(true);
    setOutcome(null);
    setChosen([]);
  };
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
  const matches = catalog.skills.filter(
    (s) =>
      !query.trim() ||
      `${s.name} ${s.description || ""}`
        .toLocaleLowerCase("fr")
        .includes(query.trim().toLocaleLowerCase("fr")),
  );
  const visible = matches.filter((s) =>
    filter === "Tous"
      ? groupOf(s) !== "rejected"
      : groupOf(s) ===
        (filter === "Installés"
          ? "installed"
          : filter === "Quarantaine"
            ? "quarantined"
            : "rejected"),
  );
  const counts: Record<string, number> = {
    Tous: catalog.skills.length,
    Installés: catalog.skills.filter((s) => groupOf(s) === "installed").length,
    Quarantaine: catalog.skills.filter((s) => groupOf(s) === "quarantined")
      .length,
    Rejetés: catalog.skills.filter((s) => groupOf(s) === "rejected").length,
  };
  return (
    <div className="sk-screen" data-screen-label="Skills">
      <header className="sk-heading">
        <div className="sk-heading-copy">
          <h1>Skills</h1>
          <p>
            Méthodes métier portables. Un Skill tiers reste en quarantaine
            jusqu’à votre revue ; l’installation n’exécute aucun script.
          </p>
        </div>
        <div className="sk-heading-tools" ref={addRoot}>
          <label className="sk-search">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7c7c82"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              aria-label="Rechercher des Skills"
              placeholder="Rechercher des Skills"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            className="sk-add"
            ref={addButton}
            aria-haspopup="menu"
            aria-expanded={addOpen}
            aria-controls={addOpen ? addMenuId : undefined}
            disabled={pending}
            onClick={() => setAddOpen(!addOpen)}
            onKeyDown={(e) => {
              if (["ArrowDown", "ArrowUp"].includes(e.key)) {
                e.preventDefault();
                setAddOpen(true);
              }
            }}
          >
            Ajouter
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path
                d="M2 3.5l3 3 3-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {addOpen && (
            <div
              className="sk-add-menu"
              id={addMenuId}
              ref={addMenu}
              role="menu"
              aria-label="Ajouter un Skill"
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  setAddOpen(false);
                  return;
                }
                if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
                  return;
                e.preventDefault();
                const items = [
                  ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  ),
                ];
                const index = items.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? items.length - 1
                      : (index +
                          (e.key === "ArrowUp" ? -1 : 1) +
                          items.length) %
                        items.length;
                items[next]?.focus();
              }}
            >
              <button role="menuitem" onClick={() => openImport("git")}>
                <span>Importer depuis GitHub</span>
                <span>Arrive en quarantaine</span>
              </button>
              <button role="menuitem" onClick={() => openImport("local")}>
                <span>Importer un dossier local</span>
                <span>Dossier contenant un SKILL.md</span>
              </button>
              <button
                role="menuitem"
                disabled={!readMissingField<boolean>("skills.create")}
              >
                <span>Créer un Skill</span>
                <span>À partir d’une mission réussie · Bientôt</span>
              </button>
            </div>
          )}
        </div>
      </header>
      {importOpen && (
        <form
          className="sk-import"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && !pending && importReady) void importSkills();
          }}
        >
          <div className="sk-import-heading">
            <strong>
              {importKind === "git"
                ? "Importer depuis GitHub"
                : "Importer un dossier local"}
            </strong>
            <button
              type="button"
              className="sk-cancel"
              onClick={() => {
                setImportOpen(false);
                addButton.current?.focus();
              }}
            >
              Annuler
            </button>
          </div>
          <input
            ref={importInput}
            required
            type={importKind === "git" ? "url" : "text"}
            aria-label={importKind === "git" ? "Dépôt GitHub" : "Dossier local"}
            placeholder={
              importKind === "git"
                ? "https://github.com/owner/repo/tree/main/skills/nom"
                : "Chemin absolu du dossier contenant SKILL.md"
            }
            value={importKind === "git" ? git : localPath}
            onChange={(e) =>
              importKind === "git"
                ? setGit(e.target.value)
                : setLocalPath(e.target.value)
            }
          />
          {importKind === "git" && (
            <label className="sk-subdir">
              Sous-dossier
              <input
                aria-label="Sous-dossier"
                placeholder=".agents/skills/career-ops"
                value={subdir}
                onChange={(e) => setSubdir(e.target.value)}
              />
            </label>
          )}
          <div className="sk-import-footer">
            <p>
              {importKind === "local" ? (
                "Saisissez le chemin d’un dossier sur la machine du serveur, dans ses racines autorisées. Il doit contenir un fichier SKILL.md. Le Skill arrive en quarantaine."
              ) : (
                <>
                  Collez l’adresse telle quelle, copiée depuis GitHub : dépôt,
                  dossier (…/tree/main/skills/nom), fichier SKILL.md
                  (…/blob/…/SKILL.md) ou lien figé sur un commit. Le
                  sous-dossier est facultatif : laissez-le vide (ou « . ») si
                  l’adresse vise déjà le dossier. Le Skill arrive en
                  quarantaine.
                </>
              )}
            </p>
            <button
              className="sk-import-submit"
              disabled={busy || pending || !importReady}
            >
              Importer
            </button>
          </div>
        </form>
      )}
      {pending && (
        <p className="import-pending" role="status">
          {importKind === "git"
            ? "Téléchargement du dépôt depuis GitHub et lecture de ses Skills… Cela peut prendre une à deux minutes."
            : "Lecture du dossier local et de ses Skills…"}
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
      <div className="sk-filters" aria-label="Filtrer les Skills">
        {["Tous", "Installés", "Quarantaine", "Rejetés"].map((f) => (
          <button
            key={f}
            aria-label={f + " " + counts[f]}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
            <span>{counts[f]}</span>
          </button>
        ))}
      </div>
      {sections.map((section) => {
        const items = visible.filter((s) => groupOf(s) === section.key);
        return (
          items.length > 0 && (
            <section
              className="sk-section"
              key={section.key}
              aria-label={section.title}
            >
              <div className="sk-section-heading">
                <h2>{section.title}</h2>
                <span>{section.sub}</span>
              </div>
              <div className="sk-grid">
                {items.map((s) => (
                  <SkillCard
                    key={s.id + s.hash}
                    skill={s}
                    busy={busy || pending}
                    act={act}
                    request={send}
                    canChain={!!request}
                    open={expanded === s.id}
                    toggle={() => setExpanded(expanded === s.id ? null : s.id)}
                  />
                ))}
              </div>
            </section>
          )
        );
      })}
      {!visible.length && (
        <p className="sk-empty">
          {query.trim()
            ? "Aucun Skill ne correspond."
            : "Aucun Skill dans cette catégorie."}
        </p>
      )}
    </div>
  );
}
