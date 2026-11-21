// fichiers-21-11 : un fichier produit par l'agent s'ouvre sous sa carte ou se télécharge
// (route du back GET /api/runs/:id/file). Signalé par le propriétaire le 21/11 : « un utilisateur
// lambda ne peut pas télécharger ou voir le contenu des fichiers ». Données FICTIVES.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { RunTurn } from "./RunTurn";
import { FILES_UNSUPPORTED, runFileUrl } from "./api";
import type { Run, RunEvent } from "./types";

const root = "/Users/fictif/.relay/workspaces/w1";
const md = `${root}/relay/missions/w1/publications-relay.md`;
const pdf = `${root}/rapport.pdf`;
let seq = 0;
const edit = (path: string): RunEvent[] => {
  const id = `t${++seq}`;
  return [
    {
      seq: ++seq,
      type: "agent",
      at: "2026-11-21T09:00:00.000Z",
      data: {
        sessionUpdate: "tool_call",
        toolCallId: id,
        kind: "edit",
        title: "Write",
        status: "pending",
        locations: [{ path }],
      } as RunEvent["data"],
    },
    {
      seq: ++seq,
      type: "agent",
      at: "2026-11-21T09:00:01.000Z",
      data: {
        sessionUpdate: "tool_call_update",
        toolCallId: id,
        status: "completed",
      } as RunEvent["data"],
    },
  ];
};
const run = {
  id: "r1",
  prompt: "Mission FICTIVE",
  agent: "fixture",
  model: "",
  state: "completed",
  mode: "agent",
  pack: "core",
  simulated: true,
  createdAt: "2026-11-21T08:59:00.000Z",
  cwd: root,
  plan: { steps: [] },
  result: { simulated: true, summary: "Dossier FICTIF prêt.", evidence: [] },
  usage: { platformCents: 0, currency: "EUR", byDimension: [] },
  ledger: { ok: true },
} as unknown as Run;
const turn = () =>
  render(
    <RunTurn
      run={run}
      events={[...edit(md), ...edit(pdf)]}
      busy={false}
      act={vi.fn(async () => {})}
      requests={false}
    />,
  );
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:fictif"),
      revokeObjectURL: vi.fn(),
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("fichiers produits : ouvrir et télécharger", () => {
  it("chemin court dans le dossier de la mission ; Ouvrir seulement pour un type lisible", () => {
    turn();
    expect(
      screen.getByText("relay/missions/w1/publications-relay.md"),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Ouvrir publications-relay.md" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Télécharger publications-relay.md" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Ouvrir rapport.pdf" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Télécharger rapport.pdf" }),
    ).toBeTruthy();
  });

  it("Ouvrir lit le fichier par la route du back et l'affiche en Markdown ; Fermer le replie sans relire", async () => {
    fetchMock.mockResolvedValue(
      new Response("# Publications FICTIVES\n\nPost 1", { status: 200 }),
    );
    turn();
    fireEvent.click(
      screen.getByRole("button", { name: "Ouvrir publications-relay.md" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(runFileUrl("r1", md));
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/runs/r1/file?path=${encodeURIComponent(md)}`,
    );
    const region = await screen.findByRole("region", {
      name: "Contenu de publications-relay.md",
    });
    // Rendu Markdown : le titre sans son « # », puis le paragraphe.
    await waitFor(() => expect(region.textContent).toContain("Post 1"));
    expect(region.textContent).toContain("Publications FICTIVES");
    expect(region.textContent).not.toContain("# Publications");
    fireEvent.click(
      screen.getByRole("button", { name: "Fermer publications-relay.md" }),
    );
    expect(
      screen.queryByRole("region", {
        name: "Contenu de publications-relay.md",
      }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Ouvrir publications-relay.md" }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("back sans la route : une phrase simple, pas « Route introuvable »", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Route introuvable" }), {
        status: 404,
      }),
    );
    turn();
    fireEvent.click(
      screen.getByRole("button", { name: "Ouvrir publications-relay.md" }),
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      FILES_UNSUPPORTED,
    );
  });

  it("refus du back (hors du dossier…) : son message est affiché", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Fichier hors du dossier de la mission" }),
        { status: 403 },
      ),
    );
    turn();
    fireEvent.click(
      screen.getByRole("button", { name: "Télécharger rapport.pdf" }),
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Fichier hors du dossier de la mission",
    );
  });

  it("Télécharger demande download=1 et enregistre sous le nom du fichier", async () => {
    fetchMock.mockResolvedValue(new Response("%PDF-FICTIF", { status: 200 }));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("rapport.pdf");
        expect(this.href).toBe("blob:fictif");
      });
    turn();
    fireEvent.click(
      screen.getByRole("button", { name: "Télécharger rapport.pdf" }),
    );
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe(runFileUrl("r1", pdf, true));
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/&download=1$/);
    click.mockRestore();
  });
});
