import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Composer } from "./Composer";
import type { Catalog, MissionInput } from "./types";

afterEach(cleanup);
const skill = (id: string, active = true) => ({
  id,
  name: `${id} FICTIF`,
  version: "1",
  origin: "local",
  state: active ? "active" : "quarantined",
  active,
  installed: active,
  integrity: active,
  hash: "h",
  findings: [],
});
const catalog = {
  live: false,
  agents: [],
  packs: [
    {
      id: "pack-fictif",
      name: "Pack FICTIF",
      description: "",
      skills: [{ id: "analyse" }],
      dags: [],
    },
  ],
  skills: [skill("analyse"), skill("autre"), skill("quarantaine", false)],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
} as unknown as Catalog;
const initial = {
  prompt: "Objectif FICTIF",
  agent: "auto",
  pack: "auto",
  skills: [],
  model: "",
  budgetCents: 0,
  mode: "agent",
  workflow: "auto",
  attachments: [],
} as MissionInput;
function setup(patch: Partial<MissionInput> = {}, cat: Catalog = catalog) {
  const changed = vi.fn();
  const manage = vi.fn();
  const planned = vi.fn();
  function Harness() {
    const [input, setInput] = useState({ ...initial, ...patch });
    return (
      <Composer
        catalog={cat}
        input={input}
        onChange={(next) => {
          changed(next);
          setInput(next);
        }}
        onPlan={planned}
        busy={false}
        onManageSkills={manage}
      />
    );
  }
  render(<Harness />);
  return { changed, manage, planned };
}
const open = () => fireEvent.click(screen.getByLabelText("Ajouter"));
const item = (name: string) => screen.getByRole("menuitemcheckbox", { name });

describe("Menu + du composer", () => {
  it("s'ouvre en trois groupes, sans sélectionner de Skill, puis se ferme avec Échap ou un clic ailleurs", () => {
    const { changed } = setup();
    expect(screen.queryByRole("menu")).toBeNull();
    const settings =
      document.querySelector<HTMLDetailsElement>(".session-menu")!;
    settings.open = true;
    open();
    expect(settings.open).toBe(false);
    expect(
      screen
        .getByRole("button", { name: "Ajouter" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    const menu = screen.getByRole("menu");
    for (const name of ["Ajouter", "Skills", "Plugins"])
      expect(within(menu).getByRole("group", { name })).toBeTruthy();
    expect(changed).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText("Ajouter"));
    open();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("la sélection explicite coche le Skill, suit son pack et crée une pastille retirable", () => {
    const { changed } = setup();
    open();
    fireEvent.click(item("analyse FICTIF"));
    expect(item("analyse FICTIF").getAttribute("aria-checked")).toBe("true");
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        skills: ["analyse"],
        pack: "pack-fictif",
        workflow: "auto",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retirer le Skill analyse FICTIF" }),
    );
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ skills: [], pack: "auto" }),
    );
    expect(item("analyse FICTIF").getAttribute("aria-checked")).toBe("false");
  });
  it("retirer une pastille conserve les autres Skills du brouillon et le pack restant", () => {
    const { changed } = setup({
      skills: ["analyse", "autre"],
      pack: "pack-fictif",
    });
    fireEvent.click(screen.getByLabelText("Retirer le Skill autre FICTIF"));
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        skills: ["analyse"],
        pack: "pack-fictif",
        workflow: "auto",
      }),
    );
    expect(screen.queryByLabelText("Retirer le Skill autre FICTIF")).toBeNull();
    expect(
      screen.getByLabelText("Retirer le Skill analyse FICTIF"),
    ).toBeTruthy();
  });
  it("un groupe sans action disponible rejoint les entrées actives du menu au clavier et Entrée n'envoie pas le prompt", () => {
    const { planned } = setup();
    const area = screen.getByLabelText("Objectif de la mission");
    fireEvent.change(area, { target: { value: "Objectif @" } });
    fireEvent.keyDown(area, { key: "Enter" });
    expect(planned).not.toHaveBeenCalled();
    fireEvent.keyDown(area, { key: "ArrowDown" });
    expect(document.activeElement).toBe(
      screen.getByRole("menuitem", { name: "Fichiers et dossiers" }),
    );
    fireEvent.keyDown(area, { key: "ArrowUp" });
    expect(document.activeElement).toBe(
      screen.getByRole("menuitem", { name: /Gérer les Skills/ }),
    );
  });
  it("garde une sélection unique et ne propose pas de Skill quarantiné comme sélectionnable", () => {
    setup();
    open();
    fireEvent.click(item("analyse FICTIF"));
    fireEvent.click(item("autre FICTIF"));
    expect(item("analyse FICTIF").getAttribute("aria-checked")).toBe("false");
    expect(item("autre FICTIF").getAttribute("aria-checked")).toBe("true");
    expect((item("quarantaine FICTIF") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
  it("Gérer les Skills affiche le nombre réel en quarantaine et ouvre la page", () => {
    const { manage } = setup();
    open();
    const button = screen.getByRole("menuitem", { name: /Gérer les Skills/ });
    expect(button.textContent).toContain("1 en quarantaine");
    fireEvent.click(button);
    expect(manage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("les flèches, Début et Fin déplacent le focus entre les entrées actives", () => {
    setup();
    const trigger = screen.getByLabelText("Ajouter");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const first = screen.getByRole("menuitem", {
      name: "Fichiers et dossiers",
    });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement).toBe(
      screen.getByRole("menuitem", { name: /Domain Pack/ }),
    );
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toBe(
      screen.getByRole("menuitem", { name: /Gérer les Skills/ }),
    );
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(first);
  });
  it.each([
    ["/", "Skills"],
    ["@", "Plugins"],
    ["#", "Ajouter"],
  ])(
    "le raccourci %s dans le champ ouvre le groupe %s sans activer de Skill",
    (shortcut, group) => {
      const { changed } = setup();
      fireEvent.change(screen.getByLabelText("Objectif de la mission"), {
        target: { value: `Objectif ${shortcut}` },
      });
      const menu = screen.getByRole("menu");
      expect(within(menu).getByRole("group", { name: group })).toBeTruthy();
      expect(menu.getAttribute("data-shortcut-group")).toBe(group);
      expect(changed).toHaveBeenLastCalledWith(
        expect.objectContaining({ prompt: `Objectif ${shortcut}`, skills: [] }),
      );
      expect(
        screen.queryByRole("button", { name: /Retirer le Skill/ }),
      ).toBeNull();
    },
  );
  it("les fonctionnalités absentes du backend sont désactivées et marquées Bientôt", () => {
    setup();
    open();
    const plugins = screen.getByRole("group", { name: "Plugins" });
    expect(plugins.textContent).toContain("Bientôt");
    expect(
      (
        screen.getByRole("menuitem", {
          name: /Ajouter un plugin/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    for (const name of ["Objectif", "Enregistrer en Skill"]) {
      const button = screen.getByRole("menuitem", {
        name: new RegExp(`^${name}`),
      });
      expect((button as HTMLButtonElement).disabled).toBe(true);
      expect(button.textContent).toContain("Bientôt");
    }
  });
  it("le catalogue vide affiche Aucun Skill disponible", () => {
    setup({}, { ...catalog, skills: [] });
    open();
    expect(screen.getByText("Aucun Skill disponible.")).toBeTruthy();
  });
});
