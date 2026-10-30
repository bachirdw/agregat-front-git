import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Markdown } from "./Markdown";
import { Composer } from "./Composer";
import { PlanCard, RunView } from "./Mission";
import {
  activity,
  AgentActivity,
  CareerResults,
  CareerThread,
  sessionThread,
} from "./Career";
import { Skills } from "./Galleries";
import type { Catalog, MissionInput, Plan, Run } from "./types";
import { agentStatus } from "./types";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const catalog: Catalog = {
  live: false,
  agents: [
    {
      id: "fixture",
      name: "Démonstrateur ACP",
      installed: true,
      compatible: true,
      simulated: true,
    },
  ],
  packs: [
    {
      id: "najah",
      name: "Najah AI",
      description: "Test",
      skills: [],
      dags: [],
    },
  ],
  skills: [],
  meters: {
    workflow_run: { category: "Workflows", unit: "run", billable: true },
  },
  pricing: {
    currency: "EUR",
    centsPerUnit: { workflow_run: 0 },
    monthlyCapCents: null,
  },
};
const input: MissionInput = {
  prompt: "emploi",
  agent: "fixture",
  pack: "najah",
  skills: [],
  model: "",
  budgetCents: 0,
  mode: "workflow",
  workflow: "auto",
};
const plan: Plan = {
  agent: "Démonstrateur ACP",
  pack: "Najah AI",
  steps: ["Chercher", "Classer"],
  cost: {
    platformCents: 50,
    currency: "EUR",
    budgetCents: 0,
    withinBudget: false,
    description: "Aucun modèle appelé",
    lines: [{ dimension: "workflow_run", units: 1, cents: 50 }],
  },
  permissions: ["Aucun envoi"],
  simulated: true,
  dataMode: "fixture",
  routing: { reasons: ["Choix manuel"], rejected: [] },
  workflow: null,
};
describe("rendu fiable", () => {
  it("distingue CLI détecté, session ouverte et prompt réellement validé", () => {
    const base = {
      id: "codex",
      name: "Codex",
      installed: true,
      compatible: true,
    };
    expect(agentStatus(base)).toBe("Détecté · non testé");
    expect(
      agentStatus({ ...base, probe: { session: true, models: [] } }),
    ).toContain("prompt non testé");
    expect(
      agentStatus({
        ...base,
        probe: { session: false, error: "Login required", models: [] },
      }),
    ).toContain("Login required");
    expect(
      agentStatus({
        ...base,
        probe: {
          session: true,
          inference: false,
          inferenceError: "Login required",
          models: [],
        },
      }),
    ).toContain("Prompt refusé · Login required");
    expect(
      agentStatus({
        ...base,
        probe: { session: true, inference: true, models: [] },
      }),
    ).toContain("date inconnue");
  });
  it("permet de choisir le navigateur avant le plan", () => {
    const onChange = vi.fn();
    render(
      <Composer
        catalog={catalog}
        input={input}
        onChange={onChange}
        onPlan={vi.fn()}
        busy={false}
      />,
    );
    fireEvent.change(screen.getByLabelText("Navigateur"), {
      target: { value: "isolated" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ browser: "isolated" }),
    );
    expect(
      screen.queryByRole("button", { name: /Choisir un navigateur/ }),
    ).toBeNull();
  });
  it("propose les modes ACP annoncés sans mode qui contourne les décisions", () => {
    const onChange = vi.fn();
    render(
      <Composer
        catalog={{
          ...catalog,
          live: true,
          agents: [
            {
              id: "codex",
              name: "Codex",
              installed: true,
              compatible: true,
              probe: {
                session: true,
                models: [],
                modes: ["read-only", "workspace-write", "bypassPermissions"],
              },
            },
          ],
        }}
        input={{ ...input, agent: "codex" }}
        onChange={onChange}
        onPlan={vi.fn()}
        busy={false}
      />,
    );
    const select = screen.getByLabelText("Mode ACP") as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    expect(select.textContent).toContain("workspace-write");
    expect(select.textContent).not.toContain("bypassPermissions");
    fireEvent.change(select, { target: { value: "workspace-write" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ agentMode: "workspace-write" }),
    );
  });
  it("signale l'échec du résultat carrière sans laisser un chargement infini", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/career/offers")
          ? new Response(JSON.stringify({ opportunities: [] }))
          : new Response(JSON.stringify({ error: "Résultat indisponible" }), {
              status: 503,
            }),
      ),
    );
    render(<CareerResults run={{ id: "fictif", state: "completed" } as Run} />);
    expect(await screen.findByText(/API locale inaccessible/)).toBeTruthy();
    expect(screen.queryByText("Chargement…")).toBeNull();
  });
  it("termine le chargement lorsque le résultat ne contient aucun résumé", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (url: string) =>
          new Response(
            JSON.stringify(
              url.includes("/career/offers")
                ? { opportunities: [] }
                : { summary: "" },
            ),
          ),
      ),
    );
    render(<CareerResults run={{ id: "fictif", state: "completed" } as Run} />);
    expect(await screen.findByText("Aucun résumé disponible.")).toBeTruthy();
    expect(screen.queryByText("Chargement…")).toBeNull();
  });
  it("ignore le résultat d'une autre mission arrivé après le changement de mission", async () => {
    let oldResult!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/career/offers"))
          return Promise.resolve(
            new Response(JSON.stringify({ opportunities: [] })),
          );
        if (url.includes("/ancien/"))
          return new Promise<Response>((resolve) => {
            oldResult = resolve;
          });
        return Promise.resolve(
          new Response(JSON.stringify({ summary: "Résumé récent FICTIF" })),
        );
      }),
    );
    const { rerender } = render(
      <CareerResults run={{ id: "ancien", state: "completed" } as Run} />,
    );
    rerender(
      <CareerResults run={{ id: "récent", state: "completed" } as Run} />,
    );
    expect(await screen.findByText("Résumé récent FICTIF")).toBeTruthy();
    await act(async () =>
      oldResult(
        new Response(JSON.stringify({ summary: "Résumé ancien FICTIF" })),
      ),
    );
    expect(screen.queryByText("Résumé ancien FICTIF")).toBeNull();
  });
  it("Markdown : pas de HTML, de liens javascript ni d’images distantes ; tableaux et code lisibles", () => {
    const { container } = render(
      <Markdown
        text={
          "<script>alert(1)</script>\n\n[mal](javascript:alert%281%29) [source](https://example.com)\n\n![pixel](https://tracker.test/x)\n\n| Colonne | Valeur |\n| --- | --- |\n| A | B |\n\n```js\nconst x=1;\n```"
        }
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
    expect(container.querySelector("a")?.rel).toBe("noopener noreferrer");
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("const x=1;")).toBeTruthy();
  });
  it("empêche de préparer avant le chargement du catalogue et invalide le formulaire par saisie", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Composer
        catalog={null}
        input={input}
        onChange={onChange}
        onPlan={vi.fn()}
        busy={false}
      />,
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Préparer le plan",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    rerender(
      <Composer
        catalog={catalog}
        input={input}
        onChange={onChange}
        onPlan={vi.fn()}
        busy={false}
      />,
    );
    fireEvent.change(screen.getByLabelText("Objectif de la mission"), {
      target: { value: "autre" },
    });
    expect(onChange).toHaveBeenCalledWith({ ...input, prompt: "autre" });
  });
  it("en réponse, garde l'ajout du CV et masque seulement les réglages", () => {
    render(
      <Composer
        catalog={catalog}
        input={{
          ...input,
          attachments: [
            { id: "f1", name: "cv-fictif.txt", size: 4, type: "text/plain" },
          ],
        }}
        onChange={vi.fn()}
        onPlan={vi.fn()}
        busy={false}
        reply
      />,
    );
    expect(
      screen.getByRole("button", { name: "Envoyer la réponse" }),
    ).toBeTruthy();
    expect(screen.getByText("cv-fictif.txt")).toBeTruthy();
    expect(screen.getByLabelText("Ajouter")).toBeTruthy();
    expect(screen.queryByLabelText(/Agent /)).toBeNull();
  });
  it("le bouton d'ajout reste accessible en mode compact", () => {
    render(
      <Composer
        catalog={catalog}
        input={input}
        onChange={vi.fn()}
        onPlan={vi.fn()}
        busy={false}
        compact
      />,
    );
    const add = screen.getByLabelText("Ajouter");
    expect(add.closest('[aria-hidden="true"]')).toBeNull();
    expect(add.closest(".filters")).toBeNull();
  });
  it("déposer un CV sur la fenêtre l'ajoute au composeur", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          '{"id":"u2","name":"cv.pdf","size":4,"type":"application/pdf"}',
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const onChange = vi.fn();
    render(
      <Composer
        catalog={catalog}
        input={input}
        onChange={onChange}
        onPlan={vi.fn()}
        busy={false}
      />,
    );
    const file = new File(["FICTIF"], "cv.pdf", { type: "application/pdf" });
    const transfer = { files: [file], types: ["Files"] };
    const over = new Event("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(over, "dataTransfer", { value: transfer });
    expect(window.dispatchEvent(over)).toBe(false);
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", { value: transfer });
    expect(window.dispatchEvent(drop)).toBe(false);
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        ...input,
        attachments: [
          { id: "u2", name: "cv.pdf", size: 4, type: "application/pdf" },
        ],
      }),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("bouton + : joindre un fichier, pastille, retrait et erreur de type", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          '{"id":"u1","name":"cv.pdf","size":2048,"type":"application/pdf"}',
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const onChange = vi.fn();
    const { rerender, container } = render(
      <Composer
        catalog={catalog}
        input={input}
        onChange={onChange}
        onPlan={vi.fn()}
        busy={false}
      />,
    );
    expect(screen.getByLabelText("Ajouter")).toBeTruthy();
    expect(
      screen.getByRole("menuitem", { name: "Ajouter un fichier" }),
    ).toBeTruthy();
    const picker = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(picker, {
      target: { files: [new File(["%PDF FICTIF"], "cv.pdf")] },
    });
    await vi.waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        ...input,
        attachments: [
          { id: "u1", name: "cv.pdf", size: 2048, type: "application/pdf" },
        ],
      }),
    );
    const withFile = onChange.mock.calls.at(-1)![0];
    rerender(
      <Composer
        catalog={catalog}
        input={withFile}
        onChange={onChange}
        onPlan={vi.fn()}
        busy={false}
      />,
    );
    expect(screen.getByText("cv.pdf")).toBeTruthy();
    expect(screen.getByText("2 Ko")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retirer cv.pdf" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...input, attachments: [] });
    fireEvent.change(picker, {
      target: { files: [new File(["x"], "photo.png")] },
    });
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /Type refusé/,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("plan réel : coût, budget, provenance et lancement explicite", () => {
    const launch = vi.fn();
    render(
      <PlanCard
        plan={plan}
        catalog={catalog}
        busy={false}
        launch={launch}
        edit={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "supérieure au budget",
    );
    expect(screen.getByText("Agent fictif · aucun modèle appelé")).toBeTruthy();
    expect(screen.getByText("Sources fictives · démonstration")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lancer" }));
    expect(launch).toHaveBeenCalledOnce();
  });
  it("agent réel et sources fictives restent deux états distincts", () => {
    render(
      <PlanCard
        plan={{ ...plan, simulated: false, agent: "Codex" }}
        catalog={catalog}
        busy={false}
        launch={vi.fn()}
        edit={vi.fn()}
      />,
    );
    expect(screen.getByText("Agent réel · compte BYOA")).toBeTruthy();
    expect(screen.getByText("Sources fictives · démonstration")).toBeTruthy();
  });
  it("résultat : la portée de vérification est distincte du succès de l’outil", () => {
    const run = {
      id: "r",
      state: "completed",
      mode: "agent",
      agent: "codex",
      model: "",
      browser: "isolated",
      pack: "core",
      simulated: false,
      usage: { platformCents: 0, currency: "EUR", byDimension: [] },
      plan: { steps: [] },
      result: { simulated: false, summary: "Réponse FICTIVE", evidence: [] },
    } as unknown as Run;
    render(
      <RunView
        run={run}
        events={[
          {
            seq: 0,
            type: "session",
            data: {
              models: { current: "modèle-test" },
              modes: { current: "workspace-write" },
            },
          },
          {
            seq: 1,
            type: "verification",
            data: { scope: "Structure seulement ; faits non vérifiés" },
          },
        ]}
        connection=""
        busy={false}
        act={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        /Vérification : Structure seulement ; faits non vérifiés/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Session ACP : modèle sélectionné modèle-test · mode workspace-write/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/Modèle effectivement servi : non confirmé par ACP/),
    ).toBeTruthy();
  });
  it("résultat navigateur réel : remplace le badge non vérifié, jamais pour une simulation", () => {
    const run = {
      id: "r-browser",
      state: "completed",
      mode: "agent",
      agent: "codex",
      model: "",
      browser: "playwriter",
      pack: "core",
      simulated: false,
      dataMode: "unverified",
      plan: { steps: [] },
      result: {
        simulated: false,
        summary: "Example Domain",
        evidence: [
          { capability: "browser.snapshot", url: "https://example.com/" },
        ],
        provenance: { data: "navigateur réel", analysis: "codex" },
      },
    } as unknown as Run;
    const { rerender } = render(
      <RunView
        run={run}
        events={[]}
        connection=""
        busy={false}
        act={vi.fn()}
      />,
    );
    expect(screen.getByText("Page observée · preuves navigateur")).toBeTruthy();
    expect(
      screen.queryByText("Provenance des données non vérifiée"),
    ).toBeNull();
    rerender(
      <RunView
        run={{ ...run, result: { ...run.result!, simulated: true } }}
        events={[]}
        connection=""
        busy={false}
        act={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Provenance des données non vérifiée"),
    ).toBeTruthy();
  });
  it("accord DAG utilise le bon run et affiche la sortie à relire", () => {
    const act = vi.fn();
    const run = {
      id: "r",
      state: "running",
      prompt: "lettre",
      mode: "workflow",
      plan: {
        workflow: {
          steps: [
            {
              id: "review",
              title: "Relire",
              kind: "approval",
              dependsOn: ["draft"],
            },
          ],
        },
        steps: [],
      },
      steps: [
        { step_id: "review", state: "waiting_approval", attempt: 0 },
        {
          step_id: "draft",
          state: "succeeded",
          attempt: 1,
          output: { summary: "Brouillon à compléter" },
        },
      ],
    } as unknown as Run;
    render(
      <RunView
        run={run}
        events={[]}
        connection="Flux en direct"
        busy={false}
        act={act}
      />,
    );
    expect(screen.getByText("Brouillon à compléter")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Approuver" }));
    expect(act).toHaveBeenCalledWith("/runs/r/steps/review", {
      approved: true,
    });
  });
  it("permission : l'expiration est visible et désactive l'accord", () => {
    vi.useFakeTimers();
    try {
      const actPermission = vi.fn();
      const run = {
        id: "r",
        state: "waiting_permission",
        mode: "agent",
        plan: { steps: [] },
        permissions: [
          {
            id: "p",
            expiresAt: Date.now() + 30000,
            tool: { title: "FICTIF envoi" },
            options: [
              {
                optionId: "allow",
                name: "Approuver l’envoi",
                kind: "allow_once",
              },
            ],
          },
        ],
      } as unknown as Run;
      render(
        <RunView
          run={run}
          events={[]}
          connection=""
          busy={false}
          act={actPermission}
        />,
      );
      expect(screen.getByRole("timer").textContent).toContain("30 s");
      const approve = screen.getByRole("button", {
        name: "Approuver l’envoi",
      }) as HTMLButtonElement;
      expect(approve.disabled).toBe(false);
      act(() => vi.advanceTimersByTime(31000));
      expect(screen.getByRole("timer").textContent).toBe("Accord expiré");
      expect(approve.disabled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
  it("workflow interrompu se reprend par API et non par nouveau lancement", () => {
    const act = vi.fn();
    const run = {
      id: "r",
      state: "interrupted",
      mode: "workflow",
      plan: { steps: [] },
      steps: [],
    } as unknown as Run;
    render(
      <RunView run={run} events={[]} connection="" busy={false} act={act} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Reprendre le workflow" }),
    );
    expect(act).toHaveBeenCalledWith("/runs/r/resume", {});
  });
  it("quarantaine : lecture explicite et hash réel pour la revue", () => {
    const act = vi.fn();
    render(
      <Skills
        catalog={{
          ...catalog,
          skills: [
            {
              id: "third",
              name: "Tiers",
              version: "1",
              origin: "third-party",
              state: "quarantined",
              active: false,
              installed: false,
              integrity: true,
              hash: "abc",
              findings: [],
            },
          ],
        }}
        busy={false}
        act={act}
      />,
    );
    const approve = screen.getByRole("button", {
      name: "Approuver après lecture",
    }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(approve);
    expect(act).toHaveBeenCalledWith("/skills/third/review", {
      approved: true,
      hash: "abc",
    });
  });
});
describe("career-ops", () => {
  it("affiche une seule section des étapes dans le fil carrière FICTIF", () => {
    const run = {
      id: "00000000-0000-4000-8000-000000000011",
      prompt: "Surveille cette offre FICTIVE",
      state: "completed",
      mode: "agent",
      pack: "career-ops",
      createdAt: "2026-10-28T00:00:00.000Z",
      plan: { steps: [] },
      skillProgress: {
        orderDeviation: false,
        steps: [
          {
            pack: "career-ops",
            intent: "search",
            id: "scan",
            title: "Scanner les portails FICTIFS",
            state: "pending",
          },
        ],
      },
    } as unknown as Run;
    render(
      <CareerThread run={run} runs={[run]} events={[]}>
        <RunView
          run={run}
          events={[]}
          connection=""
          busy={false}
          act={vi.fn()}
        />
      </CareerThread>,
    );
    expect(screen.getAllByText("Étapes du Skill")).toHaveLength(1);
  });
  it("affiche immédiatement le message privé pendant une mission en cours", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    const run = {
      id: "00000000-0000-4000-8000-000000000009",
      prompt: "Mission privée",
      state: "running",
      mode: "agent",
      pack: "career-ops",
      createdAt: "2026-10-28T00:00:00.000Z",
    } as unknown as Run;
    render(
      <CareerThread
        run={run}
        runs={[run]}
        events={[
          {
            seq: 1,
            type: "agent_silent",
            data: { elapsedMs: 60000, stopped: false },
          },
        ]}
        immediatePrompt="Postule à l’offre FICTIVE"
      >
        <span>Détails FICTIFS</span>
      </CareerThread>,
    );
    expect(screen.getByText("Postule à l’offre FICTIVE")).toBeTruthy();
    expect(screen.getByText(/Agent silencieux depuis 1 min/)).toBeTruthy();
  });
  it("affiche une seule fois le repli Chrome isolé dans le fil de la mission", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    const run = {
      id: "00000000-0000-4000-8000-000000000010",
      prompt: "Mission FICTIVE",
      state: "completed",
      mode: "agent",
      pack: "career-ops",
      createdAt: "2026-10-28T00:00:00.000Z",
    } as unknown as Run;
    const fallback = {
      type: "browser_fallback",
      data: { connected: false, reason: "Extension Playwriter indisponible" },
    };
    const { rerender } = render(
      <CareerThread run={run} runs={[run]} events={[]}>
        <span>Détails FICTIFS</span>
      </CareerThread>,
    );
    expect(screen.queryByText(/Chrome isolé, non connecté/)).toBeNull();
    rerender(
      <CareerThread
        run={run}
        runs={[run]}
        events={[
          { seq: 1, ...fallback },
          { seq: 2, ...fallback },
        ]}
      >
        <span>Détails FICTIFS</span>
      </CareerThread>,
    );
    const warnings = screen.getAllByText(/Chrome isolé, non connecté/);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].closest(".career-thread")).toBeTruthy();
    expect(warnings[0].classList.contains("career-warning")).toBe(true);
  });
  it("choisir le pack career-ops conserve l’agent choisi", () => {
    const onChange = vi.fn();
    const localCatalog = {
      ...catalog,
      live: true,
      agents: [
        ...catalog.agents,
        { id: "gemini", name: "Gemini", installed: true, compatible: true },
      ],
      packs: [
        ...catalog.packs,
        {
          id: "career-ops",
          name: "career-ops",
          description: "Test FICTIF",
          skills: [],
          dags: [],
        },
      ],
    };
    render(
      <Composer
        catalog={localCatalog}
        input={{ ...input, agent: "codex", pack: "auto" }}
        onChange={onChange}
        onPlan={vi.fn()}
        busy={false}
      />,
    );
    fireEvent.change(screen.getByLabelText("Pack"), {
      target: { value: "career-ops" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ pack: "career-ops", agent: "codex" }),
    );
  });
  it("rapport évalué A–G : G indique la légitimité, H reste facultatif", async () => {
    const offer = {
      id: "33333333-3333-4333-a333-333333333333",
      title: "Poste FICTIF",
      company: "Entreprise FICTIVE",
      source: "Source FICTIVE",
      url: "https://jobs.example.test/fictif",
      score: 3,
      simulated: true,
      report: Object.fromEntries(
        "ABCDEFG".split("").map((key) => [key, `Bloc ${key} FICTIF`]),
      ),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () =>
          url.includes("/career/offers")
            ? { opportunities: [offer] }
            : { summary: "Résumé FICTIF" },
      })),
    );
    render(
      <CareerResults
        run={{ id: "fictif", state: "completed" } as unknown as Run}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("G · Légitimité de l’annonce")).toBeTruthy(),
    );
    expect(screen.getByText("Rapport A–G (H si applicable)")).toBeTruthy();
    expect(screen.queryByText("H · Réponses de candidature")).toBeNull();
  });
  it("la conversation career-ops expose le rapport A–G de l'offre enregistrée", async () => {
    const run = {
      id: "fictif",
      prompt: "Mission privée FICTIVE",
      state: "completed",
      mode: "agent",
      pack: "career-ops",
      createdAt: "2026-10-28T00:00:00.000Z",
    } as unknown as Run;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () =>
          url.includes("/career/offers")
            ? {
                opportunities: [
                  {
                    id: "33333333-3333-4333-a333-333333333333",
                    title: "Poste FICTIF",
                    company: "Entreprise FICTIVE",
                    source: "Source FICTIVE",
                    url: "https://jobs.example.test/fictif",
                    score: 4,
                    simulated: true,
                    report: Object.fromEntries(
                      "ABCDEFG"
                        .split("")
                        .map((key) => [key, `Bloc ${key} FICTIF`]),
                    ),
                  },
                ],
              }
            : url.includes("/input")
              ? { prompt: "Question FICTIVE" }
              : { summary: "Réponse FICTIVE" },
      })),
    );
    render(
      <CareerThread run={run} runs={[run]} events={[]}>
        <span>Détails FICTIFS</span>
      </CareerThread>,
    );
    expect(
      await screen.findByText("Poste FICTIF", { exact: false }),
    ).toBeTruthy();
    expect(screen.getByText("Rapport A–G (H si applicable)")).toBeTruthy();
    expect(screen.getByText("Bloc G FICTIF")).toBeTruthy();
  });
  it("affiche l'échec de lecture de la réponse d'un tour terminé", async () => {
    const run = {
      id: "fictif",
      prompt: "Question FICTIVE",
      state: "completed",
      mode: "agent",
      pack: "career-ops",
      createdAt: "2026-10-28T00:00:00.000Z",
    } as Run;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/result")
          ? new Response(JSON.stringify({ error: "Réponse absente" }), {
              status: 404,
            })
          : new Response(
              JSON.stringify(
                url.includes("/offers")
                  ? { opportunities: [] }
                  : { prompt: "Question FICTIVE" },
              ),
            ),
      ),
    );
    render(
      <CareerThread run={run} runs={[run]} events={[]}>
        <span>Détails FICTIFS</span>
      </CareerThread>,
    );
    expect(await screen.findByText("Réponse absente")).toBeTruthy();
  });
  it("signale une lecture impossible des offres dans le fil carrière", async () => {
    const run = {
      id: "fictif",
      prompt: "Question FICTIVE",
      state: "completed",
      mode: "agent",
      pack: "career-ops",
      createdAt: "2026-10-28T00:00:00.000Z",
    } as Run;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/offers")
          ? new Response(JSON.stringify({ error: "Offres indisponibles" }), {
              status: 500,
            })
          : new Response(
              JSON.stringify(
                url.includes("/input")
                  ? { prompt: "Question FICTIVE" }
                  : { summary: "Réponse FICTIVE" },
              ),
            ),
      ),
    );
    render(
      <CareerThread run={run} runs={[run]} events={[]}>
        <span>Détails FICTIFS</span>
      </CareerThread>,
    );
    expect(await screen.findByText("Offres indisponibles")).toBeTruthy();
  });
  it("la conversation signale la perte du flux et efface l'alerte après reconnexion", () => {
    const run = {
      id: "fictif",
      prompt: "Mission FICTIVE",
      state: "running",
      mode: "agent",
      pack: "career-ops",
      createdAt: "2026-10-28T00:00:00.000Z",
    } as unknown as Run;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ prompt: "Mission FICTIVE" }),
      })),
    );
    const { rerender } = render(
      <CareerThread
        run={run}
        runs={[run]}
        events={[]}
        connection="Connexion perdue · reconnexion…"
      >
        <span>Détails FICTIFS</span>
      </CareerThread>,
    );
    expect(screen.getByText("Connexion perdue · reconnexion…")).toBeTruthy();
    rerender(
      <CareerThread
        run={run}
        runs={[run]}
        events={[]}
        connection="Flux en direct"
      >
        <span>Détails FICTIFS</span>
      </CareerThread>,
    );
    expect(screen.queryByText("Connexion perdue · reconnexion…")).toBeNull();
  });
  it("ancien bloc H conserve un libellé neutre sans modifier le rapport", async () => {
    const offer = {
      id: "44444444-4444-4444-a444-444444444444",
      title: "Poste FICTIF",
      company: "Entreprise FICTIVE",
      source: "Source FICTIVE",
      url: "https://jobs.example.test/fictif",
      score: 3,
      simulated: true,
      report: Object.fromEntries(
        "ABCDEFGH".split("").map((key) => [key, `Bloc ${key} FICTIF`]),
      ),
    };
    const current = {
      ...offer,
      id: "55555555-5555-4555-a555-555555555555",
      contractVersion: 2,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () =>
          url.includes("/career/offers")
            ? { opportunities: [offer, current] }
            : { summary: "Résumé FICTIF" },
      })),
    );
    render(
      <CareerResults
        run={{ id: "fictif", state: "completed" } as unknown as Run}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("H · Bloc historique")).toBeTruthy(),
    );
    expect(screen.getByText("H · Réponses de candidature")).toBeTruthy();
  });
  it("activité : outils fusionnés par identifiant et texte de l'agent concaténé", () => {
    const events = [
      {
        seq: 1,
        type: "agent",
        data: {
          sessionUpdate: "tool_call",
          toolCallId: "t1",
          title: "jobs_search_live",
          status: "in_progress",
        },
      },
      {
        seq: 2,
        type: "agent",
        data: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "Je cherche " },
        },
      },
      {
        seq: 3,
        type: "agent",
        data: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "des offres." },
        },
      },
      {
        seq: 4,
        type: "agent",
        data: {
          sessionUpdate: "tool_call_update",
          toolCallId: "t1",
          status: "completed",
        },
      },
      { seq: 5, type: "state", data: { state: "completed" } },
    ];
    expect(activity(events)).toEqual([
      expect.objectContaining({
        kind: "tool",
        title: "jobs_search_live",
        status: "completed",
      }),
      expect.objectContaining({ kind: "text", text: "Je cherche des offres." }),
    ]);
    render(<AgentActivity events={events} />);
    expect(screen.getByText("jobs_search_live")).toBeTruthy();
    expect(screen.getByRole("img", { name: "réussi" })).toBeTruthy();
  });
  it("fil de session : tours de la même session, du plus ancien au plus récent", () => {
    const r = (id: string, sessionId: string | null, createdAt: string) =>
      ({
        id,
        sessionId,
        createdAt,
        prompt: id,
        state: "completed",
      }) as unknown as Run;
    const a = r("a", "s1", "2026-10-26T01:00:00Z");
    const b = r("b", "s2", "2026-10-26T02:00:00Z");
    const c = r("c", "s1", "2026-10-26T03:00:00Z");
    const d = r("d", "s1", "2026-10-26T04:00:00Z");
    expect(sessionThread(c, [d, c, b, a]).map((x) => x.id)).toEqual(["a", "c"]);
    expect(sessionThread(r("x", null, "z"), [a]).map((x) => x.id)).toEqual([
      "x",
    ]);
  });
});
