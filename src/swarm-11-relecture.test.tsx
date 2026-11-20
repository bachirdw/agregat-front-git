// swarm-11, relecture indépendante : cas que les tests du codeur ne couvraient pas (sous-mission ouverte depuis le
// bloc Équipe, compteurs mal typés sur une vraie ligne, agent sous limite déjà choisi, textes d'agents hostiles).
// Toutes les valeurs sont FICTIVES.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import App from "./App";
import { api } from "./api";
import { Composer } from "./Composer";
import { TeamBlock } from "./Team";
import { avecDetailsDesLignes, missionsDeLaListe } from "./status";
import type { Catalog, MissionInput, Run } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
  watchRun: vi.fn(() => () => {}),
}));

const catalog: Catalog = {
  live: false,
  agents: [],
  packs: [],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
};

beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false })),
  );
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const id = (n: string) => `00000000-0000-4000-8000-0000000012${n}`;
const row = (n: string, prompt: string, state: string, extra = {}) =>
  ({
    id: id(n),
    prompt,
    state,
    mode: "agent",
    pack: "pack-fictif",
    agent: "agent-a",
    createdAt: `2026-11-21T00:00:${n}.000Z`,
    plan: { workflow: null, steps: [], cost: { lines: [] } },
    simulated: false,
    ...extra,
  }) as unknown as Run;
const child = (n: string, mere: string, state: string, famille = {}) =>
  row(n, `Sous-mission FICTIVE ${n}`, state, {
    famille: { racine: mere, mere, titre: `Tâche ${n}`, ...famille },
  });

function serve(rows: Run[], opened: Run[] = []) {
  vi.mocked(api).mockImplementation((path, body) => {
    if (path === "/catalog") return Promise.resolve(catalog) as never;
    if (path === "/runs" && !body) return Promise.resolve(rows) as never;
    const hit = opened.find((r) => path.split("?")[0] === `/runs/${r.id}`);
    return (hit ? Promise.resolve(hit) : new Promise(() => {})) as never;
  });
  render(<App />);
}
const listRow = (name: RegExp) =>
  screen.getByRole("button", { name }).closest(".mission-link") as HTMLElement;

describe("relecture : liste", () => {
  it("compteurs `equipe` mal typés sur une vraie ligne : pas de « NaN », pas d'activité inventée", async () => {
    const odd = row("10", "Mère FICTIVE bizarre", "completed", {
      equipe: { membres: 3, enCours: NaN, teDemande: "2", echecs: -4 },
    });
    const broken = row("11", "Mère FICTIVE cassée", "completed", {
      equipe: { membres: "3", teDemande: 1 },
    });
    serve([odd, broken]);
    await screen.findByRole("button", { name: /Mère FICTIVE bizarre/ });
    const a = listRow(/Mère FICTIVE bizarre/);
    expect(a.querySelector(".team-summary")!.textContent).toBe("3 membres");
    expect(a.querySelector("i.dot")!.getAttribute("data-activite")).toBe(
      "aucune",
    );
    expect(a.textContent).not.toMatch(/NaN|-4|undefined/);
    // `membres` not a number and no sub-mission row: the line of before.
    const b = listRow(/Mère FICTIVE cassée/);
    expect(b.querySelector(".team-summary")).toBeNull();
    expect(b.querySelector("i.dot")!.hasAttribute("data-activite")).toBe(false);
  });

  it("une sous-mission ouverte depuis le bloc Équipe s'affiche, sans revenir dans la liste", async () => {
    const mother = row("20", "Mère FICTIVE", "running");
    const kid = child("21", mother.id, "running", { motif: "Note FICTIVE" });
    const openedMother = {
      ...mother,
      multiAgent: true,
      family: [
        { id: kid.id, titre: "Tâche 21", agent: "agent-a", state: "running" },
      ],
    } as Run;
    const openedKid = { ...kid, title: "Sous-mission FICTIVE ouverte" } as Run;
    // reponse-04 : l'équipe est dans le panneau Activité, plus dans le fil. À 1440 px le panneau est
    // ouvert par défaut et la barre latérale (la liste vérifiée plus bas) reste affichée.
    const width = (value: number) =>
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value,
      });
    width(1440);
    try {
      serve([mother, kid], [openedMother, openedKid]);
      fireEvent.click(
        await screen.findByRole("button", { name: /Mère FICTIVE/ }),
      );
      const team = await screen.findByRole("region", { name: "Équipe" });
      fireEvent.click(
        within(team).getByRole("button", {
          name: "Ouvrir la sous-mission Tâche 21",
        }),
      );
      expect(vi.mocked(api)).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^/runs/${kid.id}`)),
      );
      // The list still shows the mother alone, and no row claims to be the open one.
      const list = document.querySelector(".mission-list")!;
      expect(list.querySelectorAll(".mission-link").length).toBe(1);
      expect(list.textContent).not.toMatch(/Sous-mission FICTIVE/);
    } finally {
      width(1024);
    }
  });
});

describe("relecture : choix de l'agent", () => {
  it("un agent sous limite déjà choisi reste la valeur du sélecteur, malgré le nouvel ordre", () => {
    const input = {
      prompt: "Objectif FICTIF",
      agent: "agent-a",
      pack: "auto",
      skills: [],
      model: "",
      agentMode: "",
      browser: "auto",
      browserDomains: "",
      budgetCents: 0,
      mode: "agent",
      workflow: "auto",
      attachments: [],
    } as MissionInput;
    const onChange = vi.fn();
    render(
      <Composer
        catalog={{
          ...catalog,
          live: true,
          agents: [
            {
              id: "agent-a",
              name: "AGENT-A",
              installed: true,
              compatible: true,
              etat: "limite",
              jusqua: "pas une date",
            },
            {
              id: "agent-b",
              name: "AGENT-B",
              installed: true,
              compatible: true,
            },
          ],
        }}
        input={input}
        onChange={onChange}
        onPlan={vi.fn()}
        busy={false}
      />,
    );
    const select = screen.getByLabelText("Agent") as HTMLSelectElement;
    expect(select.value).toBe("agent-a");
    expect(select.selectedOptions[0].textContent).toBe(
      "AGENT-A · limite d’usage",
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("relecture : textes d'agents", () => {
  it("motif très long, clés `__proto__` : texte brut, aucune pollution d'objet", () => {
    const long = "<script>x</script>".repeat(2000);
    const rows = JSON.parse(
      JSON.stringify([
        {
          id: "k",
          famille: { mere: "m", motif: long, agentPrevu: "agent-b" },
        },
      ]).replace('"famille":{', '"famille":{"__proto__":{"pollue":1},'),
    );
    const run = {
      id: "m",
      family: [
        { id: "k", titre: "Tâche K", agent: "agent-a", state: "running" },
      ],
    };
    const out = avecDetailsDesLignes(run, rows);
    expect(({} as Record<string, unknown>).pollue).toBeUndefined();
    expect(out.family[0]).toMatchObject({ motif: long, agentPrevu: "agent-b" });
    expect(missionsDeLaListe(rows as never).length).toBe(1);
    render(<TeamBlock run={out as unknown as Run} />);
    const item = screen.getByRole("listitem", { name: "Tâche K" });
    expect(item.querySelector("script")).toBeNull();
    expect(item.querySelector(".team-motif")!.textContent).toBe(long);
  });
});
