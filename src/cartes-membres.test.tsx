// cartes-membres-22-11 : la carte qu'un membre de l'équipe attend se répond depuis la page de la mère (cas
// f9d6bab9 / c2827b0c du 22/11, données FICTIVES de même forme).
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityPanel } from "./ActivityPanel";
import { api } from "./api";
import { ceQuiPart } from "./MemberRequests";
import { RunTurn } from "./RunTurn";
import type { Run } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
}));

const carte = {
  id: "p-1",
  capability: "browser.send",
  actionClass: "send",
  expiresAt: null,
  tool: {
    title: "Envoi FICTIF",
    rawInput: {
      args: {
        url: "https://www.exemple.test/tr?id=FICTIF",
        method: "post",
        body: "CORPS-SECRET-FICTIF",
      },
    },
  },
  options: [
    { optionId: "allow", name: "Approuver l’envoi", kind: "allow_once" },
    { optionId: "deny", name: "Refuser", kind: "reject_once" },
  ],
};
const membre = {
  id: "m-1",
  prompt: "Sous-mission FICTIVE",
  agent: "claude",
  model: "",
  state: "waiting_permission",
  mode: "agent",
  pack: "core",
  createdAt: "2026-11-22T04:30:00.000Z",
  plan: { steps: [] },
  permissions: [carte],
} as unknown as Run;
const mere = (family: unknown[]) =>
  ({
    id: "mere",
    prompt: "Mission FICTIVE en équipe",
    agent: "claude",
    model: "",
    state: "running",
    mode: "agent",
    pack: "core",
    createdAt: "2026-11-22T04:20:00.000Z",
    plan: { steps: [] },
    pendingPermission: null,
    family,
  }) as unknown as Run;
const enAttente = {
  id: "m-1",
  titre: "Recherche agences FICTIVE",
  state: "waiting_permission",
  attend: "carte_envoi",
  pendingPermission: {
    id: "p-1",
    capability: "browser.send",
    actionClass: "send",
  },
  etape: { numero: 1, libelle: "Recherche agences" },
};
const fini = {
  id: "m-2",
  titre: "Recherche SEEK FICTIVE",
  state: "completed",
  attend: null,
  etape: { numero: 1, libelle: "Recherche SEEK" },
};

beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(api).mockImplementation(((path: string) =>
    path === "/runs/m-1"
      ? Promise.resolve(membre)
      : Promise.reject(new Error("inattendu " + path))) as never);
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(cleanup);

describe("carte d'un membre sur la page de la mère", () => {
  it("les deux boutons du serveur sont à l'écran, et le clic envoie le bon POST", async () => {
    const act = vi.fn(async () => {});
    render(
      <RunTurn
        run={mere([fini, enAttente])}
        events={[]}
        busy={false}
        act={act}
      />,
    );
    const zone = await screen.findByRole("region", {
      name: "Sous-missions qui attendent ta réponse",
    });
    expect(zone.textContent).toContain(
      "Recherche agences attend ton accord : envoi POST vers www.exemple.test",
    );
    const approuver = await within(zone).findByRole("button", {
      name: "Approuver l’envoi",
    });
    expect(within(zone).getByRole("button", { name: "Refuser" })).toBeTruthy();
    fireEvent.click(approuver);
    expect(act).toHaveBeenCalledWith("/permissions/p-1", { optionId: "allow" });
    expect(api).toHaveBeenCalledWith("/runs/m-1");
  });
  it("le résumé ne montre jamais le corps de l'envoi", () => {
    expect(ceQuiPart(membre)).toBe("POST vers www.exemple.test");
    expect(ceQuiPart(membre)).not.toContain("SECRET");
  });
  it("aucun membre en attente : rien n'est ajouté ni lu", () => {
    const { container } = render(
      <RunTurn
        run={mere([fini])}
        events={[]}
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
    expect(container.querySelector(".membres-attente")).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });
  it("une carte illisible propose d'ouvrir la sous-mission", async () => {
    vi.mocked(api).mockImplementation((() =>
      Promise.reject(new Error("réseau FICTIF"))) as never);
    const open = vi.fn();
    render(
      <RunTurn
        run={mere([enAttente])}
        events={[]}
        busy={false}
        act={vi.fn(async () => {})}
        onOpenMember={open}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Ouvrir la sous-mission" }),
    );
    expect(open).toHaveBeenCalledWith("m-1");
  });
  it("panneau Activité : la même carte, avec ses boutons", async () => {
    const act = vi.fn(async () => {});
    render(
      <ActivityPanel
        catalog={null}
        run={mere([enAttente])}
        events={[]}
        onClose={() => {}}
        act={act}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Refuser" })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    expect(act).toHaveBeenCalledWith("/permissions/p-1", { optionId: "deny" });
  });
});
