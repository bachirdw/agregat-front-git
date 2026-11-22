import type { Catalog, Run } from "./types";
import { labels, money } from "./types";
import { UsageCard } from "./Mission";
// orchestre-22-11 : écran Consommation sorti de Galleries.tsx (chantier B, maquette « Consommation »).
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
  // Sub-missions have their own consumption but are not missions of the owner: counted apart.
  const subs = runs.filter((r) => r.famille).length;
  const missions = runs.length - subs;
  const count =
    `${missions} mission${missions > 1 ? "s" : ""}` +
    (subs ? ` · ${subs} sous-mission${subs > 1 ? "s" : ""}` : "");
  // The back has aliases (workflow and workflow_run…) with the same category: one line each.
  const tariffs = [
    ...new Map(
      Object.entries(catalog.pricing.centsPerUnit).map(([id, cents]) => {
        const category = catalog.meters[id]?.category || id;
        const unit = catalog.meters[id]?.unit || "unité";
        return [`${category}|${unit}|${cents}`, { category, unit, cents }];
      }),
    ).values(),
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Consommation</h1>
          <p>
            Coûts mesurés par mission. Votre consommation fournisseur BYOA n’est
            jamais refacturée.
          </p>
        </div>
      </div>
      <div className="stats">
        <div className="card card-pad">
          <small>Consommation globale</small>
          <h2>Bientôt</h2>
          <small>Pas encore de total pour toutes les missions.</small>
        </div>
        <div className="card card-pad">
          <small>Historique local</small>
          <h2>{count}</h2>
          <small>Missions retournées par le serveur.</small>
        </div>
        <div className="card card-pad">
          <small>Plafond mensuel configuré</small>
          <h2>
            {catalog.pricing.monthlyCapCents === null
              ? "Non défini"
              : money(
                  catalog.pricing.monthlyCapCents,
                  catalog.pricing.currency,
                )}
          </h2>
        </div>
      </div>
      <section className="card table-wrap">
        <table className="usage-table">
          <caption>Missions mesurées</caption>
          <thead>
            <tr>
              <th>Mission</th>
              <th>État</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  {r.famille
                    ? `Sous-mission : ${r.famille.titre || r.title || r.prompt}`
                    : r.prompt}
                </th>
                <td>{labels[r.state] || r.state}</td>
                <td>
                  <button onClick={() => onSelect(r.id)}>
                    Voir la consommation
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!runs.length && (
          <p className="empty">Aucune mission pour le moment.</p>
        )}
      </section>
      {selected && (
        <>
          <h2>Consommation : {selected.prompt}</h2>
          <UsageCard run={selected} />
        </>
      )}
      <details className="card card-pad">
        <summary>Tarifs configurés par le serveur</summary>
        {tariffs.map(({ category, unit, cents }) => (
          <div className="spread" key={`${category}|${unit}|${cents}`}>
            <span>{category}</span>
            <span>
              {money(cents, catalog.pricing.currency)} / {unit}
            </span>
          </div>
        ))}
      </details>
    </>
  );
}
