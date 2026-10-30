import { AgentActivity } from "./Career";
import { SkillSteps } from "./SkillSteps";
import { useEffect, useState } from "react";
import type { Catalog, Cost, Plan, Run, RunEvent } from "./types";
import { finalStates, labels, money } from "./types";
import { Markdown, safeLink } from "./Markdown";
const dataModeLabel = {
  fixture: "Sources fictives · démonstration",
  live: "Sources réelles · provenance à vérifier",
  user: "Données fournies par l’utilisateur · non vérifiées",
  unverified: "Provenance des données non vérifiée",
};
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
}: {
  plan: Plan;
  catalog: Catalog | null;
  busy: boolean;
  launch: () => void;
  edit: () => void;
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
        <footer>
          <button className="primary" onClick={launch} disabled={busy}>
            {busy ? "Lancement…" : "Lancer"}
          </button>
          <button onClick={edit} disabled={busy}>
            Modifier
          </button>
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
  const [now, setNow] = useState(Date.now());
  const hasExpiringPermission =
    run.permissions?.some((p) => Number.isFinite(p.expiresAt)) ?? false;
  useEffect(() => {
    setTimelineOpen(!finalStates.has(run.state));
  }, [run.id, run.state]);
  useEffect(() => {
    if (!hasExpiringPermission) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasExpiringPermission]);
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
  const resumable =
    (run.mode === "workflow" &&
      ["failed", "cancelled", "interrupted"].includes(run.state)) ||
    (run.resumable && finalStates.has(run.state));
  const browserEvidenceConfirmed =
    run.state === "completed" &&
    run.result?.simulated === false &&
    run.result.provenance?.data === "navigateur réel" &&
    !!run.result.evidence?.length;
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
            {browserEvidenceConfirmed
              ? "Page observée · preuves navigateur"
              : dataModeLabel[run.dataMode]}
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
              <summary>Journal en direct · {events.length} événements</summary>
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
          <small>Mission interrompue</small>
          <h2>{labels[run.state]}</h2>
          <p>{run.error}</p>
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
              <p>
                {s.state === "uncertain"
                  ? "L’effet de cette étape est incertain. Vérifiez son résultat avant de décider."
                  : "Relisez le brouillon avant de valider. Aucun envoi ne sera effectué."}
              </p>
              {run.steps
                ?.filter(
                  (p) =>
                    p.output &&
                    definitions
                      .find((d) => d.id === s.step_id)
                      ?.dependsOn?.includes(p.step_id),
                )
                .map((p) => (
                  <div className="review-output" key={p.step_id}>
                    <Markdown text={showOutput(p.output)} />
                  </div>
                ))}
            </div>
            <footer>
              {s.state === "waiting_approval" ? (
                <>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      void act(`/runs/${run.id}/steps/${s.step_id}`, {
                        approved: true,
                      })
                    }
                  >
                    Approuver
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act(`/runs/${run.id}/steps/${s.step_id}`, {
                        approved: false,
                      })
                    }
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
                      onClick={() =>
                        void act(`/runs/${run.id}/steps/${s.step_id}`, {
                          action,
                        })
                      }
                    >
                      {title}
                    </button>
                  ))}
                </>
              )}
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
            <small role="timer">
              {Number.isFinite(p.expiresAt)
                ? now >= p.expiresAt!
                  ? "Accord expiré"
                  : `Expire dans ${Math.ceil((p.expiresAt! - now) / 1000)} s`
                : "Une permission expirée est refusée par le serveur."}
            </small>
          </div>
          <footer>
            {p.options
              .filter((o) =>
                ["allow_once", "reject_once", "reject_always"].includes(o.kind),
              )
              .map((o) => (
                <button
                  key={o.optionId}
                  className={o.kind === "allow_once" ? "primary" : ""}
                  disabled={
                    busy || (p.expiresAt !== undefined && now >= p.expiresAt)
                  }
                  onClick={() =>
                    void act(`/permissions/${p.id}`, { optionId: o.optionId })
                  }
                >
                  {o.name}
                </button>
              ))}
          </footer>
        </section>
      ))}
      <div className="actions">
        {!finalStates.has(run.state) && (
          <button
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
                    {run.result.opportunities.map((o) => (
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
                            <a
                              href={o.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
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
                {run.result.opportunities.map((o) => (
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
                      <span className="badge warning">
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
                        <a
                          href={o.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Voir l’offre ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
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
