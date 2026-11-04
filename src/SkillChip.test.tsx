import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CareerThread, SkillChip } from "./Career";
import type { Run, RunEvent } from "./types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

let seq = 0;
const call = (id: string, title: string): RunEvent => ({
  seq: ++seq,
  type: "agent",
  data: {
    sessionUpdate: "tool_call",
    toolCallId: id,
    title,
    status: "in_progress",
  },
});
const finish = (id: string, status = "completed"): RunEvent => ({
  seq: ++seq,
  type: "agent",
  data: { sessionUpdate: "tool_call_update", toolCallId: id, status },
});
const run = (over: Partial<Run> = {}) =>
  ({
    id: "r1",
    sessionId: null,
    createdAt: "2026-11-04T00:00:00Z",
    prompt: "FICTIF",
    state: "running",
    mode: "agent",
    pack: "career-ops",
    ...over,
  }) as unknown as Run;
const chip = () => document.querySelector(".skill-chip");

describe("pastille de skill", () => {
  it("affiche le nom de l'outil en cours dans un role=status", () => {
    render(
      <SkillChip
        events={[call("t1", "career_read(sources: cv.pdf)")]}
        run={run()}
      />,
    );
    const status = screen.getByRole("status");
    expect(status.className).toBe("skill-chip");
    expect(status.textContent).toContain("career_read");
  });
  it("disparaît 1600 ms après le début de l'appel", () => {
    vi.useFakeTimers();
    render(
      <SkillChip
        events={[call("t1", "career_read(sources: cv.pdf)")]}
        run={run()}
      />,
    );
    act(() => vi.advanceTimersByTime(1599));
    expect(chip()).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(chip()).toBeNull();
  });
  it("absente pendant une demande d'accord", () => {
    render(
      <SkillChip
        events={[call("t1", "career_read(sources: cv.pdf)")]}
        run={run({
          permissions: [{ id: "p1", tool: { title: "Lire" }, options: [] }],
        })}
      />,
    );
    expect(chip()).toBeNull();
  });
  it("réapparaît avec le nom du nouvel appel d'outil", () => {
    vi.useFakeTimers();
    const first = [call("t1", "career_read(sources: cv.pdf)")];
    const { rerender } = render(<SkillChip events={first} run={run()} />);
    act(() => vi.advanceTimersByTime(1600));
    expect(chip()).toBeNull();
    rerender(
      <SkillChip
        events={[
          ...first,
          finish("t1"),
          call("t2", "career_write(file: profile.md)"),
        ]}
        run={run()}
      />,
    );
    expect(chip()?.textContent).toContain("career_write");
    expect(chip()?.textContent).not.toContain("career_read");
  });
  it("aucune pastille quand aucun outil ne tourne", () => {
    render(
      <SkillChip
        events={[call("t1", "career_read(sources: cv.pdf)"), finish("t1")]}
        run={run()}
      />,
    );
    expect(chip()).toBeNull();
  });
  it("conversation : juste avant .agent-turn pendant le tour, absente une fois le run terminé", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    const events = [call("t1", "career_read(sources: cv.pdf)")];
    const { rerender } = render(
      <CareerThread run={run()} runs={[]} events={events}>
        {null}
      </CareerThread>,
    );
    expect(chip()?.textContent).toContain("career_read");
    expect(chip()?.nextElementSibling?.className).toBe("agent-turn");
    rerender(
      <CareerThread run={run({ state: "completed" })} runs={[]} events={events}>
        {null}
      </CareerThread>,
    );
    expect(chip()).toBeNull();
  });
});

// Text of each `@media <query>` block, braces balanced.
function mediaBlocks(css: string, query: string) {
  const blocks: string[] = [];
  let from = css.indexOf(query);
  while (from !== -1) {
    let depth = 0;
    let i = css.indexOf("{", from);
    const start = i;
    for (; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) break;
    }
    blocks.push(css.slice(start, i + 1));
    from = css.indexOf(query, i);
  }
  return blocks.join("\n");
}

describe("feuille v2 : pastille et lueur", () => {
  const css = readFileSync(resolve("src/v2.css"), "utf8");
  it("trois trajectoires distinctes remplacent v2-drift", () => {
    expect(css).not.toMatch(/@keyframes v2-drift\s*\{/);
    for (const [name, move] of [
      ["a", /translate\(8%, 10%\) scale\(1\.15\)/],
      ["b", /translate\(-10%, 8%\) scale\(1\.1\)/],
      ["c", /translate\(6%, -12%\) scale\(1\.2\)/],
    ] as const) {
      const block = css.match(
        new RegExp(`@keyframes v2-drift-${name}\\s*\\{[^}]*\\}`),
      )?.[0];
      expect(block, `v2-drift-${name}`).toMatch(move);
    }
  });
  it("durées 14/16/12 s au repos, 6/7/5 s en mission", () => {
    const rule = (selector: string) =>
      css.match(
        new RegExp(selector.replace(/[.()]/g, "\\$&") + "\\s*\\{([^}]*)\\}"),
      )?.[1] ?? "";
    expect(rule(".glow i:nth-child(1)")).toMatch(/animation-name: v2-drift-a/);
    expect(rule(".glow i:nth-child(1)")).toMatch(/animation-duration: 14s/);
    expect(rule(".glow i:nth-child(2)")).toMatch(/animation-name: v2-drift-b/);
    expect(rule(".glow i:nth-child(2)")).toMatch(/animation-duration: 16s/);
    expect(rule(".glow i:nth-child(3)")).toMatch(/animation-name: v2-drift-c/);
    expect(rule(".glow i:nth-child(3)")).toMatch(/animation-duration: 12s/);
    expect(rule(".run-active .glow i:nth-child(1)")).toMatch(/6s/);
    expect(rule(".run-active .glow i:nth-child(2)")).toMatch(/7s/);
    expect(rule(".run-active .glow i:nth-child(3)")).toMatch(/5s/);
  });
  it("pastille : accent, mouvement réduit et transparence réduite couverts", () => {
    expect(css).toMatch(/\.skill-chip i\s*\{[^}]*background: var\(--accent\)/);
    const motion = mediaBlocks(css, "@media (prefers-reduced-motion: reduce)");
    expect(motion).toMatch(/\.skill-chip,\s*\.skill-chip i/);
    const transparency = mediaBlocks(
      css,
      "@media (prefers-reduced-transparency: reduce)",
    );
    expect(transparency).toMatch(/\.skill-chip/);
  });
});
