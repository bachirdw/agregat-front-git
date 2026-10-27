import { afterEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AgentActivity, CareerThread } from "./Career";
import { useFollow } from "./follow";
import type { Run, RunEvent } from "./types";
afterEach(cleanup);

let seq = 0;
const ev = (data: Record<string, unknown>): RunEvent => ({
  seq: ++seq,
  type: "agent",
  data,
});
const text = (t: string) =>
  ev({
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text: t },
  });
const thought = (t: string) =>
  ev({
    sessionUpdate: "agent_thought_chunk",
    content: { type: "text", text: t },
  });
const tool = (id: string, title: string, status = "in_progress", extra = {}) =>
  ev({ sessionUpdate: "tool_call", toolCallId: id, title, status, ...extra });
const update = (id: string, status: string, extra = {}) =>
  ev({ sessionUpdate: "tool_call_update", toolCallId: id, status, ...extra });

describe("conversation (a) : flux et indicateur d'attente", () => {
  it("avant tout événement : « Réflexion… »", () => {
    render(<AgentActivity events={[]} running />);
    expect(screen.getByRole("status").textContent).toBe("Réflexion…");
  });
  it("action en cours : « Exécution… » ; action finie : « Réflexion… »", () => {
    const events = [tool("t1", "browser_snapshot()")];
    const { rerender } = render(<AgentActivity events={events} running />);
    expect(screen.getByRole("status").textContent).toBe("Exécution…");
    rerender(
      <AgentActivity events={[...events, update("t1", "completed")]} running />,
    );
    expect(screen.getByRole("status").textContent).toBe("Réflexion…");
  });
  it("texte en flux : affiché au fur et à mesure, sans indicateur", () => {
    const events = [text("Je cherche ")];
    const { rerender } = render(<AgentActivity events={events} running />);
    expect(screen.getByText("Je cherche")).toBeTruthy();
    rerender(
      <AgentActivity events={[...events, text("des offres.")]} running />,
    );
    expect(screen.getByText("Je cherche des offres.")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("mission finie : aucun indicateur", () => {
    render(<AgentActivity events={[tool("t1", "x()")]} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("conversation (b) : bloc de réflexion repliable", () => {
  it("replié par défaut ; indicateur dans le bloc pendant la réflexion ; « Réflexion » une fois fini", () => {
    const events = [thought("Je compare les offres.")];
    const { rerender, container } = render(
      <AgentActivity events={events} running />,
    );
    const block = () =>
      container.querySelector<HTMLDetailsElement>("details.fold")!;
    expect(block().open).toBe(false);
    expect(block().querySelector("summary")!.textContent).toBe("Réflexion…");
    expect(block().querySelector(".spinner")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<AgentActivity events={[...events, text("Voici.")]} running />);
    expect(block().open).toBe(false);
    expect(block().querySelector("summary")!.textContent).toBe("Réflexion");
    expect(block().querySelector(".spinner")).toBeNull();
  });
  it("au clic, le raisonnement se déplie en texte grisé", () => {
    const { container } = render(
      <AgentActivity events={[thought("Raisonnement FICTIF.")]} />,
    );
    const block = container.querySelector<HTMLDetailsElement>("details.fold")!;
    fireEvent.click(block.querySelector("summary")!);
    expect(block.open).toBe(true);
    expect(block.closest(".activity-thought")).toBeTruthy();
    expect(screen.getByText("Raisonnement FICTIF.")).toBeTruthy();
  });
});

describe("conversation (c) : actions repliables et groupées", () => {
  it("une action = icône d'état + nom court + résumé ; détails dépliés en monospace", () => {
    const events = [
      tool("t1", "browser_click(selector: #continuer)"),
      update("t1", "completed", {
        content: [
          {
            type: "content",
            content: { type: "text", text: "Clic FICTIF fait" },
          },
        ],
      }),
    ];
    const { container } = render(<AgentActivity events={events} />);
    const line = container.querySelector<HTMLDetailsElement>("details.tool")!;
    expect(line.open).toBe(false);
    expect(line.querySelector("summary code")!.textContent).toBe(
      "browser_click",
    );
    expect(line.querySelector(".tool-summary")!.textContent).toBe(
      "selector: #continuer",
    );
    expect(screen.getByRole("img", { name: "réussi" }).textContent).toBe("✓");
    fireEvent.click(line.querySelector("summary")!);
    expect(line.open).toBe(true);
    const pres = [...line.querySelectorAll("pre")].map((p) => p.textContent);
    expect(pres).toEqual(["selector: #continuer", "Clic FICTIF fait"]);
  });
  it("paramètres bruts (Codex) et résultat brut affichés en JSON", () => {
    const events = [
      tool("t1", "mcp.platform.browser_extract", "in_progress", {
        rawInput: {
          server: "platform",
          tool: "browser_extract",
          arguments: { limit: 3 },
        },
      }),
    ];
    const { container, rerender } = render(
      <AgentActivity events={events} running />,
    );
    expect(screen.getByRole("img", { name: "en cours" }).className).toBe(
      "spinner",
    );
    expect(container.querySelector("summary code")!.textContent).toBe(
      "browser_extract",
    );
    expect(container.querySelector(".tool-summary")!.textContent).toBe(
      "limit: 3",
    );
    rerender(
      <AgentActivity
        events={[
          ...events,
          update("t1", "completed", { rawOutput: { count: 2 } }),
        ]}
        running
      />,
    );
    const pres = [...container.querySelectorAll("pre")].map(
      (p) => p.textContent,
    );
    expect(JSON.parse(pres[0]!)).toMatchObject({ arguments: { limit: 3 } });
    expect(JSON.parse(pres[1]!)).toEqual({ count: 2 });
  });
  it("actions consécutives regroupées « N actions », repliées ; un échec reste visible en rouge", async () => {
    const events = [
      tool("a", "browser_snapshot()"),
      update("a", "completed"),
      tool("b", "browser_click(ref: e7)"),
      update("b", "failed", {
        content: [
          {
            type: "content",
            content: { type: "text", text: "Action refusée" },
          },
        ],
      }),
      tool("c", "browser_type(ref: e8)"),
      update("c", "completed"),
    ];
    const { container } = render(<AgentActivity events={events} />);
    const group =
      container.querySelector<HTMLDetailsElement>("details.tool-group")!;
    expect(group.open).toBe(false);
    expect(group.querySelector("summary")!.textContent).toContain(
      "3 actions · 1 en échec",
    );
    const failures = container.querySelector(".tool-failures")!;
    expect(failures.querySelectorAll("details.tool.failed")).toHaveLength(1);
    expect(failures.textContent).toContain("browser_click");
    fireEvent.click(group.querySelector("summary")!);
    expect(group.open).toBe(true);
    expect(group.querySelectorAll("details.tool")).toHaveLength(3);
    // The toggle event is dispatched asynchronously, as in browsers.
    await waitFor(() =>
      expect(container.querySelector(".tool-failures")).toBeNull(),
    );
  });
  it("texte entre deux actions : deux groupes distincts, pas de regroupement", () => {
    const events = [
      tool("a", "x()"),
      tool("b", "y()"),
      text("Bilan."),
      tool("c", "z()"),
    ];
    const { container } = render(<AgentActivity events={events} />);
    expect(container.querySelectorAll("details.tool-group")).toHaveLength(1);
    expect(container.querySelectorAll(".activity > li")).toHaveLength(3);
  });
  it("mission finie : seules les étapes repliées restent, le texte intermédiaire disparaît", () => {
    const events = [
      thought("Pensée."),
      text("Intermédiaire."),
      tool("a", "x()"),
      update("a", "completed"),
    ];
    const { container } = render(<AgentActivity events={events} final />);
    expect(screen.queryByText("Intermédiaire.")).toBeNull();
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);
    expect(container.querySelectorAll("details")).toHaveLength(2);
  });
});

describe("conversation (d) : défilement et Stop", () => {
  function Feed({ items, active = true }: { items: number; active?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const onScroll = useFollow(ref, active, items);
    return <div data-testid="feed" ref={ref} onScroll={onScroll} />;
  }
  // jsdom has no layout: give the container a fixed geometry and record scrollTo.
  function geometry(el: HTMLElement, scrollTop: number) {
    Object.defineProperties(el, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 200 },
      scrollTop: { configurable: true, writable: true, value: scrollTop },
    });
    const calls: unknown[] = [];
    el.scrollTo = ((options: unknown) =>
      calls.push(options)) as typeof el.scrollTo;
    return calls;
  }
  // jsdom implements no scrolling at all.
  Element.prototype.scrollTo ??= () => {};
  it("suit le bas tant que l'utilisateur n'a pas remonté, puis ne force plus", () => {
    const { rerender } = render(<Feed items={1} />);
    const feed = screen.getByTestId("feed");
    const calls = geometry(feed, 800);
    rerender(<Feed items={2} />);
    expect(calls).toEqual([{ top: 1000 }]);
    feed.scrollTop = 300; // the user scrolls up
    fireEvent.scroll(feed);
    rerender(<Feed items={3} />);
    expect(calls).toHaveLength(1);
    feed.scrollTop = 790; // back near the bottom
    fireEvent.scroll(feed);
    rerender(<Feed items={4} />);
    expect(calls).toHaveLength(2);
  });
  it("hors mission : aucun défilement forcé", () => {
    const { rerender } = render(<Feed items={1} active={false} />);
    const calls = geometry(screen.getByTestId("feed"), 800);
    rerender(<Feed items={2} active={false} />);
    expect(calls).toEqual([]);
  });
  it("bouton Stop visible pendant l'exécution seulement, et il arrête la mission", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    const run = (state: string) =>
      ({
        id: "r1",
        sessionId: null,
        createdAt: "2026-10-27T00:00:00Z",
        prompt: "FICTIF",
        state,
      }) as unknown as Run;
    const stop = vi.fn();
    const { rerender } = render(
      <CareerThread run={run("running")} runs={[]} events={[]} stop={stop}>
        {null}
      </CareerThread>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Stop/ }));
    expect(stop).toHaveBeenCalledTimes(1);
    rerender(
      <CareerThread run={run("cancelled")} runs={[]} events={[]} stop={stop}>
        {null}
      </CareerThread>,
    );
    expect(screen.queryByRole("button", { name: /Stop/ })).toBeNull();
    vi.unstubAllGlobals();
  });
});
