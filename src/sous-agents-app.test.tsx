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
    if (path === "/runs?vue=liste") return Promise.resolve(runs) as never;
    // swarm-09 : une mission se lit avec ?equipe=1.
    const found = runs.find(
      (r) => String(path).split("?")[0] === "/runs/" + r.id,
    );
    if (found) return Promise.resolve(found) as never;
    return Promise.resolve({ ok: true }) as never;
  });

// equipe-05 : « Suivre » est dans la ligne dépliée du membre (avant : « Voir à côté » sur sa tuile).
const follow = async (aside: HTMLElement) => {
  const row = await within(aside).findByRole("listitem", {
    name: "Offres FICTIVES sur SEEK",
  });
  fireEvent.click(row.querySelector("button.team-row-head")!);
  fireEvent.click(
    within(row).getByRole("button", {
      name: "Suivre Offres FICTIVES sur SEEK",
    }),
  );
};
describe("sous-agents dans l'application", () => {
  it("depuis le bloc Équipe du panneau : Arrêter annule ce membre seulement, la vue à côté l'ouvre en grand", async () => {
    serve([mother, child]);
    render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    const aside = await screen.findByRole("complementary", {
      name: "Activité",
    });
    const row = await within(aside).findByRole("listitem", {
      name: "Offres FICTIVES sur SEEK",
    });
    fireEvent.click(row.querySelector("button.team-row-head")!);
    fireEvent.click(
      within(row).getByRole("button", {
        name: "Arrêter Offres FICTIVES sur SEEK",
      }),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/runs/c1/cancel", {}),
    );
    expect(api).not.toHaveBeenCalledWith("/runs/m1/cancel", {});
    // Ouvert en grand depuis la vue à côté (equipe-05 : plus de bouton « Ouvrir » sur la ligne).
    fireEvent.click(
      within(row).getByRole("button", {
        name: "Suivre Offres FICTIVES sur SEEK",
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Ouvrir en grand" }),
    );
    await screen.findByText("Consigne FICTIVE de la sous-mission");
    expect(
      screen.getByRole("button", { name: "Revenir à la mission principale" }),
    ).toBeTruthy();
  });
  it("vue scindée : « Suivre » ouvre le membre à côté du fil de sa mission, puis se ferme", async () => {
    serve([mother, child]);
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    const aside = await screen.findByRole("complementary", {
      name: "Activité",
    });
    await follow(aside);
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
      if (path === "/runs?vue=liste")
        return Promise.resolve([mother, served]) as never;
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
    await follow(
      await screen.findByRole("complementary", { name: "Activité" }),
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
    await follow(
      await screen.findByRole("complementary", { name: "Activité" }),
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
    await follow(
      await screen.findByRole("complementary", { name: "Activité" }),
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
  // 21/11 (test complet) : « Répondre à l'agent… » était proposé sur une sous-mission finie, et le
  // back refusait (409) : c'est le chef qui la relance.
  it("sous-mission terminée ouverte en grand : pas de réponse proposée", async () => {
    const done = {
      ...child,
      state: "completed",
      resumable: true,
      result: { simulated: false, summary: "Fait (FICTIF)", evidence: [] },
    } as unknown as Run;
    serve([done]);
    render(<App />);
    fireEvent.click(await screen.findByText("Offres FICTIVES sur SEEK"));
    await screen.findByText("Fait (FICTIF)");
    const field = screen.getByLabelText(
      "Objectif de la mission",
    ) as HTMLTextAreaElement;
    expect(field.disabled).toBe(true);
    expect(field.placeholder).not.toMatch(/Répondre/);
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
    await follow(
      await screen.findByRole("complementary", { name: "Activité" }),
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
    await follow(
      await screen.findByRole("complementary", { name: "Activité" }),
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
  // test-ui-21-11 : sous 980 px la vue scindée couvre l'écran ; Tab n'atteint plus le fil caché dessous.
  it("vue scindée en plein écran : le fil et la barre latérale dessous sont inertes", async () => {
    serve([mother, child]);
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByText("Mission FICTIVE à trois portails"),
    );
    const aside = await screen.findByRole("complementary", {
      name: "Activité",
    });
    await follow(aside);
    const pane = await screen.findByRole("complementary", {
      name: "Sous-agent : Offres FICTIVES sur SEEK",
    });
    const main = container.querySelector("main")!;
    // À 1440 px la vue est à côté du fil : le fil reste atteignable.
    expect(main.hasAttribute("inert")).toBe(false);
    act(() => {
      width(900);
      window.dispatchEvent(new Event("resize"));
    });
    await waitFor(() => expect(main.hasAttribute("inert")).toBe(true));
    // Le panneau Activité se ferme sous 1340 px avec la vue ouverte (seuils existants).
    expect(
      screen.queryByRole("complementary", { name: "Activité" }),
    ).toBeNull();
    for (const el of container.querySelectorAll(".sidebar"))
      expect(el.hasAttribute("inert")).toBe(true);
    // La vue elle-même reste utilisable.
    expect(pane.closest("[inert]")).toBeNull();
    fireEvent.click(
      within(pane).getByRole("button", { name: "Fermer la vue à côté" }),
    );
    await waitFor(() => expect(main.hasAttribute("inert")).toBe(false));
  });
});
