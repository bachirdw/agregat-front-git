// equipe-lisible-22-11 : réponse d'une mission en équipe lisible par le propriétaire (cas 2da0cae5, données
// FICTIVES de même forme : 4 tâches, 2 reprises, Bilan de la mère avec citations des membres).
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunTurn } from "./RunTurn";
import {
  avecMotsSimples,
  coutAnnonce,
  dureeMission,
  dureeTache,
  heure,
  ligneEtat,
  lignesTechniques,
  partiesDuResume,
  phraseTaches,
  problemesDuScan,
  resultatLisible,
  tachesDe,
} from "./TeamAnswer";
import { avecDetailsDesLignes } from "./status";
import type { FamilyMember, Run, RunEvent } from "./types";

afterEach(cleanup);

const T0 = Date.parse("2026-11-22T01:07:16.000Z");
const at = (s: number) => new Date(T0 + s * 1000).toISOString();
const ev = (seq: number, type: string, data: object, s = 0): RunEvent => ({
  seq,
  type,
  data: data as RunEvent["data"],
  at: at(s),
});
const texte = (seq: number, text: string, s: number) =>
  ev(
    seq,
    "agent",
    { sessionUpdate: "agent_message_chunk", content: { type: "text", text } },
    s,
  );
const outil = (seq: number, id: string, name: string, s: number) =>
  ev(
    seq,
    "agent",
    {
      sessionUpdate: "tool_call",
      toolCallId: id,
      title: name,
      status: "completed",
      _meta: { claudeCode: { toolName: name } },
    },
    s,
  );
const usage = (montant: number | null) => ({
  tours: 0,
  jetons: null,
  cout: montant === null ? null : { montant, devise: "USD" },
});
const membre = (
  over: Partial<FamilyMember> & { id: string },
): FamilyMember => ({
  agent: "claude",
  modele: "sonnet",
  ...over,
});
const family: FamilyMember[] = [
  membre({
    id: "m-a",
    titre: "Recherche A FICTIVE — Ville",
    state: "completed",
    dureeMs: 691814,
    resultat:
      "### Ce qui a été fait\n- 6 recherches FICTIVES\n18 stages FICTIFS",
    usage: usage(3.0285906),
    etape: { numero: 1, libelle: "Recherche A" },
  }),
  membre({
    id: "m-b",
    titre: "Recherche B FICTIVE — Ville",
    state: "completed",
    dureeMs: 958670,
    resultat: "33 emplois FICTIFS",
    usage: usage(3.482234),
    etape: { numero: 1, libelle: "Recherche B" },
  }),
  membre({
    id: "m-c",
    titre: "Recherche C FICTIVE — Ville",
    state: "failed",
    dureeMs: 1250573,
    cause: {
      type: "erreur",
      message: "Exécution FICTIVE échouée.",
      reprise: null,
    },
    usage: usage(3.553697),
    etape: { numero: 1, libelle: "Recherche C" },
  }),
  membre({
    id: "m-d",
    titre: "Recherche D FICTIVE — Ville",
    state: "failed",
    dureeMs: 575903,
    cause: {
      type: "erreur",
      message: "Exécution FICTIVE échouée.",
      reprise: null,
    },
    usage: usage(1.2577738),
    etape: { numero: 1, libelle: "Recherche D" },
  }),
  membre({
    id: "m-d2",
    titre: "Recherche D FICTIVE — Ville (reprise)",
    state: "cancelled",
    dureeMs: 117855,
    cause: {
      type: "erreur",
      message: "Annulée par l’utilisateur",
      reprise: null,
    },
    usage: usage(null),
    etape: { numero: 1, libelle: "Recherche D (retry)" },
  }),
  membre({
    id: "m-c2",
    titre: "Recherche C FICTIVE — Ville (reprise)",
    state: "cancelled",
    dureeMs: 110636,
    cause: {
      type: "erreur",
      message: "Annulée par l’utilisateur",
      reprise: null,
    },
    usage: usage(null),
    etape: { numero: 1, libelle: "Recherche C (retry)" },
  }),
];
// Lignes de `GET /api/runs` : le lien des reprises n'est que là (`famille.reprend`).
const lignes = [
  { id: "m-d2", famille: { mere: "mere", reprend: "m-d" } },
  { id: "m-c2", famille: { mere: "mere", reprend: "m-c" } },
];
const bilan = [
  "Bilan",
  "- Actions réussies : career_read, career_script.",
  "- Scan : 4 portail(s) FICTIFS en échec.",
  "  - Portail A FICTIF : injoignable.",
  "  - Portail B FICTIF : « fetch failed ».",
  "- Écart d’ordre : aucun constaté.",
  "- Cause : Annulée par l’utilisateur",
  "Accord des sous-agents : case cochée avant l’envoi.",
  "Sous-missions (6) :",
  "1. « Recherche A FICTIVE — Ville » — agent claude, terminée, 11 min 32 s (sous-mission m-a)",
  "> Affirmations de l’agent : non vérifiées.",
  "> Bilan",
  "> - Résultats mixtes : browser_extract : 8 réussis, 1 échoué.",
  "Totaux de la famille vus par la plateforme : 2 terminée(s), 2 en échec.",
  "Consommation : 6 sous-mission(s). Consommation annoncée par les agents : chef (coût annoncé 2,28 USD) ; « Recherche A FICTIVE » (coût annoncé 3,0286 USD) ; total connu : 9 jetons. Attente du chef : 18 appels de mission_attendre, 13 min 36 s.",
  "Motifs des délégations : « Recherche A FICTIVE » (parallèle : source A ; source B) ; « Recherche B FICTIVE » (parallèle : source B)",
  "Leçons : 3 servies.",
  "Carnet d’équipe : 4 note(s).",
].join("\n");
const mere = avecDetailsDesLignes(
  {
    id: "mere",
    prompt: "Mission FICTIVE en équipe",
    agent: "claude",
    model: "",
    state: "cancelled",
    mode: "agent",
    pack: "career-ops",
    error: "Annulée par l’utilisateur",
    createdAt: at(0),
    finishedAt: at(29 * 60 + 5),
    plan: { steps: [] },
    result: { simulated: false, summary: bilan, evidence: [] },
    family,
  } as unknown as Run,
  lignes,
);
const evenements = [
  texte(1, "Je lance les quatre recherches FICTIVES.", 60),
  outil(2, "l1", "mcp__relay-missions__mission_lancer", 61),
  texte(3, "Les 4 missions tournent, j’attends.", 120),
  outil(4, "w1", "mcp__relay-missions__mission_attendre", 121),
  texte(5, "Toujours en cours, j’attends la suite.", 300),
  outil(6, "w2", "mcp__relay-missions__mission_attendre", 301),
  texte(7, "A a terminé : 18 stages FICTIFS. J’attends la suite.", 900),
  outil(8, "w3", "mcp__relay-missions__mission_attendre", 901),
  texte(9, "Les deux reprises FICTIVES sont lancées.", 1600),
  outil(10, "l2", "mcp__relay-missions__mission_lancer", 1601),
  ev(11, "usage", usage(2.2799906), 1745),
];
const tour = (run: Run, events = evenements, onOpenMember = vi.fn()) =>
  render(
    <RunTurn
      run={run}
      events={events}
      busy={false}
      act={vi.fn(async () => {})}
      onOpenMember={onOpenMember}
    />,
  );

describe("calculs de la réponse en équipe", () => {
  it("une reprise se range sous sa première tentative et ne compte pas en plus", () => {
    const taches = tachesDe(mere.family!);
    expect(taches.map((t) => t.premiere.id)).toEqual([
      "m-a",
      "m-b",
      "m-c",
      "m-d",
    ]);
    expect(taches[2].reprises.map((m) => m.id)).toEqual(["m-c2"]);
    expect(taches[3].reprises.map((m) => m.id)).toEqual(["m-d2"]);
    expect(phraseTaches(taches)).toBe("4 tâches : 2 terminées, 2 non abouties");
  });
  it("sans `reprend`, chaque membre est une tâche (rien n'est deviné d'après le titre)", () => {
    expect(tachesDe(family)).toHaveLength(6);
  });
  it("coût annoncé : somme mère comprise, « au moins » quand un agent n'annonce rien", () => {
    expect(coutAnnonce(mere, evenements)).toEqual({
      texte: "13,60 USD",
      auMoins: true,
    });
    expect(coutAnnonce({ ...mere, family: [] } as Run, [])).toBeNull();
  });
  it("durées et heure : « 29 min » pour la mission, « 11 min 32 s » pour une tâche", () => {
    expect(dureeMission(29 * 60_000 + 5_000)).toBe("29 min");
    expect(dureeMission(65 * 60_000)).toBe("1 h 05");
    expect(dureeTache(691814)).toBe("11 min 32 s");
    expect(dureeTache(45_000)).toBe("45 s");
    expect(ligneEtat(mere)).toBe(
      `Annulée par vous à ${heure(mere.finishedAt!)}`,
    );
    expect(ligneEtat({ ...mere, state: "running" } as Run)).toBe("En cours");
    expect(
      ligneEtat(
        { ...mere, state: "failed", error: "x" } as Run,
        "Étape FICTIVE en échec.",
      ),
    ).toBe(`En échec à ${heure(mere.finishedAt!)} : Étape FICTIVE en échec.`);
  });
  it("le Bilan de la mère : aucune réponse avant lui, tout le reste en détails", () => {
    const p = partiesDuResume(bilan);
    expect(p.reponse).toBe("");
    expect(p.technique.startsWith("Bilan")).toBe(true);
    const avecReponse = partiesDuResume(
      "Voici la synthèse FICTIVE.\n\n" + bilan,
    );
    expect(avecReponse.reponse).toBe("Voici la synthèse FICTIVE.");
  });
  it("problèmes du scan : la ligne « - Scan : » et ses sous-lignes, pas les citations", () => {
    expect(problemesDuScan(partiesDuResume(bilan).technique)).toEqual([
      {
        titre: "4 portail(s) FICTIFS en échec.",
        details: [
          "Portail A FICTIF : injoignable.",
          "Portail B FICTIF : « fetch failed ».",
        ],
      },
    ]);
  });
  it("détails : chaque rubrique sur sa ligne, mots simples à côté des outils", () => {
    const l = lignesTechniques(bilan);
    expect(l).toContain(
      "Attente du chef : 18 appels de mission_attendre, 13 min 36 s.",
    );
    expect(
      l.some((x) => x.startsWith("Consommation annoncée par les agents : ")),
    ).toBe(true);
    expect(avecMotsSimples("browser_extract : 8")).toBe(
      "browser_extract (lectures de page) : 8",
    );
    // Un nom préfixé (mcp__platform__career_read) n'est pas touché.
    expect(avecMotsSimples("mcp__platform__career_read")).toBe(
      "mcp__platform__career_read",
    );
  });
  it("résultat d'un membre : titres « # » retirés ; une coupe à 600 caractères le dit", () => {
    expect(resultatLisible("### Fait\n- a")).toBe("Fait\n- a");
    expect(resultatLisible("mot ".repeat(150).trim() + "x")).toMatch(/ …$/);
  });
});

describe("affichage d'une mission en équipe finie", () => {
  it("carte Résultat : état en mots simples, durée, coût annoncé, compte des tâches", () => {
    tour(mere);
    const carte = screen.getByRole("region", { name: "Résultat" });
    expect(carte.textContent).toContain("Annulée par vous à");
    expect(carte.textContent).toContain("Durée : 29 min");
    expect(carte.textContent).toContain(
      "Coût annoncé par les agents : au moins 13,60 USD",
    );
    expect(carte.textContent).toContain(
      "4 tâches : 2 terminées, 2 non abouties",
    );
    expect(carte.querySelectorAll("p").length).toBeLessThanOrEqual(4);
  });
  it("ce qui a été trouvé : une carte par membre terminé, et « Ouvrir » vers la sous-mission", () => {
    const open = vi.fn();
    tour(mere, evenements, open);
    const trouve = screen.getByRole("region", { name: "Ce qui a été trouvé" });
    expect(within(trouve).getByText("Recherche A")).toBeTruthy();
    expect(within(trouve).getByText("Recherche B")).toBeTruthy();
    expect(trouve.textContent).toContain("18 stages FICTIFS");
    expect(trouve.textContent).not.toContain("###");
    fireEvent.click(
      within(trouve).getByRole("button", {
        name: "Ouvrir la sous-mission Recherche A",
      }),
    );
    expect(open).toHaveBeenCalledWith("m-a");
  });
  it("tableau Équipe : 4 tâches, les reprises en sous-ligne, la cause d'un échec sous sa ligne", () => {
    tour(mere);
    const table = within(
      screen.getByRole("region", { name: "Tâches de l’équipe" }),
    );
    expect(table.getAllByRole("rowheader").map((c) => c.textContent)).toEqual([
      "Recherche A",
      "Recherche B",
      "Recherche C",
      "Recherche D",
    ]);
    expect(table.getAllByText("Reprise : annulée")).toHaveLength(2);
    expect(table.getAllByText("Exécution FICTIVE échouée.")).toHaveLength(2);
    expect(table.getByText("11 min 32 s")).toBeTruthy();
    expect(table.getByText("3,03 USD")).toBeTruthy();
    expect(table.getAllByText("Terminée")).toHaveLength(2);
    expect(table.getAllByText("En échec")).toHaveLength(2);
  });
  it("problèmes : les sites que le Skill n'a pas pu lire, en liste à part", () => {
    tour(mere);
    const p = screen.getByRole("region", { name: "Problèmes" });
    expect(p.textContent).toContain("Sites que le Skill n’a pas pu lire");
    expect(within(p).getAllByRole("listitem")).toHaveLength(2);
  });
  it("partie visible sans nom d'outil ni identifiant ; détails repliés, une ligne par rubrique", () => {
    const { container } = tour(mere);
    const visible = [
      ...container.querySelectorAll(
        ".equipe-resultat, .equipe-trouve, .equipe-table, .equipe-problemes",
      ),
    ]
      .map((e) => e.textContent)
      .join(" ");
    expect(visible).not.toMatch(
      /browser_|career_|mission_attendre|sous-mission m-/,
    );
    const details = container.querySelector(
      ".equipe-details",
    ) as HTMLDetailsElement;
    expect(details.open).toBe(false);
    const paragraphes = [...details.querySelectorAll("p")].map(
      (p) => p.textContent,
    );
    expect(paragraphes).toContain(
      "Accord des sous-agents : case cochée avant l’envoi.",
    );
    expect(paragraphes).toContain("Sous-missions (6)");
    expect(paragraphes).toContain("Leçons : 3 servies.");
    expect(paragraphes).toContain("Carnet d’équipe : 4 note(s).");
    expect(details.textContent).toContain("browser_extract (lectures de page)");
    expect(details.querySelector(".tech-citation")).toBeTruthy();
  });
  // 22/11 après-midi, demande du propriétaire : plus de pli « Déroulé » en bas ; le fil reste visible,
  // seuls les plus anciens messages se replient, en haut, quand il est long.
  it("fil visible sous la carte Résultat, sans pli « Déroulé » ; le dernier message reste", () => {
    const { container } = tour(mere);
    expect(container.querySelector(".deroule")).toBeNull();
    expect(screen.queryByText(/^Déroulé/)).toBeNull();
    const fin = screen.getByText("Les deux reprises FICTIVES sont lancées.");
    expect(
      container
        .querySelector(".equipe-resultat")!
        .compareDocumentPosition(fin) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.textContent).toContain("2 messages d’attente précédents");
  });
});

describe("mission en équipe en cours", () => {
  it("les messages d'attente consécutifs sont regroupés : le dernier visible, les autres repliés", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(T0 + 1000 * 1000);
    const enCours = {
      ...mere,
      state: "running",
      error: undefined,
      finishedAt: undefined,
      result: undefined,
      family: mere.family!.map((m) =>
        m.id === "m-a" ? m : { ...m, state: "running", dureeMs: undefined },
      ),
    } as unknown as Run;
    const { container } = tour(enCours, evenements.slice(0, 8));
    expect(container.querySelector(".deroule")).toBeNull();
    expect(
      screen.getByRole("region", { name: "Résultat" }).textContent,
    ).toContain("En cours");
    const groupe = container.querySelector(".attente-groupe")!;
    expect(groupe.textContent).toContain(
      "En attente de 3 tâches, depuis 14 min",
    );
    expect(
      groupe.querySelector(".attente-precedente summary")!.textContent,
    ).toBe("2 messages d’attente précédents");
    expect([...groupe.children].at(-1)!.textContent).toContain(
      "A a terminé : 18 stages FICTIFS.",
    );
    now.mockRestore();
  });
});

describe("mission sans équipe", () => {
  it("affichage inchangé : la réponse et le Bilan replié comme avant, pas de carte Résultat", () => {
    const seule = {
      ...mere,
      family: undefined,
      pack: "core",
      state: "completed",
      error: undefined,
      result: {
        simulated: false,
        summary:
          "Réponse FICTIVE.\nBilan\n- Actions réussies : browser_navigate.",
        evidence: [],
      },
    } as unknown as Run;
    const { container } = tour(seule, []);
    expect(container.querySelector(".equipe-reponse")).toBeNull();
    expect(screen.getByText("Réponse FICTIVE.")).toBeTruthy();
    expect(screen.getByText(/^Détails des actions/)).toBeTruthy();
  });
});
