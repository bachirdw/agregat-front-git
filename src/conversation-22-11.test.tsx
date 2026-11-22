// conversation-22-11 : défauts vus par le propriétaire en répondant à l'agent (données FICTIVES).
// 1. Les tours précédents s'affichaient dans l'ancien cadre (`career-thread`, `agent-turn`) et en entier.
// 2. Le résultat d'un membre de l'équipe s'affichait en Markdown brut (« | --- | », « ** »).
// 3. Le tour précédent disparaissait puis réapparaissait : il était relu (GET /runs/:id) alors que la
//    liste porte déjà sa réponse (banc scripts/conversation-banc.mjs, serveur ralenti de 1,5 s).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SessionHistory } from "./Career";
import { TeamAnswer } from "./TeamAnswer";
import { api } from "./api";
import type { Run } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(() => new Promise(() => {})),
}));
beforeEach(() => {
  vi.mocked(api).mockClear();
});
afterEach(cleanup);

const tableau = [
  "Offres FICTIVES :",
  "",
  "| Offre | Lieu |",
  "|---|---|",
  "| Poste FICTIF A | Sydney |",
  "| Poste FICTIF B | Melbourne |",
].join("\n");
const tour = (id: string, n: number, extra: Partial<Run> = {}) =>
  ({
    id,
    sessionId: "s-fictive",
    createdAt: `2026-11-22T0${n}:00:00.000Z`,
    prompt: `Question FICTIVE ${n}`,
    state: "completed",
    mode: "agent",
    pack: "core",
    agent: "codex",
    result: { simulated: false, summary: `Réponse FICTIVE ${n}\n\n${tableau}` },
    ...extra,
  }) as unknown as Run;

describe("tours précédents", () => {
  it("s'affichent tout de suite depuis la liste, dans le même style que la réponse, sans relecture", () => {
    const a = tour("a", 1);
    const b = tour("b", 2, { resumedFrom: "a" } as Partial<Run>);
    const { container } = render(<SessionHistory run={b} runs={[b, a]} />);
    // Rendu immédiat : la réponse et son tableau, sans attendre une requête.
    expect(screen.getByText("Question FICTIVE 1")).toBeTruthy();
    expect(screen.getByText(/Réponse FICTIVE 1/)).toBeTruthy();
    expect(container.querySelector("table")).toBeTruthy();
    expect(api).not.toHaveBeenCalledWith(
      "/runs/a",
      undefined,
      expect.anything(),
    );
    // Même présentation que la réponse en cours ; plus l'ancien cadre.
    expect(container.querySelector(".reponse")).toBeTruthy();
    expect(container.querySelector(".agent-turn")).toBeNull();
  });
  it("au-delà d'un tour précédent, les plus anciens se replient en haut ; le dernier reste visible", () => {
    const a = tour("a", 1);
    const b = tour("b", 2, { resumedFrom: "a" } as Partial<Run>);
    const c = tour("c", 3, { resumedFrom: "b" } as Partial<Run>);
    const d = tour("d", 4, { resumedFrom: "c" } as Partial<Run>);
    render(<SessionHistory run={d} runs={[d, c, b, a]} />);
    const bouton = screen.getByRole("button", {
      name: "Afficher les 2 échanges précédents",
    });
    expect(bouton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Question FICTIVE 1")).toBeNull();
    expect(screen.queryByText("Question FICTIVE 2")).toBeNull();
    expect(screen.getByText("Question FICTIVE 3")).toBeTruthy();
    fireEvent.click(bouton);
    expect(screen.getByText("Question FICTIVE 1")).toBeTruthy();
    expect(screen.getByText("Question FICTIVE 2")).toBeTruthy();
  });
});

describe("résultat d'un membre de l'équipe", () => {
  it("le Markdown du résultat est rendu (tableau), pas affiché brut", () => {
    const run = {
      id: "m",
      state: "completed",
      agent: "claude",
      createdAt: "2026-11-22T05:00:00.000Z",
      family: [
        {
          id: "f1",
          titre: "Agences FICTIVES",
          state: "completed",
          resultat:
            "**11 offres** FICTIVES :\n\n| Agence | Offres |\n|---|---|\n| Hays | 5 |\n| Page | 2 |",
        },
      ],
    } as unknown as Run;
    const { container } = render(
      <TeamAnswer run={run} events={[]} summary={null} erreur="" />,
    );
    const carte = screen.getByRole("region", { name: "Ce qui a été trouvé" });
    expect(carte.querySelector("table")).toBeTruthy();
    expect(carte.textContent).not.toMatch(/\|---\||\*\*/);
    expect(container.querySelector("strong")?.textContent).toBe("11 offres");
  });
});
