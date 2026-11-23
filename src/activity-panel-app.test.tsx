// activity-panel-03 : le panneau « Activité » dans l'application (ouverture manuelle seulement).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
  id: "r1",
  prompt: "Mission FICTIVE",
  state: "running",
  mode: "agent",
  agent: "fixture",
  pack: "core",
  model: "",
  simulated: true,
  createdAt: "2026-11-18T10:00:00.000Z",
  plan: { steps: [] },
} as unknown as Run;
const width = (value: number) =>
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value,
  });
const serve = (run: Run) =>
  vi.mocked(api).mockImplementation((path) => {
    if (path === "/catalog") return Promise.resolve(catalog) as never;
    if (path === "/runs?vue=liste") return Promise.resolve([run]) as never;
    return Promise.resolve(run) as never;
  });
const openMission = async () => {
  fireEvent.click(await screen.findByText("Mission FICTIVE"));
  await screen.findByRole("button", {
    name: /Afficher l’activité|Masquer l’activité/,
  });
  await waitFor(() => expect(watchRun).toHaveBeenCalled());
};
const panel = () => screen.queryByRole("complementary", { name: "Activité" });

beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(watchRun).mockClear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false })),
  );
  HTMLElement.prototype.scrollTo = vi.fn();
  width(1024);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  width(1024);
});

describe("panneau Activité dans l'application", () => {
  it("fermé par défaut sous 1100px ; le bouton de la barre haute l'ouvre, la croix le ferme", async () => {
    serve(base);
    render(<App />);
    const toggle = await screen.findByRole("button", {
      name: "Afficher l’activité",
    });
    expect(panel()).toBeNull();
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(panel()).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Masquer l’activité" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Fermer le panneau" }));
    expect(panel()).toBeNull();
  });
  it("aucune ouverture automatique pendant une mission (états, outils, question)", async () => {
    serve(base);
    render(<App />);
    await openMission();
    const stream = vi.mocked(watchRun).mock.lastCall![1];
    act(() => {
      stream.update?.({ seq: 1, type: "state", data: { state: "running" } });
      stream.update?.({
        seq: 2,
        type: "agent",
        data: {
          sessionUpdate: "tool_call",
          toolCallId: "t",
          title: "lire",
          status: "in_progress",
        },
      });
      stream.update?.({
        seq: 3,
        type: "state",
        data: { state: "awaiting_owner" },
      });
    });
    await new Promise((r) => setTimeout(r, 150));
    expect(panel()).toBeNull();
  });
  it("au-dessus de 1100px : ouvert, sans .tracker ni .connections-panel, avec les étapes de la mission", async () => {
    width(1440);
    serve(base);
    const { container } = render(<App />);
    await openMission();
    expect(panel()).toBeTruthy();
    expect(container.querySelector(".activity-panel")).toBeTruthy();
    expect(container.querySelector(".tracker")).toBeNull();
    expect(container.querySelector(".connections-panel")).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Suivi de la mission" }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: /^Étapes de la mission/ }),
    ).toBeTruthy();
    // Le panneau est une colonne de .app, à côté du fil, pas dedans.
    expect(container.querySelector("main .activity-panel")).toBeNull();
    expect(container.querySelector(".app > .activity-panel")).toBeTruthy();
  });
  // reponse-04 (BRIEF 04) : la ligne méta se déplie sur place en liste clé/valeur ; elle n'ouvre plus le
  // panneau (avant : elle ouvrait le panneau et dépliait ses détails techniques).
  it("le résumé sous le résultat se déplie sur place, sans ouvrir le panneau", async () => {
    serve({
      ...base,
      state: "completed",
      result: { simulated: true, summary: "Fait", evidence: [{}, {}] },
      usage: { platformCents: 0, currency: "EUR", byDimension: [] },
    } as unknown as Run);
    render(<App />);
    fireEvent.click(await screen.findByText("Mission FICTIVE"));
    const meta = await screen.findByRole("button", { name: /2 preuves/ });
    expect(panel()).toBeNull();
    expect(meta.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(meta);
    expect(meta.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector(".thread .meta-details")).toBeTruthy();
    expect(panel()).toBeNull();
  });
  it("sous 1180px : ouvrir le panneau masque la barre latérale, la rouvrir ferme le panneau", async () => {
    serve(base);
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Afficher l’activité" }),
    );
    expect(container.querySelector(".sidebar")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Afficher la barre latérale" }),
    );
    expect(container.querySelector(".sidebar")).toBeTruthy();
    expect(panel()).toBeNull();
  });
  it("au-dessus de 1180px : le panneau et la barre latérale restent côte à côte", async () => {
    width(1440);
    serve(base);
    const { container } = render(<App />);
    await screen.findByRole("button", { name: "Masquer l’activité" });
    expect(panel()).toBeTruthy();
    expect(container.querySelector(".sidebar")).toBeTruthy();
  });
  // Sous 760px le panneau devient une surcouche pleine largeur : resté ouvert après un rétrécissement, il
  // cachait le fil et la roue faisait défiler le panneau (e2e « défilement », 21/11).
  it("fenêtre rétrécie sous 760px : le panneau se ferme ; rouvert à la main, il reste ouvert", async () => {
    width(1440);
    serve(base);
    render(<App />);
    await openMission();
    expect(panel()).toBeTruthy();
    width(375);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(panel()).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Afficher l’activité" }),
    );
    expect(panel()).toBeTruthy();
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(panel()).toBeTruthy();
  });
  it("la ligne des sous-agents du fil ouvre le panneau", async () => {
    serve({
      ...base,
      // sous-agents-19-11 : forme du back (`family`).
      estMere: true,
      family: [
        {
          id: "s1",
          titre: "Recherche FICTIVE",
          agent: "fixture",
          state: "running",
          attend: null,
          pendingQuestion: null,
          pendingPermission: null,
        },
        {
          id: "s2",
          titre: "Lettre FICTIVE",
          agent: "fixture",
          state: "completed",
          attend: null,
          pendingQuestion: null,
          pendingPermission: null,
        },
      ],
    } as unknown as Run);
    render(<App />);
    await openMission();
    expect(panel()).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: /1 sous-agent en cours · 1\/2 terminés/,
      }),
    );
    expect(panel()).toBeTruthy();
    // reponse-04 : la section d'équipe du panneau est le bloc Équipe de swarm (Team.tsx).
    expect(screen.getByRole("region", { name: "Équipe" })).toBeTruthy();
    // 21/11 (test complet) : panneau déjà ouvert, la ligne ne faisait rien ; elle amène à l'équipe.
    const seen = vi.fn();
    Element.prototype.scrollIntoView = seen;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /1 sous-agent en cours · 1\/2 terminés/,
      }),
    );
    expect(seen).toHaveBeenCalled();
    expect(seen.mock.contexts[0]).toBe(
      document.querySelector(".activity-panel .activity-team"),
    );
  });
  it("sans sous-agents, aucune ligne dans le fil", async () => {
    serve(base);
    const { container } = render(<App />);
    await openMission();
    expect(container.querySelector(".subagents-line")).toBeNull();
    // sous-agents-19-11 : le composeur dit « Autoriser les sous-agents » ; seul le fil doit en être vide.
    expect(container.querySelector(".thread")!.textContent).not.toMatch(
      /sous-agent/,
    );
  });
});
