// reponse-04 : la réponse de l'agent d'une mission hors career-ops, façon Claude Code
// (BRIEF-conversation-reponse-04, maquette « Conversation agent v5 »). Surtout du texte, dans cet ordre :
// 1. une ligne d'activité repliable (+ incidents en ligne, jamais en bannière) ;
// 2. le texte markdown (tableaux et graphiques ```chart en ligne) ;
// 3. les fichiers produits ;
// 4. une ligne méta repliable (vérification, preuves, agent, coût).
// RunView (Mission.tsx) reste exporté : tests, détails techniques.
import { Fragment, useMemo, useState, useSyncExternalStore } from "react";
import { AgentAnswer } from "./Bilan";
import {
  activity,
  actionsDuration,
  describeTool,
  isActiveTool,
  OwnerBubble,
  ownerWaits,
  shortToolName,
  SkillChip,
  Waiting,
  waitingLabel,
  type Owner,
  type Tool,
  type Wait,
} from "./Career";
import { withoutResultEnvelope } from "./envelope";
import { Markdown, safeLink } from "./Markdown";
import { extraReads, provenanceText } from "./Mission";
import {
  MISSION_GRANT_NOTICE,
  missionGrantActive,
  OwnerRequests,
  type Act,
} from "./OwnerRequests";
import { SkillSteps } from "./SkillSteps";
import { trackerItems, trackerMarks } from "./Tracker";
import { ownerTextsVersion, subscribeOwnerTexts } from "./ownerMessages";
import type { Run, RunEvent } from "./types";
import { finalStates, labels, money } from "./types";

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;
const lastEvent = (events: RunEvent[], type: string) =>
  [...events].reverse().find((event) => event.type === type);

function Chevron() {
  return (
    <svg
      className="chevron"
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
function TerminalIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="2.5"
        width="13"
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 6.5l2 1.5-2 1.5M8.5 10h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Une phrase discrète, « ! » orange ; jamais une bannière (BRIEF 04).
export function Incident({ text }: { text: string }) {
  return (
    <p className="incident" role="status">
      <b aria-hidden="true">!</b>
      <span>{text}</span>
    </p>
  );
}

const marks: Record<string, string> = {
  completed: "✓",
  failed: "✕",
  pending: "•",
  in_progress: "•",
};
// « A exécuté 38 actions · 4 min 12 s », repliée ; dépliée, une action par ligne.
function ActivityLine({ tools, waits }: { tools: Tool[]; waits: Wait[] }) {
  const [open, setOpen] = useState(false);
  if (!tools.length) return null;
  const busy = tools.some(isActiveTool);
  const failed = tools.filter((t) => t.status === "failed").length;
  const duration = busy ? null : actionsDuration(tools, waits);
  const current = busy ? [...tools].reverse().find(isActiveTool) : undefined;
  const name = (tool: Tool) => shortToolName(describeTool(tool).name);
  return (
    <div className="activity-line">
      <button
        type="button"
        className="activity-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <TerminalIcon />
        <span>
          {busy ? "Exécute" : "A exécuté"}{" "}
          {plural(tools.length, "action", "actions")}
          {failed > 0 && ` · ${plural(failed, "erreur", "erreurs")}`}
        </span>
        {current && <span className="activity-current">{name(current)}</span>}
        {duration && <small>{duration}</small>}
        <Chevron />
      </button>
      {open && (
        <ol className="activity-actions">
          {tools.map((tool) => {
            const { summary } = describeTool(tool);
            const text = [name(tool), summary].filter(Boolean).join(" ");
            return (
              <li key={tool.id} className={"act " + tool.status}>
                <span className="mark" aria-hidden="true">
                  {marks[tool.status] ?? "○"}
                </span>
                <span className="act-text" title={text}>
                  {text}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// Brief 02 : les étapes d'un workflow, une ligne repliable « Étape i/n · <étape en cours> » ;
// dépliée, la liste ✓ ✕ • ○ ! (mêmes marques que le panneau Activité).
const stepTone: Record<string, string> = {
  done: "completed",
  failed: "failed",
  running: "in_progress",
  waiting: "in_progress",
  pending: "",
};
function StepsLine({ run, events }: { run: Run; events: RunEvent[] }) {
  const [open, setOpen] = useState(false);
  if (!run.plan?.workflow?.steps?.length) return null;
  const items = trackerItems(run, events);
  const done = items.filter((i) => i.mark === "done").length;
  const at = items.findIndex(
    (i) => i.mark === "running" || i.mark === "waiting",
  );
  return (
    <div className="activity-line">
      <button
        type="button"
        className="activity-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <TerminalIcon />
        <span>
          {at >= 0
            ? `Étape ${at + 1}/${items.length} · ${items[at].title}`
            : `${done}/${items.length} ${items.length > 1 ? "étapes terminées" : "étape terminée"}`}
        </span>
        <Chevron />
      </button>
      {open && (
        <ol className="activity-actions">
          {items.map((item) => (
            <li key={item.id} className={"act " + stepTone[item.mark]}>
              <span className="mark" aria-hidden="true">
                {trackerMarks[item.mark]}
              </span>
              <span className="act-text" title={item.title}>
                {item.title}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// Fichiers écrits par les appels terminés de l'agent (ACP `kind: "edit"` et leur chemin).
function producedFiles(tools: Tool[]) {
  const paths: string[] = [];
  for (const tool of tools)
    if (
      tool.callKind === "edit" &&
      tool.status === "completed" &&
      tool.location &&
      !paths.includes(tool.location)
    )
      paths.push(tool.location);
  return paths;
}
function FileCard({ path }: { path: string }) {
  const name = path.split(/[\\/]/).pop() || path;
  return (
    <div className="file-card" title={path}>
      <DocIcon />
      <span className="file-text">
        <span className="file-name">{name}</span>
        <span className="file-path">{path}</span>
      </span>
    </div>
  );
}

// Coût et unités d'une mission, mots du back.
function usageRows(run: Run): [string, string][] {
  if (!run.usage) return [["Coût plateforme", "Non mesuré"]];
  const dims = run.usage.byDimension ?? [];
  const list = (billable: boolean) =>
    dims
      .filter((d) => d.billable === billable)
      .map((d) => `${d.category} : ${d.units}`)
      .join(", ");
  const rows: [string, string][] = [
    [
      "Coût plateforme",
      [money(run.usage.platformCents, run.usage.currency), list(true)]
        .filter(Boolean)
        .join(" · "),
    ],
  ];
  if (list(false)) rows.push(["Non facturé", list(false)]);
  return rows;
}
export function metaParts(run: Run, events: RunEvent[]) {
  const proofs = run.result?.evidence?.length ?? 0;
  return [
    lastEvent(events, "verification") ? "✓ Vérifié" : "",
    proofs ? plural(proofs, "preuve", "preuves") : "",
    run.agent,
    run.usage ? money(run.usage.platformCents, run.usage.currency) : "",
  ].filter(Boolean);
}
// « ✓ Vérifié · 2 preuves · claude · 0,00 € », repliée ; dépliée en liste clé/valeur.
export function MetaLine({ run, events }: { run: Run; events: RunEvent[] }) {
  const [open, setOpen] = useState(false);
  const parts = metaParts(run, events);
  if (!parts.length) return null;
  const evidence = Array.isArray(run.result?.evidence)
    ? run.result!.evidence
    : [];
  const extra = extraReads(run);
  const verification = lastEvent(events, "verification")?.data;
  const session = lastEvent(events, "session")?.data;
  const sessionModel = (session?.models as { current?: string } | undefined)
    ?.current;
  const sessionMode = (session?.modes as { current?: string } | undefined)
    ?.current;
  const data = provenanceText(run, events);
  const rows: [string, string][] = [
    ...usageRows(run),
    [
      "Agent",
      `${run.agent} · ${run.model || "modèle par défaut du fournisseur"} (non confirmé par ACP)`,
    ],
    [
      "Compte",
      run.simulated
        ? "Démonstrateur · aucun modèle appelé"
        : "BYOA · consommation fournisseur inconnue, non refacturée",
    ],
    [
      "Registre",
      run.ledger
        ? run.ledger.ok
          ? "Intègre (vérifié par le backend)"
          : "Registre altéré"
        : "Non disponible",
    ],
    [
      "Preuves",
      [
        evidence.length
          ? plural(evidence.length, "élément", "éléments")
          : "Aucune",
        verification ? String(verification.scope || "portée non précisée") : "",
        extra.length
          ? `${plural(extra.length, "autre page lue", "autres pages lues")} hors des preuves vérifiées`
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ],
  ];
  if (data) rows.push(["Données", data]);
  if (session)
    rows.push([
      "Session",
      `ACP · modèle ${sessionModel || "non annoncé"} · mode ${sessionMode || "non annoncé"}`,
    ]);
  if (run.browser) rows.push(["Navigateur", run.browser]);
  return (
    <div className="meta-line">
      <button
        type="button"
        className="meta-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {parts.map((part, i) => (
          <Fragment key={i}>
            {i > 0 && " · "}
            <span className={part.startsWith("✓") ? "ok" : undefined}>
              {part}
            </span>
          </Fragment>
        ))}
        <Chevron />
      </button>
      {open && (
        <>
          <dl className="meta-details">
            {rows.map(([key, value]) => (
              <Fragment key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
          </dl>
          {(evidence.length > 0 || extra.length > 0) && (
            <details className="fold meta-proofs">
              <summary>Voir les preuves</summary>
              {evidence.map((e, i) => (
                <pre key={i}>
                  {typeof e === "string" ? e : JSON.stringify(e, null, 2)}
                </pre>
              ))}
              {extra.length > 0 && (
                <ul>
                  {extra.map((r, i) => (
                    <li key={i}>
                      <code>{r.host + r.path}</code> <small>{r.reason}</small>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )}
        </>
      )}
    </div>
  );
}

// Brief 02 : l'accord d'une étape de workflow, dans la réponse (mêmes appels qu'avant).
function StepApprovals({
  run,
  busy,
  act,
}: {
  run: Run;
  busy: boolean;
  act: Act;
}) {
  const definitions = run.plan?.workflow?.steps || [];
  const pending = (run.steps ?? []).filter(
    (s) => s.state === "waiting_approval" || s.state === "uncertain",
  );
  return (
    <>
      {pending.map((s) => {
        const title =
          definitions.find((d) => d.id === s.step_id)?.title || s.step_id;
        const drafts = (run.steps ?? []).filter(
          (p) =>
            p.output &&
            definitions
              .find((d) => d.id === s.step_id)
              ?.dependsOn?.includes(p.step_id),
        );
        const call = (body: unknown) =>
          void act(`/runs/${run.id}/steps/${s.step_id}`, body);
        return (
          <div
            className="inline-approval"
            key={s.step_id}
            role="region"
            aria-label="Votre accord est requis"
          >
            <i aria-hidden="true" />
            <span>
              <strong>{title}</strong> ·{" "}
              {s.state === "uncertain"
                ? "L’effet de cette étape est incertain. Vérifiez son résultat avant de décider."
                : "Relisez le brouillon avant de valider. Aucun envoi ne sera effectué."}
            </span>
            {s.state === "waiting_approval" ? (
              <>
                <button
                  disabled={busy}
                  onClick={() => call({ approved: false })}
                >
                  Refuser
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => call({ approved: true })}
                >
                  Approuver
                </button>
              </>
            ) : (
              [
                ["retry", "Relancer"],
                ["done", "Marquer comme faite"],
                ["fail", "Marquer en échec"],
              ].map(([action, label]) => (
                <button
                  key={action}
                  disabled={busy}
                  onClick={() => call({ action })}
                >
                  {label}
                </button>
              ))
            )}
            {drafts.map((p) => (
              <details className="fold review-output" key={p.step_id} open>
                <summary>Brouillon à relire</summary>
                <Markdown
                  text={
                    typeof p.output === "string"
                      ? p.output
                      : p.output &&
                          typeof p.output === "object" &&
                          "summary" in p.output
                        ? String((p.output as { summary: unknown }).summary)
                        : JSON.stringify(p.output, null, 2)
                  }
                />
              </details>
            ))}
          </div>
        );
      })}
    </>
  );
}

// Les offres d'un workflow : un tableau replié, sous le texte.
function Offers({ run }: { run: Run }) {
  const offers = run.result?.opportunities ?? [];
  if (!offers.length) return null;
  return (
    <details className="fold offers">
      <summary>Voir les {plural(offers.length, "offre", "offres")}</summary>
      <div className="md-table">
        <table>
          <caption className="sr-only">Classement des offres</caption>
          <thead>
            <tr>
              <th>Offre</th>
              <th>Employeur</th>
              <th>Lieu</th>
              <th>Score</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <td>{o.title}</td>
                <td>{o.company}</td>
                <td>{o.location}</td>
                <td className="num">{o.score}</td>
                <td>
                  {safeLink(o.url) ? (
                    <a href={o.url} target="_blank" rel="noopener noreferrer">
                      {o.source || o.attribution || "Voir la source"} ↗
                    </a>
                  ) : (
                    o.source || "Non fournie"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function RunTurn({
  run,
  events,
  busy,
  act,
  incident,
  requests = true,
}: {
  run: Run;
  events: RunEvent[];
  busy: boolean;
  act: Act;
  // Erreur d'une action sur cette mission : une ligne, pas une bannière.
  incident?: string;
  requests?: boolean;
}) {
  const items = useMemo(() => activity(events), [events]);
  const waits = useMemo(() => ownerWaits(events), [events]);
  // Re-render when this page learns the text of a message it sent (private mission).
  useSyncExternalStore(subscribeOwnerTexts, ownerTextsVersion);
  const tools = items.filter((i): i is Tool => i.kind === "tool");
  const owners = items.filter((i): i is Owner => i.kind === "owner");
  const live = !finalStates.has(run.state);
  const incomplete = run.error?.match(
    /^Mission incomplète\s*:\s*([\s\S]+)/,
  )?.[1];
  const resumable =
    (run.mode === "workflow" &&
      ["failed", "cancelled", "interrupted"].includes(run.state)) ||
    (run.resumable && finalStates.has(run.state));
  // Le texte de l'agent tant qu'il n'y a pas de réponse finale (en cours, ou fin sans résultat).
  const transcript =
    live || !run.result
      ? items
          .filter((i) => i.kind === "text")
          .map((i) => withoutResultEnvelope((i as { text: string }).text, true))
          .filter((text) => text.trim())
          .join("\n\n")
      : "";
  const label = live ? waitingLabel(items) : null;
  const failedMembers = (Array.isArray(run.family) ? run.family : []).filter(
    (m) => ["failed", "interrupted"].includes(String(m?.state)),
  ).length;
  const files = producedFiles(tools);
  return (
    <>
      {live && <SkillChip events={events} run={run} />}
      <div className="reponse">
        <div className="reponse-activite">
          <StepsLine run={run} events={events} />
          <ActivityLine tools={tools} waits={waits} />
          {incident && <Incident text={incident} />}
          {run.error && !live && (
            <Incident
              text={
                incomplete
                  ? `Mission incomplète : ${incomplete}`
                  : `${labels[run.state] || run.state} : ${run.error}`
              }
            />
          )}
          {failedMembers > 0 && (
            <Incident
              text={`${plural(failedMembers, "sous-agent a échoué", "sous-agents ont échoué")} : détail dans le panneau Activité.`}
            />
          )}
          {requests && missionGrantActive(events, run.state) && (
            <Incident text={MISSION_GRANT_NOTICE} />
          )}
        </div>
        {owners.map((message) => (
          <OwnerBubble key={message.id} message={message} />
        ))}
        {transcript && (
          <div className="reponse-texte">
            <Markdown text={transcript} />
            {live && <span className="stream-caret" aria-hidden="true" />}
          </div>
        )}
        {label && <Waiting label={label} />}
        <SkillSteps progress={run.skillProgress} />
        <StepApprovals run={run} busy={busy} act={act} />
        {requests && <OwnerRequests run={run} busy={busy} act={act} />}
        {run.result && (
          <section className="reponse-resultat" aria-label="Résultats">
            <AgentAnswer
              text={run.result.summary}
              answer={run.result.answer}
              notes={run.result.platformNotes}
            />
            {run.result.simulated && (
              <small className="fictif">Données fictives</small>
            )}
            <Offers run={run} />
          </section>
        )}
        {files.length > 0 && (
          <div className="reponse-fichiers">
            {files.map((path) => (
              <FileCard key={path} path={path} />
            ))}
          </div>
        )}
        <div className="actions">
          {live && (
            <button
              className="stop-mission"
              disabled={busy}
              onClick={() => void act(`/runs/${run.id}/cancel`, {})}
            >
              Arrêter la mission
            </button>
          )}
          {resumable && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => void act(`/runs/${run.id}/resume`, {})}
            >
              {run.mode === "workflow"
                ? "Reprendre le workflow"
                : "Reprendre la session"}
            </button>
          )}
        </div>
        {!live && <MetaLine run={run} events={events} />}
      </div>
    </>
  );
}
