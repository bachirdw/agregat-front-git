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

it("réserve la hauteur mesurée du dock et règle le scroll-padding en bas", () => {
  const css = readFileSync("src/style.css", "utf8");
  expect(css).toMatch(
    /\.scroll-content\s*\{[^}]*padding-bottom:\s*calc\(var\(--dock-h/,
  );
  expect(css).toMatch(
    /\.scroll-content\s*\{[^}]*scroll-padding-bottom:\s*calc\(var\(--dock-h/,
  );
});
