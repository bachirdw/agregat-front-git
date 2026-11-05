import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
const mission = (id: string, prompt: string, state: string) =>
  ({
    id: `00000000-0000-4000-8000-0000000000${id}`,
    prompt,
    state,
    mode: "agent",
    pack: "career-ops",
    agent: "fixture",
    createdAt: "2026-11-05T00:00:00.000Z",
    plan: { workflow: null, steps: [], cost: { lines: [] } },
    simulated: true,
  }) as unknown as Run;
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
const link = (name: RegExp) =>
  screen.getByRole("button", { name }).closest(".mission-link")!;

it("la liste des missions suit la mission ouverte : question, puis reprise, sans rechargement", async () => {
  let run = mission("e1", "Mission FICTIVE suivie", "running");
  let handlers!: Parameters<typeof watchRun>[1];
  vi.mocked(watchRun).mockImplementation((_id, next) => {
    handlers = next;
    return () => {};
  });
  vi.mocked(api).mockImplementation((path) =>
    path === "/catalog"
      ? (Promise.resolve(catalog) as never)
      : path === "/runs"
        ? (Promise.resolve([run]) as never)
        : (Promise.resolve(run) as never),
  );
  render(<App />);
  fireEvent.click(
    await screen.findByRole("button", { name: /Mission FICTIVE suivie/ }),
  );
  await waitFor(() => expect(handlers).toBeDefined());
  const item = link(/Mission FICTIVE suivie/);
  expect(item.textContent).toContain("En cours");
  expect(item.querySelector(".owner-turn")).toBeNull();
  // The list is read once only: everything after comes from the open mission's refresh.
  const listReads = vi
    .mocked(api)
    .mock.calls.filter(([path, body]) => path === "/runs" && !body).length;

  run = { ...run, state: "awaiting_owner" };
  act(() => handlers.update({ seq: 1, type: "question", data: { id: "q1" } }));
  await waitFor(() =>
    expect(item.textContent).toContain("Attend votre réponse"),
  );
  expect(item.textContent).not.toContain("En cours");
  expect(item.querySelector(".owner-turn")?.textContent).toBe(
    "À vous de répondre",
  );
  expect(item.querySelector(".dot.awaiting_owner")).not.toBeNull();

  run = { ...run, state: "waiting_permission" };
  act(() =>
    handlers.update({ seq: 2, type: "permission", data: { id: "p1" } }),
  );
  await waitFor(() =>
    expect(item.textContent).toContain("Autorisation requise"),
  );
  expect(item.querySelector(".owner-turn")).not.toBeNull();

  run = { ...run, state: "running" };
  act(() =>
    handlers.update({ seq: 3, type: "state", data: { state: "running" } }),
  );
  await waitFor(() => expect(item.textContent).toContain("En cours"));
  expect(item.querySelector(".owner-turn")).toBeNull();
  expect(
    vi
      .mocked(api)
      .mock.calls.filter(([path, body]) => path === "/runs" && !body).length,
  ).toBe(listReads);
});

it("un événement d'état SSE met la liste à jour avant même la relecture de la mission", async () => {
  const run = mission("e2", "Mission FICTIVE immédiate", "running");
  let handlers!: Parameters<typeof watchRun>[1];
  vi.mocked(watchRun).mockImplementation((_id, next) => {
    handlers = next;
    return () => {};
  });
  vi.mocked(api).mockImplementation((path) =>
    path === "/catalog"
      ? (Promise.resolve(catalog) as never)
      : path === "/runs"
        ? (Promise.resolve([run]) as never)
        : path === `/runs/${run.id}`
          ? (Promise.resolve(run) as never)
          : (new Promise(() => {}) as never),
  );
  render(<App />);
  fireEvent.click(
    await screen.findByRole("button", { name: /Mission FICTIVE immédiate/ }),
  );
  await waitFor(() => expect(handlers).toBeDefined());
  vi.mocked(api).mockImplementation((path) =>
    path === "/catalog"
      ? (Promise.resolve(catalog) as never)
      : path === "/runs"
        ? (Promise.resolve([run]) as never)
        : (new Promise(() => {}) as never),
  );
  act(() =>
    handlers.update({
      seq: 1,
      type: "state",
      data: { state: "awaiting_owner" },
    }),
  );
  expect(link(/Mission FICTIVE immédiate/).textContent).toContain(
    "Attend votre réponse",
  );
});
