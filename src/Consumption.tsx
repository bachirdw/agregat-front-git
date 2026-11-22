import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Catalog, Run } from "./types";
import { labels, money } from "./types";
import { UsageCard } from "./Mission";
import * as missing from "./consumption/missing";
import type { Grouping, Period } from "./consumption/missing";
import {
  compactNumber,
  detailRows,
  functionSeries,
  missionNotes,
  missionTitle,
  ownerId,
  percentage,
  runDuration,
  seriesColor,
  shortDate,
} from "./consumption/model";

const tokenValue = (value?: number) =>
  typeof value === "number" ? compactNumber(value) : "Bientôt";

function stateClass(state: string) {
  if (["failed", "error"].includes(state)) return "cs-state-failed";
  if (/waiting|attend|permission|question|paused/.test(state))
    return "cs-state-waiting";
  if (["running", "planning"].includes(state)) return "cs-state-running";
  return "";
}

export function Consumption({
  catalog,
  runs,
  selected,
  onSelect,
}: {
  catalog: Catalog;
  runs: Run[];
  selected: Run | null;
  onSelect: (id: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "stats">("stats");
  const [period, setPeriod] = useState<Period>(7);
  const [grouping, setGrouping] = useState<Grouping>("function");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const id = useId();
  const subCount = runs.filter(
    (run) => run.famille?.mere || run.famille?.racine,
  ).length;
  const missionCount = runs.length - subCount;
  const count = `${missionCount} mission${missionCount > 1 ? "s" : ""}${subCount ? ` · ${subCount} sous-mission${subCount > 1 ? "s" : ""}` : ""}`;
  const missions = runs.filter((run) => !ownerId(run, runs));
  const detailedRuns = runs.map((run) =>
    selected?.id === run.id ? selected : run,
  );
  const measured = detailedRuns.filter(
    (run) => run.usage?.currency === catalog.pricing.currency,
  );
  const measuredCost = measured.reduce(
    (sum, run) => sum + run.usage!.platformCents,
    0,
  );
  const days = missing.getDailyTokenUsage(runs, period, grouping);
  const totalTokens = days.reduce(
    (sum, day) =>
      sum + day.segments.reduce((n, segment) => n + segment.tokens, 0),
    0,
  );
  const maxTokens = Math.max(
    ...days.map((day) =>
      day.segments.reduce((n, segment) => n + segment.tokens, 0),
    ),
    1,
  );
  const series = [
    ...new Map(
      days.flatMap((day) =>
        day.segments.map((segment) => [
          segment.key,
          { key: segment.key, label: segment.label },
        ]),
      ),
    ).values(),
  ];
  const legend = series.length
    ? series
    : grouping === "function"
      ? functionSeries.map((label) => ({ key: label, label }))
      : grouping === "agent"
        ? (catalog.agents || []).map((agent) => ({
            key: agent.id,
            label: agent.name,
          }))
        : [];
  const today = new Date();
  const endDate = days.at(-1)?.date || today.toISOString().slice(0, 10);
  const start = new Date(endDate);
  start.setUTCDate(start.getUTCDate() - period + 1);
  const startDate = days[0]?.date || start.toISOString().slice(0, 10);
  const middle = new Date(startDate);
  middle.setUTCDate(middle.getUTCDate() + Math.floor((period - 1) / 2));
  const ticks = [startDate, middle.toISOString(), endDate];
  const overviewTokens = missing.getOverviewTokens(runs, 7);
  const monthlyUsage = missing.getMonthlyPlatformUsage(catalog);
  const tariffs = [
    ...new Map(
      Object.entries(catalog.pricing.centsPerUnit).map(([key, cents]) => {
        const category = catalog.meters[key]?.category || key;
        const unit = catalog.meters[key]?.unit || "unité";
        return [`${category}|${unit}|${cents}`, { category, unit, cents }];
      }),
    ).values(),
  ];

  function tabKeys(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "overview"
        : event.key === "End"
          ? "stats"
          : tab === "stats"
            ? "overview"
            : "stats";
    setTab(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }

  return (
    <div className="cs-screen" data-screen-label="Consommation">
      <div className="cs-content">
        <header className="cs-heading">
          <h1>Consommation</h1>
          <p>
            Tokens et coûts mesurés par mission. Votre consommation fournisseur
            BYOA n’est jamais refacturée.
          </p>
        </header>
        <div className="cs-tabs" role="tablist" aria-label="Consommation">
          {(
            [
              ["overview", "Aperçu"],
              ["stats", "Statistiques"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              id={`${id}-tab-${key}`}
              role="tab"
              aria-selected={tab === key}
              aria-controls={`${id}-panel-${key}`}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
              onKeyDown={tabKeys}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "overview" ? (
          <div
            className="cs-overview"
            role="tabpanel"
            id={`${id}-panel-overview`}
            aria-labelledby={`${id}-tab-overview`}
          >
            <div className="cs-kpis">
              <div className="cs-kpi">
                <span className="cs-kpi-label">Tokens · 7 jours</span>
                <span className="cs-kpi-value">
                  {tokenValue(overviewTokens?.total)}
                </span>
                <span className="cs-muted">{count}</span>
                <span className="cs-muted">
                  {overviewTokens?.cache !== undefined && overviewTokens.total
                    ? `${percentage(overviewTokens.cache, overviewTokens.total)} en cache`
                    : "Part en cache : Bientôt"}
                </span>
              </div>
              <div className="cs-kpi">
                <span className="cs-kpi-label">Coût plateforme</span>
                <span className="cs-kpi-value">
                  {measured.length
                    ? money(measuredCost, catalog.pricing.currency)
                    : "Bientôt"}
                </span>
                <span className="cs-muted">
                  {measured.length
                    ? `Coûts mesurés disponibles : ${measured.length} sur ${runs.length} missions et sous-missions.`
                    : "Total non transmis. Ouvrez une mission pour consulter son coût mesuré."}
                </span>
              </div>
              <div className="cs-kpi">
                <span className="cs-kpi-label">Plafond mensuel</span>
                <span className="cs-kpi-value">
                  {catalog.pricing.monthlyCapCents === null
                    ? "Non défini"
                    : money(
                        catalog.pricing.monthlyCapCents,
                        catalog.pricing.currency,
                      )}
                </span>
                <span className="cs-muted">
                  {catalog.pricing.monthlyCapCents === null
                    ? "Aucune mission n’est bloquée par un plafond"
                    : monthlyUsage?.currency === catalog.pricing.currency
                      ? `${money(monthlyUsage.platformCents, monthlyUsage.currency)} consommés en ${monthlyUsage.month}`
                      : "Plafond configuré · consommation mensuelle : Bientôt"}
                </span>
              </div>
            </div>
            <section className="cs-accounts" aria-label="Comptes fournisseurs">
              <h2>Comptes fournisseurs</h2>
              <p className="cs-description">
                Limites lues chez chaque fournisseur quand il les expose.
              </p>
              {(catalog.agents || []).map((agent) => {
                const limits = missing.getProviderLimits(agent);
                return (
                  <div className="cs-account" key={agent.id}>
                    <span className="cs-account-name">
                      <span>{agent.name}</span>
                      <span className="cs-muted">
                        {limits?.plan ||
                          (agent.simulated
                            ? "Démonstrateur · aucun compte fournisseur"
                            : "Agent du catalogue · compte et abonnement : Bientôt")}
                      </span>
                    </span>
                    <span className="cs-account-limits">
                      {limits?.windows.length ? (
                        limits.windows.map((window) => (
                          <span
                            className={`cs-limit ${window.percent >= 100 ? "cs-limit-danger" : window.percent >= 80 ? "cs-limit-warning" : ""}`}
                            key={window.label}
                          >
                            <span>{window.label}</span>
                            <span
                              className="cs-limit-track"
                              role="progressbar"
                              aria-label={`${agent.name} · ${window.label}`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.min(window.percent, 100)}
                              aria-valuetext={`${window.percent} %`}
                            >
                              <span
                                className="cs-limit-fill"
                                style={{
                                  width: `${Math.max(0, Math.min(window.percent, 100))}%`,
                                }}
                              />
                            </span>
                            <span className="cs-limit-value">
                              {window.percent} %
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="cs-muted">
                          Bientôt · limites non transmises par le fournisseur
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
              {!catalog.agents?.length && (
                <p className="cs-empty">
                  Bientôt · aucun compte fournisseur transmis.
                </p>
              )}
            </section>
            <details className="cs-tariffs">
              <summary>Tarifs configurés par le serveur</summary>
              {tariffs.map(({ category, unit, cents }) => (
                <div className="cs-tariff" key={`${category}|${unit}|${cents}`}>
                  <span>{category}</span>
                  <span>
                    {money(cents, catalog.pricing.currency)} / {unit}
                  </span>
                </div>
              ))}
            </details>
          </div>
        ) : (
          <div
            className="cs-stats"
            role="tabpanel"
            id={`${id}-panel-stats`}
            aria-labelledby={`${id}-tab-stats`}
          >
            <section className="cs-history" aria-label="Historique">
              <div className="cs-section-title">
                <h2>Historique</h2>
                <p className="cs-description">
                  Tokens consommés par jour, toutes missions confondues.
                </p>
              </div>
              <div className="cs-controls">
                <div className="cs-segmented" role="group" aria-label="Période">
                  {([7, 30] as const).map((value) => (
                    <button
                      key={value}
                      aria-pressed={period === value}
                      onClick={() => setPeriod(value)}
                    >
                      {value} j
                    </button>
                  ))}
                </div>
                <span className="cs-control-spacer" />
                <div
                  className="cs-segmented"
                  role="group"
                  aria-label="Regroupement"
                >
                  {(
                    [
                      ["function", "Fonction"],
                      ["agent", "Agent"],
                      ["model", "Modèle"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      aria-pressed={grouping === key}
                      onClick={() => setGrouping(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cs-chart" aria-label="Tokens consommés par jour">
                <div className="cs-chart-heading">
                  <span>
                    {shortDate(startDate)} – {shortDate(endDate)}{" "}
                    {new Date(endDate).getUTCFullYear()}
                  </span>
                  <span>
                    {days.length
                      ? `${compactNumber(totalTokens)} tokens`
                      : "Bientôt"}
                  </span>
                </div>
                {days.length ? (
                  <div
                    className={`cs-bars${period === 30 ? " cs-bars-30" : ""}`}
                  >
                    {days.map((day) => {
                      const total = day.segments.reduce(
                        (sum, segment) => sum + segment.tokens,
                        0,
                      );
                      const tip = `${shortDate(day.date)} · ${compactNumber(total)} tokens`;
                      const breakdown = day.segments
                        .map(
                          (segment) =>
                            `\n${segment.label} : ${compactNumber(segment.tokens)}`,
                        )
                        .join("");
                      return (
                        <div
                          className="cs-day"
                          key={day.date}
                          title={tip}
                          tabIndex={0}
                          aria-label={tip + breakdown}
                        >
                          {[...day.segments].reverse().map((segment) => (
                            <div
                              key={segment.key}
                              className="cs-segment"
                              style={{
                                height: `${(segment.tokens / maxTokens) * 100}%`,
                                background: seriesColor(
                                  grouping,
                                  segment.label,
                                  series.findIndex(
                                    (entry) => entry.key === segment.key,
                                  ),
                                ),
                              }}
                            />
                          ))}
                          <span className="cs-tooltip" aria-hidden="true">
                            {tip}
                            {breakdown}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="cs-chart-empty">
                    <strong>Bientôt</strong>
                    <span className="cs-muted">
                      Les mesures de tokens ne sont pas encore disponibles.
                    </span>
                  </div>
                )}
                <div className="cs-ticks">
                  {ticks.map((tick, i) => (
                    <span key={i}>{shortDate(tick)}</span>
                  ))}
                </div>
              </div>
              <div className="cs-legend" aria-label="Répartition des tokens">
                {legend.map((entry, index) => {
                  const tokens = days.reduce(
                    (sum, day) =>
                      sum +
                      (day.segments.find((segment) => segment.key === entry.key)
                        ?.tokens || 0),
                    0,
                  );
                  return (
                    <div className="cs-legend-item" key={entry.key}>
                      <span
                        className="cs-legend-color"
                        style={{
                          background: seriesColor(grouping, entry.label, index),
                        }}
                      />
                      <span className="cs-legend-copy">
                        <span className="cs-legend-label">{entry.label}</span>
                        <span className="cs-legend-percent">
                          {days.length
                            ? percentage(tokens, totalTokens)
                            : "Bientôt"}
                        </span>
                        <span className="cs-legend-total">
                          {days.length
                            ? `${compactNumber(tokens)} tokens`
                            : "Tokens non transmis"}
                        </span>
                      </span>
                    </div>
                  );
                })}
                {!legend.length && (
                  <p className="cs-muted">
                    Bientôt · répartition par modèle non transmise.
                  </p>
                )}
              </div>
            </section>
            <section className="cs-missions" aria-label="Principales missions">
              <div className="cs-section-title">
                <h2>Principales missions</h2>
                <p className="cs-description">
                  Ouvrez une mission pour voir le détail par sous-agent.
                </p>
              </div>
              <div className="cs-table-scroll">
                <div className="cs-table">
                  <div className="cs-mission-columns cs-table-heading">
                    <span />
                    <span>Mission</span>
                    <span className="cs-number">Tokens</span>
                    <span className="cs-number">Part {period} j</span>
                    <span className="cs-number">Plateforme</span>
                    <span className="cs-number">Durée</span>
                  </div>
                  {(showAll ? missions : missions.slice(0, 5)).map(
                    (summary) => {
                      const run =
                        selected?.id === summary.id ? selected : summary;
                      const open = openId === run.id;
                      const tokens = missing.getRunTokens(run);
                      const periodTokens = missing.getRunPeriodTokens(
                        run,
                        period,
                      );
                      const notes = missionNotes(run, runs);
                      const cost = run.usage || run.plan?.cost;
                      return (
                        <div className="cs-mission" key={run.id}>
                          <button
                            className="cs-mission-columns cs-mission-toggle"
                            aria-expanded={open}
                            aria-controls={`${id}-detail-${run.id}`}
                            onClick={() => {
                              setOpenId(open ? null : run.id);
                              if (!open) onSelect(run.id);
                            }}
                          >
                            <svg
                              className="cs-chevron"
                              width="9"
                              height="9"
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
                            <span className="cs-mission-title">
                              <span
                                className="cs-truncate"
                                title={missionTitle(run)}
                              >
                                {missionTitle(run)}
                              </span>
                              <span
                                className={`cs-state ${stateClass(run.state)}`}
                              >
                                {labels[run.state] || run.state}
                              </span>
                            </span>
                            <span className="cs-number">
                              {tokenValue(tokens?.total)}
                            </span>
                            <span className="cs-number cs-secondary">
                              {periodTokens !== undefined && totalTokens > 0
                                ? percentage(periodTokens, totalTokens)
                                : "Bientôt"}
                            </span>
                            <span className="cs-number cs-secondary cs-cost">
                              {cost
                                ? money(cost.platformCents, cost.currency)
                                : "Bientôt"}
                              {!run.usage && cost && <small>Estimation</small>}
                            </span>
                            <span className="cs-number cs-secondary">
                              {runDuration(run) || "Bientôt"}
                            </span>
                          </button>
                          {open && (
                            <div
                              className="cs-detail"
                              id={`${id}-detail-${run.id}`}
                            >
                              <div className="cs-detail-columns cs-detail-heading">
                                <span>Sous-agent</span>
                                {["Entrée", "Sortie", "Cache", "Outils"].map(
                                  (label) => (
                                    <span className="cs-number" key={label}>
                                      {label}
                                    </span>
                                  ),
                                )}
                              </div>
                              {detailRows(run, runs).map((row) => {
                                const detail = missing.getRunTokens(row.source);
                                return (
                                  <div
                                    className="cs-detail-columns cs-detail-row"
                                    key={row.id}
                                  >
                                    <span className="cs-member">
                                      <span className="cs-phase" title="Phase">
                                        {row.phase ?? "—"}
                                      </span>
                                      <span
                                        className="cs-member-name cs-truncate"
                                        title={row.name}
                                      >
                                        {row.name}
                                      </span>
                                      <span className="cs-member-agent">
                                        {row.agent || "Bientôt"}
                                      </span>
                                    </span>
                                    <span className="cs-number">
                                      {tokenValue(detail?.input)}
                                    </span>
                                    <span className="cs-number">
                                      {tokenValue(detail?.output)}
                                    </span>
                                    <span className="cs-number">
                                      {tokenValue(detail?.cache)}
                                    </span>
                                    <span className="cs-number">
                                      {row.tools ?? "Bientôt"}
                                    </span>
                                  </div>
                                );
                              })}
                              {notes.map((note) => (
                                <p className="cs-note" key={note}>
                                  {note}
                                </p>
                              ))}
                              {run.usage && (
                                <details className="cs-measured">
                                  <summary>
                                    Consommation mesurée · détail du registre
                                  </summary>
                                  <UsageCard run={run} />
                                </details>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
              {!missions.length && (
                <p className="cs-empty">Aucune mission pour le moment.</p>
              )}
              {!showAll && missions.length > 5 && (
                <button className="cs-more" onClick={() => setShowAll(true)}>
                  Tout afficher
                </button>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
