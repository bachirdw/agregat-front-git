import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AgentActivity, mainArgument, withoutResultEnvelope } from "./Career";
import { AgentAnswer, splitSummary } from "./Bilan";
import { RunView } from "./Mission";
import type { Run, RunEvent } from "./types";
afterEach(cleanup);

// Shapes copied from a real Claude mission of the API (4313, 09/11), values FICTIVES.
let seq = 0;
const agent = (data: Record<string, unknown>, at?: string): RunEvent => ({
  seq: ++seq,
  type: "agent",
  data,
  at,
});
const meta = (toolName: string) => ({ claudeCode: { toolName } });
const call = (id: string, toolName: string, at?: string) =>
  agent(
    {
      sessionUpdate: "tool_call",
      toolCallId: id,
      title: toolName,
      kind: "other",
      status: "pending",
      content: [],
      rawInput: {},
      _meta: meta(toolName),
    },
    at,
  );
const input = (id: string, toolName: string, rawInput: unknown) =>
  agent({
    sessionUpdate: "tool_call_update",
    toolCallId: id,
    rawInput,
    _meta: meta(toolName),
  });
const done = (
  id: string,
  toolName: string,
  text: string,
  status = "completed",
  at?: string,
) =>
  agent(
    {
      sessionUpdate: "tool_call_update",
      toolCallId: id,
      status,
      content: [{ type: "content", content: { type: "text", text } }],
      rawOutput: [{ type: "text", text }],
      _meta: meta(toolName),
    },
    at,
  );
const say = (text: string) =>
  agent({
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text },
  });

const NAV = "mcp__platform__browser_navigate";
const SNAP = "mcp__platform__browser_snapshot";
const CLICK = "mcp__platform__browser_click";

describe("transcription : ligne d'outil", () => {
  it("nom court, argument principal, pastille d'état, durée ; dépliage = entrée et sortie", () => {
    const events = [
      call("n1", NAV, "2026-11-09T18:34:20.000Z"),
      input("n1", NAV, { url: "http://127.0.0.1:4321/" }),
    ];
    const { container, rerender } = render(
      <AgentActivity events={events} running />,
    );
    const line = () =>
      container.querySelector<HTMLDetailsElement>("details.tool")!;
    expect(line().querySelector("summary code")!.textContent).toBe(
      "browser_navigate",
    );
    expect(line().querySelector(".tool-summary")!.textContent).toBe(
      "http://127.0.0.1:4321/",
    );
    expect(screen.getByRole("img", { name: "en cours" })).toBeTruthy();
    rerender(
      <AgentActivity
        events={[
          ...events,
          done(
            "n1",
            NAV,
            '{"capability":"browser.navigate","title":"Page FICTIVE"}',
            "completed",
            "2026-11-09T18:34:21.500Z",
          ),
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "réussi" })).toBeTruthy();
    expect(line().querySelector(".tool-duration")!.textContent).toBe("1,5 s");
    expect(line().open).toBe(false);
    fireEvent.click(line().querySelector("summary")!);
    expect(line().open).toBe(true);
    const [params, output] = [...line().querySelectorAll("pre")].map(
      (p) => p.textContent!,
    );
    expect(JSON.parse(params)).toEqual({ url: "http://127.0.0.1:4321/" });
    // The MCP text block is shown as its (indented) text, not as the JSON of its envelope.
    expect(output).toContain('"title": "Page FICTIVE"');
    expect(output).not.toContain('"type": "text"');
  });
  it("outil natif de Claude : le nom vient de _meta, pas du titre", () => {
    const { container } = render(
      <AgentActivity
        events={[
          agent({
            sessionUpdate: "tool_call",
            toolCallId: "w1",
            title: "Write output/reponses-FICTIVES.json",
            kind: "edit",
            status: "pending",
            rawInput: { file_path: "output/reponses-FICTIVES.json" },
            _meta: meta("Write"),
          }),
        ]}
      />,
    );
    expect(container.querySelector("summary code")!.textContent).toBe("Write");
    expect(container.querySelector(".tool-summary")!.textContent).toBe(
      "output/reponses-FICTIVES.json",
    );
  });
  it("argument principal : URL, fichier, commande et ses arguments, nombre de champs", () => {
    expect(mainArgument({ ref: "e7", path: "cv-FICTIF.pdf" })).toBe(
      "cv-FICTIF.pdf",
    );
    expect(
      mainArgument({
        command: "set-status",
        args: ["--report", "5", "Applied"],
      }),
    ).toBe("set-status --report 5 Applied");
    expect(mainArgument({ fields: [{}, {}, {}] })).toBe("3 champs");
    expect(mainArgument({ ref: "e12" })).toBeUndefined();
  });
  it("échec : pastille rouge et cause visibles sans déplier", () => {
    const { container } = render(
      <AgentActivity
        events={[
          call("r1", "mcp__platform__career_read"),
          input("r1", "mcp__platform__career_read", { path: "reports/00*.md" }),
          done(
            "r1",
            "mcp__platform__career_read",
            "Motif FICTIF refusé",
            "failed",
          ),
        ]}
      />,
    );
    const line = container.querySelector("details.tool.failed")!;
    expect(screen.getByRole("img", { name: "échec" })).toBeTruthy();
    expect(line.querySelector(".tool-cause")!.textContent).toContain(
      "Motif FICTIF refusé",
    );
  });
});

describe("transcription : regroupement et ligne en cours", () => {
  it("appels consécutifs regroupés avec les noms des outils ; l'appel en cours reste visible", () => {
    const events = [
      say("Je capture la page."),
      call("a", SNAP),
      done("a", SNAP, "{}"),
      call("b", CLICK),
      input("b", CLICK, { ref: "e12" }),
      done("b", CLICK, "{}"),
      call("c", SNAP),
    ];
    const { container } = render(<AgentActivity events={events} running />);
    const group =
      container.querySelector<HTMLDetailsElement>("details.tool-group")!;
    expect(group.open).toBe(false);
    const summary = group.querySelector("summary")!.textContent!;
    expect(summary).toContain("Exécute 3 actions");
    expect(group.querySelector(".tool-group-names")!.textContent).toBe(
      "browser_snapshot ×2 · browser_click",
    );
    // Folded group: the running call is shown beneath it, with its spinner.
    const visible = container.querySelector(".tool-failures")!;
    expect(visible.querySelectorAll("details.tool")).toHaveLength(1);
    expect(visible.querySelector("details.tool")!.className).toContain(
      "pending",
    );
    expect(screen.getByRole("status").textContent).toBe("Exécution…");
  });
  it("le texte suivi d'une enveloppe JSON garde seulement le texte", () => {
    const envelope =
      '{\n  "simulated": false,\n  "summary": "Résumé FICTIF"\n}';
    expect(withoutResultEnvelope(`Voici le bilan final.\n\n${envelope}`)).toBe(
      "Voici le bilan final.",
    );
    expect(withoutResultEnvelope(envelope)).toBe("");
    render(
      <AgentActivity
        events={[say(`Voici le bilan final.\n\n${envelope}`)]}
        final
        answer="Résumé FICTIF"
      />,
    );
    expect(document.body.textContent).toContain("Voici le bilan final.");
    expect(document.body.textContent).not.toContain('"simulated"');
  });
});

// Trailer as the back writes it (orchestrator/index.js, career-ops/truth.js), values FICTIVES.
const careerSummary = [
  "## Candidature FICTIVE",
  "",
  "Formulaire rempli puis envoyé.",
  "Affirmations de l’agent : non vérifiées.",
  "Bilan",
  "- Actions réussies : career_documents, browser_navigate, browser_click.",
  "- Actions échouées : browser_upload — refusé par le site (HTTP 500).",
  "- Résultats mixtes : career_read : 11 réussis, 1 échoué (échec signalé par l’outil).",
  "- Non exécuté : envoi de courriel ; rédaction de document.",
  "- CV joint : adapté (PDF de la chaîne du Skill).",
  "Envoi par la plateforme : 1 approuvé(s) par le propriétaire.",
  "Questions : 1 posée(s), 1 répondue(s).",
  "Actions natives de l’agent (hors outils de la plateforme) : 1 écriture de fichier.",
].join("\n");

describe("réponse finale : Bilan replié", () => {
  it("la réponse de l'agent d'abord ; « Détails des actions » replié avec ses compteurs", () => {
    const { container } = render(<AgentAnswer text={careerSummary} />);
    const answer = container.querySelector(".agent-answer")!;
    expect(answer.firstElementChild!.textContent).toContain(
      "Candidature FICTIVE",
    );
    const fold = container.querySelector<HTMLDetailsElement>(
      "details.action-details",
    )!;
    expect(fold.open).toBe(false);
    expect(fold.querySelector("summary")!.textContent).toBe(
      "Détails des actions · 3 réussies · 1 échouée · 1 mixte · 2 non exécutées",
    );
    // The lists are inside the folded block only.
    const outside = [...answer.children]
      .filter((el) => el !== fold)
      .map((el) => el.textContent)
      .join("\n");
    expect(outside).not.toContain("Actions réussies");
    expect(outside).not.toContain("Actions échouées");
    expect(outside).not.toContain("Non exécuté");
    expect(outside).not.toContain("Affirmations");
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
    fireEvent.click(fold.querySelector("summary")!);
    expect(fold.open).toBe(true);
    expect(fold.textContent).toContain(
      "Actions échouées : browser_upload — refusé par le site (HTTP 500).",
    );
    expect(fold.textContent).not.toMatch(/^Bilan$/m);
  });
  it("les avertissements importants restent visibles sans dérouler", () => {
    const text = [
      "Avertissement — navigation non prouvée : aucun envoi constaté par la plateforme.",
      "Réponse FICTIVE de l'agent.",
      "Affirmations de l’agent : non vérifiées.",
      "Bilan",
      "- Actions réussies : aucune observée.",
      "- Actions échouées : aucune observée.",
      "- Résultats mixtes : aucun.",
      "- Non exécuté : aucune action demandée identifiable comme manquante.",
      "Envoi par la plateforme : aucun approuvé.",
      "Accord expiré sans réponse (300 s) : browser_click ; action non effectuée, personne ne l’a annulée.",
      "Questions : 2 posée(s), 1 répondue(s).",
      "Mission incomplète : 1 offre(s) notée(s) sans lecture de leur page.",
    ].join("\n");
    const { container } = render(<AgentAnswer text={text} />);
    const alerts = screen.getAllByRole("alert").map((a) => a.textContent);
    expect(alerts).toEqual([
      "Avertissement — navigation non prouvée : aucun envoi constaté par la plateforme.",
      "Envoi par la plateforme : aucun approuvé.",
      "Accord expiré sans réponse (300 s) : browser_click ; action non effectuée, personne ne l’a annulée.",
      "Questions : 2 posée(s), 1 répondue(s).",
      "Mission incomplète : 1 offre(s) notée(s) sans lecture de leur page.",
    ]);
    for (const alert of screen.getAllByRole("alert"))
      expect(alert.closest("details")).toBeNull();
    expect(
      container.querySelector("details.action-details summary")!.textContent,
    ).toBe("Détails des actions");
  });
  it("envoi approuvé mais sans effet : visible ; envoi approuvé simple : replié", () => {
    const sent = splitSummary(
      "Réponse.\nEnvoi par la plateforme : 1 approuvé(s) par le propriétaire.",
    );
    expect(sent.warnings).toEqual([]);
    expect(sent.details).toEqual([
      "Envoi par la plateforme : 1 approuvé(s) par le propriétaire.",
    ]);
    const failed = splitSummary(
      "Réponse.\nEnvoi par la plateforme : 1 approuvé(s) par le propriétaire, dont 1 sans effet (arrêtée avant d’agir après l’accord : rien n’a été envoyé).",
    );
    expect(failed.warnings).toHaveLength(1);
  });
  it("mission core : « Action(s) échouée(s) » compté ; les tirets de la réponse restent dans la réponse", () => {
    const split = splitSummary(
      [
        "Fait :",
        "- étape un",
        "- étape deux",
        "Affirmations de l’agent : non vérifiées.",
        "Action(s) échouée(s) : browser_fillForm — échec signalé par l’outil, 1 échoué puis réussi ; browser_click — délai",
        "Envoi par la plateforme : 1 approuvé(s) par le propriétaire.",
      ].join("\n"),
    );
    expect(split.answer).toBe("Fait :\n- étape un\n- étape deux");
    expect(split.counts.failed).toBe(2);
  });
});

const coreRun = (patch: Partial<Run> = {}) =>
  ({
    id: "00000000-0000-4000-8000-0000000000c1",
    prompt: "Mission FICTIVE",
    state: "completed",
    mode: "agent",
    agent: "claude",
    model: "",
    pack: "core",
    simulated: false,
    dataMode: "unverified",
    createdAt: "2026-11-09T18:34:07.818Z",
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
    result: {
      simulated: false,
      summary:
        "Candidature FICTIVE envoyée.\nAffirmations de l’agent : non vérifiées.\nEnvoi par la plateforme : 1 approuvé(s) par le propriétaire.",
      evidence: [],
    },
    ...patch,
  }) as unknown as Run;

describe("page d'une mission core", () => {
  it("mission finie : le fil de l'agent reste affiché hors du bloc « Exécution » replié, la synthèse replie le Bilan", () => {
    const { container } = render(
      <RunView
        run={coreRun()}
        events={[
          say("Je remplis le formulaire."),
          call("a", NAV),
          input("a", NAV, { url: "http://127.0.0.1:4321/" }),
          done("a", NAV, "{}"),
          say("Candidature FICTIVE envoyée."),
        ]}
        connection=""
        busy={false}
        act={vi.fn()}
      />,
    );
    expect(
      container
        .querySelector(".timeline-heading")!
        .getAttribute("aria-expanded"),
    ).toBe("false");
    const transcript = container.querySelector(".run-transcript")!;
    expect(transcript.textContent).toContain("Je remplis le formulaire.");
    expect(transcript.querySelector("summary code")!.textContent).toBe(
      "browser_navigate",
    );
    // The final text equal to the answer is not repeated in the thread.
    expect(transcript.textContent).not.toContain(
      "Candidature FICTIVE envoyée.",
    );
    const results = container.querySelector(".results")!;
    expect(results.querySelector(".agent-answer")!.textContent).toContain(
      "Candidature FICTIVE envoyée.",
    );
    expect(
      results.querySelector<HTMLDetailsElement>("details.action-details")!.open,
    ).toBe(false);
  });
  it("dans le fil career-ops (transcript={false}) le fil n'est pas dupliqué hors du journal", () => {
    const { container } = render(
      <RunView
        run={coreRun({ pack: "career-ops", state: "running" })}
        events={[say("Texte FICTIF.")]}
        connection=""
        busy={false}
        act={vi.fn()}
        transcript={false}
      />,
    );
    expect(container.querySelector(".run-transcript")).toBeNull();
  });
});
