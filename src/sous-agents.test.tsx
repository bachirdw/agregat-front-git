// sous-agents-19-11 : le front suit le contrat du back (agregat-back docs/api-delegation.md,
// branche contacts-13-11) : `family` et `activity` de GET /api/runs/:id, événements `delegation_*`,
// `child_*`, `family_waiting`, champ `delegation` de POST /api/runs. Données FICTIVES.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { ActivityPanel, SubagentsLine } from "./ActivityPanel";
import { activityRows } from "./ConnectionsPanel";
import type { Catalog, FamilyMember, Run, RunEvent } from "./types";

afterEach(cleanup);

const catalog = {
  live: false,
  agents: [{ id: "codex", name: "Codex", installed: true, compatible: true }],
  packs: [],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
} as unknown as Catalog;
const at = (s: number) =>
  new Date(Date.parse("2026-11-19T01:00:00.000Z") + s * 1000).toISOString();
const ev = (seq: number, type: string, data: object, s = 0): RunEvent => ({
  seq,
  type,
  data: data as RunEvent["data"],
  at: at(s),
});
// Forme exacte de `family` (delegation.js view() / line()).
const family: FamilyMember[] = [
  {
    id: "c1",
    titre: "Offres FICTIVES sur SEEK",
    agent: "codex",
    state: "running",
    attend: null,
    pendingQuestion: null,
    pendingPermission: null,
  },
  {
    id: "c2",
    titre: "Offres FICTIVES sur LinkedIn",
    agent: "claude",
    state: "completed",
    attend: null,
    pendingQuestion: null,
    pendingPermission: null,
  },
  {
    id: "c3",
    titre: "Offres FICTIVES sur Indeed",
    agent: "codex",
    state: "awaiting_owner",
    attend: "question",
    pendingQuestion: {
      id: "q1",
      kind: "form",
      message: "Quelle ville FICTIVE ?",
      requestedSchema: { type: "object", properties: {} },
      toolCallId: null,
      askedAt: at(30),
    },
    pendingPermission: null,
  },
  {
    id: "c4",
    titre: "Relecture FICTIVE",
    agent: "claude",
    state: "en_file",
    attend: "place",
    pendingQuestion: null,
    pendingPermission: null,
  },
];
const motherEvents = [
  ev(1, "delegation_accepted", { via: "bouton", total: 6, parallel: 3 }, 0),
  ev(
    2,
    "child_launched",
    {
      childId: "c1",
      titre: family[0].titre,
      agent: "codex",
      modele: "gpt-fictif",
    },
    1,
  ),
  ev(
    3,
    "child_launched",
    { childId: "c2", titre: family[1].titre, agent: "claude", modele: "" },
    1,
  ),
  ev(
    4,
    "child_done",
    {
      childId: "c2",
      state: "completed",
      envois: { ligne: "Envoi par la plateforme : aucun envoi FICTIF." },
    },
    66,
  ),
];
const mother = {
  id: "m1",
  prompt: "Cherche des offres FICTIVES sur SEEK, LinkedIn et Indeed",
  agent: "codex",
  model: "",
  state: "running",
  mode: "agent",
  pack: "core",
  plan: { steps: [] },
  estMere: true,
  family,
  activity: { agents: 3, awaitingOwner: 1 },
} as unknown as Run;
const panel = (over: Partial<Parameters<typeof ActivityPanel>[0]> = {}) => {
  const props = {
    catalog,
    run: mother as Run | null,
    events: motherEvents,
    onClose: vi.fn(),
    onOpenRun: vi.fn(),
    onCancelRun: vi.fn(),
    ...over,
  };
  return { ...render(<ActivityPanel {...props} />), props };
};
const tileOf = (title: string) =>
  screen.getByText(title).closest<HTMLElement>(".subagent-tile")!;

describe("Sous-agents : la famille du back", () => {
  it("une tuile par sous-mission, avec son état, son attente et le compteur d'agents", () => {
    const { container } = panel();
    const section = screen
      .getByRole("heading", { name: "Sous-agents" })
      .closest("section")!;
    expect(section.querySelectorAll(".subagent-tile")).toHaveLength(4);
    expect(
      section.querySelector(".activity-section-head")!.textContent,
    ).toContain("1/4 terminés");
    expect(
      within(tileOf("Offres FICTIVES sur SEEK")).getByText("En cours"),
    ).toBeTruthy();
    expect(
      tileOf("Offres FICTIVES sur SEEK").querySelector(
        ".subagent-dot.tone-running",
      ),
    ).toBeTruthy();
    const linkedin = tileOf("Offres FICTIVES sur LinkedIn");
    expect(within(linkedin).getByText("Terminée")).toBeTruthy();
    expect(linkedin.textContent).toContain("1 min 5 s");
    expect(linkedin.querySelector(".subagent-dot.tone-completed")).toBeTruthy();
    const indeed = tileOf("Offres FICTIVES sur Indeed");
    expect(within(indeed).getByText("Attend ta réponse")).toBeTruthy();
    expect(indeed.querySelector(".subagent-dot.tone-waiting")).toBeTruthy();
    // style.css a une règle globale `.waiting` (phrase d'attente du fil) : jamais ce nom nu sur la tuile.
    expect(indeed.classList.contains("waiting")).toBe(false);
    const queued = tileOf("Relecture FICTIVE");
    expect(within(queued).getByText("En file : attend une place")).toBeTruthy();
    expect(queued.querySelector(".subagent-dot.tone-queued")).toBeTruthy();
    expect(
      within(section).getByText(
        "3 agents en activité (missions et sous-agents), dont 1 en attente de toi",
      ),
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(/bientôt/);
  });
  it("clic sur une tuile : pleine largeur, Ouvrir et Arrêter réels, détails techniques", () => {
    const { props } = panel();
    const tile = tileOf("Offres FICTIVES sur SEEK");
    fireEvent.click(
      within(tile).getByRole("button", { name: /Offres FICTIVES sur SEEK/ }),
    );
    expect(tile.style.gridColumn).toBe("1 / -1");
    fireEvent.click(
      within(tile).getByRole("button", { name: "Ouvrir la sous-mission" }),
    );
    expect(props.onOpenRun).toHaveBeenCalledWith("c1");
    const stop = within(tile).getByRole("button", { name: "Arrêter" });
    expect((stop as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(stop);
    expect(props.onCancelRun).toHaveBeenCalledWith("c1");
    fireEvent.click(
      within(tile).getByRole("button", { name: "Détails techniques" }),
    );
    const tech = tile.querySelector(".activity-tech")!.textContent;
    expect(tech).toContain("codex · gpt-fictif");
    expect(tech).toContain("c1");
  });
  it("une sous-mission finie ne propose pas Arrêter ; la ligne d'envoi de son Bilan est dans les détails", () => {
    panel();
    const tile = tileOf("Offres FICTIVES sur LinkedIn");
    fireEvent.click(
      within(tile).getByRole("button", {
        name: /Offres FICTIVES sur LinkedIn/,
      }),
    );
    expect(within(tile).queryByRole("button", { name: "Arrêter" })).toBeNull();
    fireEvent.click(
      within(tile).getByRole("button", { name: "Détails techniques" }),
    );
    expect(tile.querySelector(".activity-tech")!.textContent).toContain(
      "Envoi par la plateforme : aucun envoi FICTIF.",
    );
  });
  it("question d'une sous-mission : visible dans la tuile, réponse dans la sous-mission", () => {
    const { props } = panel();
    const tile = tileOf("Offres FICTIVES sur Indeed");
    fireEvent.click(
      within(tile).getByRole("button", { name: /Offres FICTIVES sur Indeed/ }),
    );
    expect(within(tile).getByText(/Quelle ville FICTIVE \?/)).toBeTruthy();
    fireEvent.click(
      within(tile).getByRole("button", { name: "Ouvrir la sous-mission" }),
    );
    expect(props.onOpenRun).toHaveBeenCalledWith("c3");
  });
  it("Arrêter est inactif pendant une action en cours", () => {
    panel({ busy: true });
    const tile = tileOf("Offres FICTIVES sur SEEK");
    fireEvent.click(
      within(tile).getByRole("button", { name: /Offres FICTIVES sur SEEK/ }),
    );
    expect(
      (
        within(tile).getByRole("button", {
          name: "Arrêter",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("sans family : ni section ni ligne dans le fil", () => {
    panel({
      run: { ...mother, family: undefined, activity: undefined } as Run,
    });
    expect(screen.queryByRole("heading", { name: "Sous-agents" })).toBeNull();
    const { container } = render(
      <SubagentsLine family={undefined} onOpen={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });
  it("ligne du fil : en cours, terminés et en attente du propriétaire ; le clic ouvre le panneau", () => {
    const onOpen = vi.fn();
    render(<SubagentsLine family={family} onOpen={onOpen} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: /1 sous-agent en cours · 1\/4 terminés · 1 attend ta réponse/,
      }),
    );
    expect(onOpen).toHaveBeenCalledOnce();
  });
  it("sous-mission ouverte : lien vers la mission principale", () => {
    const { props } = panel({
      run: {
        ...mother,
        id: "c1",
        estMere: undefined,
        family: undefined,
        activity: undefined,
        famille: { racine: "m1", mere: "m1", titre: family[0].titre },
      } as unknown as Run,
      events: [],
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Revenir à la mission principale" }),
    );
    expect(props.onOpenRun).toHaveBeenCalledWith("m1");
  });
});

describe("journal de la mission : événements de la famille", () => {
  it("accord, lancement suivi jusqu'à la fin, refus, file et attente de la mère", () => {
    const rows = activityRows([
      ev(1, "delegation_accepted", { via: "bouton", total: 6, parallel: 3 }),
      ev(2, "child_launched", { childId: "c1", titre: "Offres FICTIVES" }),
      ev(3, "child_state", { childId: "c1", state: "running" }),
      ev(4, "child_done", { childId: "c1", state: "completed" }),
      ev(5, "child_launched", { childId: "c2", titre: "Relecture FICTIVE" }),
      ev(6, "child_state", { childId: "c2", state: "en_file" }),
      ev(7, "family_waiting", { enCours: 1 }),
      ev(8, "delegation_declined", { via: "carte" }),
      ev(9, "delegation_accepted", { via: "prompt" }),
    ]).map((r) => [r.label, r.status, r.tone]);
    expect(rows).toEqual([
      ["Sous-agents autorisés (demande dans le prompt)", "Accordé", ""],
      ["Sous-agents refusés : un seul agent mène la mission", "Refusé", ""],
      ["La mission attend la fin de ses sous-agents", "Attente", "running"],
      ["Sous-agent lancé : Relecture FICTIVE", "En file", "running"],
      ["Sous-agent lancé : Offres FICTIVES", "Terminée", "completed"],
      [
        "Sous-agents autorisés (case cochée) : 6 au plus, 3 en même temps",
        "Accordé",
        "",
      ],
    ]);
  });
});
