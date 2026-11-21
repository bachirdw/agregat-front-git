// sous-agents-internes-21-11 : les sous-agents que l'agent lance lui-même (Codex : « Start / Interact
// with / Complete subagent <nom> », back docs/api-delegation.md 5.1) dans le fil et le panneau, et les
// actions sans détail qu'il transmet pour eux (données FICTIVES, forme vue le 21/11 sur 48087a51).
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { activity, nativeSubagents } from "./Career";
import { trackerItems } from "./Tracker";
import { RunTurn } from "./RunTurn";
import type { Run, RunEvent } from "./types";

let seq = 0;
const ev = (data: Record<string, unknown>): RunEvent =>
  ({
    seq: ++seq,
    runId: "r1",
    type: "agent",
    at: `2026-11-21T12:00:${String(seq).padStart(2, "0")}.000Z`,
    data,
  }) as unknown as RunEvent;
const subagent = (
  id: string,
  verb: "Start" | "Interact with" | "Complete",
  name: string,
  activityKind: string,
) => [
  ev({
    sessionUpdate: "tool_call",
    toolCallId: id,
    title: `${verb} subagent ${name}`,
    kind: "other",
    status: "in_progress",
    rawInput: {
      agentThreadId: "fictif-" + id,
      agentPath: `/root/${name}`,
      activityKind,
    },
  }),
  ev({
    sessionUpdate: "tool_call_update",
    toolCallId: id,
    status: "completed",
  }),
];
const bare = (id: string) =>
  ev({
    sessionUpdate: "tool_call_update",
    toolCallId: id,
    status: "in_progress",
  });
const events = [
  ev({
    sessionUpdate: "tool_call",
    toolCallId: "c1",
    title: "node update-system.mjs check",
    kind: "execute",
    status: "in_progress",
    rawInput: { command: "node update-system.mjs check" },
  }),
  ev({
    sessionUpdate: "tool_call_update",
    toolCallId: "c1",
    status: "completed",
  }),
  ...subagent("s1", "Start", "scan_fictif", "started"),
  bare("exec-1"),
  bare("exec-2"),
  ...subagent("s2", "Start", "tri_fictif", "started"),
  ...subagent("s3", "Interact with", "scan_fictif", "interacted"),
  ...subagent("s4", "Complete", "tri_fictif", "completed"),
  bare("exec-3"),
];
const run = {
  id: "r1",
  prompt: "Mission FICTIVE",
  state: "running",
  mode: "agent",
  agent: "codex",
  pack: "core",
  createdAt: "2026-11-21T12:00:00.000Z",
  plan: { steps: [] },
} as unknown as Run;

afterEach(cleanup);
describe("sous-agents internes de l'agent", () => {
  it("regroupés par nom, avec leur état vu dans le flux et leurs échanges", () => {
    expect(nativeSubagents(activity(events))).toEqual({
      members: [
        { name: "scan_fictif", state: "running", exchanges: 2 },
        { name: "tri_fictif", state: "done", exchanges: 1 },
      ],
      bare: 3,
    });
  });
  it("panneau : leurs appels en français, sans les actions sans détail restées « en cours »", () => {
    const titles = trackerItems(run, events).map((i) => i.title);
    expect(titles).toEqual([
      "Commande",
      "Sous-agent scan_fictif · lancé",
      "Sous-agent tri_fictif · lancé",
      "Sous-agent scan_fictif · relancé",
      "Sous-agent tri_fictif · terminé",
    ]);
    expect(titles).not.toContain("Outil");
  });
  it("fil : une ligne dit les sous-agents internes, leur état et ce que l'agent ne transmet pas", () => {
    render(
      <RunTurn run={run} events={events} busy={false} act={async () => {}} />,
    );
    const line = screen.getByRole("group", {
      name: "Sous-agents internes de Codex",
    });
    expect(line.textContent).toContain("scan_fictif");
    expect(line.textContent).toContain("en cours");
    expect(line.textContent).toContain("tri_fictif");
    expect(line.textContent).toContain("terminé");
    expect(line.textContent).toContain("3 actions sans détail");
    expect(line.textContent).toContain(
      "lancés par l’agent lui-même : modèle et consommation non transmis",
    );
  });
  it("un seul sous-agent : « lancé » au singulier", () => {
    render(
      <RunTurn
        run={run}
        events={events.slice(0, 5)}
        busy={false}
        act={async () => {}}
      />,
    );
    const line = screen.getByRole("group", {
      name: "Sous-agents internes de Codex",
    });
    expect(line.textContent).toContain("1 sous-agent interne de Codex");
    expect(line.textContent).toContain(
      "lancé par l’agent lui-même : modèle et consommation non transmis",
    );
  });
  it("sans sous-agent interne : aucune ligne", () => {
    render(
      <RunTurn
        run={run}
        events={events.slice(0, 2)}
        busy={false}
        act={async () => {}}
      />,
    );
    expect(
      screen.queryByRole("group", { name: /Sous-agents internes/ }),
    ).toBeNull();
  });
});
