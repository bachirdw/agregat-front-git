import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Consumption } from "./Consumption";
import type { Catalog, Run } from "./types";

// Régressions avec données FICTIVES : aucun fournisseur ni backend n’est appelé.
const catalog: Catalog = {
  live: false,
  agents: [],
  packs: [],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
};

function run(overrides: Partial<Run> = {}): Run {
  return {
    id: "mere-fictive",
    title: "Mission mère FICTIVE",
    prompt: "Consigne FICTIVE",
    state: "failed",
    mode: "agent",
    agent: "agent-fictif",
    pack: "",
    model: "modele-fictif",
    simulated: true,
    dataMode: "fixture",
    createdAt: "2026-11-20T10:00:00Z",
    finishedAt: "2026-11-20T10:02:00Z",
    plan: {
      steps: [],
      cost: {
        platformCents: 0,
        currency: "EUR",
        budgetCents: 0,
        withinBudget: true,
        description: "Estimation FICTIVE",
        lines: [],
      },
    },
    ...overrides,
  };
}

function expand(mother: Run, child: Run) {
  render(
    <Consumption
      catalog={catalog}
      runs={[mother, child]}
      selected={mother}
      onSelect={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Mission mère FICTIVE/ }));
}

afterEach(cleanup);

describe("Consommation · notes des sous-missions FICTIVES", () => {
  it("affiche l’erreur d’une sous-mission de runs avec son titre quand family est absent", () => {
    const mother = run();
    const child = run({
      id: "enfant-fictif",
      title: "Collecte enfant FICTIVE",
      famille: { mere: mother.id, titre: "Collecte enfant FICTIVE" },
      error: "Échec enfant FICTIF : quota fournisseur atteint.",
    });
    expand(mother, child);
    expect(screen.getByText("Collecte enfant FICTIVE")).toBeTruthy();
    const note = screen.getByText(
      /Échec enfant FICTIF : quota fournisseur atteint\./,
    );
    expect(note.textContent).toContain("Collecte enfant FICTIVE");
  });

  it("affiche la relance et l’erreur d’étape de l’enfant sans répéter une cause déjà transmise par family", () => {
    const cause = "Quota de reprise FICTIF atteint.";
    const mother = run({
      family: [
        {
          id: "enfant-fictif",
          titre: "Vérification enfant FICTIVE",
          agent: "agent-fictif",
          cause: { type: "erreur", message: cause },
        },
      ],
    });
    const child = run({
      id: "enfant-fictif",
      title: "Vérification enfant FICTIVE",
      famille: { mere: mother.id, titre: "Vérification enfant FICTIVE" },
      error: cause,
      steps: [
        {
          step_id: "verification-fictive",
          state: "failed",
          attempt: 2,
          error: "Erreur d’étape FICTIVE après relance.",
        },
      ],
    });
    expand(mother, child);
    const notes = screen.getAllByText(/Quota de reprise FICTIF atteint\./);
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toContain("Vérification enfant FICTIVE");
    const retry = screen.getByText(/Sous-tâche relancée.*2 tentatives/);
    expect(retry.textContent).toContain("Vérification enfant FICTIVE");
    const error = screen.getByText(/Erreur d’étape FICTIVE après relance\./);
    expect(error.textContent).toContain("Vérification enfant FICTIVE");
  });
});
