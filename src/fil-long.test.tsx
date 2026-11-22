// fil-long-22-11 : une conversation longue garde ses derniers messages visibles ; les plus anciens se
// replient en haut (« Afficher les N messages précédents »), jamais en bas. Données FICTIVES.
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RunTurn } from "./RunTurn";
import type { Run, RunEvent } from "./types";

afterEach(cleanup);
const run = {
  id: "r1",
  prompt: "Mission FICTIVE",
  state: "running",
  mode: "agent",
  agent: "codex",
  pack: "core",
  createdAt: "2026-11-22T12:00:00.000Z",
  plan: { steps: [] },
} as unknown as Run;
let seq = 0;
const at = "2026-11-22T12:00:00.000Z";
const text = (t: string) =>
  ({
    seq: ++seq,
    runId: "r1",
    type: "agent",
    at,
    data: {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: t },
    },
  }) as unknown as RunEvent;
const owner = (n: number) =>
  ({
    seq: ++seq,
    runId: "r1",
    type: "owner_message",
    at,
    data: {
      id: "m" + n,
      at,
      state: "delivered",
      via: "steering",
      deliveredAt: at,
      text: `Message FICTIF ${n}`,
    },
  }) as unknown as RunEvent;
// 8 textes de l'agent séparés par 7 messages du propriétaire : 15 messages dans le fil.
const events = Array.from({ length: 8 }, (_, i) =>
  i < 7
    ? [text(`Texte FICTIF ${i + 1}`), owner(i + 1)]
    : [text("Texte FICTIF 8")],
).flat();

it("fil long : les 12 derniers visibles, les 3 plus anciens repliés en haut", () => {
  const { container } = render(
    <RunTurn run={run} events={events} busy={false} act={async () => {}} />,
  );
  const toggle = screen.getByRole("button", {
    name: "Afficher les 3 messages précédents",
  });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  // Le bouton est au-dessus des messages visibles.
  const visible = screen.getByText("Texte FICTIF 8");
  expect(
    toggle.compareDocumentPosition(visible) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.queryByText("Texte FICTIF 1")).toBeNull();
  expect(screen.queryByText("Message FICTIF 1")).toBeNull();
  // Les 3 plus anciens : Texte 1, Message 1, Texte 2 ; le fil visible commence au Message 2.
  expect(screen.queryByText("Texte FICTIF 2")).toBeNull();
  expect(screen.getByText("Message FICTIF 2")).toBeTruthy();
  expect(container.querySelector(".deroule")).toBeNull();
  fireEvent.click(toggle);
  expect(screen.getByText("Texte FICTIF 1")).toBeTruthy();
  expect(screen.getByText("Message FICTIF 1")).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "Masquer les messages précédents" })
      .getAttribute("aria-expanded"),
  ).toBe("true");
});

it("fil court : rien de replié", () => {
  render(
    <RunTurn
      run={run}
      events={events.slice(0, 6)}
      busy={false}
      act={async () => {}}
    />,
  );
  expect(
    screen.queryByRole("button", { name: /messages précédents/ }),
  ).toBeNull();
  expect(screen.getByText("Texte FICTIF 1")).toBeTruthy();
});
