import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AgentActivity } from "./Career";
import type { RunEvent } from "./types";
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
