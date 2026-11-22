import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Consumption } from "./Consumption";
import type { Catalog, Run } from "./types";

// Données FICTIVES : jsdom vérifie les points de repli, sans simuler de mise en page.
const catalog = {
  agents: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
} as unknown as Catalog;
const mission = {
  id: "responsive-fictive",
  prompt: "Mission FICTIVE au titre très long pour vérifier la troncature",
  state: "completed",
  agent: "agent-fictif",
  family: [
    {
      id: "child-fictive",
      titre: "Sous-agent FICTIF au titre très long pour vérifier la troncature",
      agent: "agent-fictif-au-nom-très-long",
      etape: { numero: 1 },
      outils: 0,
    },
  ],
} as unknown as Run;

afterEach(cleanup);

it("repère les mêmes colonnes repliables dans les en-têtes et les lignes, sans perdre les titres complets", () => {
  const { container } = render(
    <Consumption
      catalog={catalog}
      runs={[mission]}
      selected={mission}
      onSelect={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Mission FICTIVE au titre/ }),
  );
  expect(screen.getByText("Part 7 j").classList.contains("cs-col-share")).toBe(
    true,
  );
  expect(
    container.querySelectorAll(".cs-mission-toggle .cs-col-share"),
  ).toHaveLength(1);
  expect(screen.getByText("Cache").classList.contains("cs-col-cache")).toBe(
    true,
  );
  expect(
    container.querySelectorAll(".cs-detail-row .cs-col-cache"),
  ).toHaveLength(1);
  expect(
    screen.getByTitle(mission.prompt).classList.contains("cs-truncate"),
  ).toBe(true);
  expect(
    screen
      .getByTitle(mission.family![0].titre!)
      .classList.contains("cs-truncate"),
  ).toBe(true);
  expect(
    screen
      .getByTitle(mission.family![0].agent!)
      .classList.contains("cs-member-agent"),
  ).toBe(true);
  expect(screen.getByText("Durée")).toBeTruthy();
  expect(screen.getByText("Outils")).toBeTruthy();
});
