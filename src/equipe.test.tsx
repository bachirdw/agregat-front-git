// equipe-front-20-11 : the agents' team in the interface. Shapes from the back's contract
// (agregat-back-equipe-essai c1fb352 : docs/api-delegation.md, delegation.js view(), carnet.js
// view()); every value below is FICTIF.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import App from "./App";
import { api, toApiInput } from "./api";
import { RunView } from "./Mission";
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
  mode: "workflow",
  workflow: "auto",
  attachments: [],
};

// The body of POST /api/runs before this lot (7b2716c) for the composer's initial settings.
const todayBody = {
  prompt: "Objectif FICTIF",
  agent: "auto",
  pack: "auto",
  skills: [],
  model: "",
  agentMode: "",
  browser: "auto",
  browserDomains: [],
  budgetCents: 0,
  mode: "workflow",
  workflow: "auto",
};

describe("requête de création", () => {
  it("interrupteur éteint ou absent : le corps est exactement celui d'avant", () => {
    expect(toApiInput(input)).toEqual(todayBody);
    expect(toApiInput({ ...input, team: false })).toEqual(todayBody);
    expect(Object.keys(toApiInput({ ...input, team: false }))).not.toContain(
      "team",
    );
  });
  it("interrupteur allumé : multiAgent et accord par le bouton, enveloppe par défaut", () => {
    const body = toApiInput({ ...input, team: true });
    expect(body).toEqual({
      ...todayBody,
      multiAgent: true,
      delegation: { accepted: true, via: "bouton" },
    });
    // Contrôle négatif : ni `total` ni `parallel` (enveloppe de la plateforme), jamais `team`.
    expect(Object.keys(body)).not.toContain("team");
    expect(
      Object.keys((body as { delegation: object }).delegation).sort(),
    ).toEqual(["accepted", "via"]);
  });
});

async function launchFromApp(toggle: boolean) {
  const created = new Promise<Run>(() => {});
  vi.mocked(api).mockImplementation((path, body) =>
    path === "/catalog"
      ? (Promise.resolve(catalog) as never)
      : path === "/runs" && body
        ? (created as never)
        : (Promise.resolve([]) as never),
  );
  render(<App />);
  const area = screen.getByLabelText("Objectif de la mission");
  fireEvent.change(area, { target: { value: "Objectif FICTIF" } });
  const sw = screen.getByRole("switch", {
    name: "Équipe d’agents",
  }) as HTMLInputElement;
  expect(sw.checked).toBe(false);
  if (toggle) {
    fireEvent.click(sw);
    expect(sw.checked).toBe(true);
  }
  const send = screen.getByRole("button", { name: "Lancer la mission" });
  await waitFor(() => expect((send as HTMLButtonElement).disabled).toBe(false));
  await act(async () => fireEvent.click(send));
  const call = vi
    .mocked(api)
    .mock.calls.find(([path, body]) => path === "/runs" && body);
  expect(call).toBeTruthy();
  return call![1];
}

describe("interrupteur « Équipe d’agents » du composer", () => {
  it("éteint par défaut, expliqué en français simple ; lancement inchangé", async () => {
    const body = await launchFromApp(false);
    expect(body).toEqual(todayBody);
    const help = screen.getByText(/confier des parties du travail/);
    expect(help.textContent).toMatch(/en même temps/);
    expect(help.textContent).toMatch(/consomme ton abonnement/);
    expect(help.textContent).toMatch(/envois restent à ton clic/);
  });
  it("allumé : la requête porte multiAgent et l'accord du bouton", async () => {
    const body = await launchFromApp(true);
    expect(body).toEqual({
      ...todayBody,
      multiAgent: true,
      delegation: { accepted: true, via: "bouton" },
    });
  });
  it("au clavier : Espace bascule l'interrupteur", async () => {
    vi.mocked(api).mockImplementation((path) =>
      path === "/catalog"
        ? (Promise.resolve(catalog) as never)
        : (Promise.resolve([]) as never),
    );
    render(<App />);
    const sw = screen.getByRole("switch", { name: "Équipe d’agents" });
    expect(sw.getAttribute("aria-describedby")).toBeTruthy();
    expect(
      document.getElementById(sw.getAttribute("aria-describedby")!)
        ?.textContent,
    ).toMatch(/confier des parties du travail/);
    // A native checkbox: Space toggles it (jsdom fires the click).
    sw.focus();
    fireEvent.click(sw);
    expect((sw as HTMLInputElement).checked).toBe(true);
  });
});

const ids = {
  mother: "00000000-0000-4000-8000-0000000000f0",
  a: "00000000-0000-4000-8000-0000000000f1",
  b: "00000000-0000-4000-8000-0000000000f2",
  c: "00000000-0000-4000-8000-0000000000f3",
  d: "00000000-0000-4000-8000-0000000000f4",
  e: "00000000-0000-4000-8000-0000000000f5",
  f: "00000000-0000-4000-8000-0000000000f6",
  g: "00000000-0000-4000-8000-0000000000f7",
};

const run = (patch: Partial<Run> = {}) =>
  ({
    id: ids.mother,
    prompt: "Mission FICTIVE",
    state: "completed",
    mode: "agent",
    agent: "agent-fictif",
    model: "",
    pack: "core",
    simulated: true,
    createdAt: "2026-11-20T00:00:00.000Z",
    resumable: true,
    plan: {
      steps: [],
      workflow: null,
      cost: {
        platformCents: 0,
        currency: "EUR",
        budgetCents: 0,
        withinBudget: true,
        description: "FICTIF",
        lines: [],
      },
    },
    result: {
      simulated: true,
      summary: "Bilan FICTIF",
      answer: "Réponse FICTIVE",
      evidence: [],
    },
    ...patch,
  }) as unknown as Run;

// Exactly the keys of delegation.js view() at c1fb352 (no model, no `continue`).
const member = (
  id: string,
  titre: string,
  state: string,
  attend: string | null,
  extra: Record<string, unknown> = {},
) => ({
  id,
  titre,
  agent: "agent-fictif-b",
  state,
  attend,
  pendingQuestion: null,
  pendingPermission: null,
  ...extra,
});

const family = [
  member(ids.a, "Recherche FICTIVE", "completed", null, {
    agent: "agent-fictif-a",
    role: "chercheur",
  }),
  member(ids.b, "Rédaction FICTIVE", "running", "carte_envoi", {
    role: "redacteur",
    pendingPermission: {
      id: "perm-fictive",
      capability: "fictif.send",
      actionClass: "send",
    },
  }),
  member(ids.c, "Vérification FICTIVE", "completed", null, {
    role: "verificateur",
    relit: [ids.a, ids.b],
    verdict: {
      valeur: "a_corriger",
      bloquants: [
        { ou: "Section 2 FICTIVE", pourquoi: "Chiffre FICTIF non sourcé" },
      ],
      remarques: ["Remarque FICTIVE"],
      source: "fichier",
    },
  }),
  member(ids.d, "Recherche FICTIVE (suite 1)", "en_file", "place", {
    agent: "agent-fictif-a",
    role: "chercheur",
  }),
  member(ids.e, "Illustration FICTIVE", "attend_prerequis", "prerequis", {
    role: "Graphiste FICTIF",
  }),
  member(ids.f, "Question FICTIVE", "awaiting_owner", "question"),
  member(ids.g, "Accord FICTIF", "attend_accord", "accord"),
];

const view = (patch: Partial<Run>, openRun?: (id: string) => void) =>
  render(
    <RunView
      run={run(patch)}
      events={[]}
      connection=""
      busy={false}
      act={vi.fn()}
      openRun={openRun}
    />,
  );

describe("bloc « Équipe » d'une mission", () => {
  it("une ligne par membre : titre, rôle, agent, état, attente", () => {
    view({ family, activity: { agents: 4, awaitingOwner: 2 } } as never);
    const block = screen.getByRole("region", { name: "Équipe" });
    const rows = within(block).getAllByRole("listitem", { name: /.+/ });
    expect(rows).toHaveLength(7);
    const row = (title: string) =>
      rows.find((r) => r.getAttribute("aria-label") === title)!;
    expect(row("Recherche FICTIVE").textContent).toContain("chercheur");
    expect(row("Recherche FICTIVE").textContent).toContain("agent-fictif-a");
    // Same label as the states already shown by the interface.
    expect(row("Recherche FICTIVE").textContent).toContain("Terminée");
    expect(row("Rédaction FICTIVE").textContent).toContain("En cours");
    expect(row("Rédaction FICTIVE").textContent).toContain("rédacteur");
    expect(row("Rédaction FICTIVE").textContent).toContain(
      "attend ton clic sur une carte d’envoi",
    );
    expect(row("Question FICTIVE").textContent).toContain(
      "Attend votre réponse",
    );
    expect(row("Question FICTIVE").textContent).toContain("attend ta réponse");
    expect(row("Recherche FICTIVE (suite 1)").textContent).toContain(
      "attend une place",
    );
    expect(row("Illustration FICTIVE").textContent).toContain(
      "attend un prérequis",
    );
    // A free role name is a mere label, shown as given.
    expect(row("Illustration FICTIVE").textContent).toContain(
      "Graphiste FICTIF",
    );
    expect(row("Accord FICTIF").textContent).toContain("attend ton accord");
    // Contrôle négatif : the view carries no model, nothing is invented.
    expect(block.textContent).not.toMatch(/Modèle/i);
    expect(block.textContent).not.toMatch(/suite de/);
  });
  it("compteur en tête : en cours, finies, en attente de toi", () => {
    view({ family } as never);
    const block = screen.getByRole("region", { name: "Équipe" });
    const counter = within(block).getByRole("status");
    expect(counter.textContent).toBe(
      "7 membres · 2 en cours · 2 finies · 3 en attente de toi",
    );
  });
  it("vérificateur : verdict, ce qu'il relit, points bloquants dépliables", () => {
    view({ family } as never);
    const row = screen.getByRole("listitem", { name: "Vérification FICTIVE" });
    expect(row.textContent).toContain("vérificateur");
    expect(row.textContent).toContain(
      "relit « Recherche FICTIVE », « Rédaction FICTIVE »",
    );
    expect(row.textContent).toContain("Verdict : à corriger");
    const details = row.querySelector("details")!;
    expect(details.open).toBe(false);
    const summary = within(row).getByText("1 point bloquant");
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    expect(details.textContent).toContain("Section 2 FICTIVE");
    expect(details.textContent).toContain("Chiffre FICTIF non sourcé");
    expect(details.textContent).toContain("Remarque FICTIVE");
  });
  it("verdicts approuvé et rejeté ; verdict absent dit tel quel", () => {
    view({
      family: [
        member(ids.a, "V1 FICTIVE", "completed", null, {
          role: "verificateur",
          verdict: {
            valeur: "approuve",
            bloquants: [],
            remarques: [],
            source: "reponse",
          },
        }),
        member(ids.b, "V2 FICTIVE", "completed", null, {
          role: "verificateur",
          verdict: {
            valeur: "rejete",
            bloquants: [{ ou: "Tout FICTIF", pourquoi: "À refaire FICTIF" }],
            remarques: [],
            source: "fichier",
          },
        }),
        member(ids.c, "V3 FICTIVE", "failed", null, {
          role: "verificateur",
          verdict: {
            valeur: "a_corriger",
            bloquants: [],
            remarques: [],
            source: "absent",
          },
        }),
      ],
    } as never);
    const v1 = screen.getByRole("listitem", { name: "V1 FICTIVE" });
    expect(v1.textContent).toContain("Verdict : approuvé");
    expect(v1.querySelector("details")).toBeNull();
    const v2 = screen.getByRole("listitem", { name: "V2 FICTIVE" });
    expect(v2.textContent).toContain("Verdict : rejeté");
    expect(v2.textContent).toContain("1 point bloquant");
    const v3 = screen.getByRole("listitem", { name: "V3 FICTIVE" });
    expect(v3.textContent).toContain("Échec");
    expect(v3.textContent).toContain("aucun verdict écrit");
  });
  it("suite de … quand la vue porte le lien ; modèle quand elle le porte", () => {
    view({
      family: [
        member(ids.a, "Recherche FICTIVE", "completed", null),
        member(ids.d, "Recherche FICTIVE (suite 1)", "running", null, {
          continue: ids.a,
          modele: "modele-fictif",
        }),
      ],
    } as never);
    const row = screen.getByRole("listitem", {
      name: "Recherche FICTIVE (suite 1)",
    });
    expect(row.textContent).toContain("suite de « Recherche FICTIVE »");
    expect(row.textContent).toContain("modele-fictif");
  });
  it("un membre s'ouvre d'un clic quand l'interface sait ouvrir une mission", () => {
    const open = vi.fn();
    view({ family } as never, open);
    const button = screen.getByRole("button", {
      name: "Ouvrir la sous-mission Rédaction FICTIVE",
    });
    fireEvent.click(button);
    expect(open).toHaveBeenCalledWith(ids.b);
  });
  it("sans fonction d'ouverture, aucun bouton n'est inventé", () => {
    view({ family } as never);
    expect(
      screen.queryByRole("button", { name: /Ouvrir la sous-mission/ }),
    ).toBeNull();
  });
  it("famille vide : aucun bloc Équipe", () => {
    view({ family: [] } as never);
    expect(screen.queryByRole("region", { name: "Équipe" })).toBeNull();
  });
});

describe("bloc « Carnet d’équipe »", () => {
  const carnet = {
    total: 25,
    notes: [
      {
        n: 24,
        auteur: "agent principal",
        categorie: "methode",
        texte: "<b>Méthode FICTIVE</b> <script>alert(1)</script>",
        a: "2026-11-20T00:10:00.000Z",
      },
      {
        n: 25,
        auteur: "Recherche FICTIVE",
        role: "chercheur",
        categorie: "piege",
        texte: "Piège FICTIF",
        a: "2026-11-20T00:12:00.000Z",
      },
      {
        n: 26,
        auteur: "Vérification FICTIVE",
        categorie: "inconnue",
        texte: "Catégorie FICTIVE inconnue",
        a: "2026-11-20T00:13:00.000Z",
      },
    ],
  };
  it("notes : auteur, rôle, catégorie en français, heure, texte ; total", () => {
    view({ carnet } as never);
    const block = screen.getByRole("region", { name: "Carnet d’équipe" });
    const notes = within(block).getAllByRole("listitem");
    expect(notes).toHaveLength(3);
    expect(notes[0].textContent).toContain("agent principal");
    expect(notes[0].textContent).toContain("méthode");
    expect(notes[1].textContent).toContain("Recherche FICTIVE");
    expect(notes[1].textContent).toContain("chercheur");
    expect(notes[1].textContent).toContain("piège");
    expect(notes[2].textContent).toContain("inconnue");
    const time = notes[1].querySelector("time")!;
    expect(time.getAttribute("datetime")).toBe("2026-11-20T00:12:00.000Z");
    expect(time.textContent).toMatch(/\d{2}:\d{2}/);
    expect(block.textContent).toContain("3 notes affichées sur 25");
  });
  it("le texte d'une note est une donnée : jamais interprété", () => {
    view({ carnet } as never);
    const block = screen.getByRole("region", { name: "Carnet d’équipe" });
    expect(block.querySelector("b, script")).toBeNull();
    expect(block.textContent).toContain(
      "<b>Méthode FICTIVE</b> <script>alert(1)</script>",
    );
  });
  it("toutes les notes affichées : pas de total en plus", () => {
    view({ carnet: { total: 1, notes: [carnet.notes[1]] } } as never);
    const block = screen.getByRole("region", { name: "Carnet d’équipe" });
    expect(block.textContent).not.toMatch(/affichées sur/);
  });
  it("espace privé : le total seul, sans texte inventé", () => {
    view({ carnet: { total: 3 } } as never);
    const block = screen.getByRole("region", { name: "Carnet d’équipe" });
    expect(block.textContent).toContain("3 notes");
    expect(within(block).queryAllByRole("listitem")).toHaveLength(0);
  });
  it("carnet vide ou absent : aucun bloc", () => {
    view({ carnet: { total: 0, notes: [] } } as never);
    expect(
      screen.queryByRole("region", { name: "Carnet d’équipe" }),
    ).toBeNull();
  });
});

describe("mission sans équipe", () => {
  it("rendu identique à celui d'avant le lot (instantané pris à 7b2716c)", () => {
    const { container } = view({});
    expect(container.innerHTML).toMatchSnapshot();
  });
  it("champs d'équipe absents ou vides : même rendu que sans eux", () => {
    const plain = view({}).container.innerHTML;
    cleanup();
    const empty = view({
      family: [],
      carnet: { total: 0, notes: [] },
    } as never).container.innerHTML;
    expect(empty).toBe(plain);
  });
});
