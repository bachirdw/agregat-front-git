// joindre-23-11 : joindre un fichier à une réponse ou à un message pendant la mission (contrat joindre-01
// du back), et le dire quand un serveur plus ancien ne l'a pas transmis (données FICTIVES).
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
import { MissionPill } from "./MissionPill";
import { OwnerRequests } from "./OwnerRequests";
import { activity, OwnerBubble } from "./Career";
import type { Owner } from "./Career";
import { api, sendOwnerMessage, watchRun } from "./api";
import type { Catalog, Run, RunEvent } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
  watchRun: vi.fn(() => () => {}),
}));
const fichier = {
  id: "f1",
  name: "cv-fictif.pdf",
  size: 10,
  type: "application/pdf",
};
const serveFiles = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(fichier), { status: 201 })),
  );
const pick = (name = "cv-fictif.pdf") => {
  const input = screen.getByLabelText(
    "Fichier à joindre pendant la mission",
  ) as HTMLInputElement;
  const file = new File(["%PDF FICTIF"], name, { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
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
  window.location.hash = "";
});

const pill = (props: Partial<Parameters<typeof MissionPill>[0]> = {}) =>
  render(
    <MissionPill
      busy={false}
      canQueue
      queued={0}
      stop={() => {}}
      queue={() => {}}
      {...props}
    />,
  );

describe("champ de chat : « + »", () => {
  it("le fichier part par /api/files, s'affiche, puis accompagne le message", async () => {
    serveFiles();
    const send = vi.fn(async () => null);
    pill({ send });
    pick();
    expect(await screen.findByText("cv-fictif.pdf")).toBeTruthy();
    fireEvent.change(
      screen.getByLabelText("Écrire à l’agent pendant la mission"),
      {
        target: { value: "Voici mon CV" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Envoyer à l’agent" }));
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith("Voici mon CV", [fichier]),
    );
    await waitFor(() => expect(screen.queryByText("cv-fictif.pdf")).toBeNull());
  });
  it("un fichier seul répond à la question avec son nom pour texte", async () => {
    serveFiles();
    const answer = vi.fn(async () => {});
    pill({ answer, send: vi.fn() });
    pick();
    await screen.findByText("cv-fictif.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la réponse" }));
    await waitFor(() =>
      expect(answer).toHaveBeenCalledWith("Fichier joint : cv-fictif.pdf", [
        fichier,
      ]),
    );
  });
  it("un fichier se retire avant l'envoi", async () => {
    serveFiles();
    pill({ send: vi.fn() });
    pick();
    fireEvent.click(
      await screen.findByRole("button", { name: "Retirer cv-fictif.pdf" }),
    );
    expect(screen.queryByText("cv-fictif.pdf")).toBeNull();
  });
  it("un type refusé est dit, rien n'est joint", async () => {
    serveFiles();
    pill({ send: vi.fn() });
    pick("photo.png");
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /^Fichier non joint : Type refusé/,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("contrat joindre-01", () => {
  it("le message ne porte `attachments` que s'il y a un fichier", async () => {
    const request = vi.fn(async (_path: string, _body?: unknown) => ({
      id: "m1",
      state: "pending",
    }));
    await sendOwnerMessage("r1", "texte", request as never);
    await sendOwnerMessage("r1", "texte", request as never, ["f1"]);
    expect(request.mock.calls[0][1]).toEqual({ text: "texte" });
    expect(request.mock.calls[1][1]).toEqual({
      text: "texte",
      attachments: ["f1"],
    });
  });
  it("les bulles montrent les fichiers des événements", () => {
    const items = activity(
      [
        {
          seq: 1,
          type: "owner_message",
          at: "2026-11-23T18:00:00.000Z",
          data: {
            id: "m1",
            text: "Voici",
            state: "pending",
            attachments: [{ id: "f1", name: "cv-fictif.pdf" }],
          },
        },
        {
          seq: 2,
          type: "answer",
          at: "2026-11-23T18:01:00.000Z",
          data: {
            id: "q1",
            action: "accept",
            content: { reponse: "ok" },
            attachments: [{ id: "f2", name: "lettre.md" }],
          },
        },
      ] as RunEvent[],
      { exchanges: true },
    );
    const owner = items.find((i) => i.kind === "owner") as Owner;
    expect(owner.files).toEqual([{ id: "f1", name: "cv-fictif.pdf" }]);
    expect(items.find((i) => i.kind === "answer")).toMatchObject({
      files: [{ id: "f2", name: "lettre.md" }],
    });
    render(<OwnerBubble message={owner} />);
    expect(
      screen.getByText("cv-fictif.pdf").closest(".bubble-files"),
    ).toBeTruthy();
  });
});

describe("serveur sans pièce jointe pendant la mission", () => {
  const catalog: Catalog = {
    live: false,
    agents: [],
    packs: [],
    skills: [],
    meters: {},
    pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
  };
  const run = {
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
  const open = async () => {
    serveFiles();
    vi.mocked(api).mockImplementation((path) => {
      if (path === "/catalog") return Promise.resolve(catalog) as never;
      if (path === "/runs?vue=liste") return Promise.resolve([run]) as never;
      if (path === "/runs/r1/message")
        return Promise.resolve({ id: "m1", state: "pending" }) as never;
      return Promise.resolve(run) as never;
    });
    window.location.hash = "#mission/r1";
    render(<App />);
    await waitFor(() => expect(watchRun).toHaveBeenCalled());
    const { update } = vi.mocked(watchRun).mock.calls.at(-1)![1];
    pick();
    await screen.findByText("cv-fictif.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Envoyer à l’agent" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/runs/r1/message", {
        text: "Fichier joint : cv-fictif.pdf",
        attachments: ["f1"],
      }),
    );
    return (attachments?: unknown) =>
      act(() =>
        update({
          seq: 9,
          runId: "r1",
          type: "owner_message",
          at: "2026-11-23T18:00:00.000Z",
          data: {
            id: "m1",
            text: "Fichier joint : cv-fictif.pdf",
            state: "pending",
            ...(attachments ? { attachments } : {}),
          },
        } as RunEvent),
      );
  };
  it("un serveur qui ne renvoie pas le fichier : c'est dit", async () => {
    const echo = await open();
    echo();
    expect(await screen.findByText(/^Fichier non transmis/)).toBeTruthy();
  });
  it("un serveur qui le renvoie : rien à dire", async () => {
    const echo = await open();
    echo([{ id: "f1", name: "cv-fictif.pdf" }]);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/^Fichier non transmis/)).toBeNull();
  });
});

describe("carte de question : « Joindre un fichier »", () => {
  const question = (kind: "prose" | "form") => ({
    id: "q1",
    kind,
    message: "Transmets-moi ton CV FICTIF",
    requestedSchema: {
      type: "object" as const,
      properties:
        kind === "prose"
          ? { reponse: { type: "string" as const, title: "Réponse" } }
          : { ecole: { type: "string" as const, title: "École" } },
      required: [kind === "prose" ? "reponse" : "ecole"],
    },
    toolCallId: null,
    askedAt: "2026-11-23T18:00:00.000Z",
  });
  const card = (kind: "prose" | "form") => {
    const act = vi.fn(async () => {});
    render(
      <OwnerRequests
        run={
          {
            id: "r1",
            state: "awaiting_owner",
            pendingQuestion: question(kind),
          } as unknown as Run
        }
        busy={false}
        act={act}
      />,
    );
    return act;
  };
  const pickForm = () => {
    const input = screen.getByLabelText(
      "Fichier à joindre à la réponse",
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          new File(["%PDF"], "cv-fictif.pdf", { type: "application/pdf" }),
        ],
      },
    });
  };
  it("question libre : le fichier seul répond, avec son nom pour texte", async () => {
    serveFiles();
    const act = card("prose");
    pickForm();
    await screen.findByText("cv-fictif.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Répondre" }));
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        "/runs/r1/answer",
        {
          action: "accept",
          content: { reponse: "Fichier joint : cv-fictif.pdf" },
          attachments: ["f1"],
        },
        true,
      ),
    );
  });
  it("formulaire : les champs et le fichier partent ensemble", async () => {
    serveFiles();
    const act = card("form");
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "École FICTIVE" },
    });
    pickForm();
    await screen.findByText("cv-fictif.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Répondre" }));
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        "/runs/r1/answer",
        {
          action: "accept",
          content: { ecole: "École FICTIVE" },
          attachments: ["f1"],
        },
        true,
      ),
    );
  });
  it("décliner n'envoie aucun fichier", async () => {
    serveFiles();
    const act = card("prose");
    pickForm();
    await screen.findByText("cv-fictif.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Décliner" }));
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        "/runs/r1/answer",
        { action: "decline" },
        true,
      ),
    );
  });
  it("sans fichier, la réponse reste celle d'avant", async () => {
    const act = card("prose");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Oui" } });
    fireEvent.click(screen.getByRole("button", { name: "Répondre" }));
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        "/runs/r1/answer",
        { action: "accept", content: { reponse: "Oui" } },
        true,
      ),
    );
  });
});
