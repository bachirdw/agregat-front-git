// demo-fictive-22-11 (E204) : le pack de démonstration d'une suggestion ne reste pas choisi pour une vraie
// demande (mission 80794f16 partie en données fictives) ; il est annoncé avant l'envoi et sur la réponse.
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
import type { Catalog, Run } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
  watchRun: vi.fn(() => () => {}),
}));

const catalog = {
  live: false,
  agents: [],
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
} as unknown as Catalog;
const lance = {
  id: "r-demo",
  prompt: "x",
  agent: "fixture",
  model: "",
  state: "completed",
  mode: "workflow",
  pack: "najah",
  dataMode: "fixture",
  createdAt: "2026-11-22T03:51:00.000Z",
  plan: { steps: [] },
} as unknown as Run;
const envois: Record<string, unknown>[] = [];
beforeEach(() => {
  envois.length = 0;
  vi.mocked(api).mockReset();
  vi.mocked(api).mockImplementation(((path: string, body?: unknown) => {
    if (path === "/catalog") return Promise.resolve(catalog);
    if (path === "/runs" && body) {
      envois.push(body as Record<string, unknown>);
      return Promise.resolve(lance);
    }
    if (path.startsWith("/runs/r-demo")) return Promise.resolve(lance);
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

const champ = () =>
  screen.getByLabelText("Objectif de la mission") as HTMLTextAreaElement;
const pret = () =>
  waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Trouver des offres Python/ }),
    ).toBeTruthy(),
  );
const suggestion = () =>
  fireEvent.click(
    screen.getByRole("button", { name: /Trouver des offres Python/ }),
  );
const avertissement = () =>
  screen.queryByText(/Démonstration fictive : aucun site réel ne sera lu/);
const envoyer = async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Lancer la mission" }));
  });
  await waitFor(() => expect(envois.length).toBeGreaterThan(0));
  return envois.at(-1)!;
};

describe("suggestion de démonstration", () => {
  it("texte remplacé : la mission part sans le pack de démonstration (pack et workflow « auto »)", async () => {
    render(<App />);
    await pret();
    suggestion();
    expect(avertissement()).toBeTruthy();
    fireEvent.change(champ(), {
      target: { value: "Stages FICTIFS à Sydney, vraie recherche" },
    });
    expect(avertissement()).toBeNull();
    const body = await envoyer();
    expect(body.pack).toBe("auto");
    expect(body.workflow).toBe("auto");
    // Le mode revient à celui d'avant la suggestion (agent unique par défaut).
    expect(body.mode).toBe("agent");
  });
  it("texte modifié d'un seul caractère : même règle", async () => {
    render(<App />);
    await pret();
    suggestion();
    fireEvent.change(champ(), { target: { value: champ().value + " !" } });
    expect((await envoyer()).pack).toBe("auto");
  });
  it("suggestion envoyée telle quelle : démonstration, annoncée avant l'envoi", async () => {
    render(<App />);
    await pret();
    suggestion();
    expect(avertissement()).toBeTruthy();
    const body = await envoyer();
    expect(body.pack).toBe("najah");
    expect(body.workflow).toBe("opportunity-discovery-dag");
    expect(body.mode).toBe("workflow");
  });
  it("« Faire une vraie recherche » sort de la démonstration en un clic, le texte reste", async () => {
    render(<App />);
    await pret();
    suggestion();
    const texte = champ().value;
    fireEvent.click(
      screen.getByRole("button", { name: "Faire une vraie recherche" }),
    );
    expect(avertissement()).toBeNull();
    expect(champ().value).toBe(texte);
    const body = await envoyer();
    expect(body.pack).toBe("auto");
    expect(body.workflow).toBe("auto");
  });
  it("nouvelle mission après une démonstration : pack « auto »", async () => {
    render(<App />);
    await pret();
    suggestion();
    expect((await envoyer()).pack).toBe("najah");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Nouvelle mission/ }));
    });
    expect(avertissement()).toBeNull();
    fireEvent.change(champ(), { target: { value: "Vraie demande FICTIVE" } });
    const body = await envoyer();
    expect(body.pack).toBe("auto");
    expect(body.workflow).toBe("auto");
  });
});

describe("réponse d'une mission en données fictives", () => {
  const tour = (run: Run) =>
    render(
      <RunTurn
        run={run}
        events={[]}
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
  it("un bandeau « Démonstration fictive » en tête de la réponse", () => {
    const { container } = tour(lance);
    const bandeau = screen.getByRole("note", { name: "" });
    expect(bandeau.textContent).toContain("Démonstration fictive");
    expect(container.querySelector(".reponse")!.firstElementChild).toBe(
      bandeau,
    );
  });
  it("aucun bandeau pour une mission en données réelles", () => {
    const { container } = tour({ ...lance, dataMode: "live" } as Run);
    expect(container.querySelector(".demo-bandeau")).toBeNull();
  });
});
