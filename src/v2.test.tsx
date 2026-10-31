import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MissionPill } from "./MissionPill";
import { ConnectionsPanel } from "./ConnectionsPanel";
import { AgentActivity, toolDuration } from "./Career";
import {
  Tracker,
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
  it("Entrée met l'instruction en file sans espaces et referme le champ", () => {
    const { queue } = pill();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter une instruction" }),
    );
    const field = screen.getByLabelText(/Ajouter une instruction pour/);
    fireEvent.change(field, { target: { value: "  aussi en remote " } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(queue).toHaveBeenCalledWith("aussi en remote");
    expect(screen.queryByLabelText(/Ajouter une instruction pour/)).toBeNull();
  });
  it("Maj+Entrée et un texte vide n'envoient rien", () => {
    const { queue } = pill();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter une instruction" }),
    );
    const field = screen.getByLabelText(/Ajouter une instruction pour/);
    fireEvent.keyDown(field, { key: "Enter" });
    fireEvent.change(field, { target: { value: "ligne" } });
    fireEvent.keyDown(field, { key: "Enter", shiftKey: true });
    expect(queue).not.toHaveBeenCalled();
  });
  it("Échap referme le champ, le nombre en file reste visible", () => {
    pill({ queued: 2 });
    fireEvent.click(
      screen.getByRole("button", { name: /Ajouter une instruction/ }),
    );
    expect(screen.getByText("2 en file d’attente")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText(/Ajouter une instruction pour/)).toBeNull();
  });
  it("un workflow ne propose que l'arrêt", () => {
    pill({ canQueue: false });
    expect(
      screen.queryByRole("button", { name: "Ajouter une instruction" }),
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

describe("panneau v2", () => {
  it("compte les agents réellement prêts, jamais le fictif", () => {
    render(<ConnectionsPanel catalog={catalog} events={[]} run={null} />);
    expect(screen.getByText("1 prêt")).toBeTruthy();
    expect(screen.queryByText("Fictif")).toBeNull();
  });
  it("le titre replie le contenu", () => {
    render(<ConnectionsPanel catalog={catalog} events={[]} run={null} />);
    fireEvent.click(screen.getByRole("button", { name: /Connexions locales/ }));
    expect(screen.queryByText("Codex")).toBeNull();
  });
  it("aucun coût sans mission, aucun chiffre inventé sans mesure", () => {
    const { rerender, container } = render(
      <ConnectionsPanel catalog={catalog} events={[]} run={null} />,
    );
    expect(container.querySelector(".panel-cost")).toBeNull();
    rerender(<ConnectionsPanel catalog={catalog} events={[]} run={baseRun} />);
    const cost = within(container.querySelector<HTMLElement>(".panel-cost")!);
    expect(cost.getByText("Non mesuré")).toBeTruthy();
    expect(cost.getByText("Non disponible")).toBeTruthy();
    expect(cost.getByText("codex · BYOA")).toBeTruthy();
  });
  it("affiche le coût mesuré, le registre altéré et un agent fictif", () => {
    const run = {
      ...baseRun,
      simulated: true,
      usage: { platformCents: 125, currency: "EUR", byDimension: [] },
      ledger: { ok: false },
    } as unknown as Run;
    render(<ConnectionsPanel catalog={catalog} events={[]} run={run} />);
    expect(screen.getByText(/1,25/)).toBeTruthy();
    expect(screen.getByText("Registre altéré")).toBeTruthy();
    expect(screen.getByText("codex · fictif")).toBeTruthy();
  });
});

const tool = (seq: number, data: object, at?: string) =>
  ({ seq, type: "agent", at, data: { toolCallId: "t", ...data } }) as RunEvent;

describe("commandes de l'agent", () => {
  it("durée lisible, absente si une heure manque", () => {
    const line = { at: "2026-10-31T10:00:00Z", endAt: "2026-10-31T10:01:05Z" };
    expect(toolDuration(line as never)).toBe("1min 5s");
    expect(toolDuration({ at: line.at } as never)).toBeNull();
    expect(
      toolDuration({ at: line.endAt, endAt: line.at } as never),
    ).toBeNull();
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
  it("corrige la collision entre le tableau et la liste .activity", () => {
    expect(css).toMatch(/table\.activity\s*\{\s*display: table/);
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
  it("sans outil ni étape, aucun compteur inventé", () => {
    render(
      <Tracker
        run={{ ...baseRun, state: "running" }}
        events={[]}
        open={false}
        details={false}
        setOpen={() => {}}
        setDetails={() => {}}
      />,
    );
    expect(screen.getByText("Réfléchit à la suite")).toBeTruthy();
    expect(screen.queryByText(/\/\d/)).toBeNull();
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

describe("mise en page v3", () => {
  const css = readFileSync(resolve("src/v2.css"), "utf8");
  it("les valeurs des détails ne sortent pas de la carte de suivi", () => {
    expect(css).toMatch(
      /\.tracker dl \{\s*grid-template-columns: minmax\(0, 1fr\)/,
    );
  });
  it("le suivi ne couvre pas le fil quand le panneau est ouvert", () => {
    expect(css).toMatch(
      /\.main\.with-panel \.tracker \{\s*right: 12px;[^}]*width: 276px/,
    );
  });
});
