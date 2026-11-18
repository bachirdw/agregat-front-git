// activity-panel-03 : colonne « Activité » (remplace Suivi + Connexions locales).
// Règle : chaque section n'apparaît que si le back fournit la donnée ; aucun exemple inventé.
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
import { ActivityPanel, SubagentsLine } from "./ActivityPanel";
import { trackerDetails } from "./Tracker";
import type { Catalog, FamilyMember, Run, RunEvent } from "./types";

afterEach(cleanup);

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const catalog = {
  agents: [
    {
      id: "codex",
      name: "Codex",
      installed: true,
      compatible: true,
      probe: { at: ago(5 * 60000), session: true, models: [] },
    },
    {
      id: "claude",
      name: "Claude Code",
      installed: true,
      compatible: true,
      probe: { error: "Authentication required", session: false, models: [] },
    },
    { id: "gemini", name: "Gemini", installed: false, compatible: true },
    {
      id: "fixture",
      name: "Démonstrateur",
      simulated: true,
      installed: true,
      compatible: true,
    },
  ],
} as unknown as Catalog;
const running = {
  id: "r",
  prompt: "Mission FICTIVE",
  agent: "codex",
  model: "",
  state: "running",
  mode: "agent",
  pack: "core",
  plan: { steps: [] },
} as unknown as Run;
const event = (seq: number, type: string, data: object): RunEvent => ({
  seq,
  type,
  data: data as RunEvent["data"],
  at: "2026-11-18T10:00:00.000Z",
});
const panel = (over: Partial<Parameters<typeof ActivityPanel>[0]> = {}) => {
  const props = {
    catalog,
    run: running as Run | null,
    events: [] as RunEvent[],
    onClose: vi.fn(),
    ...over,
  };
  const view = render(<ActivityPanel {...props} />);
  return { ...view, props };
};
const heading = (name: string | RegExp) =>
  screen.queryByRole("heading", { name });
const OPTIONAL = [
  "Sous-agents",
  "Candidatures",
  "Agenda",
  "Documents",
  "Tâches planifiées",
];

describe("panneau Activité : structure", () => {
  it("en-tête « Activité » et croix « Fermer le panneau » qui appelle onClose", () => {
    const { props } = panel();
    const aside = screen.getByRole("complementary", { name: "Activité" });
    expect(aside.className).toContain("activity-panel");
    expect(within(aside).getByRole("heading", { name: "Activité" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fermer le panneau" }));
    expect(props.onClose).toHaveBeenCalledOnce();
  });
  it("sans mission : Connecteurs et Sites autorisés seulement", () => {
    panel({ run: null });
    expect(heading(/^Connecteurs/)).toBeTruthy();
    expect(heading(/^Sites autorisés/)).toBeTruthy();
    expect(heading(/^Étapes de la mission/)).toBeNull();
    for (const name of OPTIONAL) expect(heading(name)).toBeNull();
    expect(screen.getByText("Aucune mission ouverte.")).toBeTruthy();
  });
  it("mission sans sous-agents, compteurs, documents ni offres : sections absentes, aucun état vide inventé", () => {
    const { container } = panel({ agenda: [], schedules: [] });
    expect(heading(/^Connecteurs/)).toBeTruthy();
    expect(heading(/^Étapes de la mission/)).toBeTruthy();
    expect(heading(/^Sites autorisés/)).toBeTruthy();
    for (const name of OPTIONAL) expect(heading(name)).toBeNull();
    expect(container.textContent).not.toMatch(
      /offres trouvées|Retenues|Lettres prêtes|Envoyées|Aucun sous-agent|Aucun document/i,
    );
  });
});

describe("Connecteurs", () => {
  it("repliée par défaut avec son résumé ; dépliée : agents réels, jamais le démonstrateur", () => {
    panel();
    const toggle = screen.getByRole("button", { name: /^Connecteurs/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toContain("1 à reconnecter");
    expect(screen.queryByText("Codex")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const codex = screen.getByText("Codex").closest("li")!;
    expect(within(codex).getByText("Connecté")).toBeTruthy();
    expect(within(codex).getByText("il y a 5 min")).toBeTruthy();
    const claude = screen.getByText("Claude Code").closest("li")!;
    expect(within(claude).getByText("À reconnecter")).toBeTruthy();
    expect(claude.title).toBe("Authentication required");
    const gemini = screen.getByText("Gemini").closest("li")!;
    expect(within(gemini).getByText("Non installé")).toBeTruthy();
    expect(screen.queryByText("Démonstrateur")).toBeNull();
  });
  it("« Tous connectés » quand chaque agent réel est prêt", () => {
    panel({
      catalog: {
        agents: [catalog.agents[0], catalog.agents[3]],
      } as unknown as Catalog,
    });
    expect(
      screen.getByRole("button", { name: /^Connecteurs/ }).textContent,
    ).toContain("Tous connectés");
  });
  it("sites consultés : hôtes distincts, sans chemin ni requête", () => {
    panel({
      run: {
        ...running,
        missionProof: {
          reads: [
            {
              capability: "browser.navigate",
              url: "https://jobs.example.test/a?x=FICTIF",
            },
            { capability: "browser.snapshot", url: "https://jobs.example.test/b" },
            {
              capability: "browser.snapshot",
              url: "https://careers.example.test/c",
            },
            { capability: "browser.snapshot", url: "pas une adresse" },
            { capability: "browser.snapshot" },
          ],
        },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Connecteurs/ }));
    const sites = screen.getByRole("list", { name: "Sites consultés" });
    expect(
      within(sites)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["jobs.example.test", "careers.example.test"]);
    expect(sites.textContent).not.toMatch(/FICTIF|\/a|pas une/);
  });
  it("journal de la mission : titre de l'outil sans « Outil : », sessions dites simplement", () => {
    const { container } = panel({
      events: [
        event(1, "session", {}),
        event(2, "agent", {
          sessionUpdate: "tool_call",
          toolCallId: "t1",
          title:
            "mcp__platform__browser_navigate(url: https://exemple.invalid/secret)",
          status: "in_progress",
        }),
        event(3, "session_reset", {}),
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: /^Connecteurs/ }));
    const table = screen.getByRole("table", {
      name: "Connexions pendant la mission",
    });
    expect(table.className).toContain("activity-log");
    expect(table.classList.contains("activity")).toBe(false);
    expect(within(table).getByText("browser_navigate")).toBeTruthy();
    expect(within(table).getByText("En cours")).toBeTruthy();
    expect(within(table).getByText("Agent prêt pour la mission")).toBeTruthy();
    expect(
      within(table).getByText("Reprise impossible : l’agent repart de zéro"),
    ).toBeTruthy();
    expect(table.textContent).not.toMatch(/Outil :|secret|Session/);
    expect(container.querySelector(".panel-cost")).toBeNull();
  });
  it("sans mission ou sans activité, une phrase simple à la place du journal", () => {
    panel({ run: null });
    fireEvent.click(screen.getByRole("button", { name: /^Connecteurs/ }));
    expect(screen.getByText(/Ouvre ou lance une mission/)).toBeTruthy();
    cleanup();
    panel();
    fireEvent.click(screen.getByRole("button", { name: /^Connecteurs/ }));
    expect(screen.getByText("L’agent n’a encore rien fait.")).toBeTruthy();
  });
});

const workflow = {
  ...running,
  plan: {
    steps: [],
    workflow: {
      title: "Workflow",
      steps: [
        { id: "a", title: "Chercher", kind: "x" },
        { id: "b", title: "Relire", kind: "x" },
        { id: "c", title: "Classer", kind: "x" },
      ],
    },
  },
  steps: [
    { step_id: "a", state: "succeeded", attempt: 1 },
    { step_id: "b", state: "waiting_approval", attempt: 1 },
  ],
} as unknown as Run;

describe("Étapes de la mission", () => {
  it("reprend le suivi : phrase, compteur, étapes marquées", () => {
    panel({ run: workflow });
    const head = heading(/^Étapes de la mission/)!.parentElement!;
    expect(head.textContent).toContain("1/3");
    expect(screen.getByText("Attend ton accord : relire")).toBeTruthy();
    for (const step of ["Chercher", "Relire", "Classer"])
      expect(screen.getByText(step)).toBeTruthy();
  });
  it("sans outil ni étape, aucun compteur inventé", () => {
    panel();
    expect(screen.getByText("Réfléchit à la suite")).toBeTruthy();
    expect(
      heading(/^Étapes de la mission/)!.parentElement!.textContent,
    ).not.toMatch(/\d\/\d/);
  });
  it("Détails techniques : exactement les lignes de trackerDetails", () => {
    const run = {
      ...workflow,
      browser: "isolated",
      result: { simulated: false, summary: "", evidence: [{}, {}] },
      usage: { platformCents: 125, currency: "EUR", byDimension: [] },
      ledger: { ok: true },
    } as unknown as Run;
    const events = [
      event(1, "session", { modes: { current: "auto" } }),
      event(2, "verification", { scope: "Classement recalculé" }),
    ];
    const setDetails = vi.fn();
    const { rerender } = render(
      <ActivityPanel
        catalog={catalog}
        run={run}
        events={events}
        onClose={() => {}}
        details={false}
        setDetails={setDetails}
      />,
    );
    const more = screen.getByRole("button", { name: "Détails techniques" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(more);
    expect(setDetails).toHaveBeenCalledWith(true);
    rerender(
      <ActivityPanel
        catalog={catalog}
        run={run}
        events={events}
        onClose={() => {}}
        details
        setDetails={setDetails}
      />,
    );
    const list = document.querySelector(".activity-steps .activity-tech dl")!;
    const rows = [...list.querySelectorAll("div")].map((row) => [
      row.querySelector("dt")!.textContent,
      row.querySelector("dd")!.textContent,
    ]);
    expect(rows).toEqual(trackerDetails(run, events).map(([k, v]) => [k, v]));
  });
  it("le coût n'apparaît que dans les détails techniques, mesuré ou « Non mesuré »", () => {
    const run = {
      ...running,
      simulated: true,
      usage: { platformCents: 125, currency: "EUR", byDimension: [] },
      ledger: { ok: false },
    } as unknown as Run;
    const { container } = panel({ run });
    expect(container.textContent).not.toMatch(/1,25|Coût|Registre/);
    fireEvent.click(screen.getByRole("button", { name: "Détails techniques" }));
    const tech = container.querySelector<HTMLElement>(".activity-steps .activity-tech")!;
    expect(within(tech).getByText(/1,25.*fictif/)).toBeTruthy();
    expect(within(tech).getByText("Registre altéré")).toBeTruthy();
    cleanup();
    panel({ run: { ...running, usage: undefined } as Run, details: true });
    expect(screen.getByText(/Non mesuré · BYOA/)).toBeTruthy();
  });
});

// sous-agents-19-11 : forme du back (`family` de GET /api/runs/:id) ; les tuiles sont testées dans
// sous-agents.test.tsx.
const family: FamilyMember[] = [
  {
    id: "c1",
    titre: "Recherche Doctolib",
    agent: "codex",
    state: "running",
    attend: null,
    pendingQuestion: null,
    pendingPermission: null,
  },
];

describe("Candidatures", () => {
  it("seulement les compteurs fournis : offres trouvées depuis le résultat", () => {
    panel({
      run: {
        ...running,
        result: {
          simulated: false,
          summary: "",
          evidence: [],
          opportunities: [{}, {}, {}] as never,
        },
      },
    });
    const section = heading("Candidatures")!.closest("section")!;
    expect(within(section).getByText("3")).toBeTruthy();
    expect(within(section).getByText("Offres trouvées")).toBeTruthy();
    expect(section.textContent).not.toMatch(/Retenues|Lettres prêtes|Envoyées/);
  });
  it("compteurs du back : quatre cellules, zéro compris ; les données fictives sont signalées", () => {
    panel({
      run: {
        ...running,
        simulated: true,
        funnel: { found: 12, kept: 4, letters: 2, sent: 0 },
        result: {
          simulated: true,
          summary: "",
          evidence: [],
          opportunities: [{}] as never,
        },
      },
    });
    const section = heading("Candidatures")!.closest("section")!;
    const cells = [...section.querySelectorAll(".funnel-cell")].map(
      (cell) => cell.textContent,
    );
    expect(cells).toEqual([
      "12Offres trouvées",
      "4Retenues",
      "2Lettres prêtes",
      "0Envoyées",
    ]);
    expect(section.textContent).toContain("fictif");
  });
});

describe("Documents, Agenda, Tâches planifiées", () => {
  it("documents : nom lisible, lien seulement vers une adresse sûre", () => {
    panel({
      run: {
        ...running,
        documents: [
          { id: "d1", name: "Lettre · Doctolib", url: "/api/files/d1" },
          { id: "d2", name: "CV · version courte", url: "javascript:alert(1)" },
          { id: "d3", name: "Notes · Alan" },
        ],
      },
    });
    expect(heading("Documents")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Lettre · Doctolib/ });
    expect(link.getAttribute("href")).toBe("/api/files/d1");
    expect(screen.queryByRole("link", { name: /CV · version courte/ })).toBeNull();
    expect(screen.getByText("CV · version courte")).toBeTruthy();
    expect(screen.getByText("Notes · Alan")).toBeTruthy();
  });
  it("agenda : pavé date, titre et détail", () => {
    const { container } = panel({
      agenda: [
        {
          id: "a1",
          at: "2026-11-20T10:00:00.000Z",
          title: "Entretien FICTIF",
          detail: "Visio",
        },
      ],
    });
    expect(heading("Agenda")).toBeTruthy();
    expect(screen.getByText("Entretien FICTIF")).toBeTruthy();
    expect(screen.getByText("Visio")).toBeTruthy();
    const day = container.querySelector(".agenda-date")!;
    // Le 20 novembre 2026 est un vendredi.
    expect(day.textContent).toMatch(/^VEN\s*20$/);
  });
  it("tâches planifiées : unique ou récurrente, arrêt inactif tant que l'API manque", () => {
    const { container } = panel({
      schedules: [
        { id: "t1", name: "Veille FICTIVE", recurring: true, next: "2026-11-20T08:00:00.000Z" },
        { id: "t2", name: "Relance FICTIVE", recurring: false },
      ],
    });
    expect(heading("Tâches planifiées")).toBeTruthy();
    expect(container.querySelectorAll(".schedule-icon.recurring")).toHaveLength(1);
    expect(container.querySelectorAll(".schedule-icon.once")).toHaveLength(1);
    const stop = screen.getByRole("button", {
      name: "Arrêter la tâche « Veille FICTIVE »",
    }) as HTMLButtonElement;
    expect(stop.disabled).toBe(true);
  });
});

describe("Sites autorisés", () => {
  it("domaines demandés pour la mission, en lecture seule", () => {
    const { container } = panel({
      run: { ...running, browserDomains: ["jobs.example.test", "mail.example.test"] },
    });
    const section = heading(/^Sites autorisés/)!.closest("section")!;
    expect(within(section).getByText("jobs.example.test")).toBeTruthy();
    expect(within(section).getByText("mail.example.test")).toBeTruthy();
    expect(within(section).queryByRole("button")).toBeNull();
    expect(container.textContent).not.toMatch(/Retirer|Toujours autoriser/);
  });
  it("sans domaine demandé : phrase neutre, sans promesse", () => {
    panel({ run: { ...running, browserDomains: [] } });
    expect(
      screen.getByText("Aucun domaine précisé pour cette mission."),
    ).toBeTruthy();
  });
});

describe("vocabulaire : le panneau sert à postuler", () => {
  it("aucun mot de code hors Détails techniques", () => {
    const { container } = panel({
      run: {
        ...running,
        family,
        activity: { agents: 2, awaitingOwner: 0 },
        documents: [{ id: "d", name: "Lettre · Doctolib" }],
        usage: { platformCents: 0, currency: "EUR", byDimension: [] },
      },
      events: [
        event(1, "session", { modes: { current: "auto" } }),
        event(2, "session_reset", { lost: false }),
        event(3, "agent", {
          sessionUpdate: "tool_call",
          toolCallId: "t",
          title: "lire",
          status: "completed",
        }),
      ],
      details: true,
    });
    fireEvent.click(screen.getByRole("button", { name: /^Connecteurs/ }));
    fireEvent.click(screen.getByRole("button", { name: /Recherche Doctolib/ }));
    const tile = container.querySelector(".subagent-tile")!;
    fireEvent.click(within(tile as HTMLElement).getByRole("button", { name: "Détails techniques" }));
    // Les détails techniques existent et contiennent bien le vocabulaire technique…
    expect(container.querySelectorAll(".activity-tech")).toHaveLength(2);
    expect(container.querySelector(".activity-steps .activity-tech")!.textContent).toContain(
      "Session",
    );
    // … et rien d'autre n'en contient.
    const outside = container.cloneNode(true) as HTMLElement;
    outside.querySelectorAll(".activity-tech").forEach((node) => node.remove());
    expect(outside.textContent).not.toMatch(/Modifications|fichiers|Dossier|Session/i);
  });
});

describe("feuille : panneau Activité", () => {
  const v2 = readFileSync(resolve("src/v2.css"), "utf8");
  const base = readFileSync(resolve("src/style.css"), "utf8");
  const block = (css: string, selector: string) =>
    css.match(new RegExp(selector.replace(/[.*]/g, "\\$&") + " \\{([^}]*)\\}"))?.[1] ?? "";
  it("carte flottante de 344px à côté du fil, style de la barre latérale", () => {
    const rules = block(v2, ".activity-panel");
    expect(rules).toMatch(/width: 344px/);
    expect(rules).toMatch(/margin: 10px 10px 10px 0/);
    expect(rules).toMatch(/border-radius: 18px/);
    expect(rules).toMatch(/box-shadow: var\(--soft\)/);
    expect(rules).toMatch(/backdrop-filter/);
    expect(rules).not.toMatch(/position: absolute/);
  });
  it("sous 760px : surimpression opaque ; sous 1180px : règle dédiée", () => {
    expect(v2).toMatch(
      /@media \(max-width: 760px\) \{\s*\.activity-panel \{[^}]*position: absolute;[^}]*inset: 0 0 0 auto;[^}]*background: var\(--bg\)/,
    );
    expect(v2).toMatch(/@media \(max-width: 1180px\)/);
  });
  it("le journal défile au-delà de 180px", () => {
    expect(block(v2, ".activity-log-scroll")).toMatch(/max-height: 180px/);
  });
  it("plus aucune règle .tracker, .connections-panel, .panel-cost ni décalage du fil", () => {
    for (const css of [v2, base]) {
      expect(css).not.toMatch(/\.tracker|\.connections-panel|\.panel-cost|\.panel-card/);
      expect(css).not.toMatch(/\.with-panel \.scroll-content|\.with-panel \.composer-dock/);
    }
  });
});
