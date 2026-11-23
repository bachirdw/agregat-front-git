// lenteur-23-11 : ce que voit le propriétaire pendant qu'un document s'écrit, l'onglet quand l'agent
// l'attend, et les relectures de la mission pendant le flux (données FICTIVES).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { api, watchRun } from "./api";
import { activity, runningToolWait, Waiting } from "./Career";
import { SkillPresentation, skillPresentation } from "./SkillPresentation";
import { NotifyOwner } from "./NotifyOwner";
import { owedMissions } from "./owed";
import type { Catalog, Run, RunEvent } from "./types";

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
  createdAt: "2026-11-23T09:00:00.000Z",
  plan: { steps: [] },
} as unknown as Run;
let seq = 0;
const agent = (data: Record<string, unknown>, at = new Date().toISOString()) =>
  ({ seq: ++seq, runId: "r1", type: "agent", data, at }) as RunEvent;
const call = (rawInput: unknown, status = "pending") => [
  agent({
    sessionUpdate: "tool_call",
    toolCallId: "t1",
    title: "mcp__platform__career_write",
    kind: "other",
    status: "pending",
    rawInput: {},
    _meta: { claudeCode: { toolName: "mcp__platform__career_write" } },
  }),
  agent({
    sessionUpdate: "tool_call_update",
    toolCallId: "t1",
    rawInput,
    status,
  }),
];
const serve = (run: Run) =>
  vi.mocked(api).mockImplementation((path) => {
    if (path === "/catalog") return Promise.resolve(catalog) as never;
    if (path === "/runs?vue=liste") return Promise.resolve([run]) as never;
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
  vi.useRealTimers();
});

describe("action en cours nommée", () => {
  it("un document en cours d'écriture est nommé, sans « Exécution… »", () => {
    const wait = runningToolWait(
      activity(call({ path: "output/cv-067-fictif.md" }), { exchanges: true }),
    );
    expect(wait?.label).toBe("Rédige cv-067-fictif.md");
    expect(wait?.since).toBeTruthy();
  });
  it("la taille du texte s'ajoute quand il arrive", () => {
    const wait = runningToolWait(
      activity(call({ path: "cv.md", text: "x".repeat(4300) }), {
        exchanges: true,
      }),
    );
    expect(wait?.label).toMatch(/^Rédige cv\.md · 4\s300 caractères$/u);
  });
  it("un autre outil est nommé par son nom", () => {
    const events = [
      agent({
        sessionUpdate: "tool_call",
        toolCallId: "t2",
        title: "mcp__platform__career_read",
        status: "pending",
        rawInput: { query: "offres" },
        _meta: { claudeCode: { toolName: "mcp__platform__career_read" } },
      }),
    ];
    expect(runningToolWait(activity(events))?.label).toBe(
      "Exécute career_read",
    );
  });
  it("une action finie ne garde aucune étiquette", () => {
    expect(
      runningToolWait(activity(call({ path: "cv.md" }, "completed"))),
    ).toBeNull();
  });
  it("le temps écoulé s'affiche après 3 s et avance", () => {
    vi.useFakeTimers();
    const since = new Date(Date.now() - 12_000).toISOString();
    render(<Waiting label="Rédige cv.md" since={since} />);
    expect(screen.getByRole("status").textContent).toBe("Rédige cv.md12 s");
    act(() => vi.advanceTimersByTime(50_000));
    expect(screen.getByRole("status").textContent).toBe(
      "Rédige cv.md1 min 02 s",
    );
  });
  it("une action brève reste sans chiffre", () => {
    render(<Waiting label="Exécute x" since={new Date().toISOString()} />);
    expect(screen.getByRole("status").textContent).toBe("Exécute x");
  });
  it("dans la mission ouverte, la ligne d'attente nomme le fichier", async () => {
    serve(base);
    window.location.hash = "#mission/r1";
    render(<App />);
    await waitFor(() => expect(watchRun).toHaveBeenCalled());
    const { update } = vi.mocked(watchRun).mock.calls.at(-1)![1];
    act(() => call({ path: "output/lettre-fictive.md" }).forEach(update));
    expect(await screen.findByText("Rédige lettre-fictive.md")).toBeTruthy();
    expect(screen.queryByText("Exécution…")).toBeNull();
    window.location.hash = "";
  });
});

describe("l'onglet quand l'agent attend", () => {
  it("le titre dit qu'une réponse est attendue", async () => {
    serve({ ...base, state: "awaiting_owner" } as Run);
    render(<App />);
    await waitFor(() =>
      expect(document.title).toMatch(/^\(1\) À vous de répondre · agre agent/),
    );
  });
  it("sans attente, le titre reste simple", async () => {
    serve(base);
    render(<App />);
    await screen.findByText("Mission FICTIVE");
    expect(document.title).toMatch(/^agre agent · /);
  });
});

describe("relectures pendant le flux", () => {
  it("le flux de l'agent ne relit pas la mission ; un changement d'état si", async () => {
    serve(base);
    window.location.hash = "#mission/r1";
    render(<App />);
    await waitFor(() => expect(watchRun).toHaveBeenCalled());
    const reads = () =>
      vi.mocked(api).mock.calls.filter(([p]) => p === "/runs/r1?equipe=1")
        .length;
    const { update } = vi.mocked(watchRun).mock.calls.at(-1)![1];
    const before = reads();
    act(() => {
      for (let i = 0; i < 20; i++)
        update(
          agent({
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: "mot " },
          }),
        );
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(reads()).toBe(before);
    act(() =>
      update({
        seq: ++seq,
        runId: "r1",
        type: "state",
        data: { state: "awaiting_owner" },
        at: new Date().toISOString(),
      } as RunEvent),
    );
    await waitFor(() => expect(reads()).toBe(before + 1));
    window.location.hash = "";
  });
});

describe("façon de travailler du Skill", () => {
  const withText = {
    ...catalog,
    skills: [
      {
        id: "skill-fictif",
        name: "Skill FICTIF",
        presentation:
          "Au début, il **pose des questions** ; ensuite il avance seul.",
      },
    ],
    packs: [
      {
        id: "pack-fictif",
        name: "Pack FICTIF",
        presentation: "Texte du pack.",
      },
      { id: "core", name: "Core" },
    ],
  } as unknown as Catalog;
  it("le texte vient du Skill choisi, sinon de son pack, sinon rien", () => {
    expect(
      skillPresentation(
        { skills: ["skill-fictif"], pack: "pack-fictif" },
        withText,
      )?.name,
    ).toBe("Skill FICTIF");
    expect(
      skillPresentation({ skills: [], pack: "pack-fictif" }, withText)?.text,
    ).toBe("Texte du pack.");
    expect(
      skillPresentation({ skills: [], pack: "core" }, withText),
    ).toBeNull();
    expect(
      skillPresentation({ skills: ["skill-fictif"], pack: "" }, catalog),
    ).toBeNull();
  });
  it("ouverte au premier échange, en Markdown", () => {
    render(
      <SkillPresentation
        run={{ ...base, skills: ["skill-fictif"] } as Run}
        catalog={withText}
      />,
    );
    const card = document.querySelector("details.skill-presentation")!;
    expect(card.hasAttribute("open")).toBe(true);
    expect(screen.getByText("Comment fonctionne Skill FICTIF")).toBeTruthy();
    expect(screen.getByText("pose des questions").tagName).toBe("STRONG");
  });
  it("repliée aux échanges suivants de la conversation", () => {
    render(
      <SkillPresentation
        run={{ ...base, skills: ["skill-fictif"], resumedFrom: "r0" } as Run}
        catalog={withText}
      />,
    );
    expect(
      document
        .querySelector("details.skill-presentation")!
        .hasAttribute("open"),
    ).toBe(false);
  });
  it("sans texte du back, aucune carte", () => {
    render(
      <SkillPresentation
        run={{ ...base, skills: ["skill-fictif"] } as Run}
        catalog={catalog}
      />,
    );
    expect(document.querySelector(".skill-presentation")).toBeNull();
  });
  it("dans la mission ouverte, en tête du fil", async () => {
    vi.mocked(api).mockImplementation((path) => {
      if (path === "/catalog") return Promise.resolve(withText) as never;
      const run = { ...base, skills: ["skill-fictif"] } as Run;
      if (path === "/runs?vue=liste") return Promise.resolve([run]) as never;
      return Promise.resolve(run) as never;
    });
    window.location.hash = "#mission/r1";
    render(<App />);
    const summary = await screen.findByText("Comment fonctionne Skill FICTIF");
    const thread = summary.closest(".thread")!;
    expect(
      thread.firstElementChild?.classList.contains("skill-presentation"),
    ).toBe(true);
    window.location.hash = "";
  });
});

describe("me prévenir quand l'agent m'attend", () => {
  const stub = (permission: string, answer = "granted") => {
    const fake = {
      permission,
      requestPermission: vi.fn(async () => {
        fake.permission = answer;
        return answer;
      }),
    };
    vi.stubGlobal("Notification", fake);
    return fake;
  };
  it("la permission n'est demandée qu'au clic, puis le bouton dit « Notifications activées »", async () => {
    const fake = stub("default");
    render(<NotifyOwner />);
    expect(fake.requestPermission).not.toHaveBeenCalled();
    screen
      .getByRole("button", { name: "Me prévenir quand l’agent m’attend" })
      .click();
    expect(await screen.findByText("Notifications activées")).toBeTruthy();
    expect(fake.requestPermission).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("refusée au clic : il le dit, sans redemander", async () => {
    const fake = stub("default", "denied");
    render(<NotifyOwner />);
    screen.getByRole("button").click();
    expect(
      await screen.findByText("Notifications bloquées par le navigateur"),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(fake.requestPermission).toHaveBeenCalledTimes(1);
  });
  it("déjà refusée ou déjà permise : aucun bouton", () => {
    stub("denied");
    const { unmount } = render(<NotifyOwner />);
    expect(
      screen.getByText("Notifications bloquées par le navigateur"),
    ).toBeTruthy();
    unmount();
    stub("granted");
    render(<NotifyOwner />);
    expect(screen.getByText("Notifications activées")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("navigateur sans notifications : rien", () => {
    vi.stubGlobal("Notification", undefined);
    const { container } = render(<NotifyOwner />);
    expect(container.innerHTML).toBe("");
  });
});

describe("relecture de 6e1cb78", () => {
  const codex = (content?: unknown) => [
    agent({
      sessionUpdate: "tool_call",
      toolCallId: "c1",
      title: "Editing file",
      kind: "edit",
      status: "pending",
      ...(content ? { content } : {}),
    }),
  ];
  it("Codex : son édition est nommée par le chemin de son bloc diff, en français", () => {
    const diff = {
      type: "diff",
      path: "/tmp/fictif/cv-fictif.md",
      newText: "x",
    };
    expect(runningToolWait(activity(codex([diff])))?.label).toBe(
      "Rédige cv-fictif.md",
    );
    expect(runningToolWait(activity(codex()))?.label).toBe("Rédige un fichier");
  });
  const row = (id: string, state: string, extra = {}) =>
    ({ id, state, ...extra }) as never;
  it("un membre qui attend compte, la mère restant « running »", () => {
    expect(
      owedMissions([], {
        ...(row("m", "running") as object),
        family: [{ state: "running", pendingQuestion: { id: "q" } }],
      } as never),
    ).toBe(1);
    expect(
      owedMissions([row("m", "running", { activity: { awaitingOwner: 2 } })]),
    ).toBe(1);
  });
  it("une équipe compte pour une, deux missions pour deux", () => {
    const famille = { racine: "m" };
    expect(
      owedMissions([
        row("m", "running", { activity: { awaitingOwner: 1 } }),
        row("e1", "awaiting_owner", { famille }),
        row("x", "awaiting_owner"),
      ]),
    ).toBe(2);
  });
  it("la mission ouverte, relue avec son équipe, l'emporte sur une ligne de membre ancienne", () => {
    const famille = { racine: "m" };
    expect(
      owedMissions(
        [row("m", "running"), row("e1", "awaiting_owner", { famille })],
        {
          ...(row("m", "running") as object),
          family: [{ state: "running" }],
        } as never,
      ),
    ).toBe(0);
  });
  const hide = () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
  };
  const notifier = (fail = false) => {
    const ctor = vi.fn(function () {
      if (fail) throw new TypeError("Illegal constructor (FICTIF)");
    });
    Object.assign(ctor, { permission: "granted" });
    vi.stubGlobal("Notification", ctor);
    return ctor;
  };
  const openLive = async (state: string) => {
    let current = { ...base, state } as Run;
    vi.mocked(api).mockImplementation((path) => {
      if (path === "/catalog") return Promise.resolve(catalog) as never;
      if (path === "/runs?vue=liste")
        return Promise.resolve([current]) as never;
      return Promise.resolve(current) as never;
    });
    window.location.hash = "#mission/r1";
    render(<App />);
    await waitFor(() => expect(watchRun).toHaveBeenCalled());
    await screen.findAllByText("Mission FICTIVE");
    const { update } = vi.mocked(watchRun).mock.calls.at(-1)![1];
    return (next: string) => {
      current = { ...current, state: next } as Run;
      act(() =>
        update({
          seq: ++seq,
          runId: "r1",
          type: "state",
          data: { state: next },
          at: new Date().toISOString(),
        } as RunEvent),
      );
    };
  };
  afterEach(() => {
    window.location.hash = "";
    delete (document as { hidden?: boolean }).hidden;
  });
  it("une nouvelle attente notifie la fenêtre cachée ; le titre revient ensuite à la normale", async () => {
    hide();
    const ctor = notifier();
    const move = await openLive("running");
    expect(ctor).not.toHaveBeenCalled();
    move("awaiting_owner");
    await waitFor(() =>
      expect(document.title).toMatch(/^\(1\) À vous de répondre/),
    );
    expect(ctor).toHaveBeenCalledTimes(1);
    move("running");
    await waitFor(() => expect(document.title).toMatch(/^agre agent · /));
  });
  it("une attente déjà là au chargement ne notifie pas", async () => {
    hide();
    const ctor = notifier();
    await openLive("awaiting_owner");
    await waitFor(() => expect(document.title).toMatch(/^\(1\)/));
    await new Promise((r) => setTimeout(r, 50));
    expect(ctor).not.toHaveBeenCalled();
  });
  it("un navigateur qui refuse le constructeur ne démonte pas l'application", async () => {
    hide();
    const ctor = notifier(true);
    const move = await openLive("running");
    move("awaiting_owner");
    await waitFor(() => expect(document.title).toMatch(/^\(1\)/));
    expect(ctor).toHaveBeenCalled();
    expect(screen.getAllByText("Mission FICTIVE").length).toBeGreaterThan(0);
  });
});
