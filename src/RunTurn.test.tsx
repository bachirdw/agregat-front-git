import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import App from "./App";
import { api } from "./api";
import { RunTurn } from "./Mission";
import { Tracker, trackerDetails } from "./Tracker";
import type { Catalog, Run, RunEvent } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
  watchRun: vi.fn(() => () => {}),
}));

beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false })),
  );
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const catalog: Catalog = {
  live: false,
  agents: [],
  packs: [],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
};
const workflow = (over: Partial<Run> = {}) =>
  ({
    id: "00000000-0000-4000-8000-0000000000c2",
    createdAt: "2026-11-04T00:00:00Z",
    prompt: "Mission FICTIVE workflow",
    state: "running",
    mode: "workflow",
    agent: "fixture",
    model: "",
    pack: "najah",
    simulated: true,
    dataMode: "fixture",
    plan: {
      steps: [],
      cost: {
        platformCents: 0,
        currency: "EUR",
        budgetCents: 0,
        withinBudget: true,
        description: "Fictif",
        lines: [],
      },
      workflow: {
        title: "Brouillon",
        steps: [
          { id: "a", title: "Chercher", kind: "tool" },
          {
            id: "b",
            title: "Relire le brouillon",
            kind: "approval",
            dependsOn: ["a"],
          },
          { id: "c", title: "Classer", kind: "aggregate" },
        ],
      },
    },
    steps: [
      { step_id: "a", state: "succeeded", output: "Brouillon FICTIF à relire" },
      { step_id: "b", state: "waiting_approval" },
    ],
    usage: {
      platformCents: 0,
      currency: "EUR",
      byDimension: [
        {
          dimension: "workflow",
          category: "Workflows",
          units: 1,
          platformCents: 0,
          billable: true,
        },
      ],
    },
    ledger: { ok: true },
    ...over,
  }) as unknown as Run;
const turn = (run: Run, events: RunEvent[] = []) => {
  const act = vi.fn(() => Promise.resolve());
  const view = render(
    <div className="thread">
      <RunTurn
        run={run}
        events={events}
        connection="Flux en direct"
        busy={false}
        act={act}
      />
    </div>,
  );
  return { act, ...view };
};
const agentTurn = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(".agent-turn")!;

describe("App : la mission hors career-ops s'affiche en tour compact", () => {
  it("aucun badge, aucune progression, aucune carte de consommation, un seul .agent-turn", async () => {
    const run = workflow();
    vi.mocked(api).mockImplementation(
      (path) =>
        Promise.resolve(
          path === "/catalog" ? catalog : path === "/runs" ? [run] : run,
        ) as never,
    );
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Mission FICTIVE workflow/ }),
    );
    await waitFor(() =>
      expect(container.querySelector(".thread .agent-turn")).toBeTruthy(),
    );
    const thread = container.querySelector<HTMLElement>(".thread")!;
    expect(thread.querySelectorAll(".badge")).toHaveLength(0);
    expect(thread.querySelector("progress")).toBeNull();
    expect(
      within(thread).queryByRole("region", {
        name: "Consommation de la mission",
      }),
    ).toBeNull();
    expect(thread.querySelectorAll(".agent-turn")).toHaveLength(1);
    expect(thread.textContent).not.toContain(
      "L’agent travaille avec les outils du pack.",
    );
  });
});

describe("RunTurn", () => {
  it("permission en attente : boutons dans .agent-turn, même endpoint et mêmes options", () => {
    const { act, container } = turn(
      workflow({
        steps: [],
        permissions: [
          {
            id: "p1",
            expiresAt: Date.now() + 60000,
            tool: { title: "Lire une page FICTIVE", toolCallId: "t1" },
            options: [
              {
                optionId: "once",
                name: "Autoriser une fois",
                kind: "allow_once",
              },
              { optionId: "deny", name: "Refuser", kind: "reject_once" },
              {
                optionId: "never",
                name: "Toujours refuser",
                kind: "reject_always",
              },
              {
                optionId: "always",
                name: "Autoriser toujours",
                kind: "allow_always",
              },
            ],
          },
        ],
      }),
    );
    const card = agentTurn(container);
    const banner = within(card).getByRole("region", {
      name: "Permission agent",
    });
    expect(banner.className).toContain("inline-approval");
    expect(
      within(banner).queryByRole("button", { name: "Autoriser toujours" }),
    ).toBeNull();
    fireEvent.click(
      within(banner).getByRole("button", { name: "Autoriser une fois" }),
    );
    fireEvent.click(within(banner).getByRole("button", { name: "Refuser" }));
    fireEvent.click(
      within(banner).getByRole("button", { name: "Toujours refuser" }),
    );
    expect(act.mock.calls).toEqual([
      ["/permissions/p1", { optionId: "once" }],
      ["/permissions/p1", { optionId: "deny" }],
      ["/permissions/p1", { optionId: "never" }],
    ]);
    expect(within(banner).getByRole("timer").textContent).toMatch(
      /Expire dans \d+ s/,
    );
    const request = within(card)
      .getByText("Détails de la demande")
      .closest("details")!;
    expect(request.open).toBe(false);
    expect(request.textContent).toContain("toolCallId");
  });
  it("étape en attente d'accord : Approuver et Refuser appellent le même endpoint qu'avant", () => {
    const { act, container } = turn(workflow());
    const card = agentTurn(container);
    const banner = within(card).getByRole("region", {
      name: "Votre accord est requis",
    });
    expect(banner.className).toContain("inline-approval");
    expect(banner.textContent).toContain("Relire le brouillon");
    fireEvent.click(within(banner).getByRole("button", { name: "Approuver" }));
    fireEvent.click(within(banner).getByRole("button", { name: "Refuser" }));
    expect(act.mock.calls).toEqual([
      [
        "/runs/00000000-0000-4000-8000-0000000000c2/steps/b",
        { approved: true },
      ],
      [
        "/runs/00000000-0000-4000-8000-0000000000c2/steps/b",
        { approved: false },
      ],
    ]);
    expect(card.textContent).toContain("Brouillon FICTIF à relire");
  });
  it("étape incertaine : mêmes actions qu'avant", () => {
    const { act, container } = turn(
      workflow({
        steps: [{ step_id: "b", state: "uncertain" }],
      } as Partial<Run>),
    );
    const banner = within(agentTurn(container)).getByRole("region", {
      name: "Votre accord est requis",
    });
    fireEvent.click(within(banner).getByRole("button", { name: "Relancer" }));
    fireEvent.click(
      within(banner).getByRole("button", { name: "Marquer comme faite" }),
    );
    fireEvent.click(
      within(banner).getByRole("button", { name: "Marquer en échec" }),
    );
    expect(act.mock.calls.map((c) => (c as unknown[])[1])).toEqual([
      { action: "retry" },
      { action: "done" },
      { action: "fail" },
    ]);
  });
  it("étapes du workflow : une ligne repliable « Étape i/n · titre en cours »", () => {
    const { container } = turn(workflow());
    const steps = container.querySelector<HTMLDetailsElement>(
      ".agent-turn details.tool-group",
    )!;
    expect(steps.open).toBe(false);
    expect(steps.querySelector("summary")!.textContent).toContain(
      "Étape 2/3 · Relire le brouillon",
    );
    expect(
      [...steps.querySelectorAll("ol > li")].map((li) => li.textContent),
    ).toEqual(["✓Chercher", "•Relire le brouillon", "○Classer"]);
  });
  it("erreur : une ligne .danger dans le tour", () => {
    const { container, rerender } = turn(
      workflow({
        state: "failed",
        steps: [],
        error: "Mission incomplète : Classer",
      }),
    );
    expect(agentTurn(container).querySelector("p.danger")!.textContent).toBe(
      "Mission incomplète : Classer",
    );
    rerender(
      <div className="thread">
        <RunTurn
          run={workflow({
            state: "failed",
            steps: [],
            error: "Agent injoignable",
          })}
          events={[]}
          connection=""
          busy={false}
          act={vi.fn()}
        />
      </div>,
    );
    expect(agentTurn(container).querySelector("p.danger")!.textContent).toBe(
      "Échec · Agent injoignable",
    );
  });
  it("résultat fictif : synthèse, « Données fictives », offres et preuves repliées", () => {
    const { container } = turn(
      workflow({
        state: "completed",
        steps: [],
        result: {
          simulated: true,
          summary: "Synthèse **FICTIVE**",
          evidence: [{ summary: "preuve FICTIVE" }],
          opportunities: [
            {
              id: "o1",
              score: 80,
              title: "Dev",
              company: "ACME FICTIVE",
              location: "Sydney",
              reasons: [],
            },
            {
              id: "o2",
              score: 70,
              title: "Data",
              company: "Globex FICTIVE",
              location: "Perth",
              reasons: [],
            },
          ],
        },
      }),
    );
    const card = agentTurn(container);
    expect(card.querySelector("strong")!.textContent).toBe("FICTIVE");
    expect(within(card).getByText("Données fictives").className).toBe(
      "warning",
    );
    const offers = within(card)
      .getByText("Voir les 2 offres")
      .closest("details")!;
    expect(offers.open).toBe(false);
    expect(offers.className).toContain("fold");
    expect(offers.querySelectorAll(".offer")).toHaveLength(2);
    const proofs = within(card).getByText("Preuves · 1").closest("details")!;
    expect(proofs.open).toBe(false);
    expect(container.querySelectorAll(".badge")).toHaveLength(0);
  });
  it("résultat réel : pas de mention « Données fictives »", () => {
    const { container } = turn(
      workflow({
        state: "completed",
        steps: [],
        simulated: false,
        result: { simulated: false, summary: "Résultat", evidence: [] },
      }),
    );
    expect(
      within(agentTurn(container)).queryByText("Données fictives"),
    ).toBeNull();
  });
  it("Reprendre : bouton pill, même endpoint qu'avant", () => {
    const { act, container } = turn(
      workflow({ state: "failed", steps: [], error: "x" }),
    );
    fireEvent.click(
      within(agentTurn(container)).getByRole("button", { name: "Reprendre" }),
    );
    expect(act).toHaveBeenCalledWith(
      "/runs/00000000-0000-4000-8000-0000000000c2/resume",
      {},
    );
  });
  it("Arrêter la mission reste rendu (masqué en .run-active par la feuille) et garde son endpoint", () => {
    const { act, container } = turn(workflow({ steps: [] }));
    fireEvent.click(
      within(agentTurn(container)).getByRole("button", {
        name: "Arrêter la mission",
      }),
    );
    expect(act).toHaveBeenCalledWith(
      "/runs/00000000-0000-4000-8000-0000000000c2/cancel",
      {},
    );
  });
  it("pastille de skill juste avant .agent-turn quand la mission tourne", () => {
    const { container } = turn(workflow({ steps: [] }), [
      {
        seq: 1,
        type: "agent",
        data: {
          sessionUpdate: "tool_call",
          toolCallId: "t1",
          title: "career_read(sources: cv.pdf)",
          status: "in_progress",
        },
      },
    ]);
    const chip = container.querySelector(".skill-chip")!;
    expect(chip.textContent).toContain("career_read");
    expect(chip.nextElementSibling?.className).toBe("agent-turn");
  });
});

describe("Tracker : provenance et journal brut", () => {
  it("trackerDetails contient la ligne « Données » avec le texte d'aujourd'hui", () => {
    const row = (run: Run, events: RunEvent[] = []) =>
      trackerDetails(run, events).find(([key]) => key === "Données")?.[1];
    expect(row(workflow())).toBe("Sources fictives · démonstration");
    expect(
      row(workflow({ dataMode: "unverified" }), [
        {
          seq: 1,
          type: "verification",
          data: { scope: "Portée FICTIVE du backend" },
        },
      ]),
    ).toBe("Portée FICTIVE du backend");
    expect(
      row(
        workflow({
          state: "completed",
          dataMode: "live",
          result: {
            simulated: false,
            summary: "",
            provenance: { data: "navigateur réel", analysis: "" },
            evidence: [{}],
          },
        }),
      ),
    ).toBe("Page observée · preuves navigateur");
    expect(row(workflow({ dataMode: undefined }))).toBeUndefined();
  });
  it("Détails techniques : journal brut replié sous la grille", () => {
    const events: RunEvent[] = [
      { seq: 1, type: "state", data: { state: "running" } },
      { seq: 2, type: "step", data: { stepId: "a" } },
    ];
    const { container } = render(
      <Tracker
        run={workflow()}
        events={events}
        open
        details
        setOpen={() => {}}
        setDetails={() => {}}
      />,
    );
    const log = within(container)
      .getByText("Journal brut · 2 entrées")
      .closest("details")!;
    expect(log.open).toBe(false);
    expect(log.previousElementSibling?.tagName).toBe("DL");
    expect(log.textContent).toContain("#2 · step");
  });
});
