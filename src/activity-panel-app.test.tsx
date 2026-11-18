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
    if (path === "/runs") return Promise.resolve([run]) as never;
    return Promise.resolve(run) as never;
  });
const openMission = async () => {
  fireEvent.click(await screen.findByText("Mission FICTIVE"));
  await screen.findByRole("button", { name: /Afficher l’activité|Masquer l’activité/ });
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
    expect(screen.queryByRole("region", { name: "Suivi de la mission" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: /^Étapes de la mission/ }),
    ).toBeTruthy();
    // Le panneau est une colonne de .app, à côté du fil, pas dedans.
    expect(container.querySelector("main .activity-panel")).toBeNull();
    expect(container.querySelector(".app > .activity-panel")).toBeTruthy();
  });
  it("le résumé sous le résultat ouvre le panneau et déplie les détails techniques", async () => {
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
    fireEvent.click(meta);
    expect(panel()).toBeTruthy();
    const more = screen.getByRole("button", { name: "Détails techniques" });
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector(".activity-steps .activity-tech dl")).toBeTruthy();
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
  it("la ligne des sous-agents du fil ouvre le panneau", async () => {
    serve({
      ...base,
      subagents: [
        { id: "s1", name: "Recherche FICTIVE", state: "running" },
        { id: "s2", name: "Lettre FICTIVE", state: "completed" },
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
    expect(screen.getByRole("heading", { name: "Sous-agents" })).toBeTruthy();
  });
  it("sans sous-agents, aucune ligne dans le fil", async () => {
    serve(base);
    const { container } = render(<App />);
    await openMission();
    expect(container.querySelector(".subagents-line")).toBeNull();
    expect(screen.queryByText(/sous-agent/)).toBeNull();
  });
});
