import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Markdown } from "./Markdown";
import { Composer } from "./Composer";
import { PlanCard, RunView } from "./Mission";
import { activity, AgentActivity, CareerResults } from "./Career";
import { Skills } from "./Galleries";
import type { Catalog, MissionInput, Plan, Run } from "./types";
afterEach(cleanup);
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
  routing: { reasons: ["Choix manuel"], rejected: [] },
  workflow: null,
};
describe("rendu fiable", () => {
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
    expect(screen.getByText("Démonstration · données fictives")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lancer" }));
    expect(launch).toHaveBeenCalledOnce();
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
    expect(screen.getByText("terminé")).toBeTruthy();
  });
  it("offres : triées par note, lien externe, rapport en texte brut", async () => {
    const offer = (id: string, score: number) => ({
      id,
      title: "Poste " + id,
      company: "Entreprise FICTIVE",
      url: "https://jobs.example.test/" + id,
      source: "Fixture",
      fetchedAt: "",
      score,
      report: { A: "<b>pas du HTML</b>", H: "Postuler" },
      simulated: true,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string) =>
        path.includes("offers")
          ? new Response(
              JSON.stringify({ opportunities: [offer("a", 3), offer("b", 5)] }),
            )
          : new Response(JSON.stringify({ summary: "Résumé FICTIF" })),
      ),
    );
    render(
      <CareerResults
        run={
          { id: "r1", pack: "career-ops", state: "completed" } as unknown as Run
        }
      />,
    );
    expect(await screen.findByText("Résumé FICTIF")).toBeTruthy();
    const titles = screen.getAllByText(/^Poste /).map((n) => n.textContent);
    expect(titles).toEqual(["Poste b", "Poste a"]);
    expect(screen.getAllByText("<b>pas du HTML</b>").length).toBe(2);
    expect(screen.getAllByText("H · Prochaine action").length).toBe(2);
    const link = screen.getAllByRole("link", { name: /Voir l’offre/ })[0];
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
