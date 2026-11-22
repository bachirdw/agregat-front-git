import { useState } from "react";
import type { Catalog, Agent } from "./types";
import { agentStatus, readinessLabel } from "./types";
// orchestre-22-11 : Skills et Consommation ont chacun leur fichier ; ré-exportés ici pour les appelants.
export { Skills } from "./Skills";
export { Consumption } from "./Consumption";
export function Agents({
  catalog,
  choose,
}: {
  catalog: Catalog;
  choose: (agent: string, model?: string) => void;
}) {
  const [tab, setTab] = useState("agents"),
    [filter, setFilter] = useState("Tous");
  const ready = (a: Agent) =>
    a.installed && a.compatible && (a.simulated || a.probe?.session);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Agents</h1>
          <p>
            Les agents détectés sur votre machine. Choisissez-en un pour la
            prochaine mission, ou laissez Auto décider.
          </p>
        </div>
        <div className="segmented" aria-label="Galerie">
          {[
            ["agents", "Agents"],
            ["models", "Modèles"],
          ].map(([id, title]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {title}
            </button>
          ))}
        </div>
      </div>
      <div className="actions">
        {["Tous", "Prêts", "À configurer"].map((f) => (
          <button
            className={filter === f ? "selected pill" : "pill"}
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="gallery">
        {catalog.agents
          .filter(
            (a) =>
              filter === "Tous" || (filter === "Prêts" ? ready(a) : !ready(a)),
          )
          .map((a, index) =>
            tab === "agents" ? (
              <article className="card agent-card" key={a.id}>
                <div className={"agent-art tint-" + (index % 5)}>
                  <span className="badge">{agentStatus(a)}</span>
                  <span className="agent-icon">{a.name[0]}</span>
                </div>
                <div className="card-pad">
                  <h2>{a.name}</h2>
                  <small>
                    {a.version || "Version non annoncée"} ·{" "}
                    {a.readiness
                      ? readinessLabel(a.readiness)
                      : "Détection locale"}
                  </small>
                  <p>
                    {a.reason ||
                      a.probe?.error ||
                      (a.simulated
                        ? "ACP local · aucun modèle appelé"
                        : "Agent CLI sur votre propre compte")}
                  </p>
                  <small>
                    Session :{" "}
                    {a.probe?.session
                      ? "validée"
                      : a.simulated
                        ? "démonstration"
                        : "non validée"}
                  </small>
                  <small>Mode annoncé : {a.probe?.mode || "non connu"}</small>
                  <small>
                    Modèles annoncés :{" "}
                    {a.probe?.models.map((m) => m.id).join(", ") ||
                      "aucun connu"}
                  </small>
                  <button
                    className="primary"
                    disabled={
                      !a.installed ||
                      !a.compatible ||
                      (!catalog.live && !a.simulated)
                    }
                    onClick={() => choose(a.id)}
                  >
                    Utiliser pour la prochaine mission
                  </button>
                  <button disabled>Se connecter · bientôt</button>
                </div>
              </article>
            ) : a.probe?.models.length ? (
              a.probe.models.map((m) => (
                <article className="card model-card" key={a.id + m.id}>
                  <div className={"agent-art tint-" + (index % 5)}>
                    <strong>{m.name || m.id}</strong>
                  </div>
                  <div className="card-pad">
                    <code>{m.id}</code>
                    <strong>via {a.name}</strong>
                    <small>
                      Annoncé au dernier test · coût fournisseur inconnu
                    </small>
                    <button
                      disabled={!catalog.live || !a.compatible || !a.installed}
                      onClick={() => choose(a.id, m.id)}
                    >
                      Utiliser ce modèle
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <article className="card card-pad" key={a.id}>
                <strong>{a.name}</strong>
                <small>Aucun modèle annoncé au dernier test.</small>
              </article>
            ),
          )}
      </div>
    </>
  );
}
export function Packs({
  catalog,
  choose,
}: {
  catalog: Catalog;
  choose: (pack: string) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Domain Packs</h1>
          <p>
            Un pack apporte les outils, les méthodes et les workflows d’un
            métier.
          </p>
        </div>
      </div>
      <div className="gallery">
        {catalog.packs.map((p, i) => (
          <article className="card" key={p.id}>
            <div className={"pack-art tint-" + i}>
              <h2>{p.name}</h2>
            </div>
            <div className="card-pad">
              <p>{p.description}</p>
              <small>
                {p.skills.length} Skills · {p.dags.length} workflows
              </small>
              <ul>
                {p.dags.map((w) => (
                  <li key={w.id}>{w.title}</li>
                ))}
              </ul>
              <button className="primary" onClick={() => choose(p.id)}>
                Utiliser pour la prochaine mission
              </button>
            </div>
          </article>
        ))}
        {["Ventes", "Immobilier", "Juridique"].map((p) => (
          <article className="card future" key={p}>
            <div className="pack-art">
              <h2>{p}</h2>
            </div>
            <div className="card-pad">
              <span className="badge">Bientôt</span>
              <button disabled>À venir</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
