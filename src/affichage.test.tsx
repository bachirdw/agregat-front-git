// Display defects seen on a real career-ops mission (Gemini, 2026-11-03). The events below keep
// the shape of the real ones; every value is FICTIF.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AgentActivity } from "./Career";
import { Composer } from "./Composer";
import { RunView } from "./Mission";
import { agentWarning } from "./agentStatus";
import type { Catalog, MissionInput, Run, RunEvent } from "./types";
afterEach(cleanup);

let seq = 0;
const agent = (data: Record<string, unknown>, at?: string): RunEvent => ({
  seq: ++seq,
  type: "agent",
  data,
  ...(at ? { at } : {}),
});
const call = (id: string, title: string, at: string, kind = "other") =>
  agent(
    {
      sessionUpdate: "tool_call",
      toolCallId: id,
      title,
      kind,
      status: "pending",
      content: [],
    },
    at,
  );
const update = (id: string, status: string, text: string, at: string) =>
  agent(
    {
      sessionUpdate: "tool_call_update",
      toolCallId: id,
      kind: "other",
      status,
      content: [{ type: "content", content: { type: "text", text } }],
    },
    at,
  );
const geminiError = (cause: string) =>
  `MCP tool 'career_script' reported tool error for function call: {"name":"career_script","args":{"command":"scan"}} with response: [{"functionResponse":{"name":"career_script","response":{"content":[{"type":"text","text":${JSON.stringify(cause)}}],"isError":true}}}]`;

describe("outils en échec", () => {
  it("1. affiche la cause d'un appel en échec sans ouvrir le détail", () => {
    render(
      <AgentActivity
        events={[
          call(
            "mcp_platform_career_script__call_1",
            "scan",
            "2026-11-03T03:05:01.072Z",
          ),
          update(
            "mcp_platform_career_script__call_1",
            "failed",
            geminiError("Scanner : provider FICTIF non autorisé"),
            "2026-11-03T03:05:01.381Z",
          ),
        ]}
      />,
    );
    const summary = document.querySelector(".tool > summary")!;
    expect(summary.textContent).toContain(
      "Scanner : provider FICTIF non autorisé",
    );
    expect(summary.textContent).not.toContain("functionResponse");
  });
  it("2. un appel refusé avant l'envoi est nommé d'après son identifiant", () => {
    render(
      <AgentActivity
        events={[
          update(
            "mcp_platform_career_offer_save__call_2",
            "failed",
            "params must have required property 'url'",
            "2026-11-03T03:05:21.000Z",
          ),
          update(
            "6f1d2c3b-0000-4000-8000-000000000000",
            "failed",
            "refus FICTIF",
            "2026-11-03T03:05:22.000Z",
          ),
        ]}
      />,
    );
    const lines = [...document.querySelectorAll(".tool > summary")].map(
      (s) => s.textContent,
    );
    expect(lines[0]).toContain("career_offer_save");
    expect(lines[0]).toContain("params must have required property 'url'");
    expect(lines[1]).toContain("outil inconnu");
    expect(lines[1]).toContain("refus FICTIF");
  });
});

describe("groupes d'outils", () => {
  it("3. « commandes » seulement pour le terminal, « actions » sinon", () => {
    const { unmount } = render(
      <AgentActivity
        events={[
          call(
            "activate_skill__call_3",
            "Skill FICTIF",
            "2026-11-03T03:04:58.349Z",
          ),
          update(
            "activate_skill__call_3",
            "completed",
            "ok",
            "2026-11-03T03:04:58.363Z",
          ),
          call(
            "mcp_platform_jobs_search_live__call_4",
            "jobs_search_live(query: FICTIF)",
            "2026-11-03T03:04:58.365Z",
          ),
          update(
            "mcp_platform_jobs_search_live__call_4",
            "completed",
            "ok",
            "2026-11-03T03:04:58.379Z",
          ),
        ]}
      />,
    );
    expect(screen.getByText(/A exécuté 2 actions/)).toBeTruthy();
    expect(screen.queryByText(/commandes/)).toBeNull();
    unmount();
    render(
      <AgentActivity
        events={[
          call("t5", "ls", "2026-11-03T03:00:00.000Z", "execute"),
          update("t5", "completed", "ok", "2026-11-03T03:00:01.000Z"),
          call("t6", "pwd", "2026-11-03T03:00:01.000Z", "execute"),
          update("t6", "completed", "ok", "2026-11-03T03:00:02.000Z"),
        ]}
      />,
    );
    expect(screen.getByText(/A exécuté 2 commandes/)).toBeTruthy();
  });
  it("4. la durée du groupe et celle de ses appels sont calculées de la même façon", () => {
    render(
      <AgentActivity
        events={[
          call("a", "jobs_search_live(query: un)", "2026-11-03T03:00:00.000Z"),
          update("a", "completed", "ok", "2026-11-03T03:00:01.200Z"),
          call(
            "b",
            "jobs_search_live(query: deux)",
            "2026-11-03T03:00:01.300Z",
          ),
          update("b", "completed", "ok", "2026-11-03T03:00:02.800Z"),
          call(
            "c",
            "jobs_search_live(query: trois)",
            "2026-11-03T03:00:02.810Z",
          ),
          update("c", "completed", "ok", "2026-11-03T03:00:02.830Z"),
        ]}
      />,
    );
    const group = document.querySelector(".tool-group > summary")!;
    expect(group.textContent).toContain("2,8 s");
    const times = [...document.querySelectorAll(".tool-duration")].map(
      (t) => t.textContent,
    );
    expect(times).toEqual(["1,2 s", "1,5 s", "< 0,1 s"]);
  });
});

const run = (patch: Partial<Run> = {}) =>
  ({
    id: "00000000-0000-4000-8000-0000000000a1",
    prompt: "Mission FICTIVE",
    state: "failed",
    mode: "agent",
    agent: "gemini",
    model: "",
    pack: "career-ops",
    simulated: false,
    dataMode: "unverified",
    createdAt: "2026-11-03T03:04:53.075Z",
    plan: {
      steps: [],
      workflow: null,
      cost: {
        platformCents: 0,
        currency: "EUR",
        budgetCents: 0,
        withinBudget: true,
        description: "FICTIF",
        lines: [],
      },
    },
    ...patch,
  }) as unknown as Run;

describe("fin de mission", () => {
  it("5. une mission incomplète est titrée comme telle, avec sa cause", () => {
    render(
      <RunView
        run={run({
          error: "Mission incomplète : Étape FICTIVE (échouée)",
        })}
        events={[]}
        connection=""
        busy={false}
        act={vi.fn()}
      />,
    );
    const card = screen.getByRole("alert");
    expect(card.textContent).toContain("Mission incomplète");
    expect(card.textContent).toContain("Étape FICTIVE (échouée)");
    expect(card.textContent).not.toContain("Mission interrompue");
  });
  it("6. l'enveloppe JSON de la réponse n'apparaît pas dans le fil", () => {
    const envelope =
      '```json\n{\n  "simulated": false,\n  "summary": "Résumé FICTIF",\n  "evidence": []\n}\n```';
    render(
      <AgentActivity
        events={[
          agent({
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: envelope },
          }),
        ]}
        final
        answer="Résumé FICTIF"
      />,
    );
    expect(document.body.textContent).not.toContain('"simulated"');
  });
  it("7. la provenance ne contredit pas la vérification du back", () => {
    render(
      <RunView
        run={run({
          result: {
            simulated: false,
            summary: "FICTIF",
            evidence: [],
            provenance: { data: "navigateur réel", analysis: "gemini" },
          },
        } as Partial<Run>)}
        events={[
          {
            seq: 1,
            type: "verification",
            data: {
              valid: false,
              scope:
                "Page naviguée et observée ; autres affirmations non vérifiées",
            },
          },
        ]}
        connection=""
        busy={false}
        act={vi.fn()}
      />,
    );
    expect(
      screen.queryByText("Provenance des données non vérifiée"),
    ).toBeNull();
    expect(
      screen.getAllByText(
        /Page naviguée et observée ; autres affirmations non vérifiées/,
      ).length,
    ).toBeGreaterThan(0);
  });
});

const catalog = {
  live: true,
  agents: [
    { id: "codex", name: "Codex", installed: true, compatible: true },
    { id: "gemini", name: "Gemini CLI", installed: true, compatible: true },
    {
      id: "opencode",
      name: "OpenCode",
      installed: true,
      compatible: true,
      probe: { session: false, error: "auth FICTIVE", models: [] },
    },
  ],
  packs: [],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
} as unknown as Catalog;
const limited = run({
  agent: "codex",
  error:
    "Limite d’usage de Codex atteinte : réessayer à Nov 6th, 2026 12:54 PM. Choisir un autre agent ou attendre.",
});
const input = {
  prompt: "",
  agent: "codex",
  pack: "auto",
  skills: [],
  model: "",
  budgetCents: 0,
  mode: "agent",
  workflow: "auto",
} as MissionInput;

describe("avant le lancement", () => {
  it("8. signale un agent indisponible : catalogue ou dernière limite d'usage connue", () => {
    expect(agentWarning("codex", catalog, [limited])).toContain(
      "réessayer à Nov 6th, 2026 12:54 PM",
    );
    expect(agentWarning("gemini", catalog, [limited])).toBeNull();
    expect(agentWarning("opencode", catalog, [])).toContain("auth FICTIVE");
    expect(agentWarning("auto", catalog, [limited])).toBeNull();
    // A later success of the same agent clears the old limit.
    expect(
      agentWarning("codex", catalog, [
        run({
          agent: "codex",
          state: "completed",
          createdAt: "2026-11-04T00:00:00Z",
        }),
        limited,
      ]),
    ).toBeNull();
    render(
      <Composer
        catalog={catalog}
        input={input}
        onChange={vi.fn()}
        onPlan={vi.fn()}
        busy={false}
        agentWarning={agentWarning("codex", catalog, [limited])}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("Codex");
  });
  it("9. la pastille Skills montre les Skills de la mission", () => {
    render(
      <Composer
        catalog={catalog}
        input={input}
        onChange={vi.fn()}
        onPlan={vi.fn()}
        busy={false}
        reply
        sessionSettings={{
          agent: "gemini",
          model: "",
          pack: "career-ops",
          skills: ["career-ops"],
        }}
      />,
    );
    expect(screen.getByText("Skills · career-ops")).toBeTruthy();
    expect(screen.queryByText(/non transmis/)).toBeNull();
  });
});

describe("lancement", () => {
  it("10. un lancement sans réponse de l'API peut être annulé", async () => {
    vi.resetModules();
    vi.doMock("./api", async (importOriginal) => ({
      ...(await importOriginal<typeof import("./api")>()),
      api: vi.fn(),
      watchRun: vi.fn(() => () => {}),
    }));
    const { api } = await import("./api");
    const App = (await import("./App")).default;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
    HTMLElement.prototype.scrollTo = vi.fn();
    const plan = {
      agent: "fixture",
      pack: "core",
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
    };
    const signals: AbortSignal[] = [];
    vi.mocked(api).mockImplementation(((
      path: string,
      body: unknown,
      signal?: AbortSignal,
    ) => {
      if (path === "/catalog")
        return Promise.resolve({ ...catalog, live: false, agents: [] });
      if (path === "/plan") return Promise.resolve(plan);
      if (path === "/runs" && body) {
        if (signal) signals.push(signal);
        return new Promise((_, reject) =>
          signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          ),
        );
      }
      return Promise.resolve([]);
    }) as never);
    render(<App />);
    const composer = await screen.findByLabelText("Objectif de la mission");
    fireEvent.change(composer, { target: { value: "Objectif FICTIF" } });
    fireEvent.click(screen.getByRole("button", { name: "Préparer le plan" }));
    await screen.findByRole("region", { name: "Plan proposé" });
    fireEvent.click(screen.getByRole("button", { name: "Lancer" }));
    const cancel = await screen.findByRole("button", {
      name: "Annuler le lancement",
    });
    await act(async () => fireEvent.click(cancel));
    expect(signals[0]?.aborted).toBe(true);
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Lancer" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    vi.unstubAllGlobals();
    vi.doUnmock("./api");
  });
});
