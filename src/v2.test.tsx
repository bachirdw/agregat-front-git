import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MissionPill } from "./MissionPill";
import { AgentActivity, ownerWaits, toolDuration } from "./Career";
import {
  metaLine,
  trackerDetails,
  trackerItems,
  trackerPhrase,
} from "./Tracker";
import { Settings } from "./Settings";
import type { Catalog, Run, RunEvent } from "./types";

afterEach(cleanup);

const pill = (over = {}) => {
  const props = {
    busy: false,
    canQueue: true,
    queued: 0,
    stop: vi.fn(),
    queue: vi.fn(),
    ...over,
  };
  render(<MissionPill {...props} />);
  return props;
};

describe("pastille de mission", () => {
  it("Arrêter appelle stop et se désactive pendant une action", () => {
    const { stop } = pill();
    fireEvent.click(screen.getByRole("button", { name: "Arrêter" }));
    expect(stop).toHaveBeenCalledOnce();
  });
  it("Arrêter est inactif quand une action est en cours", () => {
    pill({ busy: true });
    expect(
      (screen.getByRole("button", { name: "Arrêter" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
  it("le champ pour écrire à l'agent est visible d'office, sans crayon à ouvrir", () => {
    pill();
    expect(
      screen.getByLabelText("Écrire à l’agent pendant la mission"),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Ajouter une instruction" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Arrêter" })).toBeTruthy();
  });
  it("Entrée met l'instruction en file sans espaces, vide le champ et le garde visible", () => {
    const { queue } = pill();
    const field = screen.getByLabelText(
      "Écrire à l’agent pendant la mission",
    ) as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: "  aussi en remote " } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(queue).toHaveBeenCalledWith("aussi en remote");
    expect(field.value).toBe("");
    expect(
      screen.getByLabelText("Écrire à l’agent pendant la mission"),
    ).toBeTruthy();
  });
  it("Maj+Entrée et un texte vide n'envoient rien", () => {
    const { queue } = pill();
    const field = screen.getByLabelText("Écrire à l’agent pendant la mission");
    fireEvent.keyDown(field, { key: "Enter" });
    fireEvent.change(field, { target: { value: "ligne" } });
    fireEvent.keyDown(field, { key: "Enter", shiftKey: true });
    expect(queue).not.toHaveBeenCalled();
  });
  it("le nombre en file est affiché sous le champ", () => {
    pill({ queued: 2 });
    expect(screen.getByText("2 en file d’attente")).toBeTruthy();
  });
  it("un workflow ne propose que l'arrêt", () => {
    pill({ canQueue: false });
    expect(
      screen.queryByLabelText("Écrire à l’agent pendant la mission"),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Arrêter" })).toBeTruthy();
  });
});

const catalog = {
  agents: [
    { id: "a", name: "Codex", installed: true, compatible: true },
    { id: "b", name: "Gemini", installed: false, compatible: true },
    { id: "f", name: "Fictif", simulated: true, installed: true },
  ],
} as unknown as Catalog;
const baseRun = { id: "r", agent: "codex", state: "completed" } as Run;

const tool = (seq: number, data: object, at?: string) =>
  ({ seq, type: "agent", at, data: { toolCallId: "t", ...data } }) as RunEvent;

describe("commandes de l'agent", () => {
  it("durée lisible, absente si une heure manque", () => {
    const line = { at: "2026-10-31T10:00:00Z", endAt: "2026-10-31T10:01:05Z" };
    expect(toolDuration(line as never)).toBe("1 min 5 s");
    expect(toolDuration({ at: line.at } as never)).toBeNull();
    expect(
      toolDuration({ at: line.endAt, endAt: line.at } as never),
    ).toBeNull();
  });
  it("ownerWaits : deux attentes, réponse expirée, attente ouverte (E104)", () => {
    const ev = (seq: number, type: string, data: object, at: string) =>
      ({ seq, type, data, at }) as RunEvent;
    const t = (m: number) =>
      Date.parse(`2026-11-13T10:${String(m).padStart(2, "0")}:00Z`);
    const iso = (m: number) => new Date(t(m)).toISOString();
    const two = [
      ev(1, "state", { state: "running" }, iso(0)),
      ev(2, "state", { state: "awaiting_owner" }, iso(1)),
      ev(3, "question", { id: "q-1" }, iso(1)),
      ev(4, "answer", { id: "q-1", action: "accept" }, iso(4)),
      ev(5, "state", { state: "running" }, iso(4)),
      ev(6, "state", { state: "awaiting_owner" }, iso(10)),
      ev(7, "state", { state: "running" }, iso(12)),
    ];
    expect(ownerWaits(two)).toEqual([
      { start: t(1), end: t(4) },
      { start: t(10), end: t(12) },
    ]);
    const expired = [
      ev(1, "state", { state: "awaiting_owner" }, iso(2)),
      ev(2, "question", { id: "q-2" }, iso(2)),
      ev(3, "answer", { id: "q-2", action: "expired" }, iso(7)),
    ];
    expect(ownerWaits(expired)).toEqual([{ start: t(2), end: t(7) }]);
    const open = [ev(1, "state", { state: "awaiting_owner" }, iso(3))];
    expect(ownerWaits(open, iso(9))).toEqual([{ start: t(3), end: t(9) }]);
    const now = Date.now();
    const [live] = ownerWaits([
      ev(
        1,
        "state",
        { state: "awaiting_owner" },
        new Date(now - 60000).toISOString(),
      ),
    ]);
    expect(live.end).toBeGreaterThanOrEqual(now);
  });
  it("ownerWaits : états consécutifs, réponse avant l'état, ordre quelconque, sans heure (E104)", () => {
    const ev = (seq: number, type: string, data: object, at?: string) =>
      ({ seq, type, data, at }) as RunEvent;
    const t = (m: number) =>
      Date.parse(`2026-11-13T10:${String(m).padStart(2, "0")}:00Z`);
    const iso = (m: number) => new Date(t(m)).toISOString();
    const events = [
      ev(5, "state", { state: "running" }, iso(8)),
      ev(1, "state", { state: "running" }, iso(0)),
      ev(3, "state", { state: "waiting_permission" }, iso(3)),
      ev(2, "state", { state: "awaiting_owner" }, iso(1)),
      ev(4, "answer", { id: "q", action: "accept" }, iso(8)),
    ];
    expect(ownerWaits(events)).toEqual([{ start: t(1), end: t(8) }]);
    expect(
      ownerWaits([
        ev(1, "state", { state: "awaiting_owner" }),
        ev(2, "state", { state: "running" }, iso(5)),
      ]),
    ).toEqual([]);
  });
  it("un outil entièrement couvert par une attente n'affiche pas « < 0,1 s » (E104)", () => {
    const at = (s: number) =>
      new Date(Date.parse("2026-11-13T10:00:00Z") + s * 1000).toISOString();
    const start = Date.parse(at(10));
    const click = { id: "c", at: at(10), endAt: at(70) } as never;
    expect(toolDuration(click, [{ start, end: Date.parse(at(70)) }])).toBe(
      "attente : 1 min 0 s",
    );
    expect(
      toolDuration(click, [{ start: start - 5000, end: start + 20000 }]),
    ).toBe("40,0 s");
  });
  it("la durée d'un groupe exclut l'attente du propriétaire (E104)", () => {
    const at = (m: number, s = 0) =>
      `2026-11-13T10:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}Z`;
    const call = (seq: number, id: string, title: string, t: string) =>
      tool(
        seq,
        {
          toolCallId: id,
          sessionUpdate: "tool_call",
          title,
          status: "pending",
        },
        t,
      );
    const done = (seq: number, id: string, t: string) =>
      tool(
        seq,
        {
          toolCallId: id,
          sessionUpdate: "tool_call_update",
          status: "completed",
        },
        t,
      );
    const state = (seq: number, value: string, t: string) =>
      ({ seq, type: "state", at: t, data: { state: value } }) as RunEvent;
    const events: RunEvent[] = [
      call(1, "a", "lire", at(0)),
      done(2, "a", at(0, 30)),
      call(3, "q1", "Asking for your input", at(0, 30)),
      state(4, "awaiting_owner", at(0, 31)),
      { seq: 5, type: "question", at: at(0, 31), data: { id: "q-1" } },
      {
        seq: 6,
        type: "answer",
        at: at(16, 31),
        data: { id: "q-1", action: "accept" },
      },
      state(7, "running", at(16, 31)),
      done(8, "q1", at(17)),
      call(9, "b", "lire", at(17)),
      done(10, "b", at(17, 20)),
      call(11, "q2", "Asking for your input", at(17, 20)),
      state(12, "awaiting_owner", at(17, 21)),
      state(13, "running", at(22, 21)),
      done(14, "q2", at(22, 57)),
    ];
    render(<AgentActivity events={events} />);
    // 22 min 57 s du premier au dernier outil, dont 21 min d'attente du propriétaire.
    expect(screen.getByText(/A exécuté 4 actions · 1 min 57 s/)).toBeTruthy();
    expect(screen.queryByText(/22 min 57 s/)).toBeNull();
    expect(screen.getByText("attente : 16 min 30 s")).toBeTruthy();
    expect(screen.getByText("attente : 5 min 37 s")).toBeTruthy();
  });
  it("Copier copie les paramètres et confirme", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <AgentActivity
        events={[
          tool(
            1,
            {
              sessionUpdate: "tool_call",
              title: "lire",
              status: "completed",
              rawInput: { path: "a.md" },
            },
            "2026-10-31T10:00:00Z",
          ),
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copier" }));
    expect(writeText.mock.calls[0][0]).toContain("a.md");
    await screen.findByRole("button", { name: "Copié" });
  });
});

describe("feuille v2", () => {
  const css = readFileSync(resolve("src/v2.css"), "utf8");
  it("couvre les deux thèmes et le mouvement réduit", () => {
    expect(css).toMatch(/:root\[data-theme="dark"\]/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
  it("s'importe après style.css pour surcharger sans le modifier", () => {
    const main = readFileSync(resolve("src/main.tsx"), "utf8");
    expect(main.indexOf("style.css")).toBeLessThan(main.indexOf("v2.css"));
  });
});

describe("suivi de mission v3", () => {
  const workflow = {
    ...baseRun,
    state: "running",
    plan: {
      workflow: {
        steps: [
          { id: "a", title: "Chercher" },
          { id: "b", title: "Relire" },
          { id: "c", title: "Classer" },
        ],
      },
    },
    steps: [
      { step_id: "a", state: "succeeded" },
      { step_id: "b", state: "waiting_approval" },
    ],
  } as unknown as Run;
  it("workflow : marque chaque étape et demande l'accord", () => {
    const items = trackerItems(workflow, []);
    expect(items.map((i) => i.mark)).toEqual(["done", "waiting", "pending"]);
    expect(trackerPhrase(workflow, items)).toBe("Attend ton accord : relire");
  });
  it("agent : les étapes sont les outils réellement appelés", () => {
    const items = trackerItems({ ...baseRun, state: "running" }, [
      tool(1, {
        sessionUpdate: "tool_call",
        title: "lire",
        status: "in_progress",
      }),
    ]);
    expect(items).toEqual([{ id: "t", title: "lire", mark: "running" }]);
    expect(trackerPhrase({ ...baseRun, state: "running" }, items)).toBe(
      "En cours : lire",
    );
  });
  it("un outil resté ouvert n'est pas montré en cours après la fin", () => {
    const items = trackerItems(baseRun, [
      tool(1, { sessionUpdate: "tool_call", title: "lire", status: "pending" }),
    ]);
    expect(items[0].mark).toBe("pending");
  });
  // 21/11 (test complet) : « Mission terminée · 0 étape » pour une mission sans étape.
  it("mission terminée sans étape : pas de « 0 étape »", () => {
    expect(trackerPhrase({ ...baseRun, state: "completed" }, [])).toBe(
      "Mission terminée",
    );
  });
  it("la mission annulée ne se dit jamais terminée", () => {
    expect(trackerPhrase({ ...baseRun, state: "cancelled" }, [])).toBe(
      "Mission annulée",
    );
  });
  it("résumé : rien de déclaré sans vérification, preuve ni coût", () => {
    expect(metaLine(baseRun, [])).toBe("");
    expect(metaLine({ ...baseRun, state: "running" }, [])).toBe("");
    const full = {
      ...baseRun,
      result: { evidence: [{}, {}] },
      usage: { platformCents: 0, currency: "EUR" },
    } as unknown as Run;
    const line = metaLine(full, [
      { seq: 1, type: "verification", data: {} } as RunEvent,
    ]);
    expect(line).toMatch(/^✓ Vérifié · 2 preuves · 0,00/);
  });
  it("détails : le registre absent n'est pas présenté intègre", () => {
    const rows = trackerDetails(baseRun, []);
    expect(rows.map((r) => r[0])).toEqual(["Agent", "Coût"]);
    expect(rows[1][1]).toContain("Non mesuré");
  });
});

describe("paramètres v3", () => {
  const view = () =>
    render(
      <Settings
        catalog={catalog}
        usage={<p>Vraie consommation</p>}
        back={() => {}}
        onName={() => {}}
      />,
    );
  it("n'affiche aucun forfait ni pourcentage inventé", () => {
    const { container } = view();
    for (const name of ["Profil", "Utilisation", "Disponible"]) {
      fireEvent.click(screen.getByRole("tab", { name }));
      expect(container.textContent).not.toMatch(/Pro\b|% cette semaine|limite/);
    }
  });
  it("Utilisation montre la vraie consommation, les réglages sans API restent inactifs", () => {
    view();
    fireEvent.click(screen.getByRole("tab", { name: "Utilisation" }));
    expect(screen.getByText("Vraie consommation")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Disponible" }));
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getAllByText("Réglage bientôt")).toHaveLength(4);
    expect(screen.queryByText("Fictif")).toBeNull();
  });
});
