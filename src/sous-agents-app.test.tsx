// sous-agents-19-11 : les sous-agents du back dans l'application (données FICTIVES).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import App from "./App";
import { api, watchRun } from "./api";
import type { Catalog, Run } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
  watchRun: vi.fn(() => () => {}),
}));
const catalog: Catalog = {
  live: false,
  agents: [],
  packs: [],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
};
const base = {
  state: "running",
  mode: "agent",
  agent: "codex",
  pack: "core",
  model: "",
  simulated: false,
  createdAt: "2026-11-19T01:00:00.000Z",
  plan: { steps: [] },
};
const mother = {
  ...base,
  id: "m1",
  prompt: "Mission FICTIVE à trois portails",
  estMere: true,
  family: [
    {
      id: "c1",
      titre: "Offres FICTIVES sur SEEK",
      agent: "codex",
      state: "running",
      attend: null,
      pendingQuestion: null,
      pendingPermission: null,
    },
  ],
  activity: { agents: 2, awaitingOwner: 0 },
} as unknown as Run;
const child = {
  ...base,
  id: "c1",
  prompt: "Consigne FICTIVE de la sous-mission",
  title: "Offres FICTIVES sur SEEK",
  famille: { racine: "m1", mere: "m1", titre: "Offres FICTIVES sur SEEK" },
} as unknown as Run;
const width = (value: number) =>
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value,
  });
beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(watchRun).mockClear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false })),
  );
  HTMLElement.prototype.scrollTo = vi.fn();
  width(1440);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  width(1024);
});
const serve = (runs: Run[]) =>
  vi.mocked(api).mockImplementation((path) => {
    if (path === "/catalog") return Promise.resolve(catalog) as never;
    if (path === "/runs") return Promise.resolve(runs) as never;
    const found = runs.find((r) => path === "/runs/" + r.id);
    if (found) return Promise.resolve(found) as never;
    return Promise.resolve({ ok: true }) as never;
  });

describe("sous-agents dans l'application", () => {
  it("la case cochée part avec la requête de lancement, puis se décoche pour la mission suivante", async () => {
    let created: unknown;
    vi.mocked(api).mockImplementation((path, body) => {
      if (path === "/catalog") return Promise.resolve(catalog) as never;
      if (path === "/runs" && body) {
        created = body;
        return Promise.resolve({ ...base, id: "n1", prompt: "x" }) as never;
      }
      if (path === "/runs") return Promise.resolve([]) as never;
      return Promise.resolve({ ...base, id: "n1", prompt: "x" }) as never;
    });
    render(<App />);
    await screen.findByRole("button", { name: "Lancer la mission" });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Autoriser les sous-agents" }),
    );
    fireEvent.change(screen.getByLabelText("Objectif de la mission"), {
      target: { value: "Cherche sur trois portails FICTIFS" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lancer la mission" }));
    await waitFor(() => expect(created).toBeTruthy());
    expect((created as { delegation: object }).delegation).toMatchObject({
      accepted: true,
      via: "bouton",
      total: 6,
      parallel: 3,
    });
    await waitFor(() =>
      expect(
        (
          screen.getByRole("checkbox", {
            name: "Autoriser les sous-agents",
          }) as HTMLInputElement
        ).checked,
      ).toBe(false),
    );
  });
  it("une tuile ouvre sa sous-mission et Arrêter annule cette sous-mission seulement", async () => {
    serve([mother, child]);
    render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    const aside = await screen.findByRole("complementary", {
      name: "Activité",
    });
    const tile = await within(aside).findByRole("button", {
      name: /Offres FICTIVES sur SEEK/,
    });
    fireEvent.click(tile);
    fireEvent.click(within(aside).getByRole("button", { name: "Arrêter" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/runs/c1/cancel", {}),
    );
    expect(api).not.toHaveBeenCalledWith("/runs/m1/cancel", {});
    fireEvent.click(
      within(aside).getByRole("button", { name: "Ouvrir la sous-mission" }),
    );
    await screen.findByText("Consigne FICTIVE de la sous-mission");
    expect(
      screen.getByRole("button", { name: "Revenir à la mission principale" }),
    ).toBeTruthy();
  });
  it("barre latérale : une sous-mission est marquée « sous-agent »", async () => {
    serve([mother, child]);
    render(<App />);
    const entry = (
      await screen.findByTitle("Consigne FICTIVE de la sous-mission")
    ).closest("button")!;
    expect(within(entry).getByText("sous-agent")).toBeTruthy();
    const main = screen
      .getByTitle("Mission FICTIVE à trois portails")
      .closest("button")!;
    expect(within(main).queryByText("sous-agent")).toBeNull();
  });
  it("voie 2 : la ligne du back « Sous-agents lancés à ta demande » s'affiche dans le fil", async () => {
    serve([mother]);
    render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    await waitFor(() => expect(watchRun).toHaveBeenCalled());
    const stream = vi.mocked(watchRun).mock.lastCall![1];
    const message =
      "Sous-agents lancés à ta demande : chacun consomme ton abonnement comme une mission ordinaire ; enveloppe : 6 au plus, 3 en même temps.";
    act(() =>
      stream.update?.({
        seq: 1,
        type: "delegation_accepted",
        data: { via: "prompt", total: 6, parallel: 3, message },
      }),
    );
    // Le « Journal en direct » brut du fil contient déjà le JSON de l'événement : on vise la ligne dédiée.
    await waitFor(() =>
      expect(
        document.querySelector(".thread .delegation-note")?.textContent,
      ).toBe(message),
    );
  });
});
