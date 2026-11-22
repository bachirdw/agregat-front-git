// sans-demo-22-11 : décision du propriétaire (22/11, 15:15) — plus de démonstration fictive ni de mise en garde
// de démonstration. En mode propriétaire, rien de ce que le catalogue marque comme démonstration n'est proposé
// ni envoyé (pack `dataMode: "fixture"`, agent `simulated`, navigateur `fixture`). Données FICTIVES.
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api } from "./api";
import { RunTurn } from "./RunTurn";
import { catalogueSansDemo, entreeSansDemo } from "./sansDemo";
import type { Catalog, MissionInput, Run } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
  watchRun: vi.fn(() => () => {}),
}));

const catalogue = (ownerMode: boolean) =>
  ({
    live: true,
    ownerMode,
    agents: [
      { id: "fixture", name: "Démonstrateur FICTIF", simulated: true },
      { id: "claude", name: "Claude Code" },
    ],
    packs: [
      { id: "core", name: "Général", description: "", skills: [], dags: [] },
      {
        id: "najah",
        name: "Démo FICTIVE",
        description: "",
        dataMode: "fixture",
        skills: [],
        dags: [
          { id: "opportunity-discovery-dag", title: "Découverte", steps: [] },
          { id: "application-draft", title: "Brouillon", steps: [] },
        ],
      },
    ],
    skills: [],
    meters: {},
    pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
  }) as unknown as Catalog;
const lance = {
  id: "r-1",
  prompt: "x",
  agent: "claude",
  model: "",
  state: "completed",
  mode: "agent",
  pack: "core",
  createdAt: "2026-11-22T04:15:00.000Z",
  plan: { steps: [] },
} as unknown as Run;
const envois: Record<string, unknown>[] = [];
let ownerMode = true;
beforeEach(() => {
  envois.length = 0;
  ownerMode = true;
  vi.mocked(api).mockReset();
  vi.mocked(api).mockImplementation(((path: string, body?: unknown) => {
    if (path === "/catalog") return Promise.resolve(catalogue(ownerMode));
    if (path === "/runs" && body) {
      envois.push(body as Record<string, unknown>);
      return Promise.resolve(lance);
    }
    if (path.startsWith("/runs/r-1")) return Promise.resolve(lance);
    return Promise.resolve([]);
  }) as never);
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

const options = (label: string) =>
  [
    ...(
      screen.getByLabelText(label, { selector: "select" }) as HTMLSelectElement
    ).options,
  ].map((o) => o.value);
const pret = () =>
  waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Analyser une idée/ }),
    ).toBeTruthy(),
  );

describe("catalogue et envoi sans démonstration", () => {
  it("mode propriétaire : pack, workflows et agent de démonstration retirés ; sinon catalogue entier", () => {
    const { catalog, demo } = catalogueSansDemo(catalogue(true));
    expect(catalog.packs.map((p) => p.id)).toEqual(["core"]);
    expect(catalog.agents.map((a) => a.id)).toEqual(["claude"]);
    expect([...demo.workflows]).toEqual([
      "opportunity-discovery-dag",
      "application-draft",
    ]);
    const banc = catalogueSansDemo(catalogue(false));
    expect(banc.catalog.packs).toHaveLength(2);
    expect(banc.catalog.agents).toHaveLength(2);
  });
  it("le corps envoyé ne porte jamais de démonstration en mode propriétaire", () => {
    const { demo } = catalogueSansDemo(catalogue(true));
    const entree = {
      prompt: "x",
      agent: "fixture",
      pack: "najah",
      workflow: "opportunity-discovery-dag",
      browser: "fixture",
      mode: "workflow",
      skills: [],
      model: "",
    } as unknown as MissionInput;
    expect(entreeSansDemo(entree, demo, true)).toMatchObject({
      agent: "auto",
      pack: "auto",
      workflow: "auto",
      browser: "auto",
    });
    expect(entreeSansDemo(entree, demo, false)).toBe(entree);
  });
});

describe("écran, catalogue de 4310 qui liste encore la démonstration", () => {
  it("accueil : plus de suggestion de démonstration ni d'avertissement", async () => {
    render(<App />);
    await pret();
    expect(
      screen.queryByRole("button", { name: /Trouver des offres Python/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Rédiger un brouillon/ }),
    ).toBeNull();
    expect(screen.queryByText(/Démonstration fictive/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Faire une vraie recherche" }),
    ).toBeNull();
  });
  it("listes du formulaire : ni agent simulé, ni pack ou workflow de démonstration, ni navigateur fictif", async () => {
    render(<App />);
    await pret();
    expect(options("Agent")).not.toContain("fixture");
    expect(options("Pack")).not.toContain("najah");
    expect(options("Navigateur")).not.toContain("fixture");
    expect(options("Navigateur")).toContain("auto");
  });
  it("Domain Packs : le pack de démonstration n'est pas proposé", async () => {
    render(<App />);
    await pret();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Domain Packs" }));
    });
    expect(screen.queryByText("Démo FICTIVE")).toBeNull();
    expect(screen.getByText("Général")).toBeTruthy();
  });
  it("envoi : pack, workflow, agent et navigateur « auto » sans choix du propriétaire", async () => {
    render(<App />);
    await pret();
    fireEvent.change(screen.getByLabelText("Objectif de la mission"), {
      target: { value: "Stages FICTIFS à Sydney" },
    });
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Lancer la mission",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Lancer la mission" }),
      );
    });
    await waitFor(() => expect(envois).toHaveLength(1));
    expect(envois[0]).toMatchObject({
      pack: "auto",
      workflow: "auto",
      agent: "auto",
      browser: "auto",
    });
  });
  it("hors mode propriétaire (bancs de test), l'agent simulé reste proposé", async () => {
    ownerMode = false;
    render(<App />);
    await pret();
    expect(options("Agent")).toContain("fixture");
  });
});

describe("réponse d'une mission ancienne en données fictives", () => {
  it("pas de bandeau ajouté ; le Bilan du serveur reste tel quel", () => {
    const run = {
      ...lance,
      dataMode: "fixture",
      result: {
        simulated: true,
        summary:
          "Réponse FICTIVE.\nBilan\n- Actions réussies : browser_navigate.",
        evidence: [],
      },
    } as unknown as Run;
    const { container } = render(
      <RunTurn
        run={run}
        events={[]}
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
    expect(container.querySelector(".demo-bandeau")).toBeNull();
    expect(container.textContent).not.toContain("Démonstration fictive");
    expect(screen.getByText("Réponse FICTIVE.")).toBeTruthy();
    expect(screen.getByText(/^Détails des actions/)).toBeTruthy();
  });
});
