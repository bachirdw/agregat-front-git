import { AgentActivity, SkillChip } from "./Career";
import { SkillSteps } from "./SkillSteps";
import { Fragment, useEffect, useState } from "react";
import type {
  Catalog,
  Cost,
  Opportunity,
  Permission,
  Plan,
  Run,
  RunEvent,
  Step,
} from "./types";
import { finalStates, labels, money } from "./types";
import { Markdown, safeLink } from "./Markdown";
import { dataLabel, dataModeLabel, trackerItems } from "./Tracker";
export function CostDetails({
  cost,
  catalog,
}: {
  cost: Cost;
  catalog: Catalog | null;
}) {
  return (
    <div className="cost-details">
      <small>Coût estimé</small>
      {cost.lines.map((l) => (
        <div className="spread" key={l.dimension}>
          <span>
            {catalog?.meters[l.dimension]?.category || l.dimension} · {l.units}
          </span>
          <span>{money(l.cents, cost.currency)}</span>
        </div>
      ))}
      <div className="spread total">
        <strong>Total plateforme</strong>
        <strong>{money(cost.platformCents, cost.currency)}</strong>
      </div>
      <small>Budget maximum : {money(cost.budgetCents, cost.currency)}</small>
      <small>{cost.description}</small>
      {!cost.withinBudget && (
        <p className="warning" role="alert">
          Estimation supérieure au budget : le lancement sera refusé.
        </p>
      )}
    </div>
  );
}
export function PlanCard({
  plan,
  catalog,
  busy,
  launch,
  edit,
  cancel,
  warning,
}: {
  plan: Plan;
  catalog: Catalog | null;
  busy: boolean;
  launch: () => void;
  edit: () => void;
  cancel?: () => void;
  warning?: string | null;
}) {
  return (
    <>
      <p>Voici le plan proposé. Rien n’a encore été exécuté.</p>
      <section className="card plan" aria-label="Plan proposé">
        <div className="card-pad">
          <small className="accent">
            Plan proposé · en attente de votre accord
          </small>
          <h2>{plan.workflow?.title || "Votre mission"}</h2>
          <div className="tags">
            <span className="badge">{plan.pack}</span>
            {plan.browser && (
              <span className="badge">Navigateur : {plan.browser}</span>
            )}
            {plan.agentMode && (
              <span className="badge">Mode ACP : {plan.agentMode}</span>
            )}
            <span className={"badge " + (plan.simulated ? "warning" : "")}>
              {plan.simulated
                ? "Agent fictif · aucun modèle appelé"
                : "Agent réel · compte BYOA"}
            </span>
            {plan.dataMode && (
              <span
                className={
                  "badge " + (plan.dataMode === "fixture" ? "warning" : "")
                }
              >
                {dataModeLabel[plan.dataMode]}
              </span>
            )}
          </div>
        </div>
        <div className="split lined">
          <div className="card-pad">
            <small>Agent</small>
            <strong>{plan.agent}</strong>
            {plan.routing.reasons.map((r, i) => (
              <small key={i}>{r}</small>
            ))}
            {plan.routing.rejected.length > 0 && (
              <details>
                <summary>Agents écartés</summary>
                {plan.routing.rejected.map((r) => (
                  <small key={r.id}>
                    {r.id} : {r.reason}
                  </small>
                ))}
              </details>
            )}
          </div>
          <div className="card-pad">
            <small>Workflow</small>
            <strong>{plan.workflow?.title || "Agent unique"}</strong>
            <small>
              {plan.workflow?.reason ||
                "L’agent conduit la mission avec les outils du pack."}
            </small>
          </div>
        </div>
        <ol className="plan-steps lined">
          {plan.steps.map((s, i) => (
            <li key={i}>
              <span className="step-number">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="split lined">
          <div className="card-pad">
            <CostDetails cost={plan.cost} catalog={catalog} />
          </div>
          <div className="card-pad">
            <small>Permissions demandées</small>
            {plan.permissions.map((p, i) => (
              <p className="permission-line" key={i}>
                ✓ {p}
              </p>
            ))}
          </div>
        </div>
        {warning && (
          <p className="agent-warning card-pad" role="alert">
            {warning}
          </p>
        )}
        <footer>
          <button className="primary" onClick={launch} disabled={busy}>
            {busy ? "Lancement…" : "Lancer"}
          </button>
          {busy && cancel ? (
            <button onClick={cancel}>Annuler le lancement</button>
          ) : (
            <button onClick={edit} disabled={busy}>
              Modifier
            </button>
          )}
          <small>
            {plan.simulated
              ? "Démonstration : aucune action réelle ne sera exécutée."
              : "Les actions sensibles demandent une décision explicite."}
          </small>
        </footer>
      </section>
    </>
  );
}
export function UsageCard({ run }: { run: Run }) {
  return run.usage ? (
    <section
      className="card usage-card"
      aria-label="Consommation de la mission"
    >
      <div className="card-pad">
        <small>Coût plateforme mesuré</small>
        <h2>{money(run.usage.platformCents, run.usage.currency)}</h2>
        {run.usage.byDimension.map((d) => (
          <div className="spread" key={d.dimension}>
            <span>
              {d.category} · {d.units}
            </span>
            <span>
              {d.billable
                ? money(d.platformCents, run.usage!.currency)
                : "Non facturé"}
            </span>
          </div>
        ))}
      </div>
      <div className="card-pad">
        <small>Votre agent</small>
        <strong>{run.agent}</strong>
        <small>Modèle demandé : {run.model || "défaut du fournisseur"}</small>
        <small>Modèle effectivement servi : non confirmé par ACP.</small>
        <p>
          {run.simulated
            ? "Démonstrateur · aucun modèle appelé"
            : "Consommation fournisseur inconnue · compte BYOA"}
        </p>
        <span className="badge">Non refacturée</span>
      </div>
      <div className="card-pad">
        <small>Registre de consommation</small>
        <strong className={run.ledger?.ok ? "success" : "danger"}>
          {run.ledger
            ? run.ledger.ok
              ? "✓ Intègre"
              : "Registre altéré"
            : "Non disponible"}
        </strong>
        <small>Vérification fournie par le backend.</small>
      </div>
    </section>
  ) : null;
}
function showOutput(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "summary" in value)
    return String(value.summary);
  return JSON.stringify(value, null, 2);
}
type Act = (path: string, body: unknown) => Promise<void>;
// Ticks every second while a permission can expire, for its countdown.
function useNow(run: Run) {
  const [now, setNow] = useState(Date.now());
  const expiring =
    run.permissions?.some((p) => Number.isFinite(p.expiresAt)) ?? false;
  useEffect(() => {
    if (!expiring) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiring]);
  return now;
}
const resumableRun = (run: Run) =>
  (run.mode === "workflow" &&
    ["failed", "cancelled", "interrupted"].includes(run.state)) ||
  (run.resumable && finalStates.has(run.state));
// The back finishes a run with unmet required steps as "Mission incomplète : <steps>".
const incompleteSteps = (run: Run) =>
  run.error?.match(/^Mission incomplète\s*:\s*([\s\S]+)/)?.[1];
const reviewText = (step: Step) =>
  step.state === "uncertain"
    ? "L’effet de cette étape est incertain. Vérifiez son résultat avant de décider."
    : "Relisez le brouillon avant de valider. Aucun envoi ne sera effectué.";
// Outputs the step under review depends on: what the user reads before deciding.
const reviewed = (run: Run, step: Step) =>
  run.steps?.filter(
    (p) =>
      p.output &&
      run.plan.workflow?.steps
        .find((d) => d.id === step.step_id)
        ?.dependsOn?.includes(p.step_id),
  ) ?? [];
// Decision buttons of a workflow step; one source for both views, so the calls stay identical.
function StepActions({
  run,
  step,
  busy,
  act,
}: {
  run: Run;
  step: Step;
  busy: boolean;
  act: Act;
}) {
  const path = `/runs/${run.id}/steps/${step.step_id}`;
  return step.state === "waiting_approval" ? (
    <>
      <button
        className="primary"
        disabled={busy}
        onClick={() => void act(path, { approved: true })}
      >
        Approuver
      </button>
      <button
        disabled={busy}
        onClick={() => void act(path, { approved: false })}
      >
        Refuser
      </button>
    </>
  ) : (
    <>
      {[
        ["retry", "Relancer"],
        ["done", "Marquer comme faite"],
        ["fail", "Marquer en échec"],
      ].map(([action, title]) => (
        <button
          key={action}
          disabled={busy}
          onClick={() => void act(path, { action })}
        >
          {title}
        </button>
      ))}
    </>
  );
}
// ACP permission options; "allow_always" is never offered.
function PermissionActions({
  permission: p,
  now,
  busy,
  act,
}: {
  permission: Permission;
  now: number;
  busy: boolean;
  act: Act;
}) {
  return (
    <>
      {p.options
        .filter((o) =>
          ["allow_once", "reject_once", "reject_always"].includes(o.kind),
        )
        .map((o) => (
          <button
            key={o.optionId}
            className={o.kind === "allow_once" ? "primary" : ""}
            disabled={busy || (p.expiresAt !== undefined && now >= p.expiresAt)}
            onClick={() =>
              void act(`/permissions/${p.id}`, { optionId: o.optionId })
            }
          >
            {o.name}
          </button>
        ))}
    </>
  );
}
const countdown = (p: Permission, now: number) =>
  Number.isFinite(p.expiresAt)
    ? now >= p.expiresAt!
      ? "Accord expiré"
      : `Expire dans ${Math.ceil((p.expiresAt! - now) / 1000)} s`
    : "Une permission expirée est refusée par le serveur.";
// `plain`: no badge (compact turn), same words.
function Opportunities({
  list,
  plain = false,
}: {
  list: Opportunity[];
  plain?: boolean;
}) {
  return (
    <>
      <div className="table-wrap card">
        <table>
          <caption>Classement des offres</caption>
          <thead>
            <tr>
              <th>Employeur</th>
              <th>Lieu</th>
              <th>Score</th>
              <th>Sponsoring</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id}>
                <th scope="row">{o.company}</th>
                <td>{o.location}</td>
                <td>{o.score}</td>
                <td>
                  {o.sponsorship === "uk_register_name_match"
                    ? "Nom présent · entité à confirmer"
                    : "Non vérifié"}
                </td>
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
      <div className="offer-grid">
        {list.map((o) => (
          <article className="card offer" key={o.id}>
            <div className="card-pad">
              <div className="spread">
                <div>
                  <strong>{o.title}</strong>
                  <p>{o.company}</p>
                  <small>{o.location}</small>
                </div>
                <strong className="score">
                  {o.score}
                  <small>/100</small>
                </strong>
              </div>
              <meter
                min="0"
                max="100"
                value={o.score}
                aria-label={`Score ${o.title}`}
              />
              <ul>
                {o.reasons?.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <span className={plain ? "warning" : "badge warning"}>
                {o.sponsorship === "uk_register_name_match"
                  ? "Nom au registre UK · entité à confirmer"
                  : "Sponsoring : non vérifié"}
              </span>
              <small>
                Source : {o.attribution || o.source || "Non fournie"}
                {o.fetchedAt &&
                  " · " + new Date(o.fetchedAt).toLocaleString("fr-FR")}
              </small>
              {safeLink(o.url) && (
                <a href={o.url} target="_blank" rel="noopener noreferrer">
                  Voir l’offre ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
const stepMarks = {
  done: "✓",
  failed: "✕",
  running: "•",
  waiting: "•",
  pending: "○",
} as const;
// Compact agent turn of a mission outside career-ops: no badge, no card grid; details live in the Tracker.
export function RunTurn({
  run,
  events,
  connection,
  busy,
  act,
}: {
  run: Run;
  events: RunEvent[];
  connection: string;
  busy: boolean;
  act: Act;
}) {
  const now = useNow(run);
  const running = !finalStates.has(run.state);
  const items = run.plan.workflow?.steps?.length
    ? trackerItems(run, events)
    : [];
  const current =
    items.find((i) => ["running", "waiting", "failed"].includes(i.mark)) ??
    items.find((i) => i.mark === "pending") ??
    items.at(-1);
  const incomplete = incompleteSteps(run);
  const opportunities = run.result?.opportunities ?? [];
  const evidence = run.result?.evidence ?? [];
  return (
    <>
      {running && <SkillChip events={events} run={run} />}
      <div className="agent-turn">
        <AgentActivity events={events} running={running} />
        {current && (
          <details
            className={
              "fold tool-group" +
              (items.some((i) => i.mark === "failed") ? " failed" : "")
            }
          >
            <summary>
              Étape {items.indexOf(current) + 1}/{items.length} ·{" "}
              {current.title}
            </summary>
            <ol>
              {items.map((item) => (
                <li key={item.id}>
                  <span aria-hidden="true">{stepMarks[item.mark]}</span>
                  <span>{item.title}</span>
                </li>
              ))}
            </ol>
          </details>
        )}
        {run.pack !== "career-ops" && (
          <SkillSteps progress={run.skillProgress} />
        )}
        {run.steps
          ?.filter(
            (s) => s.state === "waiting_approval" || s.state === "uncertain",
          )
          .map((s) => {
            const reviews = reviewed(run, s);
            return (
              <Fragment key={s.step_id}>
                <section
                  className="inline-approval"
                  aria-label="Votre accord est requis"
                >
                  <i aria-hidden="true" />
                  <span>
                    {run.plan.workflow?.steps.find((d) => d.id === s.step_id)
                      ?.title || s.step_id}
                  </span>
                  <StepActions run={run} step={s} busy={busy} act={act} />
                  <small>{reviewText(s)}</small>
                </section>
                {reviews.length > 0 && (
                  <details className="fold" open>
                    <summary>À relire avant de décider</summary>
                    {reviews.map((p) => (
                      <div className="review-output" key={p.step_id}>
                        <Markdown text={showOutput(p.output)} />
                      </div>
                    ))}
                  </details>
                )}
              </Fragment>
            );
          })}
        {run.permissions?.map((p) => (
          <Fragment key={p.id}>
            <section className="inline-approval" aria-label="Permission agent">
              <i aria-hidden="true" />
              <span>{p.tool.title || "Autorisation agent"}</span>
              <PermissionActions
                permission={p}
                now={now}
                busy={busy}
                act={act}
              />
              <small role="timer">{countdown(p, now)}</small>
            </section>
            <details className="fold">
              <summary>Détails de la demande</summary>
              <pre>{JSON.stringify(p.tool, null, 2)}</pre>
            </details>
          </Fragment>
        ))}
        {connection.includes("perdue") && (
          <small className="danger">{connection}</small>
        )}
        {run.error && (
          <p className="danger" role="alert">
            {incomplete
              ? `Mission incomplète : ${incomplete}`
              : `${labels[run.state] || run.state} · ${run.error}`}
          </p>
        )}
        {run.result && (
          <section className="results" aria-label="Résultats">
            <Markdown text={run.result.summary} />
            {run.result.simulated && (
              <small className="warning">Données fictives</small>
            )}
            {opportunities.length > 0 && (
              <details className="fold">
                <summary>Voir les {opportunities.length} offres</summary>
                <Opportunities list={opportunities} plain />
              </details>
            )}
            {evidence.length > 0 && (
              <details className="fold">
                <summary>Preuves · {evidence.length}</summary>
                {evidence.map((e, i) => (
                  <pre key={i}>{showOutput(e)}</pre>
                ))}
              </details>
            )}
          </section>
        )}
        {running && (
          <button
            className="stop-mission"
            disabled={busy}
            onClick={() => void act(`/runs/${run.id}/cancel`, {})}
          >
            Arrêter la mission
          </button>
        )}
        {resumableRun(run) && (
          <button
            type="button"
            className="resume"
            disabled={busy}
            onClick={() => void act(`/runs/${run.id}/resume`, {})}
          >
            Reprendre
          </button>
        )}
      </div>
    </>
  );
}
export function RunView({
  run,
  events,
  connection,
  busy,
  act,
}: {
  run: Run;
  events: RunEvent[];
  connection: string;
  busy: boolean;
  act: (path: string, body: unknown) => Promise<void>;
}) {
  const [timelineOpen, setTimelineOpen] = useState(!finalStates.has(run.state));
  const now = useNow(run);
  useEffect(() => {
    setTimelineOpen(!finalStates.has(run.state));
  }, [run.id, run.state]);
  const definitions = run.plan.workflow?.steps || [];
  const done = run.steps?.filter((s) => s.state === "succeeded").length || 0;
  const verification = [...events]
    .reverse()
    .find((event) => event.type === "verification");
  const session = [...events]
    .reverse()
    .find((event) => event.type === "session");
  const selectedModel = (
    session?.data.models as { current?: string } | undefined
  )?.current;
  const selectedMode = (session?.data.modes as { current?: string } | undefined)
    ?.current;
  const resumable = resumableRun(run);
  const incomplete = incompleteSteps(run);
  return (
    <>
      <div className="spread">
        <span className="badge">
          ✓ Plan validé ·{" "}
          {run.mode === "workflow" ? "Workflow" : "Agent unique"}
        </span>
        <span className="badge" role="status">
          {labels[run.state] || run.state}
        </span>
        <span className="badge">
          {run.simulated ? "Agent fictif" : "Agent réel"} · {run.agent} · modèle
          demandé : {run.model || "défaut du fournisseur"} · navigateur{" "}
          {run.browser || "non renseigné"}
          {run.agentMode ? ` · mode ACP ${run.agentMode}` : ""}
        </span>
        {run.dataMode && (
          <span
            className={"badge " + (run.dataMode === "fixture" ? "warning" : "")}
          >
            {dataLabel(run, events)}
          </span>
        )}
        {session && (
          <span className="badge">
            Session ACP : modèle sélectionné {selectedModel || "non annoncé"} ·
            mode {selectedMode || "non annoncé"}
          </span>
        )}
      </div>
      <section className="card timeline" aria-label="Exécution">
        <button
          className="timeline-heading"
          aria-expanded={timelineOpen}
          onClick={() => setTimelineOpen(!timelineOpen)}
        >
          <strong>Exécution</strong>
          <small>
            {definitions.length
              ? `${done} / ${definitions.length}`
              : labels[run.state]}
          </small>
          <small>{connection}</small>
          <span>⌄</span>
        </button>
        <progress
          max={definitions.length || 1}
          value={definitions.length ? done : run.state === "completed" ? 1 : 0}
          aria-label="Progression de la mission"
        />
        {timelineOpen && (
          <>
            <ol className="run-steps">
              {definitions.map((s) => {
                const state = run.steps?.find((r) => r.step_id === s.id);
                return (
                  <li
                    className={"step " + (state?.state || "pending")}
                    key={s.id}
                  >
                    <span className="step-number">
                      {state?.state === "succeeded"
                        ? "✓"
                        : state?.state === "failed"
                          ? "!"
                          : "·"}
                    </span>
                    <span>
                      <strong>{s.title}</strong>
                      <small>
                        {(
                          {
                            tool: "Outil",
                            agent: "Agent",
                            approval: "Approbation",
                            verify: "Vérification",
                            aggregate: "Agrégation",
                          } as Record<string, string>
                        )[s.kind] || s.kind}{" "}
                        {s.agent && "· " + s.agent}
                        {state?.attempt ? ` · tentative ${state.attempt}` : ""}
                      </small>
                      {state?.error && (
                        <small className="danger">{state.error}</small>
                      )}
                    </span>
                    <small>{labels[state?.state || "pending"]}</small>
                  </li>
                );
              })}
            </ol>
            {!definitions.length && (
              <div className="card-pad">
                <p>
                  {finalStates.has(run.state)
                    ? run.state === "completed"
                      ? "Exécution terminée."
                      : "Exécution arrêtée ; voir la cause ci-dessous."
                    : "L’agent travaille avec les outils du pack."}
                </p>
              </div>
            )}
            <AgentActivity
              events={events}
              running={!finalStates.has(run.state)}
            />
            <details className="event-log">
              <summary>Journal en direct · {events.length} entrées</summary>
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
            </details>
          </>
        )}
      </section>
      {run.pack !== "career-ops" && <SkillSteps progress={run.skillProgress} />}
      {run.error && (
        <section className="card error-card" role="alert">
          {incomplete ? (
            <>
              <small>Mission incomplète</small>
              <h2>{incomplete}</h2>
            </>
          ) : (
            <>
              <small>Mission interrompue</small>
              <h2>{labels[run.state]}</h2>
              <p>{run.error}</p>
            </>
          )}
        </section>
      )}
      {run.steps
        ?.filter(
          (s) => s.state === "waiting_approval" || s.state === "uncertain",
        )
        .map((s) => (
          <section
            className="card approval"
            key={s.step_id}
            role="region"
            aria-label="Votre accord est requis"
          >
            <div className="card-pad">
              <small className="warning">Votre accord est requis</small>
              <h2>
                {definitions.find((d) => d.id === s.step_id)?.title ||
                  s.step_id}
              </h2>
              <p>{reviewText(s)}</p>
              {reviewed(run, s).map((p) => (
                <div className="review-output" key={p.step_id}>
                  <Markdown text={showOutput(p.output)} />
                </div>
              ))}
            </div>
            <footer>
              <StepActions run={run} step={s} busy={busy} act={act} />
            </footer>
          </section>
        ))}
      {run.permissions?.map((p) => (
        <section
          className="card approval"
          key={p.id}
          aria-label="Permission agent"
        >
          <div className="card-pad">
            <small className="warning">
              Votre accord est requis · permission ponctuelle
            </small>
            <h2>{p.tool.title || "Autorisation agent"}</h2>
            <pre>{JSON.stringify(p.tool, null, 2)}</pre>
            <small role="timer">{countdown(p, now)}</small>
          </div>
          <footer>
            <PermissionActions permission={p} now={now} busy={busy} act={act} />
          </footer>
        </section>
      ))}
      <div className="actions">
        {!finalStates.has(run.state) && (
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
      {run.result && (
        <section className="results" aria-label="Résultats">
          <div className="tags">
            <span
              className={
                "badge " + (run.result.simulated ? "warning" : "success")
              }
            >
              {run.result.provenance?.data === "réelles"
                ? "Offres réelles · sources citées"
                : run.result.simulated
                  ? "DONNÉES FICTIVES"
                  : "Résultat agent"}
            </span>
            {run.result.provenance?.analysis && (
              <span className="badge">
                Analyse : {run.result.provenance.analysis}
              </span>
            )}
            {verification && (
              <span className="badge" role="status">
                Vérification :{" "}
                {String(verification.data.scope || "portée non précisée")}
              </span>
            )}
          </div>
          {run.pack !== "career-ops" && (
            <>
              <h2>Synthèse</h2>
              <Markdown text={run.result.summary} />
            </>
          )}
          {!!run.result.opportunities?.length && (
            <>
              <Opportunities list={run.result.opportunities} />
            </>
          )}
          {!!run.result.evidence?.length && (
            <details className="card card-pad">
              <summary>
                Éléments de preuve · {run.result.evidence.length}
              </summary>
              {run.result.evidence.map((e, i) => (
                <pre key={i}>{showOutput(e)}</pre>
              ))}
            </details>
          )}
        </section>
      )}
      <UsageCard run={run} />
    </>
  );
}
