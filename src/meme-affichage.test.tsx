// meme-affichage-21-11 : une mission s'affiche toujours de la même façon, career-ops compris, et un
// même message n'apparaît qu'une fois (données FICTIVES).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import App from "./App";
import { api, watchRun } from "./api";
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
const career = {
  id: "11111111-1111-4111-8111-111111111111",
  prompt: "Mission privée dans l’espace de candidature",
  state: "running",
  mode: "agent",
  agent: "codex",
  pack: "career-ops",
  workspace: "career-ops",
  skills: ["career-ops"],
  model: "",
  simulated: true,
  createdAt: "2026-11-21T11:59:00.000Z",
  plan: { steps: [] },
} as unknown as Run;
const at = "2026-11-21T11:59:10.000Z";
const agentText = (seq: number, text: string): RunEvent =>
  ({
    seq,
    runId: career.id,
    type: "agent",
    at,
    data: {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text },
    },
  }) as unknown as RunEvent;
let feed: RunEvent[] = [];
const serve = (runs: Run[], extra: Record<string, unknown> = {}) =>
  vi.mocked(api).mockImplementation((path) => {
    const p = String(path).split("?")[0];
    if (p in extra) return Promise.resolve(extra[p]) as never;
    if (p === "/catalog") return Promise.resolve(catalog) as never;
    if (p === "/runs") return Promise.resolve(runs) as never;
    const found = runs.find((r) => p === "/runs/" + r.id);
    if (found) return Promise.resolve(found) as never;
    return Promise.resolve({ ok: true }) as never;
  });
beforeEach(() => {
  vi.mocked(api).mockReset();
  feed = [];
  vi.mocked(watchRun).mockImplementation((_id, handlers) => {
    const h = handlers as { update: (e: RunEvent) => void };
    queueMicrotask(() => feed.forEach((e) => h.update(e)));
    return () => {};
  });
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

describe("career-ops s'affiche comme les autres missions", () => {
  it("en cours : la consigne privée dans la bulle, la réponse de l'agent une seule fois, pas d'ancienne vue", async () => {
    feed = [agentText(1, "J’active le skill career-ops (FICTIF).")];
    serve([career], {
      [`/career/runs/${career.id}/input`]: {
        prompt: "Trouve des postes ingénieur FICTIFS",
      },
    });
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByText("Mission privée dans l’espace de candidature"),
    );
    // La consigne réelle, lue par la route privée.
    await screen.findByText("Trouve des postes ingénieur FICTIFS", {
      selector: ".prompt-bubble-text",
    });
    await waitFor(() =>
      expect(
        screen.getAllByText("J’active le skill career-ops (FICTIF)."),
      ).toHaveLength(1),
    );
    // Même réponse que les autres missions ; plus de fil career-ops ni de détails techniques.
    expect(container.querySelector(".thread .reponse")).toBeTruthy();
    expect(container.querySelector(".career-thread")).toBeNull();
    expect(
      screen.queryByText("Détails techniques (coût, journal brut)"),
    ).toBeNull();
    expect(container.querySelector(".tech-details")).toBeNull();
  });
  it("terminée : le résultat privé dans la réponse, les offres enregistrées, la ligne méta une fois", async () => {
    const done = {
      ...career,
      state: "completed",
      result: { simulated: true, summary: "" },
    } as unknown as Run;
    serve([done], {
      [`/career/runs/${career.id}/input`]: { prompt: "Consigne FICTIVE" },
      [`/career/runs/${career.id}/result`]: {
        summary: "Trois postes FICTIFS retenus.",
      },
      "/career/offers": {
        opportunities: [
          {
            id: "o1",
            title: "Ingénieur FICTIF",
            company: "Société FICTIVE",
            source: "SEEK",
            url: "https://example.com/offre",
            score: 4,
          },
        ],
      },
    });
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByText("Mission privée dans l’espace de candidature"),
    );
    await screen.findByText("Consigne FICTIVE", {
      selector: ".prompt-bubble-text",
    });
    const reponse = await waitFor(() => {
      const el = container.querySelector<HTMLElement>(".thread .reponse");
      expect(el).toBeTruthy();
      return el!;
    });
    await within(reponse).findByText("Trois postes FICTIFS retenus.");
    await within(reponse).findByText(/Toutes vos offres enregistrées · 1/);
    expect(
      container.querySelectorAll(".meta-line, .ligne-meta").length,
    ).toBeLessThanOrEqual(1);
    expect(container.querySelector(".career-thread")).toBeNull();
  });
});

describe("un même message n'apparaît qu'une fois", () => {
  const hi = {
    ...career,
    id: "22222222-2222-4222-8222-222222222222",
    prompt: "hi",
    pack: "core",
    workspace: undefined,
    skills: [],
    state: "completed",
    result: { simulated: true, summary: "J’ai ouvert la page (FICTIF)." },
  } as unknown as Run;
  const question = {
    seq: 2,
    runId: hi.id,
    type: "question",
    at,
    data: {
      id: "q1",
      kind: "prose",
      message: "Que souhaitez-vous faire (FICTIF) ?",
      requestedSchema: {
        type: "object",
        properties: { reponse: { type: "string", title: "Réponse" } },
        required: ["reponse"],
      },
    },
  } as unknown as RunEvent;
  const owner = (seq: number, state: string, via: string | null) =>
    ({
      seq,
      runId: hi.id,
      type: "owner_message",
      at,
      data: {
        id: "m1",
        at,
        state,
        via,
        deliveredAt: state === "delivered" ? at : null,
        text: "cherche Karim FICTIF",
      },
    }) as unknown as RunEvent;
  const answer = {
    seq: 4,
    runId: hi.id,
    type: "answer",
    at,
    data: {
      id: "q1",
      action: "accept",
      content: { reponse: "cherche Karim FICTIF" },
    },
  } as unknown as RunEvent;
  it("message joint à la réponse avec le même texte : une seule bulle", async () => {
    feed = [
      agentText(1, "La tâche reste à préciser."),
      question,
      owner(3, "pending", null),
      answer,
      owner(5, "delivered", "with_answer"),
    ];
    serve([hi]);
    render(<App />);
    fireEvent.click(await screen.findByText("hi"));
    await screen.findByText("Vous, en réponse");
    expect(screen.getAllByText("cherche Karim FICTIF")).toHaveLength(1);
    expect(screen.queryByText("Vous, pendant la mission")).toBeNull();
  });
  it("question ouverte à texte libre : le champ du bas y répond directement", async () => {
    const waiting = {
      ...hi,
      state: "awaiting_owner",
      result: undefined,
      pendingQuestion: question.data,
    } as unknown as Run;
    feed = [agentText(1, "La tâche reste à préciser."), question];
    serve([waiting]);
    render(<App />);
    fireEvent.click(await screen.findByText("hi"));
    const field = await screen.findByRole("textbox", {
      name: "Répondre à la question de l’agent",
    });
    fireEvent.change(field, { target: { value: "cherche Karim FICTIF" } });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Envoyer la réponse" }),
      );
    });
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(`/runs/${hi.id}/answer`, {
        action: "accept",
        content: { reponse: "cherche Karim FICTIF" },
      }),
    );
    expect(api).not.toHaveBeenCalledWith(
      `/runs/${hi.id}/message`,
      expect.anything(),
    );
  });
});
