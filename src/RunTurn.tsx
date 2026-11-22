// reponse-04 : la réponse de l'agent d'une mission (career-ops compris depuis meme-affichage-21-11), façon Claude Code
// (BRIEF-conversation-reponse-04, maquette « Conversation agent v5 »). Surtout du texte, dans cet ordre :
// 1. une ligne d'activité repliable (+ incidents en ligne, jamais en bannière) ;
// 2. le texte markdown (tableaux et graphiques ```chart en ligne) ;
// 3. les fichiers produits ;
// 4. une ligne méta repliable (vérification, preuves, agent, coût).
// RunView (Mission.tsx) et CareerThread (Career.tsx) ne sont plus affichés par l'application ; gardés
// exportés pour leurs tests de composants, à retirer dans un lot à part.
import {
  Fragment,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { fetchRunFile } from "./api";
import { AgentAnswer } from "./Bilan";
import {
  activeSilence,
  activity,
  actionsDuration,
  CareerOffers,
  isCareerRun,
  nativeSubagents,
  usePrivateResult,
  describeTool,
  isActiveTool,
  OwnerBubble,
  ownerWaits,
  shortToolName,
  SkillChip,
  Waiting,
  waitingLabel,
  type AskedQuestion,
  type Item,
  type Owner,
  type OwnerAnswer,
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
import { MemberRequests } from "./MemberRequests";
import { SkillSteps } from "./SkillSteps";
import {
  dureeMission,
  derniere,
  etatDe,
  membresDe,
  partiesDuResume,
  tachesDe,
  TeamAnswer,
} from "./TeamAnswer";
import { texteAnnonce } from "./status";
import { trackerItems, trackerMarks } from "./Tracker";
import {
  ownerText,
  ownerTextsVersion,
  subscribeOwnerTexts,
} from "./ownerMessages";
import type { Run, RunEvent } from "./types";
import { finalStates, labels, money, ownerStates } from "./types";

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
// fichiers-21-11 : chaque fichier produit s'ouvre sous sa carte (Markdown, texte, image) ou se
// télécharge, par la route du back GET /api/runs/:id/file. Types affichés : ceux que le back sert en
// ligne ; le reste (PDF, HTML, Office…) se télécharge seulement.
const VIEW_TEXT = /\.(md|markdown|txt|log|csv|tsv|json|ya?ml)$/i;
const VIEW_IMAGE = /\.(png|jpe?g|gif|webp)$/i;
const PREVIEW_MAX = 200_000;
function FileCard({
  runId,
  path,
  root,
}: {
  runId: string;
  path: string;
  root?: string;
}) {
  const name = path.split(/[\\/]/).pop() || path;
  const base = root?.replace(/[\\/]+$/, "");
  const shownPath =
    base && path.startsWith(base + "/") ? path.slice(base.length + 1) : path;
  const viewable = VIEW_TEXT.test(name) || VIEW_IMAGE.test(name);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image);
    },
    [image],
  );
  const toggle = async () => {
    if (open) return setOpen(false);
    setOpen(true);
    setError("");
    if (text !== null || image) return;
    setLoading(true);
    try {
      const response = await fetchRunFile(runId, path);
      if (VIEW_IMAGE.test(name))
        setImage(URL.createObjectURL(await response.blob()));
      else setText(await response.text());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      const response = await fetchRunFile(runId, path, true);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };
  const long = text !== null && text.length > PREVIEW_MAX;
  const preview = long ? text!.slice(0, PREVIEW_MAX) : (text ?? "");
  return (
    <div className="file-item">
      <div className="file-card" title={path}>
        <DocIcon />
        <span className="file-text">
          <span className="file-name">{name}</span>
          <span className="file-path">{shownPath}</span>
        </span>
        <span className="file-actions">
          {viewable && (
            <button
              type="button"
              className="file-action"
              aria-expanded={open}
              aria-label={`${open ? "Fermer" : "Ouvrir"} ${name}`}
              onClick={() => void toggle()}
            >
              {open ? "Fermer" : "Ouvrir"}
            </button>
          )}
          <button
            type="button"
            className="file-action"
            aria-label={`Télécharger ${name}`}
            disabled={downloading}
            onClick={() => void download()}
          >
            {downloading ? "…" : "Télécharger"}
          </button>
        </span>
      </div>
      {error && (
        <small className="file-error" role="alert">
          {error}
        </small>
      )}
      {open && !error && (
        <div
          className="file-preview"
          role="region"
          aria-label={`Contenu de ${name}`}
        >
          {loading ? (
            <p className="loading" role="status">
              Chargement du fichier…
            </p>
          ) : image ? (
            <img src={image} alt={name} />
          ) : /\.(md|markdown)$/i.test(name) ? (
            <Markdown text={preview} />
          ) : (
            <pre>{preview}</pre>
          )}
          {long && (
            <small className="file-note">
              Aperçu limité au début du fichier : télécharger pour tout lire.
            </small>
          )}
        </div>
      )}
    </div>
  );
}

// Permissions the owner never answered (back: `permission_resolved` with reason `expired`): the card
// leaves `run.permissions`, so the thread keeps a line naming the action.
function expiredPermissions(events: RunEvent[]) {
  const titles = new Map<string, string>();
  const out: string[] = [];
  for (const event of events) {
    const data = event.data ?? {};
    if (event.type === "permission") {
      const tool = data.tool as { title?: unknown } | undefined;
      titles.set(
        String(data.id),
        typeof tool?.title === "string" && tool.title
          ? tool.title
          : "action de l’agent",
      );
    } else if (
      event.type === "permission_resolved" &&
      data.reason === "expired"
    )
      out.push(titles.get(String(data.id)) ?? "action de l’agent");
  }
  return out;
}
// The back's workflow failure (« Étapes en échec : review (failed : …) ; report (skipped : …) »)
// said with the step titles of the plan, without step ids nor states; any other error is kept.
export function plainRunError(run: Run) {
  const error = run.error ?? "";
  const list = error.match(/^Étapes en échec : ([\s\S]+)$/)?.[1];
  if (!list) return error;
  const titles = new Map(
    (run.plan?.workflow?.steps ?? []).map((s) => [s.id, s.title]),
  );
  const failed: string[] = [];
  let skipped = 0;
  for (const part of list.split(" ; ")) {
    const m = part.match(/^(\S+) \(([a-z_]+)(?: : ([\s\S]*))?\)$/);
    if (!m) return error;
    const [, id, state, why] = m;
    if (state === "skipped") skipped++;
    else
      failed.push(
        `Étape « ${titles.get(id) ?? id} » en échec` +
          (why ? ` : ${why.replace(/MCP error -?\d+:\s*/g, "")}` : ""),
      );
  }
  return [
    ...failed.map((f) => f + "."),
    skipped
      ? plural(
          skipped,
          "étape suivante non faite.",
          "étapes suivantes non faites.",
        )
      : "",
  ]
    .filter(Boolean)
    .join(" ");
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
  const announced = texteAnnonce(lastEvent(events, "usage")?.data);
  const rows: [string, string][] = [
    ...usageRows(run),
    ...(announced
      ? [
          [
            "Annoncé par l’agent",
            `${announced} (non mesuré par la plateforme)`,
          ] as [string, string],
        ]
      : []),
    [
      "Agent",
      `${run.agent} · ${run.model || "modèle par défaut du fournisseur"} (non confirmé par ACP)`,
    ],
    [
      "Compte",
      run.simulated
        ? "Démonstrateur · aucun modèle appelé"
        : announced
          ? "BYOA · consommation annoncée par l’agent, non refacturée"
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

// fil-21-11 : la discussion dans l'ordre où elle a eu lieu (texte de l'agent, messages du propriétaire,
// questions de l'agent et réponses). Avant, le texte de l'agent disparaissait à la réponse finale et
// les questions répondues disparaissaient avec leur formulaire.
type Entry =
  | {
      kind: "text";
      id: string;
      text: string;
      // equipe-lisible-22-11 : message écrit juste avant que le chef attende ses sous-missions.
      attente?: boolean;
      at?: string;
    }
  | Owner
  | AskedQuestion
  | (OwnerAnswer & { question?: AskedQuestion });
// equipe-lisible-22-11 : avec `coupe`, un outil d'équipe (`mission_lancer`, `mission_attendre`…) termine le
// message en cours ; celui qui précède `mission_attendre` est un message d'attente (regroupé à l'affichage).
const outilEquipe = (tool: Tool) =>
  /(?:^|_)mission_[a-z_]+$/.exec(tool.toolName || tool.title || "")?.[0];
export function conversation(items: Item[], coupe = false): Entry[] {
  const out: Entry[] = [];
  const questions = new Map<string, AskedQuestion>();
  let ferme = false;
  for (const item of items) {
    if (item.kind === "text") {
      const text = withoutResultEnvelope(item.text, true);
      if (!text.trim()) continue;
      const last = out.at(-1);
      // Un outil entre deux textes ne coupe pas le bloc ; un changement de tour y met un paragraphe.
      if (last?.kind === "text" && !ferme) last.text += "\n\n" + text;
      else out.push({ kind: "text", id: item.id, text, at: item.at });
      ferme = false;
    } else if (item.kind === "tool") {
      const outil = coupe ? outilEquipe(item) : undefined;
      const last = out.at(-1);
      if (outil && last?.kind === "text" && !ferme) {
        if (outil.endsWith("mission_attendre")) last.attente = true;
        ferme = true;
      }
    } else if (item.kind === "owner") out.push(item);
    else if (item.kind === "question") {
      questions.set(item.questionId, item);
      out.push(item);
    } else if (item.kind === "answer")
      out.push({ ...item, question: questions.get(item.questionId) });
  }
  return out;
}
type Choice = { const?: unknown; title?: string };
const choiceTitle = (value: unknown, choices?: Choice[]) =>
  choices?.find((c) => c.const === value)?.title ?? String(value);
// La réponse telle que le propriétaire l'a donnée : texte libre, ou titres des choix du formulaire.
export function answerText(answer: OwnerAnswer, question?: AskedQuestion) {
  if (answer.action === "decline") return "Question déclinée";
  if (answer.action === "expired")
    return "Question restée sans réponse (délai dépassé)";
  if (answer.action === "cancel") return "Question annulée";
  const props =
    (
      question?.schema as
        | {
            properties?: Record<
              string,
              { title?: string; oneOf?: Choice[]; items?: { anyOf?: Choice[] } }
            >;
          }
        | undefined
    )?.properties ?? {};
  const lines = Object.entries(answer.content ?? {}).flatMap(([key, value]) => {
    const prop = props[key];
    const shown = Array.isArray(value)
      ? value.map((v) => choiceTitle(v, prop?.items?.anyOf)).join(", ")
      : typeof value === "boolean"
        ? value
          ? "Oui"
          : "Non"
        : choiceTitle(value, prop?.oneOf);
    return shown.trim()
      ? [{ title: prop?.title ?? key, shown: shown.trim() }]
      : [];
  });
  if (!lines.length) return "Réponse envoyée";
  if (lines.length === 1) return lines[0].shown;
  return lines.map((l) => `${l.title} : ${l.shown}`).join("\n");
}
const flat = (text: string) => text.replace(/\s+/g, " ").trim();
function AnswerBubble({ answer }: { answer: Entry & { kind: "answer" } }) {
  return (
    <div className="owner-message delivered answer-message">
      <small className="owner-message-head">Vous, en réponse</small>
      <div className="prompt-bubble">
        <span className="prompt-bubble-text">
          {answerText(answer, answer.question)}
        </span>
      </div>
    </div>
  );
}

// sous-agents-internes-21-11 : les sous-agents que l'agent lance lui-même, vus dans son flux. La
// plateforme ne les compte ni ne les borne (back docs/api-delegation.md 5.1) : ni Arrêter, ni Suivre.
const agentNames: Record<string, string> = {
  codex: "Codex",
  claude: "Claude Code",
};
const memberStates = {
  running: "en cours",
  done: "terminé",
  failed: "en échec",
};
function InternalSubagents({
  run,
  items,
  live,
}: {
  run: Run;
  items: Item[];
  live: boolean;
}) {
  const { members, bare } = useMemo(() => nativeSubagents(items), [items]);
  if (!members.length) return null;
  const agent = agentNames[run.agent] ?? run.agent ?? "l’agent";
  return (
    <div
      className="internes"
      role="group"
      aria-label={`Sous-agents internes de ${agent}`}
    >
      <span className="internes-titre">
        {plural(members.length, "sous-agent interne", "sous-agents internes")}{" "}
        de {agent}
      </span>
      <ul>
        {members.map((m) => {
          // Mission over without a seen end: the platform cannot say it finished.
          const state =
            m.state === "running" && !live
              ? "sans fin vue"
              : memberStates[m.state];
          return (
            <li key={m.name} className={"internes-" + m.state}>
              <b aria-hidden="true">
                {m.state === "done" ? "✓" : m.state === "failed" ? "✕" : "•"}
              </b>
              <span>
                {m.name} · {state}
                {m.exchanges > 1 ? ` · ${m.exchanges} échanges` : ""}
              </span>
            </li>
          );
        })}
      </ul>
      <small>
        {bare > 0 &&
          `${plural(bare, "action sans détail", "actions sans détail")} · `}
        {members.length > 1 ? "lancés" : "lancé"} par l’agent lui-même : modèle
        et consommation non transmis
      </small>
    </div>
  );
}
// Message joint au tour de la réponse (`via: "with_answer"`) qui dit la même chose que cette réponse :
// le propriétaire l'a écrit deux fois (champ du bas puis formulaire), le fil ne le montre qu'une fois.
function echoedAnswers(entries: Entry[]) {
  const answers = entries.flatMap((e) =>
    e.kind === "answer" ? [flat(answerText(e, e.question))] : [],
  );
  return new Set(
    entries.flatMap((e) => {
      if (e.kind !== "owner" || e.via !== "with_answer") return [];
      const text = e.text ?? ownerText(e.messageId);
      return text && answers.includes(flat(text)) ? [e.id] : [];
    }),
  );
}
// fil-long-22-11 (demande du propriétaire) : le fil reste visible ; quand il est long, seuls les plus
// anciens messages se replient, en haut, derrière un bouton. Jamais de pli en bas.
const RECENT_MESSAGES = 12;
function OlderFolded({ nodes }: { nodes: ReactNode[] }) {
  const [open, setOpen] = useState(false);
  const list = nodes.filter(
    (n) => n !== null && n !== undefined && n !== false,
  );
  const older = list.length - RECENT_MESSAGES;
  if (older <= 0) return <>{list}</>;
  return (
    <>
      <button
        type="button"
        className="fil-precedents"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open
          ? "Masquer les messages précédents"
          : `Afficher les ${plural(older, "message précédent", "messages précédents")}`.replace(
              /^Afficher les 1 message précédent$/,
              "Afficher le message précédent",
            )}
      </button>
      {open ? list : list.slice(older)}
    </>
  );
}
export function RunTurn({
  run,
  events,
  busy,
  act,
  incident,
  connection,
  requests = true,
  onOpenMember,
}: {
  run: Run;
  events: RunEvent[];
  busy: boolean;
  act: Act;
  // Erreur d'une action sur cette mission : une ligne, pas une bannière.
  incident?: string;
  // État du flux en direct (« Connexion perdue · reconnexion… ») : une ligne tant qu'il est perdu.
  connection?: string;
  requests?: boolean;
  // equipe-lisible-22-11 : « Ouvrir » d'une sous-mission terminée (vue côte à côte) ; absent : pas de bouton.
  onOpenMember?: (id: string) => void;
}) {
  // Mission en équipe : carte Résultat, trouvailles, tableau, problèmes et détails avant le fil.
  const team = membresDe(run).length > 0;
  const items = useMemo(() => activity(events, { exchanges: true }), [events]);
  const waits = useMemo(() => ownerWaits(events), [events]);
  // Re-render when this page learns the text of a message it sent (private mission).
  useSyncExternalStore(subscribeOwnerTexts, ownerTextsVersion);
  // Bare actions (no name, never ended, sent for the agent's internal subagents) are counted on the
  // subagents line, not as running tools (they kept « Exécution… » on forever).
  const shownItems = useMemo(
    () => items.filter((i) => i.kind !== "tool" || !i.bare),
    [items],
  );
  const tools = shownItems.filter((i): i is Tool => i.kind === "tool");
  const live = !finalStates.has(run.state);
  // La réponse finale (run.result) remplace seulement le dernier morceau de texte de l'agent, celui
  // qui l'a écrite, s'il n'est suivi d'aucun échange : le texte des tours d'avant reste dans le fil.
  // equipe-lisible-22-11 : en équipe, le Bilan peut ne porter aucune réponse de l'agent principal (mission
  // annulée) ; son dernier message reste alors dans le fil.
  const final =
    !!run.result &&
    !live &&
    (!team ||
      !!partiesDuResume(
        run.result.summary ?? "",
        run.result.answer,
        run.result.platformNotes,
      ).reponse);
  const entries = useMemo(() => {
    let last = -1;
    if (final)
      for (let i = items.length - 1; i >= 0; i--) {
        const kind = items[i].kind;
        if (kind === "text") {
          last = i;
          break;
        }
        if (kind === "owner" || kind === "question" || kind === "answer") break;
      }
    return conversation(
      items.filter((_, i) => i !== last),
      team,
    );
  }, [items, final, team]);
  // The mission waits for the owner: the agent is neither thinking nor writing.
  const ownerTurn = ownerStates.has(run.state);
  const incomplete = run.error?.match(
    /^Mission incomplète\s*:\s*([\s\S]+)/,
  )?.[1];
  // A workflow stopped or failed only (22/11, owner: « Le retirer ») : an agent session resumes when
  // the owner sends a message in « Répondre à l'agent… » ; the old « Reprendre la session » button
  // relaunched the agent without saying so. A sub-mission is relaunched by its chief (409).
  const resumable =
    ["failed", "cancelled", "interrupted"].includes(run.state) &&
    run.mode === "workflow" &&
    !run.famille;
  const expired = expiredPermissions(events);
  const shown = entries;
  const answered = new Set(
    entries.flatMap((e) => (e.kind === "answer" ? [e.questionId] : [])),
  );
  // RunTurn shows no thoughts: a trailing thought keeps « Réflexion… » (else the turn looks stuck).
  const label =
    live && !ownerTurn
      ? (waitingLabel(shownItems) ??
        (items.at(-1)?.kind === "thought" ? "Réflexion…" : null))
      : null;
  const failedMembers = (Array.isArray(run.family) ? run.family : []).filter(
    (m) => ["failed", "interrupted"].includes(String(m?.state)),
  ).length;
  const files = producedFiles(tools);
  const echoed = echoedAnswers(entries);
  // career-ops : le résultat est privé, lu par sa route (meme-affichage-21-11).
  const career = isCareerRun(run);
  const privateResult = usePrivateResult(run);
  const summary = privateResult.wanted
    ? (privateResult.text ??
      (privateResult.failed ? run.result?.summary || "" : null))
    : (run.result?.summary ?? null);
  const silent = activeSilence(events, run.state);
  const browserFallback = events.some(
    (event) => event.type === "browser_fallback",
  );
  const renderEntry = (entry: Entry, index: number, list: Entry[]) => {
    if (entry.kind === "owner")
      return echoed.has(entry.id) ? null : (
        <OwnerBubble key={entry.id} message={entry} />
      );
    if (entry.kind === "answer")
      return <AnswerBubble key={entry.id} answer={entry} />;
    if (entry.kind === "question") {
      // Question encore ouverte : son formulaire (OwnerRequests) la montre déjà.
      if (!answered.has(entry.questionId) && live) return null;
      // Question déjà écrite à la fin du texte de l'agent : pas de doublon.
      const before = list[index - 1];
      if (
        before?.kind === "text" &&
        flat(before.text).endsWith(flat(entry.message))
      )
        return null;
      return (
        <div key={entry.id} className="reponse-texte reponse-question">
          <small className="reponse-question-head">Question de l’agent</small>
          <Markdown text={entry.message} />
        </div>
      );
    }
    return (
      <div key={entry.id} className="reponse-texte">
        <Markdown text={entry.text} />
        {index === list.length - 1 && live && !ownerTurn && (
          <span className="stream-caret" aria-hidden="true" />
        )}
      </div>
    );
  };
  const activite = (
    <div className="reponse-activite">
      <StepsLine run={run} events={events} />
      <ActivityLine tools={tools} waits={waits} />
      <InternalSubagents run={run} items={items} live={live} />
      {incident && <Incident text={incident} />}
      {connection?.includes("perdue") && <Incident text={connection} />}
      {run.error && !live && (
        <Incident
          text={
            incomplete
              ? `Mission incomplète : ${incomplete}`
              : `${labels[run.state] || run.state} : ${plainRunError(run)}`
          }
        />
      )}
      {expired.map((title, i) => (
        <Incident key={i} text={`Accord expiré sans réponse : ${title}`} />
      ))}
      {failedMembers > 0 && (
        <Incident
          text={`${plural(failedMembers, "sous-agent a échoué", "sous-agents ont échoué")} : détail dans le panneau Activité.`}
        />
      )}
      {requests && missionGrantActive(events, run.state) && (
        <Incident text={MISSION_GRANT_NOTICE} />
      )}
      {silent && (
        <Incident
          text={`Agent silencieux depuis ${Math.max(1, Math.ceil(Number(silent.data?.elapsedMs || 60000) / 60000))} min. Vous pouvez arrêter la mission.`}
        />
      )}
      {browserFallback && (
        <Incident text="Navigateur : Chrome isolé, non connecté à vos comptes (extension Playwriter indisponible)." />
      )}
    </div>
  );
  // equipe-lisible-22-11 : messages d'attente consécutifs du chef regroupés ; le dernier reste visible,
  // les précédents sont repliés (rien n'est retiré du fil).
  const filEquipe = () => {
    const out: ReactNode[] = [];
    const enCours = tachesDe(membresDe(run)).filter(
      (t) => etatDe(derniere(t).state) === "encours",
    ).length;
    for (let i = 0; i < shown.length; i++) {
      const entry = shown[i];
      if (entry.kind !== "text" || !entry.attente) {
        out.push(renderEntry(entry, i, shown));
        continue;
      }
      let j = i;
      while (
        j + 1 < shown.length &&
        shown[j + 1].kind === "text" &&
        (shown[j + 1] as { attente?: boolean }).attente
      )
        j++;
      const groupe = shown.slice(i, j + 1);
      const debut = (groupe[0] as { at?: string }).at;
      const depuis = debut ? Date.now() - Date.parse(debut) : NaN;
      const enTete =
        live && j === shown.length - 1 && enCours > 0 && Number.isFinite(depuis)
          ? `En attente de ${plural(enCours, "tâche", "tâches")}, depuis ${dureeMission(depuis)}`
          : "";
      out.push(
        <div className="attente-groupe" key={"attente-" + entry.id}>
          {enTete && <p className="attente-entete">{enTete}</p>}
          {groupe.length > 1 && (
            <details className="fold attente-precedente">
              <summary>
                {plural(
                  groupe.length - 1,
                  "message d’attente précédent",
                  "messages d’attente précédents",
                )}
              </summary>
              {groupe.slice(0, -1).map((e, k) => renderEntry(e, i + k, shown))}
            </details>
          )}
          {renderEntry(groupe.at(-1)!, j, shown)}
        </div>,
      );
      i = j;
    }
    return out;
  };
  const resultat = run.result && (
    <section className="reponse-resultat" aria-label="Résultats">
      {!team && summary !== null && (
        <AgentAnswer
          text={summary}
          answer={career ? undefined : run.result.answer}
          notes={career ? undefined : run.result.platformNotes}
        />
      )}
      {privateResult.failed && (
        <p className="muted answer-source">
          Résultat privé illisible : réponse enregistrée sur la mission.
        </p>
      )}
      {run.result.simulated && (
        <small className="fictif">Données fictives</small>
      )}
      <Offers run={run} />
    </section>
  );
  return (
    <>
      {live && <SkillChip events={events} run={run} />}
      <div className="reponse">
        {team ? (
          <>
            {/* cartes-membres-22-11 : la carte qu'un membre attend se répond ici, en premier. */}
            {requests && (
              <MemberRequests
                run={run}
                busy={busy}
                act={act}
                onOpenMember={onOpenMember}
              />
            )}
            <TeamAnswer
              run={run}
              events={events}
              summary={run.result ? summary : null}
              erreur={run.error ? plainRunError(run) : ""}
              onOpenMember={onOpenMember}
              technique={<SkillSteps progress={run.skillProgress} />}
            />
            {activite}
            <OlderFolded nodes={filEquipe()} />
            {label && <Waiting label={label} />}
          </>
        ) : (
          <>
            {activite}
            <OlderFolded
              nodes={shown.map((entry, index) =>
                renderEntry(entry, index, shown),
              )}
            />
            {label && <Waiting label={label} />}
            <SkillSteps progress={run.skillProgress} />
          </>
        )}
        <StepApprovals run={run} busy={busy} act={act} />
        {requests && <OwnerRequests run={run} busy={busy} act={act} />}
        {resultat}
        {career && <CareerOffers done={run.state === "completed"} />}
        {files.length > 0 && (
          <div className="reponse-fichiers">
            {files.map((path) => (
              <FileCard key={path} runId={run.id} path={path} root={run.cwd} />
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
              Reprendre le workflow
            </button>
          )}
        </div>
        {!live && <MetaLine run={run} events={events} />}
      </div>
    </>
  );
}
