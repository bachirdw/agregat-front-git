// activity-panel-03 : colonne « Activité » à côté du fil (remplace la carte Suivi et les Connexions
// locales). Chaque section n'apparaît que si le back fournit sa donnée : jamais d'exemple ni de chiffre
// par défaut. Le produit sert à postuler : le vocabulaire technique reste dans « Détails techniques ».
import { useId, useState, type ReactNode } from "react";
import { MemberRequests } from "./MemberRequests";
import type { Act } from "./OwnerRequests";
import { activity, describeTool, shortToolName } from "./Career";
import { activityRows, type ActivityRow } from "./ConnectionsPanel";
import { Icon } from "./Icon";
import { CarnetBlock, TeamBlock } from "./Team";
import {
  trackerDetails,
  trackerItems,
  trackerMarks,
  trackerPhrase,
  type Mark,
} from "./Tracker";
import type {
  Agent,
  AgendaItem,
  Catalog,
  FamilyMember,
  Run,
  RunEvent,
  Schedule,
} from "./types";
import { finalStates, labels } from "./types";

type Tool = Parameters<typeof describeTool>[0];
type DetailRow = [string, string, string?];

// « il y a 5 min » ; rien si la date est absente ou illisible.
export function since(at?: string | null, now = Date.now()) {
  const time = Date.parse(at ?? "");
  if (!Number.isFinite(time)) return "";
  const minutes = Math.floor((now - time) / 60000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}
// Durée entre deux instants ; rien si l'un manque ou si l'ordre est incohérent.
export function duration(start?: string, end?: string | number) {
  const from = Date.parse(start ?? "");
  const to = typeof end === "number" ? end : Date.parse(end ?? "");
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return "";
  const seconds = Math.round((to - from) / 1000);
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
  return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
}
const clock = (at?: string, seconds = false) => {
  const date = new Date(at ?? "");
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        ...(seconds ? { second: "2-digit" } : {}),
      });
};
// Lien seulement vers une adresse web ou une route du back local ; jamais javascript:, data:, //hôte.
export const safeHref = (url?: string) =>
  url && (/^https?:\/\//i.test(url) || /^\/(?![/\\])/.test(url))
    ? url
    : undefined;

// Connecteurs : mêmes règles que l'ancien panneau (agents réels seulement, jamais le démonstrateur).
// Without a probe the agent is only detected, as the Agents page says (« Détecté · non testé »).
const isUntested = (agent: Agent) =>
  agent.installed && agent.compatible && !agent.probe;
const isReady = (agent: Agent) =>
  agent.installed && agent.compatible && !!agent.probe && !agent.probe.error;
function connector(agent: Agent) {
  if (isReady(agent)) return { tone: "ready", state: "Connecté", why: "Prêt" };
  if (isUntested(agent))
    return {
      tone: "missing",
      state: "Détecté",
      why: "Détecté · non testé : la première mission le vérifiera",
    };
  if (!agent.installed)
    return {
      tone: "missing",
      state: "Non installé",
      why: agent.reason || "Non installé",
    };
  return {
    tone: "broken",
    state: "À reconnecter",
    why: agent.reason || agent.probe?.error || "Non prêt",
  };
}
export function connectorsSummary(catalog: Catalog | null) {
  if (!catalog) return "";
  const agents = catalog.agents.filter((agent) => !agent.simulated);
  if (!agents.length) return "Aucun agent détecté";
  const broken = agents.filter(
    (agent) => agent.installed && !isReady(agent) && !isUntested(agent),
  ).length;
  if (broken) return `${broken} à reconnecter`;
  const ready = agents.filter(isReady).length;
  if (ready === agents.length) return "Tous connectés";
  if (ready) return `${ready} connecté${ready > 1 ? "s" : ""}`;
  const seen = agents.filter(isUntested).length;
  return seen ? `${seen} détecté${seen > 1 ? "s" : ""}` : "Aucun connecté";
}
// Hôtes distincts lus pendant la mission (origine seulement : ni chemin ni requête).
export function visitedHosts(run: Run | null) {
  const hosts = new Map<string, string>();
  for (const read of run?.missionProof?.reads ?? []) {
    try {
      const url = new URL(read.url ?? "");
      if (/^https?:$/.test(url.protocol) && !hosts.has(url.host))
        hosts.set(url.host, url.origin);
    } catch {
      // Adresse absente ou illisible : rien à montrer.
    }
  }
  return [...hosts];
}
// Le journal garde ses libellés (tests et rapport) ; l'affichage les dit sans jargon.
function plainLabel(
  row: ActivityRow,
  event: RunEvent | undefined,
  tools: Map<string, Tool>,
) {
  if (!event) return row.label;
  const data = event.data ?? {};
  if (event.type === "agent" && data.sessionUpdate === "tool_call") {
    const tool = tools.get(String(data.toolCallId ?? event.seq));
    return tool
      ? shortToolName(describeTool(tool).name)
      : row.label.replace(/^Outil : /, "");
  }
  if (event.type === "session") return "Agent prêt pour la mission";
  if (event.type === "session_reset")
    return data.lost === false
      ? "Contexte précédent non rechargé : l’agent repart de zéro"
      : "Reprise impossible : l’agent repart de zéro";
  return row.label;
}

// Candidatures : un compteur n'apparaît que s'il est fourni par le back.
export function funnelCells(run: Run): [string, number][] {
  const cells: [string, number | undefined][] = [
    ["Offres trouvées", run.funnel?.found ?? run.result?.opportunities?.length],
    ["Retenues", run.funnel?.kept],
    ["Lettres prêtes", run.funnel?.letters],
    ["Envoyées", run.funnel?.sent],
  ];
  return cells.filter((cell): cell is [string, number] =>
    Number.isFinite(cell[1]),
  );
}

// Sous-agents : la famille du back (GET /api/runs/:id `family`, docs/api-delegation.md), complétée
// par les événements de la mère (modèle, heures de lancement et de fin, envois vus par la plateforme).
const stateOf = (member: FamilyMember) =>
  typeof member.state === "string" ? member.state : "";
const waitsForOwner = (member: FamilyMember) =>
  member.attend === "question" || member.attend === "carte_envoi";
export function familySummary(family: FamilyMember[]) {
  const running = family.filter(
    (member) => stateOf(member) === "running",
  ).length;
  const done = family.filter((member) =>
    finalStates.has(stateOf(member)),
  ).length;
  const waiting = family.filter(waitsForOwner).length;
  const head = running
    ? `${running} sous-agent${running > 1 ? "s" : ""} en cours`
    : `${family.length} sous-agent${family.length > 1 ? "s" : ""}`;
  return (
    `${head} · ${done}/${family.length} terminés` +
    (waiting
      ? ` · ${waiting} attend${waiting > 1 ? "ent" : ""} ta réponse`
      : "")
  );
}
function Section({
  title,
  summary,
  className,
  children,
}: {
  title: string;
  summary?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={"activity-section" + (className ? " " + className : "")}
    >
      <div className="activity-section-head">
        <h3>{title}</h3>
        {summary && <small>{summary}</small>}
      </div>
      {children}
    </section>
  );
}
function TechDetails({
  open,
  onToggle,
  rows,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  rows: DetailRow[];
  children?: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        className="tech-toggle"
        aria-expanded={open}
        onClick={onToggle}
      >
        <b className="chevron" aria-hidden="true">
          ›
        </b>
        Détails techniques
      </button>
      {open && (
        <div className="activity-tech">
          <dl>
            {rows.map(([key, value, tone]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd className={tone} title={value}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {children}
        </div>
      )}
    </>
  );
}
// Brief 02 : le journal brut de la mission, replié, dans les détails techniques.
function RawJournal({ events }: { events: RunEvent[] }) {
  const [open, setOpen] = useState(false);
  if (!events.length) return null;
  return (
    <details
      className="fold raw-journal"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Journal brut · {events.length} entrées</summary>
      {open && (
        <ol>
          {events.map((e) => (
            <li key={e.seq}>
              <span>
                #{e.seq} · {e.type}
              </span>
              <pre>{JSON.stringify(e.data, null, 2)}</pre>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
function StepList({
  label,
  steps,
}: {
  label: string;
  steps: { key: string; title: string; mark: Mark }[];
}) {
  return (
    <ol className="steps-list" aria-label={label}>
      {steps.map((step) => (
        <li className={"step " + step.mark} key={step.key}>
          <span className="mark" aria-hidden="true">
            {trackerMarks[step.mark]}
          </span>
          <span title={step.title}>{step.title}</span>
        </li>
      ))}
    </ol>
  );
}
function datePad(at: string) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: date
      .toLocaleDateString("fr-FR", { weekday: "short" })
      .replace(".", "")
      .toUpperCase(),
    num: date.getDate(),
    full: date.toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
    }),
    time: clock(at),
  };
}
const nextRun = (at?: string) => {
  const date = new Date(at ?? "");
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

// Ligne discrète du fil : n'existe que si le back a fourni la famille de la mission.
export function SubagentsLine({
  family,
  onOpen,
}: {
  family?: FamilyMember[];
  onOpen: () => void;
}) {
  if (!family?.length) return null;
  return (
    <button
      type="button"
      className="subagents-line"
      title="Voir les sous-agents dans le panneau Activité"
      onClick={onOpen}
    >
      <Icon name="grid" />
      <span>{familySummary(family)}</span>
      <b className="chevron" aria-hidden="true">
        ›
      </b>
    </button>
  );
}

export function ActivityPanel({
  catalog,
  run,
  events,
  onClose,
  details,
  setDetails,
  agenda,
  schedules,
  onOpenRun,
  onCancelRun,
  onOpenSide,
  busy,
  act,
}: {
  catalog: Catalog | null;
  run: Run | null;
  events: RunEvent[];
  onClose: () => void;
  // « Détails techniques » des étapes : piloté par App pour que le résumé du fil puisse l'ouvrir.
  details?: boolean;
  setDetails?: (open: boolean) => void;
  agenda?: AgendaItem[];
  schedules?: Schedule[];
  // sous-agents-19-11 : open a sub-mission (or the main mission) and cancel a sub-mission.
  onOpenRun?: (id: string) => void;
  onCancelRun?: (id: string) => void;
  // Vue scindée : un membre de l'équipe ouvert à côté du fil.
  onOpenSide?: (id: string) => void;
  busy?: boolean;
  // cartes-membres-22-11 : répondre ici à la carte qu'un membre attend (absent : rien n'est ajouté).
  act?: Act;
}) {
  const [connectors, setConnectors] = useState(false);
  const [ownDetails, setOwnDetails] = useState(false);
  const stepsDetails = details ?? ownDetails;
  const logId = useId();
  const agents = catalog?.agents.filter((agent) => !agent.simulated) ?? [];
  const summary = connectorsSummary(catalog);
  const hosts = visitedHosts(run);
  const rows = run ? activityRows(events, run) : [];
  const bySeq = new Map(events.map((event) => [String(event.seq), event]));
  const tools = new Map(
    activity(events).flatMap((item) =>
      item.kind === "tool" ? [[item.id, item as Tool] as const] : [],
    ),
  );
  const items = run ? trackerItems(run, events) : [];
  const done = items.filter((item) => item.mark === "done").length;
  const tone = !run
    ? ""
    : !finalStates.has(run.state)
      ? "running"
      : run.state === "completed"
        ? "completed"
        : "failed";
  const cells = run ? funnelCells(run) : [];
  const family = Array.isArray(run?.family) ? run!.family : [];
  const documents = run?.documents ?? [];
  const domains = run?.browserDomains ?? [];
  return (
    <aside className="activity-panel" aria-label="Activité">
      <header className="activity-header">
        <h2>Activité</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Fermer le panneau"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="activity-body">
        {typeof run?.famille?.mere === "string" && onOpenRun && (
          <div className="activity-parent">
            <span>Sous-agent d’une autre mission</span>
            <button
              type="button"
              onClick={() => onOpenRun(String(run.famille!.mere))}
            >
              Revenir à la mission principale
            </button>
          </div>
        )}
        <section className="activity-section activity-connectors">
          <h3 className="activity-section-head">
            <button
              type="button"
              aria-expanded={connectors}
              onClick={() => setConnectors(!connectors)}
            >
              <span>Connecteurs</span>
              {summary && <small>{summary}</small>}
              <b className="chevron" aria-hidden="true">
                ›
              </b>
            </button>
          </h3>
          {connectors && (
            <div className="connectors-body">
              {agents.length ? (
                <ul className="activity-rows">
                  {agents.map((agent) => {
                    const state = connector(agent);
                    const last = since(agent.probe?.at);
                    return (
                      <li
                        className="connector"
                        key={agent.id}
                        title={state.why}
                      >
                        <i
                          className={"state-dot " + state.tone}
                          aria-hidden="true"
                        />
                        <span className="row-text">{agent.name}</span>
                        <small>{state.state}</small>
                        {last && (
                          <small
                            className="connector-since"
                            title="Dernière vérification"
                          >
                            {last}
                          </small>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="activity-empty">
                  {catalog
                    ? "Aucun agent détecté sur cet ordinateur."
                    : "Chargement des agents…"}
                </p>
              )}
              {hosts.length > 0 && (
                <>
                  <h4>Sites consultés</h4>
                  <ul className="site-chips" aria-label="Sites consultés">
                    {hosts.map(([host, origin]) => (
                      <li key={host} title={origin}>
                        {host}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <h4 id={logId}>Connexions pendant la mission</h4>
              {rows.length ? (
                <div className="activity-log-scroll">
                  <table className="activity-log" aria-labelledby={logId}>
                    <colgroup>
                      <col className="col-time" />
                      <col />
                      <col className="col-state" />
                    </colgroup>
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Heure</th>
                        <th scope="col">Événement</th>
                        <th scope="col">État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.key}>
                          <td title={clock(row.at, true)}>{clock(row.at)}</td>
                          <td>{plainLabel(row, bySeq.get(row.key), tools)}</td>
                          <td
                            className={
                              row.tone ? "tone-" + row.tone : undefined
                            }
                          >
                            {row.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="activity-empty">
                  {run
                    ? "L’agent n’a encore rien fait."
                    : "Ouvre ou lance une mission pour voir ce que fait l’agent."}
                </p>
              )}
            </div>
          )}
        </section>
        {/* reponse-04 : l'équipe (logique swarm, Team.tsx) vit dans le panneau, plus dans le fil. */}
        {run && family.length > 0 && (
          <section className="activity-section activity-team">
            {act && (
              <MemberRequests
                run={run}
                busy={!!busy}
                act={act}
                onOpenMember={onOpenSide}
              />
            )}
            <TeamBlock
              run={run}
              openRun={onOpenRun}
              onOpenSide={onOpenSide}
              onCancel={onCancelRun}
              busy={busy}
            />
          </section>
        )}
        {run && Number(run.carnet?.total) > 0 && (
          <section className="activity-section activity-carnet">
            <CarnetBlock
              run={run}
              lessonsKept={
                events.filter((event) => event.type === "lecon_gardee").length
              }
            />
          </section>
        )}
        {run && cells.length > 0 && (
          <Section title="Candidatures">
            <div className="funnel">
              {cells.map(([label, count]) => (
                <div className="funnel-cell" key={label}>
                  <b>{count}</b>
                  <small>{label}</small>
                </div>
              ))}
            </div>
          </Section>
        )}
        {!!agenda?.length && (
          <Section title="Agenda">
            <ul className="activity-rows">
              {agenda.map((item) => {
                const pad = datePad(item.at);
                return (
                  <li className="agenda-row" key={item.id}>
                    <span className="agenda-date" title={pad?.full}>
                      {pad ? (
                        <>
                          <small>{pad.day}</small>
                          <b>{pad.num}</b>
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                    <span className="agenda-text">
                      <span>{item.title}</span>
                      {item.detail ? (
                        <small>{item.detail}</small>
                      ) : (
                        pad?.time && <small>{pad.time}</small>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}
        {run && (
          <Section
            title="Étapes de la mission"
            className="activity-steps"
            summary={items.length ? `${done}/${items.length}` : undefined}
          >
            <p className="steps-phrase" title={labels[run.state] || run.state}>
              <i className={"state-dot " + tone} aria-hidden="true" />
              {trackerPhrase(run, items)}
            </p>
            {items.length > 0 && (
              <StepList
                label="Étapes de la mission"
                steps={items.map((item) => ({ ...item, key: item.id }))}
              />
            )}
            <TechDetails
              open={stepsDetails}
              onToggle={() => (setDetails ?? setOwnDetails)(!stepsDetails)}
              rows={trackerDetails(run, events)}
            >
              <RawJournal events={events} />
            </TechDetails>
          </Section>
        )}
        {documents.length > 0 && (
          <Section title="Documents">
            <ul className="activity-rows">
              {documents.map((doc) => {
                const href = safeHref(doc.url);
                const body = (
                  <>
                    <Icon name="doc" />
                    <span className="row-text">{doc.name}</span>
                  </>
                );
                return (
                  <li key={doc.id}>
                    {href ? (
                      <a
                        className="activity-link"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {body}
                      </a>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}
        {!!schedules?.length && (
          <Section title="Tâches planifiées">
            <ul className="activity-rows">
              {schedules.map((task) => {
                const next = nextRun(task.next);
                return (
                  <li className="schedule-row" key={task.id}>
                    <span
                      className={
                        "schedule-icon " +
                        (task.recurring ? "recurring" : "once")
                      }
                      title={task.recurring ? "Récurrente" : "Unique"}
                    >
                      <Icon name={task.recurring ? "repeat" : "clock"} />
                    </span>
                    <span className="schedule-text">
                      <span>{task.name}</span>
                      {next && (
                        <small>
                          {task.recurring ? "Prochaine : " : "Prévue : "}
                          {next}
                        </small>
                      )}
                    </span>
                    <button
                      type="button"
                      className="schedule-stop"
                      disabled
                      aria-label={`Arrêter la tâche « ${task.name} »`}
                      title="Arrêt d’une tâche planifiée : bientôt disponible"
                    >
                      <span className="stop-square" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}
        <Section
          title="Sites autorisés"
          className="activity-sites"
          summary={domains.length ? String(domains.length) : undefined}
        >
          {!run ? (
            <p className="activity-empty">Aucune mission ouverte.</p>
          ) : domains.length ? (
            <>
              <ul
                className="activity-rows"
                aria-label="Domaines demandés pour la mission"
              >
                {domains.map((domain) => (
                  <li key={domain}>
                    <span className="row-text">{domain}</span>
                  </li>
                ))}
              </ul>
              <p className="activity-note">
                Domaines demandés au lancement de la mission.
              </p>
            </>
          ) : (
            <p className="activity-empty">
              Aucun domaine précisé pour cette mission.
            </p>
          )}
        </Section>
      </div>
    </aside>
  );
}
