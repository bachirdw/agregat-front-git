// review-orienter-14-11 : le front joué sur les réponses et les événements que le back produit
// réellement (src/ownerMessages.back.fixture.ts, capturés sur agregat-back-orienter).
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
import { api, ApiError, watchRun } from "./api";
import { AgentActivity } from "./Career";
import { backOwnerMessages as back } from "./ownerMessages.back.fixture";
import type { Catalog, Run, RunEvent } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
  watchRun: vi.fn(() => () => {}),
}));
const real = await vi.importActual<typeof import("./api")>("./api");

beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(watchRun).mockClear();
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

const events = (list: readonly unknown[]) => list as unknown as RunEvent[];
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
const reply = (r: { status: number; body: unknown }) =>
  new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: { "content-type": "application/json" },
  });

describe("réponses réelles du back à POST /message", () => {
  it("202 (pending et delivered), 400, 404 et 409 tels que le back les écrit", async () => {
    const [empty, long, unknown, accepted, late] =
      back.turn_end_private.responses;
    const steered = back.steering.responses[0];
    const send = async (r: { status: number; body: unknown }) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(reply(r))),
      );
      return real.sendOwnerMessage("r1", "x");
    };
    expect(await send(accepted)).toEqual({
      outcome: "sent",
      id: accepted.body.id,
      state: "pending",
    });
    expect(await send(steered)).toEqual({
      outcome: "sent",
      id: steered.body.id,
      state: "delivered",
    });
    expect(await send(late)).toEqual({ outcome: "fallback", reason: "ended" });
    expect(await send(unknown)).toEqual({
      outcome: "fallback",
      reason: "unsupported",
    });
    await expect(send(empty)).rejects.toMatchObject({
      status: 400,
      message: "Message vide",
    });
    await expect(send(long)).rejects.toMatchObject({
      status: 400,
      message: "Message trop long (8000 caractères au plus)",
    });
  });
});

describe("événements réels du back dans le fil", () => {
  it.each([
    ["steering", "Remis à l’agent pendant son tour"],
    ["with_answer", "Remis à l’agent avec votre réponse"],
    ["turn_end_private", "Remis à l’agent à la fin de son tour"],
  ] as const)("%s : une bulle, état final dit", (name, label) => {
    const list = back[name].events;
    render(<AgentActivity events={events(list)} running />);
    expect(document.querySelectorAll(".owner-message")).toHaveLength(1);
    const last = list.at(-1)!.data;
    expect(
      screen.getByText(`${label} · ${hhmm(last.deliveredAt!)}`),
    ).toBeTruthy();
  });
  it("non remis : libellé et texte", () => {
    render(<AgentActivity events={events(back.undelivered.events)} />);
    expect(screen.getByText("Jamais remis FICTIF.")).toBeTruthy();
    expect(
      screen.getByText(/Non remis : la mission s’est terminée avant/),
    ).toBeTruthy();
  });
  it("relecture d'une mission terminée : tout l'historique d'un coup, depuis le début", () => {
    const history = events([
      ...back.with_answer.events,
      {
        seq: 50,
        type: "agent",
        data: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "Entre deux FICTIF." },
        },
      },
      ...back.undelivered.events,
    ]);
    render(<AgentActivity events={history} />);
    const bubbles = [...document.querySelectorAll(".owner-message")];
    expect(bubbles).toHaveLength(2);
    expect(bubbles[0].textContent).toContain("Plutôt demain FICTIF.");
    expect(bubbles[0].textContent).toContain("avec votre réponse");
    expect(bubbles[1].textContent).toContain("Jamais remis FICTIF.");
    expect(bubbles[1].textContent).toContain("Non remis");
  });
});

const catalog: Catalog = {
  live: false,
  agents: [],
  packs: [],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
};
const running = {
  id: "r1",
  prompt: "Mission fictive",
  state: "running",
  mode: "agent",
  agent: "fixture",
  pack: "core",
  plan: {},
} as unknown as Run;

describe("POST et SSE qui se croisent (le back attend jusqu'à 1,5 s un steering)", () => {
  const open = async (message: () => Promise<unknown>) => {
    vi.mocked(api).mockImplementation((path) => {
      if (path === "/catalog") return Promise.resolve(catalog) as never;
      if (path === "/runs?vue=liste")
        return Promise.resolve([running]) as never;
      if (String(path).endsWith("/message")) return message() as never;
      return Promise.resolve(running) as never;
    });
    render(<App />);
    fireEvent.click(await screen.findByText("Mission fictive"));
    const field = (await screen.findByLabelText(
      "Écrire à l’agent pendant la mission",
    )) as HTMLTextAreaElement;
    return field;
  };
  it("mission privée : les événements arrivent avant la réponse 202 ; la bulle prend le texte ensuite, une seule fois", async () => {
    let answer!: (value: unknown) => void;
    const field = await open(
      () => new Promise((resolve) => (answer = resolve)),
    );
    const text = "Ajoute le salaire FICTIF.";
    fireEvent.change(field, { target: { value: text } });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/runs/r1/message", { text }),
    );
    const sse = vi.mocked(watchRun).mock.lastCall![1];
    const [pending, delivered] = back.turn_end_private.events;
    act(() => sse.update(events([pending])[0]));
    expect(
      screen.getByText(
        "Message envoyé pendant la mission (texte non conservé)",
      ),
    ).toBeTruthy();
    await act(async () => answer(back.turn_end_private.responses[3].body));
    expect(await screen.findByText(text)).toBeTruthy();
    act(() => sse.update(events([delivered])[0]));
    expect(document.querySelectorAll(".owner-message")).toHaveLength(1);
    expect(
      screen.getByText(/Remis à l’agent à la fin de son tour/),
    ).toBeTruthy();
    expect(screen.queryByText(/en file d’attente/)).toBeNull();
    expect(field.value).toBe("");
  });
  it("steering : 202 « delivered » après les deux événements ; l'état reste celui des événements", async () => {
    let answer!: (value: unknown) => void;
    const field = await open(
      () => new Promise((resolve) => (answer = resolve)),
    );
    fireEvent.change(field, {
      target: { value: "Concentre-toi sur la ville FICTIVE." },
    });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(api).toHaveBeenCalled());
    const sse = vi.mocked(watchRun).mock.lastCall![1];
    for (const e of events(back.steering.events)) act(() => sse.update(e));
    await act(async () => answer(back.steering.responses[0].body));
    expect(document.querySelectorAll(".owner-message")).toHaveLength(1);
    expect(screen.getByText(/Remis à l’agent pendant son tour/)).toBeTruthy();
  });
  it("400 du back (texte trop long) : message d'erreur du back, texte gardé, rien en file", async () => {
    const field = await open(() =>
      Promise.reject(
        new ApiError(
          back.turn_end_private.responses[1].body.error,
          back.turn_end_private.responses[1].status,
        ),
      ),
    );
    fireEvent.change(field, { target: { value: "Texte FICTIF" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(
      await screen.findByText(
        "Message non envoyé : Message trop long (8000 caractères au plus)",
      ),
    ).toBeTruthy();
    expect(field.value).toBe("Texte FICTIF");
    expect(screen.queryByText(/en file d’attente/)).toBeNull();
  });
});
