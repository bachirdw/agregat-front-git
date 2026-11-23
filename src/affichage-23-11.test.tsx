// affichage-23-11 : retours à la ligne gardés comme dans Claude Code, Bilan brut replié (données FICTIVES).
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Markdown } from "./Markdown";
import { AgentAnswer, splitSummary } from "./Bilan";
import { membresDuTour } from "./status";

afterEach(cleanup);

describe("retours à la ligne", () => {
  it("un retour simple reste un retour à la ligne", () => {
    const { container } = render(
      <Markdown text={"Décision : seul.\nAffirmations : non vérifiées."} />,
    );
    const p = container.querySelector("p")!;
    expect(p.querySelectorAll("br")).toHaveLength(1);
    expect(p.textContent).toMatch(
      /^Décision : seul\.\n?Affirmations : non vérifiées\.$/,
    );
  });
  it("un bloc de code garde son texte tel quel", () => {
    const { container } = render(<Markdown text={"```\na\nb\n```"} />);
    expect(container.querySelector("pre br")).toBeNull();
    expect(container.querySelector("code")!.textContent).toBe("a\nb\n");
  });
  it("les paragraphes, listes et tableaux restent comme avant", () => {
    const { container } = render(
      <Markdown text={"Un.\n\n- a\n- b\n\n| X | Y |\n| - | - |\n| 1 | 2 |"} />,
    );
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelectorAll("td")).toHaveLength(2);
    expect(container.querySelectorAll("br")).toHaveLength(0);
  });
});

describe("Bilan brut d'un tour annulé", () => {
  const bilan = [
    "Bilan",
    "- Cause : Annulée par l’utilisateur",
    "Accord des sous-agents : donné sur la carte au premier lancement.",
    "Sous-missions (1) :",
    "1. « Tâche FICTIVE » — rôle chercheur — terminée",
    "> Affirmations de l’agent : non vérifiées.",
    "Résultat rendu : texte FICTIF.",
  ].join("\n");
  it("n'est jamais pris pour la réponse de l'agent", () => {
    const split = splitSummary(bilan);
    expect(split.answer).toBe("");
    expect(split.details).toContain("Sous-missions (1) :");
  });
  it("après une réponse, il est coupé à « Bilan »", () => {
    expect(splitSummary("Réponse FICTIVE.\n\n" + bilan).answer).toBe(
      "Réponse FICTIVE.",
    );
  });
  it("se lit replié, une ligne par information, sans « > » ni « - »", () => {
    const { container } = render(<AgentAnswer text={bilan} />);
    expect(container.querySelector(".markdown")).toBeNull();
    const items = [...container.querySelectorAll(".action-details li")].map(
      (li) => li.textContent,
    );
    expect(items).toContain("Cause : Annulée par l’utilisateur");
    expect(items).toContain("Affirmations de l’agent : non vérifiées.");
  });
});

describe("sous-missions d'un tour repris", () => {
  const tour = {
    createdAt: "2026-11-23T06:56:54.101Z",
    resumedFrom: "tour-precedent",
    family: [
      { id: "a", debut: "2026-11-23T05:44:09.390Z" },
      { id: "b", debut: "2026-11-23T06:58:00.000Z" },
      { id: "c", debut: null },
    ],
  };
  it("ne garde que les sous-missions lancées pendant ce tour", () => {
    expect(membresDuTour(tour).family!.map((m) => m!.id)).toEqual(["b", "c"]);
  });
  it("un premier tour garde toute son équipe", () => {
    const premier = { ...tour, resumedFrom: null };
    expect(membresDuTour(premier)).toBe(premier);
  });
  it("sans sous-mission ancienne, la mission est rendue telle quelle", () => {
    const neuf = { ...tour, family: [tour.family[1]] };
    expect(membresDuTour(neuf)).toBe(neuf);
  });
});

describe("texte en cours d'écriture (remend)", () => {
  it("un gras pas encore fermé s'affiche déjà en gras", () => {
    const { container } = render(
      <Markdown text={"Je prépare **ton CV FICTIF"} streaming />,
    );
    expect(container.querySelector("strong")?.textContent).toBe(
      "ton CV FICTIF",
    );
    expect(container.textContent).not.toContain("**");
  });
  it("un lien à moitié écrit reste du texte, sans adresse inventée", () => {
    const { container } = render(
      <Markdown
        text={"Voir [la fiche](https://exemple.invalid/fi"}
        streaming
      />,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("la fiche");
  });
  it("un texte terminé n'est pas retouché", () => {
    const { container } = render(<Markdown text={"Prix : 3 **x"} />);
    expect(container.querySelector("strong")).toBeNull();
    expect(container.textContent).toBe("Prix : 3 **x");
  });
});
