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
import { Composer } from "./Composer";
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
    const body = toApiInput({ ...input, team: true, teamConsent: true });
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

// 21/11 : l'accueil part en agent unique par défaut (en workflow, une mission finie ne reçoit pas de
// message de suite) ; le reste du corps est celui d'avant.
const appBody = { ...todayBody, mode: "agent" };
describe("interrupteur « Équipe d’agents » du composer", () => {
  it("éteint par défaut, expliqué en français simple ; lancement inchangé", async () => {
    const body = await launchFromApp(false);
    expect(body).toEqual(appBody);
    const help = screen.getByText(/confier des parties du travail/);
    expect(help.textContent).toMatch(/en même temps/);
    expect(help.textContent).toMatch(/consomme ton abonnement/);
    expect(help.textContent).toMatch(/envois restent à ton clic/);
  });
  it("allumé : la requête porte multiAgent et l'accord du bouton", async () => {
    const body = await launchFromApp(true);
    expect(body).toEqual({
      ...appBody,
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
      // Relecture : en file et attente d'un prérequis ne sont pas « en cours » (aucun membre ne travaille ici
      // sans attendre le propriétaire).
      "7 membres · 0 en cours · 2 en attente d’une place ou d’un prérequis · 2 finies · 3 en attente de toi",
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

// Relecture (review of ed9d66d): three claims of an independent reviewer, each written as a test first.
describe("relecture : accord, workflow et compteur", () => {
  const renderComposer = (patch: Partial<MissionInput>) => {
    const onChange = vi.fn();
    render(
      <Composer
        catalog={catalog}
        input={{ ...input, ...patch }}
        onChange={onChange}
        onPlan={vi.fn()}
        busy={false}
      />,
    );
    return onChange;
  };
  it("le texte d'accord du contrat (section 6) est montré avec l'enveloppe par défaut", () => {
    renderComposer({ team: true, teamConsent: true });
    const sw = screen.getByRole("switch", { name: "Équipe d’agents" });
    const help = document.getElementById(
      sw.getAttribute("aria-describedby")!,
    )!.textContent!;
    expect(help).toMatch(
      /Au plus 6 sous-missions Relay pour cette mission, 3 en même temps/,
    );
    expect(help).toMatch(/limite d['’]usage peut être atteinte plus vite/);
    expect(help).toMatch(/Autoriser n['’]oblige pas/);
    expect(help).toMatch(/repris(e)? deux fois hors de cette limite/);
    expect(help).toMatch(/sous-agents internes/);
    expect(help).toMatch(/envois restent à ton clic/);
  });
  it("mode allumé sans accord : multiAgent seul, l'accord viendra par la carte (voie 3)", () => {
    expect(toApiInput({ ...input, team: true, teamConsent: false })).toEqual({
      ...todayBody,
      multiAgent: true,
    });
    // Contrôle négatif : accord coché → la clé delegation est bien là.
    expect(toApiInput({ ...input, team: true, teamConsent: true })).toEqual({
      ...todayBody,
      multiAgent: true,
      delegation: { accepted: true, via: "bouton" },
    });
    // Accord sans le mode : rien n'est ajouté (le contrat dit que l'accord seul n'a aucun effet).
    expect(toApiInput({ ...input, team: false, teamConsent: true })).toEqual(
      todayBody,
    );
  });
  it("la case « Autoriser les sous-agents » se décoche séparément du mode", () => {
    const onChange = renderComposer({ team: true, teamConsent: true });
    const consent = screen.getByRole("checkbox", {
      name: "Autoriser les sous-agents",
    }) as HTMLInputElement;
    expect(consent.checked).toBe(true);
    fireEvent.click(consent);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ team: true, teamConsent: false }),
    );
  });
  it("allumer le mode coche l'accord (un geste, comme avant) ; l'éteindre le retire", () => {
    const onChange = renderComposer({});
    expect(
      screen.queryByRole("checkbox", { name: "Autoriser les sous-agents" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: "Équipe d’agents" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ team: true, teamConsent: true }),
    );
  });
  it("équipe allumée et workflow choisi : l'interface prévient que l'équipe remplace le workflow", () => {
    renderComposer({ mode: "workflow", workflow: "wf-fictif", team: true });
    expect(screen.getByRole("alert").textContent).toMatch(
      /équipe remplace le workflow/i,
    );
  });
  it("contrôle négatif : workflow auto, ou équipe éteinte, aucun avertissement", () => {
    renderComposer({ mode: "workflow", workflow: "auto", team: true });
    expect(screen.queryByText(/équipe remplace le workflow/i)).toBeNull();
    cleanup();
    renderComposer({ mode: "workflow", workflow: "wf-fictif", team: false });
    expect(screen.queryByText(/équipe remplace le workflow/i)).toBeNull();
  });
  it("compteur : les membres en file ou qui attendent un prérequis ne sont pas « en cours »", () => {
    view({
      family: [
        member(ids.a, "A FICTIF", "en_file", "place"),
        member(ids.b, "B FICTIF", "en_file", "place"),
        member(ids.c, "C FICTIF", "attend_prerequis", "prerequis"),
      ],
    } as never);
    const counter = within(
      screen.getByRole("region", { name: "Équipe" }),
    ).getByRole("status");
    expect(counter.textContent).toBe(
      "3 membres · 0 en cours · 3 en attente d’une place ou d’un prérequis · 0 finie · 0 en attente de toi",
    );
  });
  it("compteur : un membre qui travaille est « en cours »", () => {
    view({ family: [member(ids.a, "A FICTIF", "running", null)] } as never);
    expect(
      within(screen.getByRole("region", { name: "Équipe" })).getByRole("status")
        .textContent,
    ).toBe("1 membre · 1 en cours · 0 finie · 0 en attente de toi");
  });
});

// swarm-09 : states, members and chief. New member fields of `GET /api/runs/:id?equipe=1` (back
// api-equipe-vue.md, swarm-07) and `complet` of a verdict (api-verdicts.md, swarm-04). FICTIF values.
describe("swarm-09 : états, membres, chef", () => {
  const block = () => screen.getByRole("region", { name: "Équipe" });
  const row = (title: string) => screen.getByRole("listitem", { name: title });
  it("le chef en tête du bloc : agent et état de la mission mère", () => {
    view({ state: "running", family } as never);
    const chef = block().querySelector(".team-chef")!;
    expect(chef.textContent).toBe("Chef : agent-fictif · En cours");
    expect(chef.querySelector(".etat-encours")).not.toBeNull();
  });
  it("une seule table : pastille et libellé écrit pour chaque membre", () => {
    view({ family } as never);
    const badge = (title: string) => row(title).querySelector(".etat")!;
    expect(badge("Recherche FICTIVE").className).toContain("etat-fini");
    expect(badge("Recherche FICTIVE").textContent).toBe("Terminée");
    // Running but waiting for the owner's click: the dot says « asks you », the label stays written.
    expect(badge("Rédaction FICTIVE").className).toContain("etat-te-demande");
    expect(badge("Rédaction FICTIVE").textContent).toBe("En cours");
    expect(badge("Recherche FICTIVE (suite 1)").className).toContain(
      "etat-attente",
    );
    expect(badge("Accord FICTIF").textContent).toBe("Attend ton accord");
  });
  it("état inconnu : « État inconnu », jamais la valeur brute", () => {
    view({
      family: [member(ids.a, "Inconnu FICTIF", "etat_fictif_brut", null)],
    } as never);
    const r = row("Inconnu FICTIF");
    expect(r.textContent).toContain("État inconnu");
    expect(r.textContent).not.toContain("etat_fictif_brut");
    expect(r.querySelector(".etat-inconnu")).not.toBeNull();
  });
  it("membre fini avec résultat : pli fermé, durée, texte brut jamais interprété", () => {
    view({
      family: [
        member(ids.a, "Fini FICTIF", "completed", null, {
          debut: "2026-11-20T00:00:00.000Z",
          fin: "2026-11-20T00:04:12.000Z",
          dureeMs: 252_000,
          resultat: "**Gras FICTIF** <b>balise</b> <script>alert(1)</script>",
        }),
      ],
    } as never);
    const r = row("Fini FICTIF");
    expect(r.textContent).toContain("durée 4 min 12 s");
    const details = r.querySelector("details")!;
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")!.textContent).toBe("Résultat");
    expect(details.textContent).toContain(
      "**Gras FICTIF** <b>balise</b> <script>alert(1)</script>",
    );
    expect(details.querySelector("b, strong, script")).toBeNull();
  });
  it("membre en échec par limite d'usage : pli ouvert, durée, cause et « réessayer à … »", () => {
    const reprise = "2026-11-20T05:30:00.000Z";
    view({
      family: [
        member(ids.a, "Échec FICTIF", "failed", null, {
          debut: "2026-11-20T00:00:00.000Z",
          fin: "2026-11-20T00:00:45.000Z",
          cause: {
            type: "limite_usage",
            message: "Limite FICTIVE <i>atteinte</i>",
            reprise,
          },
        }),
      ],
    } as never);
    const r = row("Échec FICTIF");
    const details = r.querySelector("details")!;
    expect(details.open).toBe(true);
    expect(details.querySelector("summary")!.textContent).toBe(
      "Échec après 45 s : limite d’usage atteinte",
    );
    expect(details.textContent).toContain("Limite FICTIVE <i>atteinte</i>");
    expect(details.querySelector("i")).toBeNull();
    const at = new Date(reprise).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(details.textContent).toContain(`réessayer à ${at}`);
  });
  // 21/11 (test complet) : un membre arrêté par l'utilisateur était présenté « Échec … : erreur ».
  it("membre arrêté par l'utilisateur : « Arrêtée après … », pas « Échec »", () => {
    view({
      family: [
        member(ids.a, "Arrêt FICTIF", "cancelled", null, {
          debut: "2026-11-20T00:00:00.000Z",
          fin: "2026-11-20T00:06:50.000Z",
          cause: { type: "erreur", message: "Annulée par l’utilisateur" },
        }),
      ],
    } as never);
    const details = row("Arrêt FICTIF").querySelector("details")!;
    expect(details.querySelector("summary")!.textContent).toBe(
      "Arrêtée après 6 min 50 s",
    );
    expect(details.className).not.toContain("team-echec");
    expect(details.textContent).toContain("Annulée par l’utilisateur");
  });
  it("échec sans message (mission privée) ni reprise : la cause seule, rien d'inventé", () => {
    view({
      family: [
        member(ids.a, "Erreur FICTIVE", "interrupted", null, {
          cause: { type: "erreur", reprise: null },
        }),
      ],
    } as never);
    const details = row("Erreur FICTIVE").querySelector("details")!;
    expect(details.open).toBe(true);
    expect(details.textContent).toBe("Échec : erreur");
  });
  it("membre en cours : depuis quand et dernière action", () => {
    view({
      family: [
        member(ids.a, "En cours FICTIF", "running", null, {
          debut: "2026-11-20T00:00:00.000Z",
          fin: null,
          depuis: 120,
          inactiveDepuis: 45,
          outils: 3,
          dernierOutil: "outil_fictif",
        }),
      ],
    } as never);
    const r = row("En cours FICTIF");
    expect(r.textContent).toContain("depuis 2 min 0 s");
    expect(r.textContent).toContain("dernière action outil_fictif il y a 45 s");
    expect(r.querySelector("details")).toBeNull();
  });
  it("verdict complet: false → « sans point précis » ; source absent → « illisible »", () => {
    view({
      family: [
        member(ids.a, "V1 FICTIVE", "completed", null, {
          role: "verificateur",
          verdict: {
            valeur: "a_corriger",
            bloquants: [],
            remarques: [],
            source: "reponse",
            complet: false,
          },
        }),
        member(ids.b, "V2 FICTIVE", "completed", null, {
          role: "verificateur",
          verdict: {
            valeur: "a_corriger",
            bloquants: [],
            remarques: [],
            source: "absent",
            complet: false,
          },
        }),
        // Contrôle négatif : no blocking point but no `complet` key → nothing deduced.
        member(ids.c, "V3 FICTIVE", "completed", null, {
          role: "verificateur",
          verdict: {
            valeur: "a_corriger",
            bloquants: [],
            remarques: [],
            source: "fichier",
          },
        }),
      ],
    } as never);
    expect(row("V1 FICTIVE").textContent).toContain(
      "Verdict : à corriger · sans point précis",
    );
    expect(row("V2 FICTIVE").textContent).toContain(
      "Verdict : illisible · aucun verdict écrit",
    );
    expect(row("V2 FICTIVE").textContent).not.toContain("sans point précis");
    expect(row("V3 FICTIVE").textContent).toContain("Verdict : à corriger");
    expect(row("V3 FICTIVE").textContent).not.toMatch(
      /sans point précis|illisible/,
    );
  });
  it("10 membres : 8 visibles et « +2 autres », qui montre le reste", () => {
    const ten = Array.from({ length: 10 }, (_, i) =>
      member(`m-fictif-${i}`, `Membre FICTIF ${i}`, "running", null),
    );
    view({ family: ten } as never);
    const rows = () =>
      within(block()).getAllByRole("listitem", { name: /Membre FICTIF/ });
    expect(rows()).toHaveLength(8);
    // The counter covers every member, shown or not.
    expect(within(block()).getByRole("status").textContent).toContain(
      "10 membres · 10 en cours",
    );
    fireEvent.click(within(block()).getByRole("button", { name: "+2 autres" }));
    expect(rows()).toHaveLength(10);
    expect(
      within(block()).queryByRole("button", { name: /autres?$/ }),
    ).toBeNull();
  });
  it("membres triés par début, non démarrés à la fin", () => {
    view({
      family: [
        member(ids.a, "Pas démarré FICTIF", "en_file", "place", {
          debut: null,
        }),
        member(ids.b, "Second FICTIF", "running", null, {
          debut: "2026-11-20T00:02:00.000Z",
        }),
        member(ids.c, "Premier FICTIF", "completed", null, {
          debut: "2026-11-20T00:01:00.000Z",
        }),
      ],
    } as never);
    expect(
      within(block())
        .getAllByRole("listitem", { name: /.+/ })
        .map((r) => r.getAttribute("aria-label")),
    ).toEqual(["Premier FICTIF", "Second FICTIF", "Pas démarré FICTIF"]);
  });
  it("sans aucun champ neuf : rendu d'aujourd'hui (ordre, compteur, aucun texte neuf)", () => {
    view({ family } as never);
    const b = block();
    expect(
      within(b)
        .getAllByRole("listitem", { name: /.+/ })
        .map((r) => r.getAttribute("aria-label")),
    ).toEqual(family.map((m) => m.titre));
    expect(within(b).getByRole("status").textContent).toBe(
      "7 membres · 0 en cours · 2 en attente d’une place ou d’un prérequis · 2 finies · 3 en attente de toi",
    );
    expect(b.textContent).not.toMatch(
      /durée|depuis|dernière action|Résultat|Échec après|réessayer|sans point précis|illisible|\+\d+ autres?/,
    );
    // Only the verifier's verdict folds; no result or failure fold is invented.
    expect(b.querySelectorAll("details")).toHaveLength(1);
    expect(within(b).queryByRole("button", { name: /autres?$/ })).toBeNull();
  });
});

describe("swarm-09 : lecture d'une mission avec la vue d'équipe", () => {
  it("ouvrir une mission la lit par GET /runs/:id?equipe=1, jamais sans le paramètre", async () => {
    const mother = run({ state: "completed", title: "Mère FICTIVE" } as never);
    vi.mocked(api).mockImplementation((path) =>
      path === "/catalog"
        ? (Promise.resolve(catalog) as never)
        : path === "/runs"
          ? (Promise.resolve([mother]) as never)
          : path.split("?")[0] === `/runs/${mother.id}`
            ? (Promise.resolve(mother) as never)
            : (new Promise(() => {}) as never),
    );
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Mère FICTIVE/ }),
    );
    await waitFor(() =>
      expect(vi.mocked(api)).toHaveBeenCalledWith(
        `/runs/${mother.id}?equipe=1`,
      ),
    );
    const reads = vi
      .mocked(api)
      .mock.calls.map(([path]) => path)
      .filter((path) => path.split("?")[0] === `/runs/${mother.id}`);
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.every((path) => path === `/runs/${mother.id}?equipe=1`)).toBe(
      true,
    );
  });
});
