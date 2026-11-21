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
    // swarm-09 : une mission se lit avec ?equipe=1.
    const found = runs.find(
      (r) => String(path).split("?")[0] === "/runs/" + r.id,
    );
    if (found) return Promise.resolve(found) as never;
    return Promise.resolve({ ok: true }) as never;
  });

describe("sous-agents dans l'application", () => {
  it("depuis le bloc Équipe du panneau : Arrêter annule ce membre seulement, Ouvrir l'affiche en grand", async () => {
    serve([mother, child]);
    render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    const aside = await screen.findByRole("complementary", {
      name: "Activité",
    });
    fireEvent.click(
      await within(aside).findByRole("button", {
        name: "Arrêter Offres FICTIVES sur SEEK",
      }),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/runs/c1/cancel", {}),
    );
    expect(api).not.toHaveBeenCalledWith("/runs/m1/cancel", {});
    fireEvent.click(
      within(aside).getByRole("button", {
        name: "Ouvrir la sous-mission Offres FICTIVES sur SEEK",
      }),
    );
    await screen.findByText("Consigne FICTIVE de la sous-mission");
    expect(
      screen.getByRole("button", { name: "Revenir à la mission principale" }),
    ).toBeTruthy();
  });
  it("vue scindée : « Voir à côté » suit le membre à côté du fil de sa mission, puis se ferme", async () => {
    serve([mother, child]);
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    const aside = await screen.findByRole("complementary", {
      name: "Activité",
    });
    fireEvent.click(
      await within(aside).findByRole("button", {
        name: "Voir à côté Offres FICTIVES sur SEEK",
      }),
    );
    const pane = await screen.findByRole("complementary", {
      name: "Sous-agent : Offres FICTIVES sur SEEK",
    });
    // Le membre à côté, la mission principale toujours dans le fil.
    await within(pane).findByText("Consigne FICTIVE de la sous-mission");
    expect(
      within(container.querySelector("main")!).getByText(
        "Mission FICTIVE à trois portails",
        { selector: ".prompt-bubble-text" },
      ),
    ).toBeTruthy();
    // Jusqu'à 1560 px la barre latérale s'efface pour garder la place du fil.
    expect(container.querySelector(".sidebar")).toBeNull();
    fireEvent.click(
      within(pane).getByRole("button", { name: "Fermer la vue à côté" }),
    );
    expect(
      screen.queryByRole("complementary", {
        name: "Sous-agent : Offres FICTIVES sur SEEK",
      }),
    ).toBeNull();
  });
  // 21/11 (test complet) : trois défauts de la vue scindée.
  it("vue scindée : un membre qui change d'état dans la vue met à jour le compteur de la liste", async () => {
    width(1600);
    const waiting = { ...child, state: "awaiting_owner" } as Run;
    const handlers = new Map<string, { update: (e: unknown) => void }>();
    vi.mocked(watchRun).mockImplementation((id, h) => {
      handlers.set(id, h as never);
      return () => {};
    });
    let served = waiting;
    vi.mocked(api).mockImplementation((path) => {
      if (path === "/catalog") return Promise.resolve(catalog) as never;
      if (path === "/runs") return Promise.resolve([mother, served]) as never;
      if (String(path).startsWith("/runs/c1"))
        return Promise.resolve(served) as never;
      return Promise.resolve(mother) as never;
    });
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    await waitFor(() =>
      expect(container.querySelector(".owner-count")).toBeTruthy(),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Voir à côté Offres FICTIVES sur SEEK",
      }),
    );
    await screen.findByRole("complementary", {
      name: "Sous-agent : Offres FICTIVES sur SEEK",
    });
    served = { ...child, state: "completed" } as Run;
    await act(async () => {
      handlers.get("c1")!.update({ seq: 9, type: "state", data: {} });
      await new Promise((r) => setTimeout(r, 400));
    });
    await waitFor(() =>
      expect(container.querySelector(".owner-count")).toBeNull(),
    );
  });
  it("vue scindée : la fermer rend la barre latérale qu'elle avait effacée", async () => {
    serve([mother, child]);
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    expect(container.querySelector(".sidebar")).toBeTruthy();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Voir à côté Offres FICTIVES sur SEEK",
      }),
    );
    const pane = await screen.findByRole("complementary", {
      name: "Sous-agent : Offres FICTIVES sur SEEK",
    });
    expect(container.querySelector(".sidebar")).toBeNull();
    fireEvent.click(
      within(pane).getByRole("button", { name: "Fermer la vue à côté" }),
    );
    expect(container.querySelector(".sidebar")).toBeTruthy();
  });
  // 21/11 (test complet, mise en page) : vue ouverte en grand puis fenêtre réduite, le fil tombait à
  // 0 px. Les seuils du clic (1560 : barre, 1340 : panneau) valent aussi au redimensionnement.
  it("vue scindée puis fenêtre réduite : la barre puis le panneau cèdent la place au fil", async () => {
    width(1920);
    serve([mother, child]);
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Voir à côté Offres FICTIVES sur SEEK",
      }),
    );
    await screen.findByRole("complementary", {
      name: "Sous-agent : Offres FICTIVES sur SEEK",
    });
    expect(container.querySelector(".sidebar")).toBeTruthy();
    expect(
      screen.getByRole("complementary", { name: "Activité" }),
    ).toBeTruthy();
    width(1440);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(container.querySelector(".sidebar")).toBeNull();
    expect(
      screen.getByRole("complementary", { name: "Activité" }),
    ).toBeTruthy();
    width(1200);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(
      screen.queryByRole("complementary", { name: "Activité" }),
    ).toBeNull();
    expect(
      screen.getByRole("complementary", {
        name: "Sous-agent : Offres FICTIVES sur SEEK",
      }),
    ).toBeTruthy();
  });
  it("vue scindée sur mobile : Échap la ferme", async () => {
    width(375);
    serve([mother, child]);
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Afficher la barre latérale" }),
    );
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails", {
        selector: "span",
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Afficher l’activité" }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Voir à côté Offres FICTIVES sur SEEK",
      }),
    );
    await screen.findByRole("complementary", {
      name: "Sous-agent : Offres FICTIVES sur SEEK",
    });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(
      screen.queryByRole("complementary", {
        name: "Sous-agent : Offres FICTIVES sur SEEK",
      }),
    ).toBeNull();
  });
  it("vue scindée : « Ouvrir en grand » ouvre le membre à la place de sa mission", async () => {
    serve([mother, child]);
    render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Voir à côté Offres FICTIVES sur SEEK",
      }),
    );
    const pane = await screen.findByRole("complementary", {
      name: "Sous-agent : Offres FICTIVES sur SEEK",
    });
    fireEvent.click(
      within(pane).getByRole("button", { name: "Ouvrir en grand" }),
    );
    await screen.findByRole("button", {
      name: "Revenir à la mission principale",
    });
    expect(
      screen.queryByRole("complementary", {
        name: "Sous-agent : Offres FICTIVES sur SEEK",
      }),
    ).toBeNull();
  });
  it("barre latérale : sans sa mère dans la liste, une sous-mission reste listée, titrée et marquée « sous-agent »", async () => {
    // swarm-11 retire une sous-mission dont la mère est listée ; l'orpheline reste ouvrable.
    serve([child]);
    render(<App />);
    const entry = (
      await screen.findByTitle("Consigne FICTIVE de la sous-mission")
    ).closest("button")!;
    expect(within(entry).getByText("sous-agent")).toBeTruthy();
    expect(entry.textContent).toContain("Offres FICTIVES sur SEEK");
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
