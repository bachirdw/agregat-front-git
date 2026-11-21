// equipe-05 : section « Équipe » en liste verticale groupée par étape, et « Ce que l'équipe a appris »
// (maquette design_handoff_conversation_agent/Panneau equipe v6.dc.html). Données FICTIVES.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CarnetBlock, TeamBlock, noteParts } from "./Team";
import type { CarnetNote, FamilyMember, Run } from "./types";

afterEach(cleanup);

const member = (over: Partial<FamilyMember>): FamilyMember => ({
  id: "m" + Math.random().toString(16).slice(2),
  titre: "Membre FICTIF",
  agent: "claude",
  modele: "sonnet",
  role: "chercheur",
  pourquoi: "parallele",
  state: "completed",
  debut: "2026-11-21T09:00:00.000Z",
  fin: "2026-11-21T09:03:18.000Z",
  dureeMs: 198000,
  usage: { tours: 1, jetons: { total: 760717 } },
  ...over,
});
const ig = member({
  id: "ig",
  titre: "Recherche tendances Instagram — agents IA pour TPE/PME (FICTIF)",
  phase: { index: 1, label: "En parallèle" },
});
const x = member({
  id: "x",
  titre: "Recherche tendances X (Twitter) — agents IA pour TPE/PME (FICTIF)",
  phase: { index: 1, label: "En parallèle" },
  debut: "2026-11-21T09:00:13.000Z",
  dureeMs: 190000,
  usage: { tours: 1, jetons: { total: 704018 } },
});
const review = member({
  id: "r1",
  titre: "Relecture des 6 publications (FICTIF)",
  agent: "codex",
  modele: "",
  role: "verificateur",
  pourquoi: "regard_independant",
  relit: ["ig", "x"],
  phase: { index: 2, label: "Ensuite" },
  state: "running",
  dureeMs: undefined,
  fin: null,
  depuis: 125,
  usage: undefined,
});
const run = (family: FamilyMember[], over: Partial<Run> = {}) =>
  ({
    id: "mere",
    prompt: "Mission FICTIVE",
    agent: "claude",
    state: "running",
    mode: "agent",
    pack: "core",
    createdAt: "2026-11-21T08:59:00.000Z",
    family,
    ...over,
  }) as unknown as Run;
const team = (r: Run, props = {}) => {
  const handlers = {
    onOpenSide: vi.fn(),
    onCancel: vi.fn(),
    ...props,
  };
  render(<TeamBlock run={r} {...handlers} />);
  return handlers;
};
const rows = () => screen.getAllByRole("button", { expanded: false });

describe("Équipe : liste verticale groupée par étape", () => {
  it("une ligne par sous-agent, groupées par étape dans l'ordre (« 1. En parallèle », « 2. Ensuite »)", () => {
    team(run([review, x, ig]));
    const section = screen.getByRole("region", { name: "Équipe" });
    const groups = within(section).getAllByRole("list");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
      "1. En parallèle",
      "2. Ensuite",
    ]);
    expect(
      within(groups[0])
        .getAllByRole("listitem")
        .map((li) => li.getAttribute("aria-label")),
    ).toEqual([ig.titre, x.titre]);
    expect(within(groups[1]).getAllByRole("listitem")).toHaveLength(1);
  });

  it("sans phase : une seule liste, sans titre d'étape", () => {
    team(
      run([
        { ...ig, phase: undefined },
        { ...x, phase: undefined },
      ]),
    );
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(1);
    expect(screen.queryByText(/^1\. /)).toBeNull();
  });

  it("jamais de grille : la feuille de style ne met pas la liste de l'équipe en colonnes", () => {
    const css = readFileSync(resolve(__dirname, "v2.css"), "utf8");
    const rules = css.match(/\.team-[a-z-]*\s*\{[^}]*\}/g) ?? [];
    expect(rules.join("\n")).not.toMatch(
      /grid-template-columns:\s*(repeat|1fr 1fr)/,
    );
  });

  it("ligne repliée : titre complet, « Rôle · agent modèle · durée », sans pastille d'état ni de rôle, sans « Voir à côté »", () => {
    team(run([ig]));
    const row = screen.getByRole("button", {
      name: (name) => name.includes(ig.titre!),
    });
    expect(row.textContent).toContain(ig.titre);
    expect(row.textContent).toContain("Chercheur · claude sonnet · 3 min 18 s");
    // Plus de pastilles « Terminée » ni « chercheur » : l'état reste écrit pour le lecteur d'écran seulement.
    const section = screen.getByRole("region", { name: "Équipe" });
    expect(section.querySelector(".badge")).toBeNull();
    expect(section.querySelector(".team-dot .sr-only")!.textContent).toBe(
      "Terminée",
    );
    expect(screen.queryByText("chercheur")).toBeNull();
    expect(screen.queryByRole("button", { name: /Voir à côté/ })).toBeNull();
  });

  it("une seule ligne dépliée à la fois ; un second clic la replie", () => {
    team(run([ig, x]));
    const [a, b] = rows();
    fireEvent.click(a);
    expect(a.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(b);
    expect(a.getAttribute("aria-expanded")).toBe("false");
    expect(b.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(b);
    expect(b.getAttribute("aria-expanded")).toBe("false");
  });

  it("ligne dépliée : la raison, Modèle et Jetons, « Voir le résultat » qui ouvre le membre à côté", () => {
    const { onOpenSide } = team(run([ig]));
    fireEvent.click(rows()[0]);
    expect(
      screen.getByText(
        "Menée en même temps que d’autres tâches pour gagner du temps.",
      ),
    ).toBeTruthy();
    const details = screen.getByRole("group", {
      name: `Détail de ${ig.titre}`,
    });
    expect(details.textContent).toContain("Modèle");
    expect(details.textContent).toContain("claude · sonnet");
    expect(details.textContent).toContain("Jetons");
    expect(details.textContent).toMatch(/760\s717/);
    fireEvent.click(
      screen.getByRole("button", { name: `Voir le résultat de ${ig.titre}` }),
    );
    expect(onOpenSide).toHaveBeenCalledWith("ig");
  });

  it("sous-agent en cours : « Arrêter » dans la ligne dépliée seulement", () => {
    const { onCancel } = team(run([review]));
    expect(screen.queryByRole("button", { name: /^Arrêter/ })).toBeNull();
    fireEvent.click(rows()[0]);
    fireEvent.click(
      screen.getByRole("button", { name: `Arrêter ${review.titre}` }),
    );
    expect(onCancel).toHaveBeenCalledWith("r1");
  });

  it("en-tête : « Équipe » et le statut global (« 2 terminées » en vert, « 1 en cours » couleur « en cours »)", () => {
    team(run([ig, x]));
    const done = screen.getByText("2 terminées");
    expect(done.className).toContain("success");
    cleanup();
    team(run([ig, review]));
    // Même couleur que la pastille « en cours » de la table d'états (status.ts).
    expect(screen.getByText("1 en cours").className).toContain("info");
  });

  it("plan_summary présent : la phrase grise sous l'en-tête ; absent : rien", () => {
    const summary = "claude a découpé la mission FICTIVE en 3 tâches.";
    team(run([ig], { plan_summary: summary }));
    expect(screen.getByText(summary).className).toContain("team-plan");
    cleanup();
    const { container } = render(<TeamBlock run={run([ig])} />);
    expect(container.querySelector(".team-plan")).toBeNull();
  });
});

const note = (over: Partial<CarnetNote>): CarnetNote => ({
  n: 1,
  auteur: "Recherche tendances X (FICTIF)",
  role: "chercheur",
  categorie: "piege",
  a: "2026-11-21T13:58:09.000Z",
  ...over,
});

describe("Ce que l’équipe a appris", () => {
  it("note en ancien format : titre = première phrase, le reste = ce qui s'est passé", () => {
    expect(
      noteParts(
        note({
          texte:
            "WebFetch sur x.com renvoie une erreur 402. Même sans connexion, aucune page ne passe.",
        }),
      ),
    ).toEqual({
      title: "WebFetch sur x.com renvoie une erreur 402.",
      what: "Même sans connexion, aucune page ne passe.",
      fix: "",
    });
  });

  it("forme des leçons du back (ligne 1 la situation, ligne 2 la règle) : la règle va dans « Ce qu’il faut faire »", () => {
    expect(
      noteParts(
        note({
          texte:
            "Un pourcentage agrégé n'est pas une peur isolée\nQuand une source additionne plusieurs freins, ne pas le présenter comme une peur précise.",
        }),
      ),
    ).toEqual({
      title: "Un pourcentage agrégé n'est pas une peur isolée",
      what: "",
      fix: "Quand une source additionne plusieurs freins, ne pas le présenter comme une peur précise.",
    });
  });

  it("nouveau format (title, what, fix) : pris tel quel", () => {
    expect(
      noteParts(note({ title: "T", what: "W", fix: "F", texte: "ignoré" })),
    ).toEqual({ title: "T", what: "W", fix: "F" });
  });

  it("une note se déplie et montre « Ce qui s’est passé » et « Ce qu’il faut faire »", () => {
    render(
      <CarnetBlock
        run={run([], {
          carnet: {
            total: 1,
            notes: [
              note({
                texte:
                  "Les résultats sont pollués par des pages pub. Aucune donnée vérifiable.\nCroiser avec des sources crédibles.",
              }),
            ],
          },
        })}
      />,
    );
    const section = screen.getByRole("region", {
      name: "Ce que l’équipe a appris",
    });
    const row = within(section).getByRole("button", {
      name: /Les résultats sont pollués par des pages pub\./,
    });
    expect(row.textContent).toMatch(
      /Recherche tendances X \(FICTIF\) · \d\d:\d\d/,
    );
    expect(within(section).queryByText("Ce qui s’est passé")).toBeNull();
    fireEvent.click(row);
    expect(within(section).getByText("Ce qui s’est passé")).toBeTruthy();
    expect(within(section).getByText("Aucune donnée vérifiable.")).toBeTruthy();
    expect(within(section).getByText("Ce qu’il faut faire")).toBeTruthy();
    expect(
      within(section).getByText("Croiser avec des sources crédibles."),
    ).toBeTruthy();
  });

  it("pièges et méthodes dans la liste ; les autres notes (décision, découverte) repliées à part, rien n'est perdu", () => {
    render(
      <CarnetBlock
        run={run([], {
          carnet: {
            total: 3,
            notes: [
              note({ n: 1, categorie: "decision", texte: "Brief FICTIF." }),
              note({ n: 2, categorie: "piege", texte: "Piège FICTIF." }),
              note({ n: 3, categorie: "methode", texte: "Méthode FICTIVE." }),
            ],
          },
        })}
      />,
    );
    const section = screen.getByRole("region", {
      name: "Ce que l’équipe a appris",
    });
    const learned = within(section).getByRole("list", {
      name: "Obstacles et méthodes",
    });
    expect(within(learned).getAllByRole("listitem")).toHaveLength(2);
    expect(
      within(section).getByText("Autres notes du carnet · 1"),
    ).toBeTruthy();
  });

  it("ligne d'aide : « gardés en mémoire » seulement si le back a gardé des leçons", () => {
    const carnet = { total: 1, notes: [note({ texte: "Piège FICTIF." })] };
    render(<CarnetBlock run={run([], { carnet })} lessonsKept={0} />);
    expect(
      screen.getByText("Obstacles rencontrés et contournés.", { exact: false })
        .textContent,
    ).not.toMatch(/mémoire/);
    cleanup();
    render(<CarnetBlock run={run([], { carnet })} lessonsKept={2} />);
    expect(
      screen.getByText(/Obstacles rencontrés et contournés\./).textContent,
    ).toBe(
      "Obstacles rencontrés et contournés. 2 leçons gardées en mémoire pour les prochaines missions.",
    );
  });
});
