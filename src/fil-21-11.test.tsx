// fil-21-11 : la discussion garde tout, dans l'ordre (texte de l'agent, questions, réponses du
// propriétaire, messages pendant la mission). Signalé par le propriétaire le 21/11 : « plus on avance
// dans une discussion, plus les messages en haut se suppriment ». Données FICTIVES.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RunTurn, answerText } from "./RunTurn";
import { activity, type AskedQuestion, type OwnerAnswer } from "./Career";
import type { Run, RunEvent } from "./types";

afterEach(cleanup);

const at = (s: number) =>
  new Date(Date.parse("2026-11-21T09:00:00.000Z") + s * 1000).toISOString();
let seq = 0;
const ev = (type: string, data: object): RunEvent => ({
  seq: ++seq,
  type,
  data: data as RunEvent["data"],
  at: at(seq),
});
const say = (text: string) =>
  ev("agent", {
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text },
  });
const state = (value: string) => ev("state", { state: value });
const prose = (id: string, message: string) =>
  ev("question", {
    id,
    kind: "prose",
    message,
    options: [],
    requestedSchema: {
      type: "object",
      properties: { reponse: { type: "string", title: "Réponse" } },
      required: ["reponse"],
    },
    toolCallId: null,
  });
const form = (id: string, message: string) =>
  ev("question", {
    id,
    kind: "form",
    message,
    requestedSchema: {
      type: "object",
      properties: {
        question_0: {
          type: "array",
          title: "Suite",
          items: {
            anyOf: [
              { const: "visuel", title: "Un visuel/maquette" },
              { const: "planning", title: "Planning de diffusion" },
            ],
          },
        },
      },
    },
    toolCallId: "t9",
  });
const answer = (id: string, content: object, action = "accept") =>
  ev("answer", { id, action, content });

const run = (over: Partial<Run> = {}) =>
  ({
    id: "r1",
    prompt: "Mission FICTIVE",
    agent: "fixture",
    model: "",
    state: "completed",
    mode: "agent",
    pack: "core",
    simulated: true,
    createdAt: at(0),
    plan: { steps: [] },
    result: {
      simulated: true,
      summary: "Planning FICTIF final prêt.",
      evidence: [],
    },
    usage: { platformCents: 0, currency: "EUR", byDimension: [] },
    ledger: { ok: true },
    ...over,
  }) as unknown as Run;
const turn = (r: Run, events: RunEvent[]) =>
  render(
    <RunTurn
      run={r}
      events={events}
      busy={false}
      act={vi.fn(async () => {})}
      requests={false}
    />,
  );

describe("fil : rien ne disparaît en haut de la discussion", () => {
  const events = [
    state("running"),
    say("Je vais d’abord noter le contexte FICTIF au carnet."),
    say(" Puis je lance les recherches."),
    say("Dossier FICTIF prêt. Dis-moi si tu veux un planning ?"),
    state("awaiting_owner"),
    prose("q1", "Dis-moi si tu veux un planning ?"),
    answer("q1", { reponse: "oui fais " }),
    state("running"),
    form("q2", "Que veux-tu ensuite ?"),
    answer("q2", { question_0: ["visuel"] }),
    say("Planning FICTIF final prêt."),
    state("completed"),
  ];

  it("mission terminée : le texte des tours d'avant reste, seule la réponse finale remplace le dernier", () => {
    const { container } = turn(run(), events);
    expect(
      screen.getByText(/Je vais d’abord noter le contexte FICTIF/),
    ).toBeTruthy();
    expect(screen.getByText(/Dossier FICTIF prêt/)).toBeTruthy();
    // La réponse finale une seule fois (le dernier bloc de texte n'est pas répété).
    expect(
      container.textContent!.split("Planning FICTIF final prêt.").length,
    ).toBe(2);
  });

  it("question répondue : la réponse du propriétaire reste, en clair, dans l'ordre", () => {
    const { container } = turn(run(), events);
    const answers = [...container.querySelectorAll(".answer-message")].map(
      (node) => node.textContent,
    );
    expect(answers).toEqual([
      "Vous, en réponseoui fais",
      "Vous, en réponseUn visuel/maquette",
    ]);
    const text = container.textContent!;
    expect(text.indexOf("Dossier FICTIF prêt")).toBeLessThan(
      text.indexOf("oui fais"),
    );
    expect(text.indexOf("oui fais")).toBeLessThan(
      text.indexOf("Que veux-tu ensuite ?"),
    );
    expect(text.indexOf("Que veux-tu ensuite ?")).toBeLessThan(
      text.indexOf("Un visuel/maquette"),
    );
  });

  it("question déjà écrite à la fin du texte de l'agent : pas de doublon ; sinon elle est dite « Question de l’agent »", () => {
    const { container } = turn(run(), events);
    expect(
      container.textContent!.split("Dis-moi si tu veux un planning ?").length,
    ).toBe(2);
    const asked = container.querySelectorAll(".reponse-question");
    expect(asked.length).toBe(1);
    expect(asked[0].textContent).toContain("Question de l’agent");
    expect(asked[0].textContent).toContain("Que veux-tu ensuite ?");
  });

  it("mission en cours : la question ouverte n'est pas répétée (son formulaire la montre)", () => {
    const open = [
      state("running"),
      say("Résultats FICTIFS rassemblés."),
      state("awaiting_owner"),
      form("q3", "Quel format préfères-tu ?"),
    ];
    turn(run({ state: "awaiting_owner", result: undefined }), open);
    expect(screen.queryByText("Quel format préfères-tu ?")).toBeNull();
    expect(screen.getByText("Résultats FICTIFS rassemblés.")).toBeTruthy();
  });

  it("deux tours de suite ne sont plus collés dans la même phrase", () => {
    const { container } = turn(run({ state: "running", result: undefined }), [
      state("running"),
      say("Bon lancement 🚀"),
      ev("verdict_turn", { verdict: "a_corriger" }),
      say("Le système me signale un verdict FICTIF."),
    ]);
    expect(container.textContent).not.toContain("🚀Le système");
    const paragraphs = [...container.querySelectorAll(".reponse-texte p")].map(
      (p) => p.textContent,
    );
    expect(paragraphs).toEqual([
      "Bon lancement 🚀",
      "Le système me signale un verdict FICTIF.",
    ]);
  });
});

describe("activity : questions et réponses sur demande seulement", () => {
  const events = [
    say("Avant."),
    prose("q1", "Question FICTIVE ?"),
    answer("q1", { reponse: "oui" }),
    say("Après."),
  ];
  it("sans l'option, aucun élément question ni réponse (fil career-ops inchangé), mais le texte est coupé", () => {
    const items = activity(events);
    expect(items.map((i) => i.kind)).toEqual(["text", "text"]);
  });
  it("avec l'option, dans l'ordre, une seule fois même si l'événement revient", () => {
    const items = activity([...events, answer("q1", { reponse: "oui" })], {
      exchanges: true,
    });
    expect(items.map((i) => i.kind)).toEqual([
      "text",
      "question",
      "answer",
      "text",
    ]);
  });
});

describe("answerText", () => {
  const q = {
    kind: "question",
    id: "question-q",
    questionId: "q",
    message: "?",
    schema: {
      properties: {
        ville: { title: "Ville", oneOf: [{ const: "par", title: "Paris" }] },
        remote: { title: "Télétravail" },
      },
    },
  } as AskedQuestion;
  const a = (action: string, content?: object) =>
    ({
      kind: "answer",
      id: "answer-q",
      questionId: "q",
      action,
      content,
    }) as OwnerAnswer;
  it("plusieurs champs : titre et valeur lisible ; un booléen dit Oui ou Non", () => {
    expect(answerText(a("accept", { ville: "par", remote: true }), q)).toBe(
      "Ville : Paris\nTélétravail : Oui",
    );
  });
  it("refus, expiration, annulation et réponse vide sont dits", () => {
    expect(answerText(a("decline"), q)).toBe("Question déclinée");
    expect(answerText(a("expired"), q)).toBe(
      "Question restée sans réponse (délai dépassé)",
    );
    expect(answerText(a("cancel"), q)).toBe("Question annulée");
    expect(answerText(a("accept", {}), q)).toBe("Réponse envoyée");
  });
});
