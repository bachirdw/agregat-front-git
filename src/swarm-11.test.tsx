// swarm-11 : liste des missions (une activité par ligne), accord court, état réel des agents, motif et agent
// prévu dans le bloc Équipe. Shapes from the back's contracts (agregat-back-swarm docs/api-equipe-vue.md,
// api-agents-etat.md, api-delegation.md); every value below is FICTIF, no agent name of the platform.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import App from "./App";
import { api } from "./api";
import { Composer } from "./Composer";
import { TeamBlock } from "./Team";
import {
  activiteListe,
  avecDetailsDesLignes,
  missionsDeLaListe,
  resumeListe,
  texteJetons,
  texteResume,
} from "./status";
import { agentStateLabel, agentsInOrder, agentWarning } from "./agentStatus";
import type { Agent, Catalog, MissionInput, Run } from "./types";

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

const id = (n: string) => `00000000-0000-4000-8000-0000000011${n}`;
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

function serve(rows: Run[], open?: Run) {
  vi.mocked(api).mockImplementation((path, body) =>
    path === "/catalog"
      ? (Promise.resolve(catalog) as never)
      : path === "/runs" && !body
        ? (Promise.resolve(rows) as never)
        : open && path.split("?")[0] === `/runs/${open.id}`
          ? (Promise.resolve(open) as never)
          : (new Promise(() => {}) as never),
  );
  render(<App />);
}
const listRow = (name: RegExp) =>
  screen.getByRole("button", { name }).closest(".mission-link") as HTMLElement;

describe("liste : seulement les missions, l'équipe en un mot", () => {
  it("une sous-mission n'apparaît plus ; la mère affiche le résumé calculé et une seule pastille", async () => {
    const mother = row("10", "Mère FICTIVE", "running");
    serve([
      child("11", mother.id, "running"),
      child("12", mother.id, "awaiting_owner"),
      child("13", mother.id, "completed"),
      mother,
    ]);
    await screen.findByRole("button", { name: /Mère FICTIVE/ });
    expect(screen.queryByText(/Sous-mission FICTIVE/)).toBeNull();
    expect(
      document.querySelectorAll(".mission-list .mission-link").length,
    ).toBe(1);
    const item = listRow(/Mère FICTIVE/);
    expect(item.querySelector(".team-summary")!.textContent).toBe(
      "3 membres · 1 te demande",
    );
    const dots = item.querySelectorAll("i.dot");
    expect(dots.length).toBe(1);
    expect(dots[0].className).toBe("dot awaiting_owner");
    expect(dots[0].getAttribute("data-activite")).toBe("te_demande");
    // The accessible name says what is drawn: no second activity, no hidden state label.
    expect(item.textContent).toBe("Mère FICTIVE3 membres · 1 te demande");
    expect(item.querySelector(".owner-turn")).toBeNull();
  });

  it("champ `equipe` du back : la bonne pastille pour chacune des trois priorités", async () => {
    const asks = row("20", "Mère A FICTIVE", "running", {
      equipe: { membres: 3, enCours: 1, finis: 0, echecs: 1, teDemande: 1 },
    });
    const runs = row("21", "Mère B FICTIVE", "running", {
      equipe: { membres: 3, enCours: 2, finis: 0, echecs: 1, teDemande: 0 },
    });
    const failed = row("22", "Mère C FICTIVE", "completed", {
      equipe: { membres: 2, enCours: 0, finis: 1, echecs: 1, teDemande: 0 },
    });
    serve([asks, runs, failed]);
    await screen.findByRole("button", { name: /Mère A FICTIVE/ });
    const look = (name: RegExp) => {
      const item = listRow(name);
      return [
        item.querySelector("i.dot")!.getAttribute("data-activite"),
        item.querySelector("i.dot")!.className,
        item.querySelector(".team-summary")!.textContent,
      ];
    };
    expect(look(/Mère A FICTIVE/)).toEqual([
      "te_demande",
      "dot awaiting_owner",
      "3 membres · 1 te demande",
    ]);
    expect(look(/Mère B FICTIVE/)).toEqual([
      "encours",
      "dot running",
      "3 membres · 2 en cours",
    ]);
    expect(look(/Mère C FICTIVE/)).toEqual([
      "echec",
      "dot failed",
      "2 membres · 1 échec",
    ]);
  });

  it("équipe finie sans échec (annulé seul) : aucune activité, l'état reste lu par un lecteur d'écran", async () => {
    const mother = row("30", "Mère FICTIVE finie", "completed");
    serve([
      mother,
      child("31", mother.id, "completed"),
      child("32", mother.id, "cancelled"),
    ]);
    await screen.findByRole("button", { name: /Mère FICTIVE finie/ });
    const item = listRow(/Mère FICTIVE finie/);
    expect(item.querySelector("i.dot")!.className).toBe("dot completed");
    expect(item.querySelector("i.dot")!.getAttribute("data-activite")).toBe(
      "aucune",
    );
    expect(item.querySelector(".team-summary")!.textContent).toBe("2 membres");
    expect(item.querySelector("small.sr-only")!.textContent).toBe("Terminée");
  });

  it("mission sans équipe : la ligne d'aujourd'hui, à l'octet près", async () => {
    serve([
      row("40", "Mission FICTIVE seule", "running"),
      row("41", "Mission FICTIVE attend", "awaiting_owner"),
    ]);
    await screen.findByRole("button", { name: /Mission FICTIVE seule/ });
    expect(listRow(/Mission FICTIVE seule/).outerHTML).toBe(
      '<button class="mission-link "><i class="dot running"></i>' +
        '<span title="Mission FICTIVE seule">Mission FICTIVE seule</span>' +
        '<small class="">En cours</small></button>',
    );
    expect(listRow(/Mission FICTIVE attend/).outerHTML).toBe(
      '<button class="mission-link "><i class="dot awaiting_owner"></i>' +
        '<span title="Mission FICTIVE attend">Mission FICTIVE attend</span>' +
        '<small class="sr-only">Attend votre réponse</small>' +
        '<small class="owner-turn" title="À vous de répondre">À vous</small></button>',
    );
  });

  it("les autres lecteurs de la liste gardent toutes les lignes : le compteur compte encore une sous-mission qui attend", async () => {
    const mother = row("50", "Mère FICTIVE", "running");
    serve([mother, child("51", mother.id, "awaiting_owner")]);
    await screen.findByRole("button", { name: /Mère FICTIVE/ });
    expect(
      screen.getByLabelText("1 mission attend votre réponse"),
    ).toBeTruthy();
  });

  it("ouvrir une mère montre toujours son bloc Équipe, avec le motif et l'agent prévu lus sur la ligne de la sous-mission", async () => {
    const mother = row("60", "Mère FICTIVE ouverte", "running");
    const a = child("61", mother.id, "running", {
      motif: "**Comparer** <b>deux</b> sources FICTIVES en parallèle",
      agentPrevu: "agent-b",
    });
    const b = child("62", mother.id, "completed");
    const opened = {
      ...mother,
      multiAgent: true,
      family: [
        { id: a.id, titre: "Tâche 61", agent: "agent-a", state: "running" },
        { id: b.id, titre: "Tâche 62", agent: "agent-a", state: "completed" },
      ],
    } as Run;
    serve([mother, a, b], opened);
    fireEvent.click(
      await screen.findByRole("button", { name: /Mère FICTIVE ouverte/ }),
    );
    // reponse-04 : l'équipe est dans le panneau Activité (fermé par défaut à 1024 px), plus dans le fil.
    fireEvent.click(
      await screen.findByRole("button", { name: "Afficher l’activité" }),
    );
    const team = await screen.findByRole("region", { name: "Équipe" });
    const first = within(team).getByRole("listitem", { name: "Tâche 61" });
    // equipe-05 : motif et agent de repli sont dans la ligne dépliée.
    fireEvent.click(first.querySelector("button.team-row-head")!);
    const motif = first.querySelector(".team-motif")!;
    // Plain text: neither Markdown nor HTML is interpreted.
    expect(motif.textContent).toBe(
      "**Comparer** <b>deux</b> sources FICTIVES en parallèle",
    );
    expect(motif.querySelector("b, strong")).toBeNull();
    expect(first.textContent).toContain(
      "lancé sur agent-a (agent-b indisponible)",
    );
    const second = within(team).getByRole("listitem", { name: "Tâche 62" });
    fireEvent.click(second.querySelector("button.team-row-head")!);
    expect(second.querySelector(".team-motif")).toBeNull();
    expect(second.textContent).not.toMatch(/lancé sur|indisponible/);
    // No new read of a sub-mission: only the mother is read by id.
    await waitFor(() =>
      expect(vi.mocked(api)).toHaveBeenCalledWith(
        `/runs/${mother.id}?equipe=1`,
      ),
    );
    const byId = vi
      .mocked(api)
      .mock.calls.map(([path]) => path)
      .filter((path) => /^\/runs\/[^/?]+(\?|$)/.test(path));
    expect(byId.every((path) => path.startsWith(`/runs/${mother.id}`))).toBe(
      true,
    );
  });
});

describe("liste : fonctions pures", () => {
  it("missionsDeLaListe garde une sous-mission dont la mère n'est pas dans la réponse", () => {
    const orphan = child("70", id("99"), "running");
    const mother = row("71", "Mère", "running");
    const kid = child("72", mother.id, "running");
    expect(missionsDeLaListe([orphan, mother, kid]).map((r) => r.id)).toEqual([
      orphan.id,
      mother.id,
    ]);
  });
  it("valeurs mal typées : aucune exception, pas d'équipe inventée", () => {
    const hostile = [
      null,
      7,
      "x",
      { id: "a", famille: "texte" },
      { id: "b", famille: { mere: 12 } },
      { id: "c", famille: null },
    ] as unknown as Run[];
    expect(() => missionsDeLaListe(hostile)).not.toThrow();
    expect(missionsDeLaListe(hostile).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(resumeListe({ id: "a", equipe: "3" }, hostile)).toBeNull();
    expect(
      resumeListe({ id: "a", equipe: { membres: -2, teDemande: "1" } }, []),
    ).toBeNull();
    expect(
      resumeListe({ id: "", equipe: undefined }, [{ famille: { mere: "" } }]),
    ).toBeNull();
    expect(missionsDeLaListe(undefined as never)).toEqual([]);
  });
  it("`equipe` du back préférée ; les échecs viennent des lignes présentes (failed seulement)", () => {
    const mother = { id: "m", equipe: { membres: 2, enCours: 0, echecs: 1 } };
    const rows = [
      { id: "x", state: "cancelled", famille: { mere: "m" } },
      { id: "y", state: "completed", famille: { mere: "m" } },
    ];
    expect(resumeListe(mother, rows)).toEqual({
      membres: 2,
      enCours: 0,
      teDemande: 0,
      echecs: 0,
    });
    // Without the rows, the back's count is the only source.
    expect(resumeListe(mother, [])!.echecs).toBe(1);
    // Contrôle : sans `equipe`, compté depuis les lignes (attend_accord compte comme « te demande »).
    expect(
      resumeListe({ id: "m" }, [
        { id: "x", state: "attend_accord", famille: { mere: "m" } },
        { id: "y", state: "failed", famille: { mere: "m" } },
      ]),
    ).toEqual({ membres: 2, enCours: 1, teDemande: 1, echecs: 1 });
  });
  it("priorité : te demande, puis en cours, puis échec, sinon rien ; la mère compte aussi", () => {
    const r = (o: object) => ({
      membres: 3,
      enCours: 0,
      teDemande: 0,
      echecs: 0,
      ...o,
    });
    expect(
      activiteListe({ state: "running" }, r({ teDemande: 1, echecs: 2 })),
    ).toBe("te_demande");
    expect(activiteListe({ state: "waiting_permission" }, r({}))).toBe(
      "te_demande",
    );
    expect(
      activiteListe({ state: "completed" }, r({ enCours: 1, echecs: 1 })),
    ).toBe("encours");
    expect(activiteListe({ state: "running" }, r({ echecs: 1 }))).toBe(
      "encours",
    );
    expect(activiteListe({ state: "failed" }, r({}))).toBe("echec");
    expect(activiteListe({ state: "completed" }, r({}))).toBeNull();
    expect(activiteListe({ state: "cancelled" }, r({}))).toBeNull();
  });
  it("texte du résumé : nombres, accords et mot seul quand seule la mère porte l'activité", () => {
    const r = (o: object) => ({
      membres: 3,
      enCours: 0,
      teDemande: 0,
      echecs: 0,
      ...o,
    });
    expect(texteResume(r({ teDemande: 1 }), "te_demande")).toBe(
      "3 membres · 1 te demande",
    );
    expect(texteResume(r({ teDemande: 2 }), "te_demande")).toBe(
      "3 membres · 2 te demandent",
    );
    expect(texteResume(r({}), "te_demande")).toBe("3 membres · te demande");
    expect(texteResume(r({ echecs: 2 }), "echec")).toBe("3 membres · 2 échecs");
    expect(texteResume(r({ membres: 1 }), null)).toBe("1 membre");
  });
});

const fullConsent =
  "L’agent de ta mission pourra, s’il le juge utile, confier des parties du travail à d’autres agents qui " +
  "travaillent en même temps. Chacun consomme ton abonnement comme une mission ordinaire : avec plusieurs " +
  "agents à la fois, ta limite d’usage peut être atteinte plus vite. Autoriser n’oblige pas : pour une " +
  "demande simple, un seul agent travaillera. Au plus 6 sous-missions Relay pour cette mission, 3 en même " +
  "temps ; une sous-mission en échec peut en plus être reprise deux fois hors de cette limite ; les " +
  "sous-agents internes que les agents lancent d’eux-mêmes ne sont ni comptés ni bornés par cette limite. " +
  "Sans « Autoriser les sous-agents », ton accord te sera demandé au premier lancement. Les envois restent " +
  "à ton clic.";

const input: MissionInput = {
  prompt: "Objectif FICTIF",
  agent: "auto",
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
};
const renderComposer = (cat: Catalog, patch: Partial<MissionInput> = {}) =>
  render(
    <Composer
      catalog={cat}
      input={{ ...input, ...patch }}
      onChange={vi.fn()}
      onPlan={vi.fn()}
      busy={false}
    />,
  );

describe("composer : accord court", () => {
  it("une phrase visible, le texte complet du contrat entier et inchangé dans le pli « En savoir plus »", () => {
    renderComposer(catalog, { team: true, teamConsent: true });
    const short = document.querySelector(".team-accord")!;
    expect(short.textContent!.trim()).toBe(
      "Ton agent pourra se faire aider par d’autres agents, chacun sur ton abonnement.",
    );
    expect(short.closest("details.team-accord-plus")).toBeNull();
    const fold = document.querySelector("details.team-accord-plus")!;
    expect((fold as HTMLDetailsElement).open).toBe(false);
    expect(fold.querySelector("summary")!.textContent).toBe("En savoir plus");
    const sw = screen.getByRole("switch", { name: "Équipe d’agents" });
    const help = document.getElementById(sw.getAttribute("aria-describedby")!)!;
    expect(fold.contains(help)).toBe(true);
    expect(help.textContent!.replace(/\s+/g, " ").trim()).toBe(fullConsent);
    expect(screen.getAllByText(/confier des parties du travail/).length).toBe(
      1,
    );
  });
});

const agent = (o: Partial<Agent> & { id: string }): Agent => ({
  name: o.id.toUpperCase(),
  installed: true,
  compatible: true,
  ...o,
});
const options = () =>
  Array.from((screen.getByLabelText("Agent") as HTMLSelectElement).options).map(
    (o) => [o.value, o.textContent, o.disabled],
  );

describe("composer : état réel des agents", () => {
  it("agent sous limite : libellé avec l'heure locale, en fin de liste, sélectionnable ; le défaut reste « auto »", () => {
    const jusqua = new Date(2026, 10, 21, 23, 27).toISOString();
    renderComposer({
      ...catalog,
      live: true,
      agents: [
        agent({
          id: "agent-a",
          etat: "limite",
          raison: "Limite d’usage jusqu’à 23:27",
          jusqua,
        }),
        agent({
          id: "agent-b",
          etat: "connexion_refusee",
          raison: "Session refusée (FICTIF)",
        }),
        agent({ id: "agent-c", etat: "pret" }),
        agent({ id: "agent-d" }),
      ],
    });
    expect((screen.getByLabelText("Agent") as HTMLSelectElement).value).toBe(
      "auto",
    );
    expect(options()).toEqual([
      ["auto", "Auto · selon les capacités", false],
      ["agent-c", "AGENT-C", false],
      ["agent-d", "AGENT-D", false],
      ["agent-a", "AGENT-A · limite d’usage jusqu’à 23:27", false],
      ["agent-b", "AGENT-B · connexion refusée", false],
    ]);
  });
  it("agents sans champ `etat` : rendu d'aujourd'hui (ordre du catalogue, désactivation, « · indisponible »)", () => {
    renderComposer({
      ...catalog,
      live: false,
      agents: [
        agent({ id: "agent-x", compatible: false }),
        agent({ id: "agent-y", simulated: true }),
        agent({ id: "agent-z", installed: false }),
      ],
    });
    expect(options()).toEqual([
      ["auto", "Auto · selon les capacités", false],
      ["agent-x", "AGENT-X · indisponible", true],
      ["agent-y", "AGENT-Y", false],
      ["agent-z", "AGENT-Z", true],
    ]);
  });
  it("libellés lus par clé propre ; heure illisible ; valeurs mal typées sans exception", () => {
    expect(agentStateLabel(agent({ id: "a", etat: "__proto__" }))).toBe("");
    expect(agentStateLabel(agent({ id: "a", etat: "constructor" }))).toBe("");
    expect(
      agentStateLabel(agent({ id: "a", etat: "limite", jusqua: "demain" })),
    ).toBe("limite d’usage");
    expect(agentStateLabel(agent({ id: "a", etat: 3 as never }))).toBe("");
    expect(agentsInOrder(undefined)).toEqual([]);
    expect(agentsInOrder([null, agent({ id: "a" })] as never).length).toBe(1);
    // agentWarning keeps its output: a catalog `etat` adds nothing to it.
    expect(
      agentWarning(
        "a",
        { ...catalog, agents: [agent({ id: "a", etat: "limite" })] },
        [],
      ),
    ).toBeNull();
  });
});

describe("bloc Équipe : motif, agent prévu, jetons", () => {
  const mother = (family: object[]) =>
    ({ ...row("80", "Mère", "running"), multiAgent: true, family }) as Run;
  it("jetons montrés seulement quand `usage.jetons.total` existe", () => {
    render(
      <TeamBlock
        run={mother([
          {
            id: "m1",
            titre: "Avec jetons",
            agent: "agent-a",
            state: "completed",
            usage: {
              tours: 2,
              jetons: { entree: 12000, sortie: 345, total: 12345 },
              cout: null,
            },
          },
          {
            id: "m2",
            titre: "Sans jetons",
            agent: "agent-a",
            state: "completed",
          },
          {
            id: "m3",
            titre: "Jetons non annoncés",
            agent: "agent-a",
            state: "completed",
            usage: { tours: 1, jetons: null },
          },
        ])}
      />,
    );
    // equipe-05 : « Jetons » est une ligne clé/valeur de la ligne dépliée.
    const open = (name: string) => {
      const item = screen.getByRole("listitem", { name });
      fireEvent.click(item.querySelector("button.team-row-head")!);
      return item;
    };
    const withTokens = open("Avec jetons");
    expect(withTokens.querySelector(".team-jetons")!.textContent).toMatch(
      /^12\s345$/,
    );
    expect(withTokens.querySelector(".team-kv")!.textContent).toContain(
      "Jetons",
    );
    for (const name of ["Sans jetons", "Jetons non annoncés"]) {
      const item = open(name);
      expect(item.querySelector(".team-jetons")).toBeNull();
      expect(item.textContent!.replace(name, "")).not.toMatch(/jeton/);
    }
    expect(texteJetons({ jetons: { total: "12" } })).toBe("");
    expect(texteJetons({ jetons: { total: -1 } })).toBe("");
    expect(texteJetons("x")).toBe("");
  });
  it("agent prévu identique à l'agent réel, ou motif vide : rien de neuf", () => {
    render(
      <TeamBlock
        run={mother([
          {
            id: "m1",
            titre: "Même agent",
            agent: "agent-a",
            agentPrevu: "agent-a",
            motif: "",
          },
        ])}
      />,
    );
    const item = screen.getByRole("listitem", { name: "Même agent" });
    fireEvent.click(item.querySelector("button.team-row-head")!);
    expect(item.textContent).not.toMatch(/lancé sur|indisponible/);
    expect(item.querySelector(".team-motif")).toBeNull();
  });
  it("avecDetailsDesLignes : copie motif et agentPrevu, rend la même mission quand rien n'est à ajouter", () => {
    const m = mother([{ id: "k1" }, { id: "k2" }]);
    const rows = [
      {
        id: "k1",
        famille: { mere: m.id, motif: "Motif FICTIF", agentPrevu: 5 },
      },
      { id: "k2", famille: { mere: m.id } },
      null,
    ];
    const out = avecDetailsDesLignes(m, rows);
    expect(out.family).toEqual([
      { id: "k1", motif: "Motif FICTIF" },
      { id: "k2" },
    ]);
    expect(m.family).toEqual([{ id: "k1" }, { id: "k2" }]);
    expect(avecDetailsDesLignes(m, [rows[1]])).toBe(m);
    const plain = row("81", "Seule", "running");
    expect(avecDetailsDesLignes(plain, rows)).toBe(plain);
  });
});
