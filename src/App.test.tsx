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
import { api, ApiError, watchRun } from "./api";
import type { Catalog, Plan, Run } from "./types";
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
it("conserve la saisie effectuée avant le catalogue et permet de réessayer une erreur réseau", async () => {
  let resolveCatalog!: (value: Catalog) => void;
  const pending = new Promise<Catalog>((r) => (resolveCatalog = r));
  vi.mocked(api).mockImplementation((path) =>
    path === "/catalog" ? (pending as never) : (Promise.resolve([]) as never),
  );
  render(<App />);
  fireEvent.change(screen.getByLabelText("Objectif de la mission"), {
    target: { value: "Saisie rapide" },
  });
  await act(async () => resolveCatalog(catalog));
  expect(
    (screen.getByLabelText("Objectif de la mission") as HTMLTextAreaElement)
      .value,
  ).toBe("Saisie rapide");
});
it("une réponse de plan tardive ne remplace pas une nouvelle mission", async () => {
  let resolvePlan!: (value: Plan) => void;
  const pending = new Promise<Plan>((r) => (resolvePlan = r));
  vi.mocked(api).mockImplementation((path) =>
    path === "/catalog"
      ? (Promise.resolve(catalog) as never)
      : path === "/plan"
        ? (pending as never)
        : (Promise.resolve([]) as never),
  );
  render(<App />);
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Préparer le plan",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true),
  );
  fireEvent.change(screen.getByLabelText("Objectif de la mission"), {
    target: { value: "Ancien objectif" },
  });
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Préparer le plan",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Préparer le plan" }));
  fireEvent.click(screen.getByRole("button", { name: /Nouvelle mission/ }));
  await act(async () =>
    resolvePlan({
      agent: "fixture",
      pack: "core",
      steps: [],
      cost: {
        platformCents: 0,
        currency: "EUR",
        budgetCents: 0,
        withinBudget: true,
        description: "Test",
        lines: [],
      },
      permissions: [],
      simulated: true,
      routing: { reasons: [], rejected: [] },
      workflow: null,
    }),
  );
  expect(screen.queryByRole("region", { name: "Plan proposé" })).toBeNull();
  expect(
    (screen.getByLabelText("Objectif de la mission") as HTMLTextAreaElement)
      .value,
  ).toBe("");
});
it("affiche le plan avec un composeur compact, place les actions en bas et rouvre Modifier", async () => {
  const plan = {
    agent: "fixture",
    pack: "core",
    steps: ["Étape fictive"],
    cost: {
      platformCents: 0,
      currency: "EUR",
      budgetCents: 0,
      withinBudget: true,
      description: "Test fictif",
      lines: [],
    },
    permissions: [],
    simulated: true,
    routing: { reasons: [], rejected: [] },
    workflow: null,
  } as Plan;
  vi.mocked(api).mockImplementation(
    (path) =>
      Promise.resolve(
        path === "/catalog" ? catalog : path === "/plan" ? plan : [],
      ) as never,
  );
  const { container } = render(<App />);
  const feed = container.querySelector<HTMLElement>(".scroll-content")!;
  Object.defineProperty(feed, "scrollHeight", {
    configurable: true,
    value: 1000,
  });
  fireEvent.change(screen.getByLabelText("Objectif de la mission"), {
    target: {
      value:
        "Ligne fictive 1\nLigne fictive 2\nLigne fictive 3\nLigne fictive 4",
    },
  });
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Préparer le plan",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Préparer le plan" }));
  await screen.findByRole("region", { name: "Plan proposé" });
  expect(
    container.querySelector(".composer")?.getAttribute("data-compact"),
  ).toBe("true");
  expect(feed.scrollTo).toHaveBeenCalledWith({ top: 1000 });
  fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
  expect(
    container.querySelector(".composer")?.getAttribute("data-compact"),
  ).toBe("false");
  expect(document.activeElement).toBe(
    screen.getByLabelText("Objectif de la mission"),
  );
});

it("mesure le dock et garde le bas visible quand il grandit, sans déplacer une lecture plus haut", async () => {
  let resize!: () => void;
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe = observe;
      disconnect = disconnect;
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.mocked(api).mockImplementation(
    (path) => Promise.resolve(path === "/catalog" ? catalog : []) as never,
  );
  const { container, unmount } = render(<App />);
  await screen.findByRole("button", { name: "Préparer le plan" });
  const main = container.querySelector<HTMLElement>(".main")!;
  const feed = container.querySelector<HTMLElement>(".scroll-content")!;
  const dock = container.querySelector<HTMLElement>(".composer-dock")!;
  let dockHeight = 100;
  dock.getBoundingClientRect = () => ({ height: dockHeight }) as DOMRect;
  Object.defineProperties(feed, {
    scrollHeight: {
      configurable: true,
      get: () =>
        1000 + (parseInt(main.style.getPropertyValue("--dock-h")) || 0) - 100,
    },
    clientHeight: { configurable: true, get: () => 200 - (dockHeight - 100) },
    scrollTop: { configurable: true, writable: true, value: 0 },
  });
  resize();
  expect(observe).toHaveBeenCalledWith(dock);
  expect(main.style.getPropertyValue("--dock-h")).toBe("100px");
  feed.scrollTop = 800;
  dockHeight = 180;
  resize();
  expect(main.style.getPropertyValue("--dock-h")).toBe("180px");
  expect(feed.scrollTop).toBe(1080);
  feed.scrollTop = 200;
  dockHeight = 220;
  resize();
  expect(feed.scrollTop).toBe(200);
  dockHeight = 0;
  resize();
  expect(main.style.getPropertyValue("--dock-h")).toBe("220px");
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

it("retire la réserve mesurée lorsqu'on quitte une page avec dock", async () => {
  vi.mocked(api).mockImplementation(
    (path) => Promise.resolve(path === "/catalog" ? catalog : []) as never,
  );
  const { container } = render(<App />);
  await screen.findByRole("button", { name: "Préparer le plan" });
  const main = container.querySelector<HTMLElement>(".main")!;
  main.style.setProperty("--dock-h", "180px");
  fireEvent.click(screen.getByRole("button", { name: "Agents" }));
  expect(container.querySelector(".composer-dock")).toBeNull();
  expect(main.style.getPropertyValue("--dock-h")).toBe("");
});
it("une API indisponible affiche une action de reconnexion", async () => {
  vi.mocked(api).mockRejectedValue(new Error("API locale inaccessible"));
  render(<App />);
  await screen.findByRole("alert");
  expect(
    screen.getByRole("button", { name: "Réessayer la connexion" }),
  ).toBeTruthy();
  vi.mocked(api).mockImplementation(
    (path) => Promise.resolve(path === "/catalog" ? catalog : []) as never,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Réessayer la connexion" }),
  );
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});
it("signale une perte du backend pendant une mission puis retente la lecture", async () => {
  const run = {
    id: "00000000-0000-4000-8000-000000000004",
    prompt: "Mission FICTIVE en cours",
    state: "running",
    mode: "agent",
    pack: "career-ops",
    agent: "fixture",
    createdAt: "2026-10-28T00:00:00.000Z",
    plan: { workflow: null, steps: [] },
    simulated: true,
  } as unknown as Run;
  let reads = 0;
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
          ? ++reads === 1
            ? Promise.resolve(run)
            : Promise.reject(new ApiError("API locale inaccessible", 502))
          : (Promise.resolve({ prompt: "Mission FICTIVE en cours" }) as never),
  );
  const { container } = render(<App />);
  fireEvent.click(
    await screen.findByRole("button", { name: /Mission FICTIVE en cours/ }),
  );
  await screen.findByText("Mission FICTIVE en cours", {
    selector: ".toolbar strong",
  });
  act(() =>
    handlers.update({ seq: 1, type: "state", data: { state: "running" } }),
  );
  await waitFor(() => expect(reads).toBeGreaterThan(1));
  expect(
    container.querySelector(".conversation-status .danger")?.textContent,
  ).toBe("Connexion perdue · reconnexion…");
});
it("détecte une perte du backend même si le flux ne signale aucune erreur", async () => {
  const run = {
    id: "00000000-0000-4000-8000-000000000005",
    prompt: "Mission FICTIVE sans événement",
    state: "running",
    mode: "agent",
    pack: "career-ops",
    agent: "fixture",
    createdAt: "2026-10-28T00:00:00.000Z",
    plan: { workflow: null, steps: [] },
    simulated: true,
  } as unknown as Run;
  let reads = 0;
  vi.mocked(watchRun).mockImplementation(() => () => {});
  vi.mocked(api).mockImplementation((path) =>
    path === "/catalog"
      ? (Promise.resolve(catalog) as never)
      : path === "/runs"
        ? (Promise.resolve([run]) as never)
        : path === `/runs/${run.id}`
          ? ++reads === 1
            ? Promise.resolve(run)
            : Promise.reject(new ApiError("API locale inaccessible", 502))
          : (Promise.resolve({
              prompt: "Mission FICTIVE sans événement",
            }) as never),
  );
  const { container } = render(<App />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: /Mission FICTIVE sans événement/,
    }),
  );
  await screen.findByText("Mission FICTIVE sans événement", {
    selector: ".toolbar strong",
  });
  await waitFor(() => expect(reads).toBeGreaterThan(1), { timeout: 3500 });
  expect(
    container.querySelector(".conversation-status .danger")?.textContent,
  ).toBe("Connexion perdue · reconnexion…");
});
it("conserve le brouillon de réponse si la reprise échoue", async () => {
  const run = {
    id: "00000000-0000-4000-8000-000000000001",
    prompt: "Mission FICTIVE",
    state: "completed",
    mode: "agent",
    pack: "core",
    resumable: true,
    plan: { steps: [], workflow: null },
    simulated: true,
  } as unknown as Run;
  vi.mocked(api).mockImplementation((path) =>
    path === "/catalog"
      ? (Promise.resolve(catalog) as never)
      : path === "/runs"
        ? (Promise.resolve([run]) as never)
        : path.endsWith("/resume")
          ? Promise.reject(new Error("Reprise impossible"))
          : (Promise.resolve(run) as never),
  );
  render(<App />);
  fireEvent.click(
    await screen.findByRole("button", { name: /Mission FICTIVE/ }),
  );
  const composer = await screen.findByLabelText("Objectif de la mission");
  fireEvent.change(composer, { target: { value: "Réponse à conserver" } });
  fireEvent.click(screen.getByRole("button", { name: "Envoyer la réponse" }));
  await screen.findByText("Reprise impossible");
  expect((composer as HTMLTextAreaElement).value).toBe("Réponse à conserver");
});
it("transmet un CV joint lors d'une réponse et vide la pièce après la reprise", async () => {
  const run = {
    id: "00000000-0000-4000-8000-000000000011",
    prompt: "Mission privée FICTIVE",
    state: "completed",
    mode: "agent",
    agent: "fixture",
    pack: "career-ops",
    resumable: true,
    plan: { steps: [], workflow: null },
    simulated: true,
    createdAt: "2026-10-28T00:00:00.000Z",
  } as unknown as Run;
  vi.mocked(api).mockImplementation(
    (path) =>
      Promise.resolve(
        path === "/catalog" ? catalog : path === "/runs" ? [run] : run,
      ) as never,
  );
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          '{"id":"cv-1","name":"cv.pdf","size":7,"type":"application/pdf"}',
          { status: 201 },
        ),
      ),
  );
  render(<App />);
  fireEvent.click(
    await screen.findByRole("button", { name: /Mission privée FICTIVE/ }),
  );
  fireEvent.change(screen.getByLabelText("Fichier à joindre"), {
    target: {
      files: [new File(["FICTIF"], "cv.pdf", { type: "application/pdf" })],
    },
  });
  await screen.findByText("cv.pdf");
  fireEvent.change(screen.getByLabelText("Objectif de la mission"), {
    target: { value: "Analyse ce CV FICTIF" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Envoyer la réponse" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(`/runs/${run.id}/resume`, {
      prompt: "Analyse ce CV FICTIF",
      attachments: ["cv-1"],
    }),
  );
  await waitFor(() => expect(screen.queryByText("cv.pdf")).toBeNull());
});
it("vide l'objectif initial après le lancement pour ne pas le proposer comme réponse", async () => {
  const plan = {
    agent: "fixture",
    pack: "career-ops",
    steps: [],
    cost: {
      platformCents: 0,
      currency: "EUR",
      budgetCents: 0,
      withinBudget: true,
      description: "FICTIF",
      lines: [],
    },
    permissions: [],
    simulated: true,
    routing: { reasons: [], rejected: [] },
    workflow: null,
  } as Plan;
  const run = {
    id: "00000000-0000-4000-8000-000000000003",
    prompt: "Mission privée FICTIVE",
    state: "completed",
    mode: "agent",
    agent: "fixture",
    model: "",
    pack: "career-ops",
    resumable: true,
    plan,
    simulated: true,
    createdAt: "2026-10-28T00:00:00.000Z",
  } as unknown as Run;
  vi.mocked(api).mockImplementation(
    (path, body) =>
      Promise.resolve(
        path === "/catalog"
          ? catalog
          : path === "/plan"
            ? plan
            : path === "/runs"
              ? body
                ? run
                : [run]
              : path.startsWith("/runs/")
                ? run
                : { opportunities: [], summary: "FICTIF" },
      ) as never,
  );
  render(<App />);
  const composer = await screen.findByLabelText("Objectif de la mission");
  fireEvent.change(composer, { target: { value: "Profil FICTIF initial" } });
  fireEvent.click(screen.getByRole("button", { name: "Préparer le plan" }));
  await screen.findByRole("region", { name: "Plan proposé" });
  fireEvent.click(screen.getByRole("button", { name: "Lancer" }));
  await screen.findByRole("button", { name: "Envoyer la réponse" });
  expect((composer as HTMLTextAreaElement).value).toBe("");
  expect(
    (
      screen.getByRole("button", {
        name: "Envoyer la réponse",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it("en conversation, le défilement vers le haut compacte le composeur, le focus et le retour en bas le rouvrent", async () => {
  const run = {
    id: "00000000-0000-4000-8000-000000000002",
    prompt: "Mission FICTIVE pour le défilement",
    state: "completed",
    mode: "agent",
    agent: "fixture",
    model: "",
    pack: "core",
    resumable: true,
    plan: {
      steps: [],
      workflow: null,
      cost: {
        platformCents: 0,
        currency: "EUR",
        budgetCents: 0,
        withinBudget: true,
        description: "Fictif",
        lines: [],
      },
    },
    simulated: true,
  } as unknown as Run;
  vi.mocked(api).mockImplementation(
    (path) =>
      Promise.resolve(
        path === "/catalog" ? catalog : path === "/runs" ? [run] : run,
      ) as never,
  );
  const { container } = render(<App />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: /Mission FICTIVE pour le défilement/,
    }),
  );
  await waitFor(() =>
    expect(container.querySelector(".conversation-main")).toBeTruthy(),
  );
  const feed = container.querySelector<HTMLElement>(".scroll-content")!;
  Object.defineProperties(feed, {
    scrollHeight: { configurable: true, value: 1000 },
    clientHeight: { configurable: true, value: 200 },
    scrollTop: { configurable: true, writable: true, value: 800 },
  });
  fireEvent.scroll(feed);
  feed.scrollTop = 450;
  fireEvent.scroll(feed);
  expect(
    container.querySelector(".composer")?.getAttribute("data-compact"),
  ).toBe("true");
  expect(container.querySelector(".session-settings")).toBeNull();
  fireEvent.focus(screen.getByLabelText("Objectif de la mission"));
  expect(
    container.querySelector(".composer")?.getAttribute("data-compact"),
  ).toBe("false");
  expect(container.querySelector(".session-settings")?.textContent).toContain(
    "Pack · core",
  );
  feed.scrollTop = 200;
  fireEvent.scroll(feed);
  expect(
    container.querySelector(".composer")?.getAttribute("data-compact"),
  ).toBe("true");
  feed.scrollTop = 790;
  fireEvent.scroll(feed);
  expect(
    container.querySelector(".composer")?.getAttribute("data-compact"),
  ).toBe("false");
});
it("une nouvelle mission ne conserve pas les pièces jointes précédentes", async () => {
  vi.mocked(api).mockImplementation(
    (path) => Promise.resolve(path === "/catalog" ? catalog : []) as never,
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        '{"id":"f1","name":"cv-fictif.txt","size":4,"type":"text/plain"}',
        {
          status: 201,
        },
      ),
    ),
  );
  render(<App />);
  await screen.findByRole("button", { name: "Préparer le plan" });
  fireEvent.change(screen.getByLabelText("Fichier à joindre"), {
    target: {
      files: [new File(["fake"], "cv-fictif.txt", { type: "text/plain" })],
    },
  });
  await screen.findByText("cv-fictif.txt");
  fireEvent.click(screen.getByRole("button", { name: /Nouvelle mission/ }));
  expect(screen.queryByText("cv-fictif.txt")).toBeNull();
});
it("ignore un fichier dont l’envoi finit après le début d’une nouvelle mission", async () => {
  vi.mocked(api).mockImplementation(
    (path) => Promise.resolve(path === "/catalog" ? catalog : []) as never,
  );
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))),
  );
  render(<App />);
  await screen.findByRole("button", { name: "Préparer le plan" });
  fireEvent.change(screen.getByLabelText("Fichier à joindre"), {
    target: {
      files: [new File(["fake"], "cv-fictif.txt", { type: "text/plain" })],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Nouvelle mission/ }));
  await act(async () =>
    finish(
      new Response(
        '{"id":"f1","name":"cv-fictif.txt","size":4,"type":"text/plain"}',
        { status: 201 },
      ),
    ),
  );
  expect(screen.queryByText("cv-fictif.txt")).toBeNull();
});
