import { useState } from "react";
import type { ReactNode } from "react";
import type { Catalog } from "./types";
import { agentStatus } from "./types";

const NAME_KEY = "agre-profile-name";
export function storedName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}
const tabs = [
  ["profil", "Profil"],
  ["usage", "Utilisation"],
  ["dispo", "Disponible"],
] as const;
const tools = [
  ["Navigateur", "Choisi pour chaque mission dans la zone de saisie"],
  ["Fichiers", "Dossier de la mission"],
  ["Terminal", "Commandes locales de l’agent"],
  ["Recherche web", "Requêtes sur Internet"],
];
// Rows without an API behind them stay visibly unavailable instead of pretending to save.
export function Settings({
  catalog,
  usage,
  back,
  onName,
}: {
  catalog: Catalog | null;
  usage: ReactNode;
  back: () => void;
  onName: (name: string) => void;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("profil");
  const [name, setName] = useState(storedName);
  return (
    <div className="settings">
      <div className="settings-head">
        <button type="button" onClick={back}>
          ‹ Retour
        </button>
        <div role="tablist" aria-label="Sections des paramètres">
          {tabs.map(([id, label]) => (
            <button
              type="button"
              role="tab"
              key={id}
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "profil" && (
        <>
          <h2>Profil</h2>
          <div className="settings-group">
            <label>
              <span>Nom</span>
              <input
                value={name}
                placeholder="Ton nom"
                onChange={(e) => {
                  setName(e.target.value);
                  onName(e.target.value);
                  try {
                    localStorage.setItem(NAME_KEY, e.target.value);
                  } catch {
                    /* Private browsing may disable storage. */
                  }
                }}
              />
            </label>
          </div>
          <h2>Profil carrière</h2>
          <div className="settings-group">
            {["CV", "LinkedIn"].map((label) => (
              <div key={label}>
                <span>{label}</span>
                <small>Bientôt</small>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "usage" && usage}
      {tab === "dispo" && (
        <>
          <h2>Agents connectés</h2>
          <div className="settings-group">
            {catalog?.agents
              .filter((agent) => !agent.simulated)
              .map((agent) => (
                <div key={agent.id}>
                  <span>{agent.name}</span>
                  <small>{agentStatus(agent)}</small>
                </div>
              ))}
          </div>
          <h2>Outils</h2>
          <div className="settings-group">
            {tools.map(([label, description]) => (
              <div key={label}>
                <span>
                  {label}
                  <small>{description}</small>
                </span>
                <small>Réglage bientôt</small>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
