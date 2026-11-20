// reponse-04 : la réponse de l'agent façon Claude Code (BRIEF-conversation-reponse-04, maquette v5).
// Surtout du texte ; un bloc riche (tableau, graphique, fichier) seulement quand il le faut. Données FICTIVES.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RunTurn } from "./RunTurn";
import { Markdown } from "./Markdown";
import { PromptBubble } from "./PromptBubble";
import { Composer } from "./Composer";
import type { Catalog, MissionInput, Run, RunEvent } from "./types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const chart = {
  type: "bar",
  title: "Taille du marché, M USD",
  source: "IMARC · TCAC 7,22 %",
  x: [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034],
  y: [
    774.7, 830.6, 890.6, 954.8, 1023.7, 1097.6, 1176.8, 1261.7, 1352.7, 1450.9,
  ],
  highlight: [0, 9],
};
const fence = (body: string) => "```chart\n" + body + "\n```";
const answer = [
  "La recherche FICTIVE est terminée.",
  "",
  "### Prix des outils",
  "",
  "| Outil | Plan payant | Source |",
  "| --- | --- | --- |",
  "| Outil A | 29 USD/mois | officielle |",
  "",
  "### À vérifier",
  "",
  "- Prix de l'outil D (page en 403)",
].join("\n");
const at = (s: number) =>
  new Date(Date.parse("2026-11-21T09:00:00.000Z") + s * 1000).toISOString();
const ev = (seq: number, type: string, data: object, s = 0): RunEvent => ({
  seq,
  type,
  data: data as RunEvent["data"],
  at: at(s),
});
const tool = (
  seq: number,
  id: string,
  title: string,
  status: string,
  s: number,
  extra: object = {},
) =>
  ev(
    seq,
    "agent",
    {
      sessionUpdate: "tool_call",
      toolCallId: id,
      title,
      status,
      ...extra,
    },
    s,
  );
const events = [
  tool(
    1,
    "t1",
    "browser_navigate(url: https://a.example.test/pricing)",
    "completed",
    0,
  ),
  tool(
    2,
    "t2",
    "browser_navigate(url: https://d.example.test/pricing)",
    "failed",
    20,
  ),
  tool(3, "t3", "Write australie.md", "completed", 65, {
    kind: "edit",
    locations: [{ path: "relay/missions/fictive/1-recherche/australie.md" }],
  }),
  ev(4, "verification", { scope: "Pages naviguées et observées" }, 70),
];
const run = {
  id: "r1",
  prompt: "Mission FICTIVE",
  agent: "fixture",
  model: "",
  state: "completed",
  mode: "agent",
  pack: "core",
  simulated: true,
  createdAt: at(-5),
  plan: { steps: [] },
  result: { simulated: true, summary: answer, answer, evidence: [{}, {}] },
  usage: { platformCents: 0, currency: "EUR", byDimension: [] },
  ledger: { ok: true },
} as unknown as Run;
const turn = (over: Partial<Parameters<typeof RunTurn>[0]> = {}) =>
  render(
    <RunTurn
      run={run}
      events={events}
      busy={false}
      act={vi.fn(async () => {})}
      {...over}
    />,
  );

describe("réponse de l'agent : texte d'abord", () => {
  it("le markdown s'affiche, tableau GFM compris, dans un conteneur qui défile", () => {
    turn();
    expect(
      screen.getByRole("heading", { name: "Prix des outils" }),
    ).toBeTruthy();
    const table = screen.getByRole("table");
    expect(table.closest(".md-table")).toBeTruthy();
    expect(within(table).getByText("Outil")).toBeTruthy();
    expect(within(table).getByText("29 USD/mois")).toBeTruthy();
  });
  it("un bloc ```chart valide donne un graphique en barres, accentué aux points voulus", () => {
    render(<Markdown text={fence(JSON.stringify(chart))} />);
    const figure = screen.getByRole("img", { name: "Taille du marché, M USD" });
    expect(figure.querySelectorAll(".chart-bar")).toHaveLength(10);
    expect(figure.querySelectorAll(".chart-bar.hi")).toHaveLength(2);
    const box = figure.closest(".chart")!;
    expect(box.textContent).toContain("IMARC · TCAC 7,22 %");
    expect(box.textContent).toMatch(/2025 · 774,7/);
    expect(box.textContent).toMatch(/2034 · 1\s450,9/);
  });
  it("un bloc ```chart de type line donne une courbe", () => {
    render(
      <Markdown text={fence(JSON.stringify({ ...chart, type: "line" }))} />,
    );
    const figure = screen.getByRole("img", { name: "Taille du marché, M USD" });
    expect(figure.querySelector("polyline")).toBeTruthy();
  });
  it("un bloc ```chart invalide s'affiche en code brut, jamais d'erreur visible", () => {
    for (const body of [
      "{pas du json",
      JSON.stringify({ ...chart, type: "camembert" }),
      JSON.stringify({ ...chart, y: [1, 2] }),
      JSON.stringify({ ...chart, y: chart.y.map(() => "x") }),
    ]) {
      const { container, unmount } = render(<Markdown text={fence(body)} />);
      expect(screen.queryByRole("img")).toBeNull();
      expect(container.querySelector(".code-block")!.textContent).toContain(
        body.slice(0, 12),
      );
      expect(container.textContent).not.toMatch(/erreur|invalide|error/i);
      unmount();
    }
  });
  it("la ligne méta est repliée par défaut, puis se déplie en liste clé/valeur", () => {
    const { container } = turn();
    const meta = screen.getByRole("button", {
      name: /Vérifié · 2 preuves · fixture · 0,00/,
    });
    expect(meta.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".meta-details")).toBeNull();
    fireEvent.click(meta);
    expect(meta.getAttribute("aria-expanded")).toBe("true");
    const list = container.querySelector(".meta-details")!;
    const keys = [...list.querySelectorAll("dt")].map((d) => d.textContent);
    for (const key of [
      "Coût plateforme",
      "Agent",
      "Compte",
      "Registre",
      "Preuves",
    ])
      expect(keys).toContain(key);
    expect(list.textContent).toContain("Intègre");
  });
  it("la ligne d'activité résume les actions, repliée, puis les liste avec ✓ et ✕", () => {
    const { container } = turn();
    const line = screen.getByRole("button", { name: /A exécuté 3 actions/ });
    expect(line.textContent).toMatch(/1 min 5 s/);
    expect(line.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".activity-actions")).toBeNull();
    fireEvent.click(line);
    const list = container.querySelector(".activity-actions")!;
    expect(list.textContent).toMatch(/✓\s*browser_navigate/);
    expect(list.textContent).toMatch(/✕\s*browser_navigate/);
  });
  it("aucun badge, ni carte Exécution, ni Synthèse, ni coût en colonnes dans la réponse", () => {
    const { container } = turn();
    expect(container.querySelector(".badge")).toBeNull();
    expect(container.querySelector("progress")).toBeNull();
    expect(screen.queryByRole("region", { name: "Exécution" })).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Consommation de la mission" }),
    ).toBeNull();
    expect(screen.queryByRole("heading", { name: "Synthèse" })).toBeNull();
    expect(container.textContent).not.toMatch(/Éléments de preuve|Plan validé/);
  });
  it("les fichiers produits deviennent des cartes compactes (nom, chemin tronqué)", () => {
    const { container } = turn();
    const card = container.querySelector(".file-card")!;
    expect(card.textContent).toContain("australie.md");
    expect(card.getAttribute("title")).toBe(
      "relay/missions/fictive/1-recherche/australie.md",
    );
  });
  it("ordre : activité, texte, fichiers, ligne méta", () => {
    const { container } = turn();
    const order = [
      ".activity-line",
      ".markdown",
      ".file-card",
      ".meta-line",
    ].map((s) => container.querySelector(s)!);
    for (let i = 1; i < order.length; i++)
      expect(
        order[i - 1].compareDocumentPosition(order[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
  });
  it("« Données fictives » reste visible sous une réponse simulée", () => {
    turn();
    expect(screen.getByText("Données fictives")).toBeTruthy();
  });
  it("un incident passé en prop s'affiche en ligne sous l'activité, avec « ! »", () => {
    const { container } = turn({ incident: "Une sous-tâche a échoué." });
    const line = container.querySelector(".incident")!;
    expect(line.textContent).toMatch(/!\s*Une sous-tâche a échoué\./);
    expect(line.getAttribute("role")).not.toBe("alert");
  });
});

describe("pastille de skill (skill-chip-01)", () => {
  const live = {
    ...run,
    state: "running",
    result: undefined,
  } as unknown as Run;
  const reading = (id: string, name: string) =>
    tool(10, id, `${name}(path: profil.md)`, "in_progress", 0);
  it("visible au début d'un appel, puis cachée après 1,6 s ; un nouvel appel la rallume", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <RunTurn
        run={live}
        events={[reading("c1", "career_read")]}
        busy={false}
        act={vi.fn()}
      />,
    );
    expect(document.querySelector(".skill-chip")!.textContent).toContain(
      "career_read",
    );
    act(() => vi.advanceTimersByTime(1600));
    expect(document.querySelector(".skill-chip")).toBeNull();
    rerender(
      <RunTurn
        run={live}
        events={[reading("c1", "career_read"), reading("c2", "career_write")]}
        busy={false}
        act={vi.fn()}
      />,
    );
    expect(document.querySelector(".skill-chip")!.textContent).toContain(
      "career_write",
    );
  });
  it("cachée pendant une demande d'accord et quand la mission est finie", () => {
    render(
      <RunTurn
        run={
          {
            ...live,
            permissions: [
              { id: "p", tool: { title: "Envoi FICTIF" }, options: [] },
            ],
          } as unknown as Run
        }
        events={[reading("c1", "career_read")]}
        busy={false}
        act={vi.fn()}
      />,
    );
    expect(document.querySelector(".skill-chip")).toBeNull();
    cleanup();
    render(
      <RunTurn
        run={run}
        events={[reading("c1", "career_read")]}
        busy={false}
        act={vi.fn()}
      />,
    );
    expect(document.querySelector(".skill-chip")).toBeNull();
  });
});

describe("message de l'utilisateur", () => {
  it("bulle tronquée à ~170 caractères, « Afficher tout » puis « Réduire »", () => {
    const text = "Mission FICTIVE ".repeat(30).trim();
    render(<PromptBubble text={text} />);
    const bubble = document.querySelector(".prompt-bubble-text")!;
    expect(bubble.textContent!.length).toBeLessThanOrEqual(171);
    expect(bubble.textContent!.endsWith("…")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Afficher tout" }));
    expect(bubble.textContent).toBe(text);
    fireEvent.click(screen.getByRole("button", { name: "Réduire" }));
    expect(bubble.textContent!.endsWith("…")).toBe(true);
  });
  it("un message court n'a ni coupure ni bouton", () => {
    render(<PromptBubble text="Mission FICTIVE courte" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

const catalog = {
  live: false,
  agents: [],
  packs: [],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
} as unknown as Catalog;
const input: MissionInput = {
  prompt: "",
  agent: "auto",
  pack: "auto",
  skills: [],
  model: "",
  agentMode: "",
  browser: "auto",
  browserDomains: "",
  budgetCents: 0,
  mode: "workflow",
  workflow: "auto",
  attachments: [],
};
describe("composer d'une mission", () => {
  it("un seul bouton discret « agent · modèle » à la place des pastilles, et plus de texte d'aide", () => {
    const { container } = render(
      <Composer
        catalog={catalog}
        input={input}
        onChange={vi.fn()}
        onPlan={vi.fn()}
        busy={false}
        reply
        sessionSettings={{
          agent: "claude",
          model: "",
          pack: "career-ops",
          skills: ["career-ops"],
        }}
      />,
    );
    const menu = container.querySelector<HTMLDetailsElement>(
      "details.session-menu",
    )!;
    expect(menu.querySelector("summary")!.textContent).toBe("claude · défaut");
    expect(menu.open).toBe(false);
    expect(within(menu).getByText("Skills · career-ops")).toBeTruthy();
    expect(container.querySelector(".composer-note")).toBeNull();
  });
});

describe("feuille : réponse et lueur", () => {
  const css = readFileSync(resolve("src/v2.css"), "utf8");
  it("lueur : trois trajectoires, 14/16/12 s au repos et 6/7/5 s en mission", () => {
    for (const name of ["v2-drift-a", "v2-drift-b", "v2-drift-c"])
      expect(css).toContain(`@keyframes ${name}`);
    expect(css).toMatch(
      /\.glow i:nth-child\(1\) \{[^}]*animation-duration: 14s/,
    );
    expect(css).toMatch(
      /\.glow i:nth-child\(2\) \{[^}]*animation-duration: 16s/,
    );
    expect(css).toMatch(
      /\.glow i:nth-child\(3\) \{[^}]*animation-duration: 12s/,
    );
    expect(css).toMatch(
      /\.run-active \.glow i:nth-child\(2\) \{\s*animation-duration: 7s/,
    );
  });
  it("mesures de la maquette v5 : colonne 720px, texte 15px/1.62, titres 17px", () => {
    expect(css).toMatch(/\.thread \{[^}]*max-width: 720px/);
    expect(css).toMatch(
      /\.reponse \{[^}]*font-size: 15px;[^}]*line-height: 1\.62/,
    );
    expect(css).toMatch(/\.reponse \.markdown h3 \{[^}]*font-size: 17px/);
  });
});
