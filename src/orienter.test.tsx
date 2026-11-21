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
import { MissionPill } from "./MissionPill";
import { AgentActivity } from "./Career";
import { OWNER_DRAFT_EVENT, rememberOwnerText } from "./ownerMessages";
import type { Catalog, Run, RunEvent } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
  watchRun: vi.fn(() => () => {}),
}));
const real = await vi.importActual<typeof import("./api")>("./api");

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

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("envoi d'un message à l'agent (api)", () => {
  it("POST /api/runs/:id/message avec le texte, 202 → envoyé", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(json(202, { id: "m1", state: "pending" })),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(await real.sendOwnerMessage("r1", "Aussi en remote")).toEqual({
      outcome: "sent",
      id: "m1",
      state: "pending",
    });
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/runs/r1/message");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ text: "Aussi en remote" });
    expect((init.headers as Record<string, string>)["x-platform-request"]).toBe(
      "1",
    );
  });
  it("409 → repli « terminée », 404 → repli « non pris en charge », 400 → erreur", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(json(409, { error: "Mission terminée" }))),
    );
    expect(await real.sendOwnerMessage("r1", "x")).toEqual({
      outcome: "fallback",
      reason: "ended",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("Not found", { status: 404 }))),
    );
    expect(await real.sendOwnerMessage("r1", "x")).toEqual({
      outcome: "fallback",
      reason: "unsupported",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(json(400, { error: "Texte vide" }))),
    );
    await expect(real.sendOwnerMessage("r1", "x")).rejects.toThrow(
      "Texte vide",
    );
  });
});

const pill = (over = {}) => {
  const props = {
    busy: false,
    canQueue: true,
    queued: 0,
    stop: vi.fn(),
    queue: vi.fn(),
    send: vi.fn((_text: string) => Promise.resolve<string | null>(null)),
    ...over,
  };
  render(<MissionPill {...props} />);
  return {
    props,
    field: screen.getByLabelText(
      "Écrire à l’agent pendant la mission",
    ) as HTMLTextAreaElement,
  };
};

describe("pastille : envoi immédiat", () => {
  it("Entrée envoie tout de suite, le champ se vide, rien en file", async () => {
    const { props, field } = pill();
    fireEvent.change(field, { target: { value: " Aussi en remote " } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(props.send).toHaveBeenCalledWith("Aussi en remote");
    expect(props.queue).not.toHaveBeenCalled();
    await waitFor(() => expect(field.value).toBe(""));
  });
  it("le bouton « Envoyer à l’agent » est inactif pendant l'envoi ; Maj+Entrée n'envoie pas", async () => {
    let finish!: (v: string | null) => void;
    const send = vi.fn(
      () => new Promise<string | null>((resolve) => (finish = resolve)),
    );
    const { field } = pill({ send });
    fireEvent.change(field, { target: { value: "ligne" } });
    fireEvent.keyDown(field, { key: "Enter", shiftKey: true });
    expect(send).not.toHaveBeenCalled();
    const button = screen.getByRole("button", {
      name: "Envoyer à l’agent",
    }) as HTMLButtonElement;
    fireEvent.click(button);
    expect(send).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    await act(async () => finish(null));
    expect(field.value).toBe("");
  });
  it("une erreur réseau garde le texte et affiche un message court", async () => {
    const send = vi.fn(() =>
      Promise.reject(new ApiError("API locale inaccessible.", 0)),
    );
    const { field } = pill({ send });
    fireEvent.change(field, { target: { value: "Aussi en remote" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Message non envoyé",
    );
    expect(field.value).toBe("Aussi en remote");
  });
  it("une ligne explique l'attente quand l'agent attend une réponse", () => {
    pill({ waiting: true });
    expect(
      screen.getByText(
        "L’agent attend votre réponse ci-dessus ; ce message lui sera remis ensuite",
      ),
    ).toBeTruthy();
  });
});

let seq = 0;
const owner = (data: Record<string, unknown>): RunEvent => ({
  seq: ++seq,
  type: "owner_message",
  at: data.at as string,
  data: {
    id: "m1",
    at: "2026-11-14T10:00:00.000Z",
    state: "pending",
    via: null,
    deliveredAt: null,
    ...data,
  },
});
const agentText = (text: string): RunEvent => ({
  seq: ++seq,
  type: "agent",
  data: {
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text },
  },
});
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

describe("transcription : bulle « Vous, pendant la mission »", () => {
  const delivered = "2026-11-14T10:01:00.000Z";
  it("passe de pending à delivered pour chaque via, une seule bulle par id, à sa place", () => {
    const before = agentText("Je cherche.");
    const pending = owner({ text: "Aussi en remote" });
    const after = agentText("Bien reçu.");
    const { rerender } = render(
      <AgentActivity events={[before, pending, after]} running />,
    );
    expect(screen.getByText("Vous, pendant la mission")).toBeTruthy();
    expect(
      screen.getByText(
        "En attente : l’agent le recevra à la prochaine occasion",
      ),
    ).toBeTruthy();
    const items = [...document.querySelectorAll(".activity > li")].map(
      (li) => li.textContent,
    );
    expect(items[0]).toContain("Je cherche.");
    expect(items[1]).toContain("Aussi en remote");
    expect(items[2]).toContain("Bien reçu.");
    for (const [via, label] of [
      ["steering", "Remis à l’agent pendant son tour"],
      ["turn_end", "Remis à l’agent à la fin de son tour"],
      ["with_answer", "Remis à l’agent avec votre réponse"],
    ]) {
      rerender(
        <AgentActivity
          events={[
            before,
            pending,
            after,
            owner({
              state: "delivered",
              via,
              deliveredAt: delivered,
              text: "Aussi en remote",
            }),
          ]}
          running
        />,
      );
      expect(screen.getByText(`${label} · ${hhmm(delivered)}`)).toBeTruthy();
      expect(document.querySelectorAll(".owner-message")).toHaveLength(1);
      expect(screen.getAllByText("Aussi en remote")).toHaveLength(1);
    }
  });
  it("undelivered : libellé et action qui remet le texte dans le champ", () => {
    const reused = vi.fn();
    const listen = (e: Event) => reused((e as CustomEvent).detail);
    window.addEventListener(OWNER_DRAFT_EVENT, listen);
    render(
      <AgentActivity
        events={[
          owner({ text: "Aussi en remote" }),
          owner({ state: "undelivered", text: "Aussi en remote" }),
        ]}
      />,
    );
    expect(
      screen.getByText(/Non remis : la mission s’est terminée avant/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reprendre le texte" }));
    expect(reused).toHaveBeenCalledWith("Aussi en remote");
    window.removeEventListener(OWNER_DRAFT_EVENT, listen);
  });
  it("texte absent : texte gardé par l'interface, sinon libellé de remplacement", () => {
    render(
      <AgentActivity
        events={[owner({ id: "connu" }), owner({ id: "inconnu" })]}
      />,
    );
    expect(
      screen.getAllByText(
        "Message envoyé pendant la mission (texte non conservé)",
      ),
    ).toHaveLength(2);
    act(() => rememberOwnerText("connu", "Texte gardé FICTIF"));
    expect(screen.getByText("Texte gardé FICTIF")).toBeTruthy();
    expect(
      screen.getAllByText(
        "Message envoyé pendant la mission (texte non conservé)",
      ),
    ).toHaveLength(1);
  });
  it("apparaît aussi dans l'affichage d'une mission terminée", () => {
    render(
      <AgentActivity
        events={[
          owner({
            state: "delivered",
            via: "turn_end",
            deliveredAt: delivered,
            text: "Aussi en remote",
          }),
          agentText("Réponse finale"),
        ]}
        final
        answer="Réponse finale"
      />,
    );
    expect(screen.getByText("Aussi en remote")).toBeTruthy();
    expect(
      screen.getByText(/Remis à l’agent à la fin de son tour/),
    ).toBeTruthy();
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
const openApp = async (
  run: Run,
  message: (body: unknown) => Promise<unknown> = () =>
    Promise.resolve({ id: "m1", state: "pending" }),
) => {
  vi.mocked(api).mockImplementation((path, body) => {
    if (path === "/catalog") return Promise.resolve(catalog) as never;
    if (path === "/runs") return Promise.resolve([run]) as never;
    if (String(path).endsWith("/message")) return message(body) as never;
    return Promise.resolve(run) as never;
  });
  render(<App />);
  fireEvent.click(await screen.findByText("Mission fictive"));
};
const typeAndSend = async (text: string) => {
  const field = (await screen.findByLabelText(
    "Écrire à l’agent pendant la mission",
  )) as HTMLTextAreaElement;
  fireEvent.change(field, { target: { value: text } });
  fireEvent.keyDown(field, { key: "Enter" });
  return field;
};
const resumed = () =>
  vi.mocked(api).mock.calls.some(([path]) => String(path).endsWith("/resume"));

describe("orienter la mission depuis l'application", () => {
  it("202 : le message part tout de suite, sans file ni reprise, et sa bulle prend le texte envoyé", async () => {
    await openApp(running);
    const field = await typeAndSend("Aussi en remote");
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/runs/r1/message", {
        text: "Aussi en remote",
      }),
    );
    await waitFor(() => expect(field.value).toBe(""));
    expect(screen.queryByText(/en file d’attente/)).toBeNull();
    const events = vi.mocked(watchRun).mock.lastCall![1];
    // Private mission: the event has no text, the interface shows the one it sent.
    act(() =>
      events.update({
        seq: 1,
        type: "owner_message",
        data: {
          id: "m1",
          at: "2026-11-14T10:00:00.000Z",
          state: "pending",
          via: null,
          deliveredAt: null,
        },
      }),
    );
    expect(await screen.findByText("Aussi en remote")).toBeTruthy();
    expect(resumed()).toBe(false);
  });
  for (const [status, line] of [
    [
      409,
      "La mission est terminée : votre message sera envoyé dans une reprise",
    ],
    [404, /Envoi en direct indisponible sur ce serveur/],
  ] as const)
    it(`${status} : repli sur la file locale, texte conservé, ligne d'explication`, async () => {
      await openApp(running, () =>
        Promise.reject(new ApiError("refus", status)),
      );
      await typeAndSend("Aussi en remote");
      expect((await screen.findAllByText(line)).length).toBeGreaterThan(0);
      expect(screen.getByText("1 en file d’attente")).toBeTruthy();
      expect(resumed()).toBe(false);
    });
  it("409 puis fin de mission : le texte part dans la reprise", async () => {
    let current: Run = running;
    vi.mocked(api).mockImplementation((path) => {
      if (path === "/catalog") return Promise.resolve(catalog) as never;
      if (path === "/runs") return Promise.resolve([current]) as never;
      if (String(path).endsWith("/message"))
        return Promise.reject(new ApiError("Mission terminée", 409)) as never;
      if (String(path).endsWith("/resume"))
        return Promise.resolve({ ...running, id: "r2" }) as never;
      if (path === "/runs/r2")
        return Promise.resolve({ ...running, id: "r2" }) as never;
      return Promise.resolve(current) as never;
    });
    render(<App />);
    fireEvent.click(await screen.findByText("Mission fictive"));
    await typeAndSend("Aussi en remote");
    await screen.findByText("1 en file d’attente");
    current = { ...running, state: "completed", resumable: true };
    act(() => vi.mocked(watchRun).mock.lastCall![1].end?.());
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/runs/r1/resume", {
        prompt: "Aussi en remote",
        attachments: [],
      }),
    );
  });
  it("une ligne précise quand l'agent attend une réponse", async () => {
    await openApp({ ...running, state: "awaiting_owner" } as Run);
    await screen.findByLabelText("Écrire à l’agent pendant la mission");
    expect(
      screen.getByText(
        "L’agent attend votre réponse ci-dessus ; ce message lui sera remis ensuite",
      ),
    ).toBeTruthy();
  });
  it("champ masqué en état final et en workflow", async () => {
    await openApp({ ...running, state: "completed" } as Run);
    await screen.findAllByText("Mission fictive");
    expect(
      screen.queryByLabelText("Écrire à l’agent pendant la mission"),
    ).toBeNull();
    cleanup();
    await openApp({ ...running, mode: "workflow" } as Run);
    await screen.findByRole("button", { name: "Arrêter" });
    expect(
      screen.queryByLabelText("Écrire à l’agent pendant la mission"),
    ).toBeNull();
  });
  it("« Reprendre le texte » remet un message non remis dans la zone de saisie", async () => {
    vi.mocked(watchRun).mockClear();
    await openApp({ ...running, state: "completed", resumable: true } as Run);
    await waitFor(() => expect(watchRun).toHaveBeenCalled());
    const events = vi.mocked(watchRun).mock.lastCall![1];
    act(() =>
      events.update({
        seq: 1,
        type: "owner_message",
        data: {
          id: "m9",
          at: "2026-11-14T10:00:00.000Z",
          state: "undelivered",
          via: null,
          deliveredAt: null,
          text: "Texte à reprendre",
        },
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Reprendre le texte" }),
    );
    expect(
      (screen.getByLabelText("Objectif de la mission") as HTMLTextAreaElement)
        .value,
    ).toBe("Texte à reprendre");
  });
});
