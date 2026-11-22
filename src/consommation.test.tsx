import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Consumption } from "./Consumption";
import * as missing from "./consumption/missing";
import type { Catalog, Run } from "./types";
import { money } from "./types";

// Toutes les données de ce banc sont FICTIVES ; aucun appel fournisseur ni API.
const catalog: Catalog = {
  live: false,
  agents: [
    {
      id: "fixture",
      name: "Fournisseur FICTIF",
      installed: true,
      compatible: true,
      simulated: true,
    },
  ],
  packs: [],
  skills: [],
  meters: {
    workflow: { category: "Workflows", unit: "exécution", billable: true },
    workflow_run: { category: "Workflows", unit: "exécution", billable: true },
  },
  pricing: {
    currency: "EUR",
    centsPerUnit: { workflow: 20, workflow_run: 20 },
    monthlyCapCents: 12500,
  },
};

function run(overrides: Partial<Run> = {}): Run {
  return {
    id: "mission-fictive",
    prompt: "Consigne FICTIVE",
    title: "Mission FICTIVE",
    state: "completed",
    mode: "agent",
    agent: "fixture",
    pack: "",
    model: "modele-fictif",
    simulated: true,
    dataMode: "fixture",
    createdAt: "2026-11-20T10:00:00Z",
    finishedAt: "2026-11-20T10:02:00Z",
    plan: {
      steps: [],
      cost: {
        platformCents: 999,
        currency: "EUR",
        budgetCents: 2000,
        withinBudget: true,
        description: "Estimation FICTIVE",
        lines: [],
      },
    },
    ...overrides,
  };
}

function setup(runs: Run[] = [], selected: Run | null = null) {
  const onSelect = vi.fn();
  return {
    onSelect,
    ...render(
      <Consumption
        catalog={catalog}
        runs={runs}
        selected={selected}
        onSelect={onSelect}
      />,
    ),
  };
}

function overview() {
  fireEvent.click(screen.getByRole("tab", { name: "Aperçu" }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Consommation · navigation et données absentes", () => {
  it("ouvre les Statistiques par défaut et permet le retour depuis Aperçu", () => {
    setup();
    expect(
      screen
        .getByRole("tab", { name: "Statistiques" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("heading", { name: "Historique" })).toBeTruthy();
    overview();
    expect(
      screen.getByRole("tab", { name: "Aperçu" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("heading", { name: "Comptes fournisseurs" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Historique" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Statistiques" }));
    expect(screen.getByRole("heading", { name: "Historique" })).toBeTruthy();
  });

  it("change la période et le regroupement transmis au module isolé", () => {
    const daily = vi.spyOn(missing, "getDailyTokenUsage");
    const runs = [run()];
    setup(runs);
    expect(
      screen.getByRole("button", { name: "7 j" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Fonction" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "30 j" }));
    expect(
      screen.getByRole("button", { name: "30 j" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "7 j" }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(daily).toHaveBeenLastCalledWith(runs, 30, "function");
    fireEvent.click(screen.getByRole("button", { name: "Agent" }));
    expect(daily).toHaveBeenLastCalledWith(runs, 30, "agent");
    expect(
      screen
        .getByRole("button", { name: "Agent" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Modèle" }));
    expect(daily).toHaveBeenLastCalledWith(runs, 30, "model");
    expect(
      screen
        .getByRole("button", { name: "Modèle" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "7 j" }));
    expect(daily).toHaveBeenLastCalledWith(runs, 7, "model");
  });

  it("signale les tokens absents sans reprendre les chiffres et missions de la maquette", () => {
    setup([run()]);
    expect(screen.getAllByText(/Bientôt/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/1[ ,.]?078[ ,.]?000/)).toBeNull();
    expect(screen.queryByText("1,08 M")).toBeNull();
    expect(screen.queryByText(/Recherche marché/)).toBeNull();
    expect(screen.queryByText(/CV et lettres pour deux offres/)).toBeNull();
    overview();
    expect(screen.getByText("Fournisseur FICTIF")).toBeTruthy();
    expect(screen.getAllByText(/Bientôt/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/Abonnement Max|ChatGPT Plus/)).toBeNull();
  });

  it("affiche une liste vide sans inventer une mission ou un bouton Tout afficher", () => {
    setup();
    expect(screen.getByText("Aucune mission pour le moment.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Tout afficher/ })).toBeNull();
    expect(screen.queryByRole("button", { expanded: false })).toBeNull();
  });
});

describe("Consommation · missions et sous-agents", () => {
  it("déplie puis replie une mission et demande sa consommation détaillée à App", () => {
    const mission = run();
    const { onSelect } = setup([mission]);
    const trigger = screen.getByRole("button", {
      name: /Mission FICTIVE/,
      expanded: false,
    });
    expect(screen.queryByText("Entrée")).toBeNull();
    fireEvent.click(trigger);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(mission.id);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    for (const header of ["Entrée", "Sortie", "Cache", "Outils"])
      expect(screen.getByText(header)).toBeTruthy();
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Entrée")).toBeNull();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("affiche le détail sélectionné avec phase, nom, agent, outils et cause du sous-agent", () => {
    const mission = run();
    const { rerender, onSelect } = setup([mission]);
    fireEvent.click(screen.getByRole("button", { name: /Mission FICTIVE/ }));
    const detailed = run({
      family: [
        {
          id: "membre-fictif",
          titre: "Vérification FICTIVE",
          agent: "codex-fictif",
          etape: { numero: 2 },
          outils: 17,
          state: "failed",
          cause: { type: "limite_usage", message: "Quota FICTIF atteint" },
        },
      ],
    });
    rerender(
      <Consumption
        catalog={catalog}
        runs={[mission]}
        selected={detailed}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText("Vérification FICTIVE")).toBeTruthy();
    expect(screen.getByText("codex-fictif")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("17")).toBeTruthy();
    expect(screen.getByText(/Quota FICTIF atteint/)).toBeTruthy();
    expect(screen.getAllByText(/Bientôt/).length).toBeGreaterThanOrEqual(3);
    fireEvent.click(
      screen.getByRole("button", { name: /Mission FICTIVE/, expanded: true }),
    );
    expect(screen.queryByText("Vérification FICTIVE")).toBeNull();
  });

  it("relie les sous-missions connues à leur mère et conserve les sous-missions orphelines", () => {
    const mother = run();
    const sub = run({
      id: "sous-fictive",
      title: "Collecte FICTIVE",
      famille: { mere: mother.id, titre: "Collecte FICTIVE" },
    });
    const orphan = run({
      id: "orpheline-fictive",
      title: "Orpheline FICTIVE",
      famille: { mere: "absente", titre: "Orpheline FICTIVE" },
    });
    setup([mother, sub, orphan]);
    expect(
      screen.queryByRole("button", { name: /Collecte FICTIVE/ }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /Orpheline FICTIVE/ }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Mission FICTIVE/ }));
    expect(screen.getAllByText("Collecte FICTIVE")).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: /Collecte FICTIVE/ }),
    ).toBeNull();
  });

  it("affiche les étapes réelles, leur échec et la relance sans simuler des sous-agents", () => {
    const mission = run({
      plan: {
        ...run().plan,
        workflow: {
          title: "Workflow FICTIF",
          steps: [
            {
              id: "verification-fictive",
              title: "Contrôle FICTIF",
              kind: "agent",
              agent: "agent-etape-fictif",
            },
          ],
        },
      },
      steps: [
        {
          step_id: "verification-fictive",
          state: "failed",
          attempt: 2,
          error: "Erreur FICTIVE de quota",
        },
      ],
    });
    setup([mission], mission);
    fireEvent.click(screen.getByRole("button", { name: /Mission FICTIVE/ }));
    expect(screen.getByText("Contrôle FICTIF")).toBeTruthy();
    expect(screen.getByText("agent-etape-fictif")).toBeTruthy();
    expect(screen.getByText(/Erreur FICTIVE de quota/)).toBeTruthy();
    expect(screen.getByText(/relanc/i)).toBeTruthy();
  });

  it("limite la liste à cinq missions puis Tout afficher montre les suivantes", () => {
    setup(
      Array.from({ length: 6 }, (_, i) =>
        run({ id: `fictive-${i}`, title: `Mission FICTIVE ${i + 1}` }),
      ),
    );
    expect(
      screen.getByRole("button", { name: /Mission FICTIVE 5/ }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Mission FICTIVE 6/ }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Tout afficher/ }));
    expect(
      screen.getByRole("button", { name: /Mission FICTIVE 6/ }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Tout afficher/ })).toBeNull();
  });

  it("distingue le coût mesuré du coût estimé et utilise le plafond configuré", () => {
    setup([
      run({
        id: "mesuree",
        title: "Mesurée FICTIVE",
        usage: { platformCents: 250, currency: "EUR", byDimension: [] },
      }),
      run({ id: "estimee", title: "Estimée FICTIVE" }),
    ]);
    const measured = screen.getByRole("button", { name: /Mesurée FICTIVE/ });
    expect(
      within(measured).getByText(money(250), { normalizer: (value) => value }),
    ).toBeTruthy();
    expect(within(measured).queryByText(/Estimation/)).toBeNull();
    const estimated = screen.getByRole("button", { name: /Estimée FICTIVE/ });
    expect(within(estimated).getByText(/Estimation/)).toBeTruthy();
    expect(estimated.textContent).toContain(money(999));
    overview();
    expect(
      screen.getByText(money(12500), { normalizer: (value) => value }),
    ).toBeTruthy();
  });
});

describe("Consommation · données futures isolées FICTIVES", () => {
  it("dessine les segments de chaque jour, l’infobulle et les parts de légende depuis le module isolé", () => {
    vi.spyOn(missing, "getDailyTokenUsage").mockReturnValue([
      {
        date: "2026-11-20",
        segments: [
          { key: "main", label: "Agent principal", tokens: 300 },
          { key: "sub", label: "Sous-agents", tokens: 300 },
        ],
      },
      {
        date: "2026-11-21",
        segments: [
          { key: "main", label: "Agent principal", tokens: 300 },
          { key: "sub", label: "Sous-agents", tokens: 100 },
        ],
      },
    ]);
    setup();
    const first = screen.getByTitle(/20 nov\..*600 tokens/);
    const second = screen.getByTitle(/21 nov\..*400 tokens/);
    expect(first.querySelectorAll('[style*="height"]')).toHaveLength(2);
    expect(second.querySelectorAll('[style*="height"]')).toHaveLength(2);
    expect(screen.getByText("Agent principal")).toBeTruthy();
    expect(screen.getByText("Sous-agents")).toBeTruthy();
    expect(screen.getByText("60,0 %")).toBeTruthy();
    expect(screen.getByText("40,0 %")).toBeTruthy();
    expect(screen.getByText("600 tokens")).toBeTruthy();
    expect(screen.getByText("400 tokens")).toBeTruthy();
  });

  it("affiche les limites fournisseur aux seuils exacts 79 %, 80 % et 100 %", () => {
    vi.spyOn(missing, "getProviderLimits").mockReturnValue({
      plan: "Abonnement FICTIF · BYOA",
      windows: [
        { label: "Fenêtre FICTIVE 79", percent: 79 },
        { label: "Fenêtre FICTIVE 80", percent: 80 },
        { label: "Fenêtre FICTIVE 100", percent: 100 },
      ],
    });
    setup();
    overview();
    expect(screen.getByText("Abonnement FICTIF · BYOA")).toBeTruthy();
    const bars = screen.getAllByRole("progressbar");
    expect(bars.map((bar) => bar.getAttribute("aria-valuenow"))).toEqual([
      "79",
      "80",
      "100",
    ]);
    expect(bars[0].closest(".cs-limit-warning, .cs-limit-danger")).toBeNull();
    expect(bars[1].closest(".cs-limit-warning")).toBeTruthy();
    expect(bars[2].closest(".cs-limit-danger")).toBeTruthy();
    expect(screen.getByText("100 %")).toBeTruthy();
  });

  it("n’assimile pas un total connu à des entrées, sorties ou cache connus", () => {
    vi.spyOn(missing, "getRunTokens").mockReturnValue({ total: 1234 });
    const mission = run({
      family: [
        {
          id: "membre-fictif",
          titre: "Sous-agent FICTIF",
          agent: "fixture",
          outils: 0,
        },
      ],
    });
    setup([mission], mission);
    fireEvent.click(screen.getByRole("button", { name: /Mission FICTIVE/ }));
    expect(screen.getByText("Sous-agent FICTIF")).toBeTruthy();
    expect(screen.getAllByText(/Bientôt/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("0")).toBeTruthy();
  });
});

describe("Consommation · fiabilité des champs partiels FICTIFS", () => {
  it("garde les tokens annoncés par MemberUsage séparés de toute consommation mesurée", () => {
    const mission = run({
      family: [
        {
          id: "annonce-fictive",
          titre: "Annonce FICTIVE",
          agent: "fixture",
          outils: 8,
          usage: { jetons: { entree: 56789, sortie: 22222, total: 79011 } },
        },
      ],
    });
    const { container } = setup([mission], mission);
    fireEvent.click(screen.getByRole("button", { name: /Mission FICTIVE/ }));
    const row = container.querySelector(".cs-detail-row") as HTMLElement;
    expect(within(row).getByText("Annonce FICTIVE")).toBeTruthy();
    expect(within(row).getAllByText("Bientôt")).toHaveLength(3);
    expect(within(row).getByText("8")).toBeTruthy();
    expect(screen.queryByText(/57 k|22 k|79 k|79011|56789|22222/)).toBeNull();
  });

  it("fusionne une sous-mission présente dans family et famille sans perdre le détail du membre", () => {
    const mother = run({
      family: [
        {
          id: "doublon-fictif",
          titre: "Sous-mission FICTIVE unique",
          agent: "agent-fictif",
          outils: 23,
          etape: { numero: 3 },
        },
      ],
    });
    const child = run({
      id: "doublon-fictif",
      title: "Résumé FICTIF du même membre",
      famille: { mere: mother.id },
    });
    setup([mother, child], mother);
    fireEvent.click(screen.getByRole("button", { name: /Mission FICTIVE/ }));
    expect(screen.getAllByText("Sous-mission FICTIVE unique")).toHaveLength(1);
    expect(screen.queryByText("Résumé FICTIF du même membre")).toBeNull();
    expect(screen.getByText("23")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: /Sous-mission FICTIVE unique|Résumé FICTIF du même membre/,
      }),
    ).toBeNull();
  });

  it.each([
    { createdAt: "date-fictive-invalide", finishedAt: "2026-11-20T10:02:00Z" },
    { createdAt: "2026-11-20T10:02:00Z", finishedAt: "2026-11-20T10:00:00Z" },
    { createdAt: "2026-11-20T10:00:00Z", finishedAt: undefined },
  ])("affiche Bientôt pour une durée absente ou invalide (%j)", (dates) => {
    setup([run(dates)]);
    const trigger = screen.getByRole("button", { name: /Mission FICTIVE/ });
    // Tokens et part sont déjà absents ; la durée constitue le troisième champ absent.
    expect(within(trigger).getAllByText("Bientôt")).toHaveLength(3);
    expect(trigger.textContent).not.toMatch(/NaN|Invalid Date|-[0-9]+ min/);
  });

  it("traite zéro centime mesuré comme une mesure et conserve le total nul dans Aperçu", () => {
    setup([
      run({ usage: { platformCents: 0, currency: "EUR", byDimension: [] } }),
    ]);
    const trigger = screen.getByRole("button", { name: /Mission FICTIVE/ });
    expect(
      within(trigger).getByText(money(0), { normalizer: (value) => value }),
    ).toBeTruthy();
    expect(within(trigger).queryByText("Estimation")).toBeNull();
    overview();
    expect(
      screen.getByText(money(0), { normalizer: (value) => value }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Coûts mesurés disponibles : 1 sur 1/),
    ).toBeTruthy();
  });

  it("déplace le focus et l’onglet sélectionné avec les flèches, Home et End", () => {
    setup();
    const stats = screen.getByRole("tab", { name: "Statistiques" });
    const overviewTab = screen.getByRole("tab", { name: "Aperçu" });
    stats.focus();
    fireEvent.keyDown(stats, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(overviewTab);
    expect(overviewTab.getAttribute("aria-selected")).toBe("true");
    expect(overviewTab.tabIndex).toBe(0);
    expect(stats.tabIndex).toBe(-1);
    fireEvent.keyDown(overviewTab, { key: "ArrowRight" });
    expect(document.activeElement).toBe(stats);
    expect(stats.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(stats, { key: "Home" });
    expect(document.activeElement).toBe(overviewTab);
    fireEvent.keyDown(overviewTab, { key: "End" });
    expect(document.activeElement).toBe(stats);
    expect(stats.getAttribute("aria-selected")).toBe("true");
  });

  it("recalcule le graphique et la légende pour chaque regroupement au lieu de conserver les séries précédentes", () => {
    vi.spyOn(missing, "getDailyTokenUsage").mockImplementation(
      (_runs, _period, grouping) => [
        {
          date: "2026-11-20",
          segments:
            grouping === "function"
              ? [
                  {
                    key: "function-fictive",
                    label: "Fonction FICTIVE",
                    tokens: 100,
                  },
                ]
              : grouping === "agent"
                ? [
                    { key: "agent-fictif", label: "Agent FICTIF", tokens: 75 },
                    {
                      key: "autre-fictif",
                      label: "Autre agent FICTIF",
                      tokens: 25,
                    },
                  ]
                : [
                    {
                      key: "modele-fictif",
                      label: "Modèle FICTIF",
                      tokens: 50,
                    },
                  ],
        },
      ],
    );
    setup();
    expect(screen.getByText("Fonction FICTIVE")).toBeTruthy();
    expect(screen.getByText("100,0 %")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Agent" }));
    expect(screen.queryByText("Fonction FICTIVE")).toBeNull();
    expect(screen.getByText("Agent FICTIF")).toBeTruthy();
    expect(screen.getByText("Autre agent FICTIF")).toBeTruthy();
    expect(screen.getByText("75,0 %")).toBeTruthy();
    expect(screen.getByText("25,0 %")).toBeTruthy();
    const segments = screen
      .getByTitle(/20 nov\..*100 tokens/)
      .querySelectorAll(".cs-segment");
    expect(segments).toHaveLength(2);
    expect((segments[0] as HTMLElement).style.height).toBe("25%");
    expect((segments[1] as HTMLElement).style.height).toBe("75%");
    fireEvent.click(screen.getByRole("button", { name: "Modèle" }));
    expect(screen.queryByText("Agent FICTIF")).toBeNull();
    expect(screen.getByText("Modèle FICTIF")).toBeTruthy();
    expect(screen.getByTitle(/20 nov\..*50 tokens/)).toBeTruthy();
    expect(screen.getByText("100,0 %")).toBeTruthy();
  });
});
