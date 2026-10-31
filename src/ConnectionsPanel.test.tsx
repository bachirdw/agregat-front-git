import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { appendEvent } from "./api";
import { activityRows, ConnectionsPanel } from "./ConnectionsPanel";
import type { Catalog, Run, RunEvent } from "./types";

const event = (seq: number, type: string, data: object): RunEvent => ({
  seq,
  type,
  data: data as RunEvent["data"],
  at: "2026-10-31T02:17:18.000Z",
});
const tool = (status: string) =>
  event(1, "agent", {
    sessionUpdate: "tool_call",
    toolCallId: "t1",
    title:
      "mcp__platform__browser_navigate(url: https://exemple.invalid/secret)",
    status,
  });

describe("tableau des événements", () => {
  it("une ligne par outil, fermée par sa mise à jour, sans argument", () => {
    const rows = activityRows([
      tool("pending"),
      event(2, "agent", {
        sessionUpdate: "tool_call_update",
        toolCallId: "t1",
        status: "completed",
      }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("Outil : browser_navigate");
    expect(rows[0].status).toBe("Terminé");
    expect(JSON.stringify(rows)).not.toContain("secret");
  });
  it("les messages de l'agent ne font pas de ligne, le plus récent est en haut", () => {
    const rows = activityRows([
      event(1, "session", {}),
      event(2, "agent", { sessionUpdate: "agent_message_chunk" }),
      event(3, "state", { state: "completed" }),
    ]);
    expect(rows.map((row) => row.label)).toEqual([
      "Mission",
      "Session de l’agent ouverte",
    ]);
  });
  it("un accord expiré n'est jamais montré comme un choix de l'utilisateur", () => {
    const rows = activityRows([
      event(1, "permission", { id: "p1", tool: { title: "browser.send" } }),
      event(2, "permission_resolved", {
        id: "p1",
        optionId: null,
        reason: "expired",
      }),
    ]);
    expect(rows[0].status).toBe("Expiré sans réponse");
    expect(rows[0].tone).toBe("failed");
  });
  it("une demande en attente et la cause d'échec sont visibles", () => {
    const rows = activityRows(
      [event(1, "permission", { id: "p1", tool: { title: "browser.send" } })],
      { error: "Agent arrêté" } as Run,
    );
    expect(rows[0].label).toBe("Agent arrêté");
    expect(rows[1].status).toBe("Attend ton clic");
  });
});

describe("panneau Connexions locales", () => {
  const catalog = {
    agents: [
      { id: "fixture", name: "Démonstrateur", simulated: true },
      { id: "codex", name: "Codex", installed: true, compatible: true },
      {
        id: "claude",
        name: "Claude Code",
        installed: true,
        compatible: true,
        probe: { error: "Authentication required" },
      },
    ],
  } as unknown as Catalog;
  it("sans mission : agents et invitation, sans démonstrateur", () => {
    render(<ConnectionsPanel catalog={catalog} events={[]} run={null} />);
    expect(screen.getByText("Connexions locales")).toBeTruthy();
    expect(screen.getByText("Codex")).toBeTruthy();
    expect(screen.queryByText("Démonstrateur")).toBeNull();
    expect(screen.getByText("Claude Code").title).toBe(
      "Authentication required",
    );
    expect(screen.getByText(/Ouvre ou lance une mission/)).toBeTruthy();
  });
  it("avec une mission : tableau des événements", () => {
    render(
      <ConnectionsPanel
        catalog={catalog}
        events={[tool("in_progress")]}
        run={{ id: "r1" } as Run}
      />,
    );
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("Outil : browser_navigate")).toBeTruthy();
    expect(screen.getByText("En cours")).toBeTruthy();
  });
});

describe("mission longue", () => {
  it("les messages de l'agent ne chassent ni les outils ni les états", () => {
    let events: RunEvent[] = [
      event(1, "state", { state: "running" }),
      tool("pending"),
    ];
    for (let seq = 2; seq < 1500; seq++)
      events = appendEvent(
        events,
        event(seq, "agent", { sessionUpdate: "agent_message_chunk" }),
      );
    expect(events.filter((e) => e.type === "state")).toHaveLength(1);
    expect(activityRows(events).map((row) => row.label)).toContain(
      "Outil : browser_navigate",
    );
    expect(events.length).toBeLessThanOrEqual(502);
    expect(events.at(-1)?.seq).toBe(1499);
  });
  it("le total reste borné", () => {
    let events: RunEvent[] = [];
    for (let seq = 0; seq < 30; seq++)
      events = appendEvent(events, event(seq, "state", {}), { maxEvents: 10 });
    expect(events).toHaveLength(10);
    expect(events[0].seq).toBe(20);
  });
});
