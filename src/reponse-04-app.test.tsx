// reponse-04 : la réponse de l'agent dans l'application (données FICTIVES).
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
import { api, API_UNREACHABLE, ApiError, watchRun } from "./api";
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

// 21/11 (test complet) : sur Mac, Ctrl+K (« effacer jusqu'à la fin de la ligne » dans un champ) était
// capturé comme ⌘K et vidait la mission. « Nouvelle mission » (⌘K ou bouton) repart d'une page vierge,
// comme voulu depuis front-02 (tests d'App.test.tsx sur les pièces jointes).
describe("raccourci Nouvelle mission", () => {
  it("depuis une mission, ⌘K ouvre une mission vide", async () => {
    serve(base);
    render(<App />);
    fireEvent.change(await screen.findByLabelText("Objectif de la mission"), {
      target: { value: "Brouillon FICTIF" },
    });
    fireEvent.click(await screen.findByText("Mission FICTIVE"));
    await screen.findByRole("button", { name: "Arrêter" });
    fireEvent.keyDown(document.body, { key: "k", metaKey: true });
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Objectif de la mission") as HTMLTextAreaElement)
          .value,
      ).toBe(""),
    );
  });
  it("sur Mac, Ctrl+K reste au champ de saisie", async () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    serve(base);
    render(<App />);
    const field = await screen.findByLabelText("Objectif de la mission");
    fireEvent.change(field, { target: { value: "Brouillon FICTIF" } });
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

// 21/11 (test complet) : « API locale inaccessible » restait affiché après la reconnexion du flux.
describe("reconnexion", () => {
  it("le message « API locale inaccessible » s'efface quand le flux revient", async () => {
    let handlers: { connection: (ok: boolean) => void } | undefined;
    vi.mocked(watchRun).mockImplementation((_id, h) => {
      handlers = h as typeof handlers;
      return () => {};
    });
    vi.mocked(api).mockImplementation((path) => {
      if (path === "/catalog") return Promise.resolve(catalog) as never;
      if (path === "/runs") return Promise.resolve([base]) as never;
      if (String(path).endsWith("/cancel"))
        return Promise.reject(new ApiError(API_UNREACHABLE, 0)) as never;
      return Promise.resolve(base) as never;
    });
    render(<App />);
    fireEvent.click(await screen.findByText("Mission FICTIVE"));
    fireEvent.click(await screen.findByRole("button", { name: "Arrêter" }));
    await screen.findByText(/API locale inaccessible/);
    act(() => handlers!.connection(true));
    expect(screen.queryByText(/API locale inaccessible/)).toBeNull();
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
