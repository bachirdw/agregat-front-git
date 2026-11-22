// Données FICTIVES — interactions de la maquette Skills sur les contrats réels.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Skills } from "./Skills";
import type { Catalog, Skill } from "./types";

afterEach(cleanup);
const skill = (
  id: string,
  state: string,
  extra: Partial<Skill> = {},
): Skill => ({
  id,
  name: id,
  state,
  version: "1.2.3",
  origin: "bundled",
  active: state === "active",
  installed: ["installed", "active"].includes(state),
  integrity: true,
  hash: "fictif-" + id,
  description: "Description FICTIVE de " + id,
  findings: [],
  ...extra,
});
const entries = [
  skill("installé-fictif", "installed"),
  skill("actif-fictif", "active"),
  skill("embarqué-fictif", "available"),
  skill("revue-fictive", "reviewed", { origin: "third-party" }),
  skill("tiers-fictif", "quarantined", { origin: "third-party" }),
  skill("rejeté-fictif", "rejected", { origin: "third-party" }),
];
function show(skills = entries, request = vi.fn(async () => ({}))) {
  const act = vi.fn(async () => {});
  render(
    <Skills
      catalog={{ skills } as Catalog}
      busy={false}
      act={act}
      request={request}
    />,
  );
  return { act, request };
}
const expand = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name: "Détails de " + name }));

describe("Skills — sections et détails", () => {
  it("regroupe tous les états réels sans activer un Skill", () => {
    const { act, request } = show();
    const installed = screen.getByRole("region", { name: "Installés" });
    expect(within(installed).getByText("installé-fictif")).toBeTruthy();
    expect(within(installed).getByText("actif-fictif")).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Embarqués" })).getByText(
        "embarqué-fictif",
      ),
    ).toBeTruthy();
    const quarantine = screen.getByRole("region", { name: "En quarantaine" });
    expect(within(quarantine).getByText("tiers-fictif")).toBeTruthy();
    expect(within(quarantine).getByText("revue-fictive")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Rejetés/ }));
    expect(
      within(screen.getByRole("region", { name: "Rejetés" })).getByText(
        "rejeté-fictif",
      ),
    ).toBeTruthy();
    expect(act).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
  it("déplie une ligne, affiche les métadonnées réelles puis la replie", () => {
    show([skill("embarqué-fictif", "available", { license: "Apache-2.0" })]);
    const row = screen.getByRole("button", {
      name: "Détails de embarqué-fictif",
    });
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Apache-2.0")).toBeNull();
    expand("embarqué-fictif");
    expect(row.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Apache-2.0")).toBeTruthy();
    expect(screen.getByText("v1.2.3")).toBeTruthy();
    expect(screen.getByText("Scripts")).toBeTruthy();
    expect(screen.getByText("Bientôt")).toBeTruthy();
    expand("embarqué-fictif");
    expect(screen.queryByText("Apache-2.0")).toBeNull();
  });
  it("liste vide et recherche sans résultat ont un message explicite", () => {
    const view = show([]);
    expect(screen.getByText("Aucun Skill dans cette catégorie.")).toBeTruthy();
    cleanup();
    show();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Rechercher des Skills" }),
      { target: { value: "introuvable-fictif" } },
    );
    expect(screen.getByText("Aucun Skill ne correspond.")).toBeTruthy();
    expect(view.act).not.toHaveBeenCalled();
  });
  it("filtre aussi la description et conserve les comptes du catalogue", () => {
    show([
      skill("a-fictif", "available", { description: "Visa FICTIF" }),
      skill("b-fictif", "available"),
    ]);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "visa" },
    });
    expect(screen.getByText("a-fictif")).toBeTruthy();
    expect(screen.queryByText("b-fictif")).toBeNull();
    expect(screen.getByRole("button", { name: "Tous 2" })).toBeTruthy();
  });
});

describe("Skills — Ajouter et quarantaine", () => {
  it("ouvre le menu, navigue au clavier et ferme sur Échap ou clic ailleurs", () => {
    show();
    const add = screen.getByRole("button", { name: "Ajouter" });
    expect(add.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(add);
    const menu = screen.getByRole("menu", { name: "Ajouter un Skill" });
    const github = within(menu).getByRole("menuitem", {
      name: /Importer depuis GitHub/,
    });
    expect(document.activeElement).toBe(github);
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(
      within(menu).getByRole("menuitem", { name: /Importer un dossier local/ }),
    );
    fireEvent.keyDown(menu, { key: "Home" });
    expect(document.activeElement).toBe(github);
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(add);
    fireEvent.click(add);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("l’import GitHub s’ouvre depuis Ajouter et conserve le sous-dossier réel", async () => {
    const { request } = show();
    expect(screen.queryByLabelText("Dépôt GitHub")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: /Importer depuis GitHub/ }),
    );
    fireEvent.change(screen.getByLabelText("Dépôt GitHub"), {
      target: { value: "https://github.com/exemple/fictif" },
    });
    fireEvent.change(screen.getByLabelText("Sous-dossier"), {
      target: { value: "skills/fictif" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Importer" }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith("/skills/import", {
        git: "https://github.com/exemple/fictif",
        subdir: "skills/fictif",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByLabelText("Dépôt GitHub")).toBeNull();
  });
  it("approuve l’empreinte puis installe seulement après lecture explicite", async () => {
    const { request } = show([entries[4]]);
    expand("tiers-fictif");
    const approve = screen.getByRole("button", {
      name: "Approuver et installer",
    }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(approve);
    await waitFor(() =>
      expect(request).toHaveBeenNthCalledWith(
        2,
        "/skills/tiers-fictif/install",
        {},
      ),
    );
    expect(request).toHaveBeenNthCalledWith(1, "/skills/tiers-fictif/review", {
      approved: true,
      hash: "fictif-tiers-fictif",
    });
    expect(request).not.toHaveBeenCalledWith(
      expect.stringContaining("activate"),
      expect.anything(),
    );
  });
  it("importe un dossier local via le chemin saisi et l’API réelle", async () => {
    const { request } = show();
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: /Importer un dossier local/ }),
    );
    fireEvent.change(screen.getByLabelText("Dossier local"), {
      target: { value: "/tmp/FICTIF/skill" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Importer" }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith("/skills/import", {
        path: "/tmp/FICTIF/skill",
      }),
    );
  });
  it("une revue refusée ne déclenche pas l’installation ; le rejet garde le hash", async () => {
    const request = vi
      .fn()
      .mockRejectedValue(new Error("Revue FICTIVE refusée"));
    const { act } = show([entries[4]], request);
    expand("tiers-fictif");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Approuver et installer" }),
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Revue FICTIVE refusée",
    );
    expect(request).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Rejeter" }));
    expect(act).toHaveBeenCalledWith("/skills/tiers-fictif/review", {
      approved: false,
      hash: "fictif-tiers-fictif",
    });
  });
});
