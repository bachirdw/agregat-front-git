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

describe("session perdue", () => {
  it("la reprise impossible apparaît dans le tableau", () => {
    const rows = activityRows([event(1, "session_reset", {})]);
    expect(rows[0].label).toMatch(/Session précédente introuvable/);
  });
  it("un rechargement échoué pour une autre cause n'est pas dit introuvable", () => {
    const rows = activityRows([event(1, "session_reset", { lost: false })]);
    expect(rows[0].label).toMatch(/Session précédente non rechargée/);
    expect(rows[0].label).not.toMatch(/introuvable/);
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
  it("un long message reste entier du premier au dernier morceau", () => {
    const chunk = (seq: number, sessionUpdate = "agent_message_chunk") =>
      event(seq, "agent", {
        sessionUpdate,
        content: { type: "text", text: `m${seq} ` },
      });
    let events: RunEvent[] = [];
    for (let seq = 1; seq <= 1500; seq++)
      events = appendEvent(events, chunk(seq));
    expect(events).toHaveLength(1);
    expect(events[0].seq).toBe(1);
    const text = (events[0].data.content as { text: string }).text;
    expect(text.startsWith("m1 m2 ")).toBe(true);
    expect(text.endsWith("m1500 ")).toBe(true);
    events = appendEvent(events, chunk(1501, "agent_thought_chunk"));
    expect(events).toHaveLength(2);
  });
  it("à la limite du total, le texte passe avant les autres événements", () => {
    let events: RunEvent[] = [
      event(1, "agent", {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "à garder" },
      }),
    ];
    for (let seq = 2; seq < 30; seq++)
      events = appendEvent(events, event(seq, "state", {}), { maxEvents: 10 });
    expect(events).toHaveLength(10);
    expect(events[0].seq).toBe(1);
  });
  it("le total reste borné", () => {
    let events: RunEvent[] = [];
    for (let seq = 0; seq < 30; seq++)
      events = appendEvent(events, event(seq, "state", {}), { maxEvents: 10 });
    expect(events).toHaveLength(10);
    expect(events[0].seq).toBe(20);
  });
});

describe("accord de mission", () => {
  it("l'accord donné et chaque envoi accordé ont leur ligne, cible sans requête ni fragment", () => {
    const rows = activityRows([
      event(1, "send_grant", { scope: "mission" }),
      event(2, "send_auto", {
        capability: "browser_click",
        target: {
          method: "POST",
          host: "jobs.example.test",
          path: "/apply/42?token=FICTIF#etape",
        },
        label: "Envoyer la candidature",
        grant: "mission",
      }),
      event(3, "send_auto", {
        capability: "browser_click",
        target: { method: "POST", host: "mail.example.test", path: "/send" },
        grant: "mission",
      }),
    ]);
    expect(rows.map((r) => [r.label, r.status])).toEqual([
      [
        "Envoi accordé par l’accord de mission : POST mail.example.test/send",
        "Accordé",
      ],
      [
        "Envoi accordé par l’accord de mission : POST jobs.example.test/apply/42 · « Envoyer la candidature »",
        "Accordé",
      ],
      ["Accord de mission donné : envois suivants sans demande", "Accordé"],
    ]);
    expect(JSON.stringify(rows)).not.toContain("FICTIF");
    expect(JSON.stringify(rows)).not.toContain("etape");
  });
});

describe("accord de mission : cas limites du journal", () => {
  const rowsOf = (data: object) =>
    activityRows([event(1, "send_auto", data)]).map((r) => r.label);
  it("sans cible, cible partielle, chemin sans barre, cible mal formée", () => {
    expect(rowsOf({ grant: "mission" })).toEqual([
      "Envoi accordé par l’accord de mission",
    ]);
    expect(rowsOf({ target: { host: "a.example.test" } })).toEqual([
      "Envoi accordé par l’accord de mission : a.example.test",
    ]);
    expect(
      rowsOf({ target: { host: "a.example.test", path: "x?k=FICTIF" } }),
    ).toEqual(["Envoi accordé par l’accord de mission : a.example.test/x"]);
    expect(rowsOf({ target: null })).toEqual([
      "Envoi accordé par l’accord de mission",
    ]);
    expect(rowsOf({ target: "chaîne" })).toEqual([
      "Envoi accordé par l’accord de mission",
    ]);
  });
  it("libellé très long : conservé entier dans la ligne, sans exception", () => {
    const label = "L".repeat(5000);
    const rows = rowsOf({
      target: { method: "POST", host: "h.example.test", path: "/p" },
      label,
    });
    expect(rows[0]).toContain(label);
  });
});

describe("libelles-14-11 : écritures réseau de la page", () => {
  it("browser.send accordé automatiquement : écriture réseau avec l'hôte ; les autres gardent leur libellé", () => {
    const rows = activityRows([
      event(1, "permission_auto", {
        capability: "browser.send",
        host: "collector.example.test",
      }),
      event(2, "permission_auto", { capability: "browser.send" }),
      event(3, "permission_auto", { capability: "browser.navigate" }),
    ]);
    const labels = rows.map((r) => [r.label, r.status]);
    expect(labels).toContainEqual([
      "Écriture réseau de la page : collector.example.test",
      "Accordé",
    ]);
    expect(labels).toContainEqual(["Écriture réseau de la page", "Accordé"]);
    expect(labels).toContainEqual([
      "Accord automatique : browser.navigate",
      "Accordé",
    ]);
    expect(JSON.stringify(rows)).not.toContain(
      "Accord automatique : browser.send",
    );
  });
});

describe("review-libelles-14-11 : écritures réseau, cas limites", () => {
  it("hôte vide ou non textuel jamais affiché ; nom d'outil préfixé reconnu ; autre capacité inchangée", () => {
    const rows = activityRows([
      event(1, "permission_auto", { capability: "browser.send", host: "" }),
      event(2, "permission_auto", {
        capability: "browser.send",
        host: { url: "https://x.example.test/?q=FICTIF" },
      }),
      event(3, "permission_auto", {
        capability: "mcp__platform__browser.send",
        host: "jobs.example.test",
      }),
      event(4, "permission_auto", {
        capability: "browser.click",
        host: "ignore.example.test",
      }),
    ]);
    const labels = rows.map((r) => r.label);
    expect(
      labels.filter((l) => l === "Écriture réseau de la page"),
    ).toHaveLength(2);
    expect(labels).toContain("Écriture réseau de la page : jobs.example.test");
    expect(labels).toContain("Accord automatique : browser.click");
    expect(JSON.stringify(rows)).not.toContain("FICTIF");
    expect(JSON.stringify(rows)).not.toContain("ignore.example.test");
  });
});
