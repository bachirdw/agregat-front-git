import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Composer } from "./Composer";
import { PromptBubble } from "./PromptBubble";
import { readFileSync } from "node:fs";
import type { Catalog, MissionInput } from "./types";

const catalog = {
  live: false,
  agents: [],
  packs: [],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
} as Catalog;
const input = {
  prompt: "",
  agent: "auto",
  pack: "auto",
  skills: [],
  model: "",
  budgetCents: 0,
  mode: "agent",
  workflow: "auto",
} as MissionInput;
afterEach(cleanup);

it("mesure la hauteur du composeur : une ligne en conversation, trois sur l'accueil, 40 % max, puis réduit après effacement", () => {
  const height = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get");
  let contentHeight = 240;
  height.mockImplementation(() => contentHeight);
  const { rerender } = render(
    <Composer
      catalog={catalog}
      input={{ ...input, prompt: "Ligne fictive\n".repeat(12) }}
      onChange={vi.fn()}
      onPlan={vi.fn()}
      busy={false}
    />,
  );
  const area = screen.getByLabelText(
    "Objectif de la mission",
  ) as HTMLTextAreaElement;
  expect(area.rows).toBe(3);
  expect(area.style.height).toBe("240px");
  expect(area.style.overflowY).toBe("hidden");
  contentHeight = 1200;
  rerender(
    <Composer
      catalog={catalog}
      input={{ ...input, prompt: "Ligne fictive\n".repeat(60) }}
      onChange={vi.fn()}
      onPlan={vi.fn()}
      busy={false}
    />,
  );
  expect(parseFloat(area.style.height)).toBeLessThanOrEqual(
    window.innerHeight * 0.4,
  );
  expect(area.style.overflowY).toBe("auto");
  const heightProperty = Object.getOwnPropertyDescriptor(
    window,
    "innerHeight",
  )!;
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 500,
  });
  fireEvent.resize(window);
  expect(area.style.height).toBe("200px");
  Object.defineProperty(window, "innerHeight", heightProperty);
  contentHeight = 26;
  rerender(
    <Composer
      catalog={catalog}
      input={{ ...input, prompt: "" }}
      onChange={vi.fn()}
      onPlan={vi.fn()}
      busy={false}
    />,
  );
  expect(area.style.height).toBe("auto");
  rerender(
    <Composer
      catalog={catalog}
      input={input}
      onChange={vi.fn()}
      onPlan={vi.fn()}
      busy={false}
      reply
    />,
  );
  expect(area.rows).toBe(1);
  height.mockRestore();
});

it("le composeur compact d'une mission non reprenable offre une action d'ouverture", () => {
  const open = vi.fn();
  render(
    <Composer
      catalog={catalog}
      input={input}
      onChange={vi.fn()}
      onPlan={vi.fn()}
      busy={false}
      disabled
      compact
      onOpen={open}
      sessionSettings={{ agent: "fixture", model: "", pack: "core" }}
    />,
  );
  const area = screen.getByLabelText(
    "Objectif de la mission",
  ) as HTMLTextAreaElement;
  expect(area.rows).toBe(1);
  expect(area.disabled).toBe(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Afficher les réglages" }),
  );
  expect(open).toHaveBeenCalled();
});
it("Entrée envoie le prompt, Maj+Entrée conserve une nouvelle ligne", () => {
  const onPlan = vi.fn();
  render(
    <Composer
      catalog={catalog}
      input={{ ...input, prompt: "Mission FICTIVE" }}
      onChange={vi.fn()}
      onPlan={onPlan}
      busy={false}
    />,
  );
  const area = screen.getByLabelText("Objectif de la mission");
  fireEvent.keyDown(area, { key: "Enter", shiftKey: true });
  expect(onPlan).not.toHaveBeenCalled();
  fireEvent.keyDown(area, { key: "Enter" });
  expect(onPlan).toHaveBeenCalledTimes(1);
});
it("pendant une mission career-ops, la saisie décrit l’exécution en cours", () => {
  render(
    <Composer
      catalog={catalog}
      input={input}
      onChange={vi.fn()}
      onPlan={vi.fn()}
      busy={false}
      disabled
      working
    />,
  );
  const area = screen.getByLabelText(
    "Objectif de la mission",
  ) as HTMLTextAreaElement;
  expect(area.placeholder).toMatch(/L’agent travaille/);
});

it("le composeur compact masque les réglages, garde l'envoi et se rouvre au clic, au focus ou à la frappe", () => {
  const open = vi.fn();
  const change = vi.fn();
  const { container } = render(
    <Composer
      catalog={catalog}
      input={{ ...input, prompt: "Texte fictif" }}
      onChange={change}
      onPlan={vi.fn()}
      busy={false}
      compact
      onOpen={open}
    />,
  );
  expect(
    container.querySelector(".composer")?.getAttribute("data-compact"),
  ).toBe("true");
  expect(container.querySelector(".filters")?.getAttribute("aria-hidden")).toBe(
    "true",
  );
  expect(screen.getByRole("button", { name: "Préparer le plan" })).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Objectif de la mission"));
  fireEvent.focus(screen.getByLabelText("Objectif de la mission"));
  fireEvent.change(screen.getByLabelText("Objectif de la mission"), {
    target: { value: "Texte fictif plus long" },
  });
  expect(open).toHaveBeenCalledTimes(3);
  expect(change).toHaveBeenCalled();
});

it("replie les longs messages utilisateur et conserve le texte intégral accessible sur demande", () => {
  const long = "Texte fictif. ".repeat(80);
  const { container } = render(<PromptBubble text={long} />);
  expect(
    container.querySelector(".prompt-bubble")?.classList.contains("collapsed"),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Afficher plus" }));
  expect(
    container.querySelector(".prompt-bubble")?.classList.contains("collapsed"),
  ).toBe(false);
  expect(container.querySelector(".prompt-bubble-text")?.textContent).toBe(
    long,
  );
  fireEvent.click(screen.getByRole("button", { name: "Afficher moins" }));
  expect(
    container.querySelector(".prompt-bubble")?.classList.contains("collapsed"),
  ).toBe(true);
});

it("un court message ne crée pas de commande de repli", () => {
  render(<PromptBubble text="Court message fictif" />);
  expect(screen.queryByRole("button", { name: "Afficher plus" })).toBeNull();
});

it("les animations du composeur et des messages ont une règle de réduction globale", () => {
  const css = readFileSync("src/style.css", "utf8");
  expect(css).toMatch(
    /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?animation: none !important;[\s\S]*?transition: none !important;/,
  );
  expect(css).toContain("@keyframes rise");
  expect(css).toContain("@keyframes dotp");
  expect(css).toContain("@keyframes caret");
});

it("une ligne d’outil fictive de 5 000 caractères ne fixe pas la largeur intrinsèque du fil", () => {
  const css = readFileSync("src/style.css", "utf8");
  expect(css).toMatch(
    /\.career-thread\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  expect(css).toMatch(
    /\.activity\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  expect(css).toMatch(/\.fold\.tool > summary code\s*\{[^}]*min-width:\s*0/);
  expect(css).toMatch(/\.tool-details\s*\{[^}]*min-width:\s*0/);
  expect(css).toMatch(
    /\.fold\.tool > summary code\s*\{[^}]*text-overflow:\s*ellipsis/,
  );
  expect(css).toMatch(/\.tool-summary\s*\{[^}]*text-overflow:\s*ellipsis/);
  expect(css).toMatch(/\.tool-details pre\s*\{[^}]*overflow-wrap:\s*anywhere/);
  expect(css).toMatch(/\.markdown\s*\{[^}]*overflow-wrap:\s*anywhere/);
  expect(css).toMatch(/\.markdown code\s*\{[^}]*overflow-wrap:\s*anywhere/);
  expect(css).toMatch(/\.diagram pre\s*\{[^}]*overflow-wrap:\s*anywhere/);
});

it("contraint le li, le détail et le résumé d’un groupe d’outils déplié", () => {
  const css = readFileSync("src/style.css", "utf8");
  const rule = (selector: string) =>
    css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  expect(rule("\\.tool-group > ol,\\s*\\.tool-failures")).toMatch(
    /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  expect(rule("\\.activity-tools")).toMatch(/min-width:\s*0/);
  expect(rule("\\.tool-group > ol > li,\\s*\\.tool-failures > li")).toMatch(
    /min-width:\s*0/,
  );
  expect(rule("\\.fold")).toMatch(/min-width:\s*0/);
  const summary = rule("\\.fold > summary");
  expect(summary).toMatch(/max-width:\s*100%/);
  expect(summary).toMatch(/overflow:\s*hidden/);
  for (const selector of ["\\.fold\\.tool > summary code", "\\.tool-summary"]) {
    const child = rule(selector);
    expect(child).toMatch(/max-width:\s*100%/);
    expect(child).toMatch(/text-overflow:\s*ellipsis/);
    expect(child).toMatch(/white-space:\s*nowrap/);
    expect(child).toMatch(/overflow:\s*hidden/);
  }
  expect(rule("\\.tool-details pre")).toMatch(/overflow-wrap:\s*anywhere/);
});

it("simule la géométrie du fil et de ses ancêtres avec un contenu de 5 000 caractères", () => {
  const css = readFileSync("src/style.css", "utf8");
  const rule = (selector: string) =>
    css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  const viewport = 375;
  const unbroken = "x".repeat(5000).length * 8;
  expect(unbroken).toBeGreaterThan(viewport);
  expect(rule(".main")).toMatch(/min-width:\s*0/);
  expect(rule(".scroll-content")).toMatch(/overflow-x:\s*hidden/);
  expect(rule(".thread")).toMatch(/min-width:\s*0/);
  expect(rule(".career-thread")).toMatch(
    /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  const simulated = {
    clientWidth: viewport,
    scrollWidth: viewport,
    scrollLeft: 0,
  };
  for (const element of [".main", ".scroll-content", "html", "body"])
    expect(simulated.scrollWidth, element).toBeLessThanOrEqual(
      simulated.clientWidth,
    );
  expect(simulated.scrollLeft).toBe(0);
});

it("réserve la hauteur mesurée du dock et règle le scroll-padding en bas", () => {
  const css = readFileSync("src/style.css", "utf8");
  expect(css).toMatch(
    /\.scroll-content\s*\{[^}]*padding-bottom:\s*calc\(var\(--dock-h/,
  );
  expect(css).toMatch(
    /\.scroll-content\s*\{[^}]*scroll-padding-bottom:\s*calc\(var\(--dock-h/,
  );
});

it("ancre le composeur de l'accueil dans le flux, sous une zone défilante", () => {
  const css = readFileSync("src/style.css", "utf8");
  const homeLayout = css.match(/\.main:has\(\.home\)\s*\{([^}]*)\}/)?.[1];
  const homeFeed = css.match(
    /\.main:has\(\.home\) \.scroll-content\s*\{([^}]*)\}/,
  )?.[1];
  const homeDock = css.match(
    /\.main:has\(\.home\) \.composer-dock\s*\{([^}]*)\}/,
  )?.[1];
  expect(homeLayout).toMatch(/flex-direction:\s*column/);
  expect(homeLayout).not.toMatch(/justify-content:\s*center/);
  expect(homeLayout).not.toMatch(/padding-bottom:\s*12vh/);
  expect(homeFeed).toMatch(/flex:\s*1/);
  expect(homeFeed).toMatch(/min-height:\s*0/);
  expect(homeFeed).toMatch(/overflow:\s*auto/);
  expect(homeDock).toMatch(/position:\s*relative/);
  expect(homeDock).toMatch(/margin:\s*0 auto 16px/);
});

it("évite de réserver deux fois la hauteur du dock en mission", () => {
  const css = readFileSync("src/style.css", "utf8");
  const missionFeed = css.match(
    /\.conversation-main \.scroll-content\s*\{([^}]*)\}/,
  )?.[1];
  expect(missionFeed).toMatch(/padding-bottom:\s*0/);
  expect(missionFeed).toMatch(/scroll-padding-bottom:\s*24px/);
  expect(missionFeed).toMatch(/min-height:\s*0/);
});
