// reponse-04 : la réponse de l'agent dans l'application (données FICTIVES).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "./App";
import { api, ApiError } from "./api";
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
  createdAt: "2026-11-21T09:00:00.000Z",
  plan: { steps: [] },
} as unknown as Run;
const serve = (run: Run) =>
  vi.mocked(api).mockImplementation((path) => {
    if (path === "/catalog") return Promise.resolve(catalog) as never;
    if (path === "/runs") return Promise.resolve([run]) as never;
    if (String(path).endsWith("/cancel"))
      return Promise.reject(
        new ApiError("Exécution déjà terminée (FICTIF)", 409),
      ) as never;
    return Promise.resolve(run) as never;
  });
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

describe("incidents dans le fil", () => {
  it("une action en échec s'affiche en ligne sous l'activité, pas en bannière", async () => {
    serve(base);
    render(<App />);
    fireEvent.click(await screen.findByText("Mission FICTIVE"));
    fireEvent.click(await screen.findByRole("button", { name: "Arrêter" }));
    const line = await screen.findByText(/Exécution déjà terminée \(FICTIF\)/);
    expect(line.closest(".thread .incident")).toBeTruthy();
    expect(document.querySelector(".global-error")).toBeNull();
  });
  it("une mission bloquée qui attend l'utilisateur garde la bannière", async () => {
    serve({ ...base, state: "awaiting_owner" } as Run);
    render(<App />);
    fireEvent.click(await screen.findByText("Mission FICTIVE"));
    fireEvent.click(await screen.findByRole("button", { name: "Arrêter" }));
    await waitFor(() =>
      expect(document.querySelector(".global-error")).toBeTruthy(),
    );
    expect(document.querySelector(".thread .incident")).toBeNull();
  });
});

describe("fil d'une mission hors career-ops", () => {
  it("la ligne méta dépliée sur une mission repart repliée sur la mission suivante", async () => {
    const done = (id: string, prompt: string) =>
      ({
        ...base,
        id,
        prompt,
        // Deux conversations distinctes (sinon l'historique de session montre A avant B).
        sessionId: "session-" + id,
        state: "completed",
        result: { simulated: true, summary: "Réponse FICTIVE.", evidence: [] },
        usage: { platformCents: 0, currency: "EUR", byDimension: [] },
      }) as unknown as Run;
    const a = done("r1", "Mission FICTIVE A");
    const b = done("r2", "Mission FICTIVE B");
    vi.mocked(api).mockImplementation((path) => {
      if (path === "/catalog") return Promise.resolve(catalog) as never;
      if (path === "/runs") return Promise.resolve([a, b]) as never;
      return Promise.resolve(String(path).includes("r2") ? b : a) as never;
    });
    render(<App />);
    fireEvent.click(await screen.findByText("Mission FICTIVE A"));
    const meta = await screen.findByRole("button", { name: /fixture · 0,00/ });
    fireEvent.click(meta);
    expect(document.querySelector(".meta-details")).toBeTruthy();
    fireEvent.click(
      screen.getByText("Mission FICTIVE B", { selector: "span" }),
    );

    await waitFor(() =>
      expect(document.querySelector(".prompt-bubble-text")?.textContent).toBe(
        "Mission FICTIVE B",
      ),
    );
    expect(document.querySelector(".meta-details")).toBeNull();
  });
  it("une seule réponse : ni badges, ni carte Exécution, ni coût en colonnes", async () => {
    serve({
      ...base,
      state: "completed",
      result: { simulated: true, summary: "Réponse FICTIVE.", evidence: [] },
      usage: { platformCents: 0, currency: "EUR", byDimension: [] },
    } as unknown as Run);
    render(<App />);
    fireEvent.click(await screen.findByText("Mission FICTIVE"));
    await screen.findByText("Réponse FICTIVE.");
    const thread = document.querySelector(".thread")!;
    expect(thread.querySelectorAll(".reponse")).toHaveLength(1);
    expect(thread.querySelector(".badge")).toBeNull();
    expect(thread.querySelector("progress")).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Consommation de la mission" }),
    ).toBeNull();
  });
});
