// skill-explicite (décision du propriétaire, 21/11 vers 18:45, transmise par le manager du back) : un Skill ne
// s'active jamais tout seul. L'utilisateur le choisit dans la zone de saisie, comme le modèle ; par défaut,
// « Aucun Skill ». Données FICTIVES.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Composer } from "./Composer";
import type { Catalog, MissionInput } from "./types";

afterEach(cleanup);

const skill = (id: string, name: string, active = true) => ({
  id,
  name,
  version: "1",
  origin: "local",
  state: active ? "active" : "installed",
  active,
  installed: true,
  integrity: true,
  hash: "h",
  findings: [],
});
const catalog = {
  live: false,
  agents: [],
  packs: [
    {
      id: "najah",
      name: "Najah FICTIF",
      description: "",
      skills: [{ id: "offer-evaluation" }, { id: "visa-check" }],
      dags: [],
    },
  ],
  skills: [
    skill("offer-evaluation", "Évaluation d’offre FICTIVE"),
    skill("libre", "Skill libre FICTIF"),
    skill("visa-check", "Visa FICTIF", false),
  ],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
} as unknown as Catalog;
const input = {
  prompt: "Objectif FICTIF",
  agent: "auto",
  pack: "auto",
  skills: [],
  model: "",
  agentMode: "",
  browser: "auto",
  browserDomains: "",
  budgetCents: 0,
  mode: "agent",
  workflow: "auto",
  attachments: [],
} as unknown as MissionInput;
const composer = (patch: Partial<MissionInput> = {}) => {
  const onChange = vi.fn();
  render(
    <Composer
      catalog={catalog}
      input={{ ...input, ...patch }}
      onChange={onChange}
      onPlan={vi.fn()}
      busy={false}
    />,
  );
  return onChange;
};
const select = () => screen.getByLabelText("Skill") as HTMLSelectElement;

describe("Skill choisi explicitement", () => {
  it("un seul sélecteur « Skill », « Aucun Skill » par défaut ; plus de cases à cocher", () => {
    composer();
    expect(select().value).toBe("");
    expect(select().options[0].textContent).toBe("Aucun Skill");
    expect(screen.queryByRole("checkbox", { name: /FICTI/ })).toBeNull();
  });

  it("le bouton des réglages dit le Skill choisi, ou « aucun Skill »", () => {
    composer();
    expect(document.querySelector(".session-menu > summary")!.textContent).toBe(
      "Auto · défaut · aucun Skill",
    );
    cleanup();
    composer({ skills: ["libre"] });
    expect(document.querySelector(".session-menu > summary")!.textContent).toBe(
      "Auto · défaut · Skill libre FICTIF",
    );
  });

  it("choisir un Skill d'un pack : le Skill dans `skills` et son pack", () => {
    const onChange = composer();
    fireEvent.change(select(), { target: { value: "offer-evaluation" } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        skills: ["offer-evaluation"],
        pack: "najah",
        workflow: "auto",
      }),
    );
  });

  it("un Skill sans pack : le pack choisi ne change pas", () => {
    const onChange = composer();
    fireEvent.change(select(), { target: { value: "libre" } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ skills: ["libre"], pack: "auto" }),
    );
  });

  it("revenir à « Aucun Skill » : `skills` vide et le pack que le Skill avait mis est retiré", () => {
    const onChange = composer({ skills: ["offer-evaluation"], pack: "najah" });
    fireEvent.change(select(), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ skills: [], pack: "auto" }),
    );
  });

  it("un Skill inactif est proposé mais pas choisissable, avec la marche à suivre", () => {
    composer();
    const visa = [...select().options].find((o) => o.value === "visa-check")!;
    expect(visa.disabled).toBe(true);
    expect(visa.textContent).toContain("à activer dans Skills");
  });
});
