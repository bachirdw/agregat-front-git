// swarm-09 : one state table for the « Équipe » block (src/status.ts). Every value below is FICTIF.
import { describe, expect, it } from "vitest";
import {
  CLASSE_ETAT,
  LIMITE_MEMBRES,
  dureeOf,
  formatDuree,
  labelOf,
  libelleAutres,
  ligneConfie,
  membresVisibles,
  resumeEquipe,
  trierParDebut,
  variantOf,
} from "./status";
import { labels } from "./types";

// Every state the block renders, with its variant and its French label.
const known: [string, string, string][] = [
  ["queued", "attente", "En attente"],
  ["pending", "attente", "En attente"],
  ["en_file", "attente", "En file"],
  ["attend_prerequis", "attente", "Attend un prérequis"],
  ["running", "encours", "En cours"],
  ["awaiting_owner", "te_demande", "Attend votre réponse"],
  ["waiting_permission", "te_demande", "Autorisation requise"],
  ["waiting_approval", "te_demande", "Accord requis"],
  ["attend_accord", "te_demande", "Attend ton accord"],
  ["uncertain", "te_demande", "Incertaine · décision requise"],
  ["completed", "fini", "Terminée"],
  ["succeeded", "fini", "Réussie"],
  ["failed", "echec", "Échec"],
  ["cancelled", "annule", "Annulée"],
  ["interrupted", "annule", "Interrompue"],
  ["skipped", "annule", "Ignorée"],
];

describe("table d'états", () => {
  it.each(known)("%s → %s, « %s »", (state, variant, label) => {
    expect(variantOf(state)).toBe(variant);
    expect(labelOf(state)).toBe(label);
    expect(CLASSE_ETAT[variantOf(state)]).toBe(
      `etat etat-${variant.replace("_", "-")}`,
    );
  });
  it("chaque libellé de l'interface (types.ts) est dans la table : une seule table", () => {
    for (const [state, label] of Object.entries(labels)) {
      expect(labelOf(state)).toBe(label);
      expect(variantOf(state)).not.toBe("inconnu");
    }
  });
  it("état inconnu → « État inconnu », jamais la valeur brute", () => {
    for (const state of [
      "etat_fictif",
      "",
      "__proto__",
      "constructor",
      "toString",
      "hasOwnProperty",
      null,
      undefined,
      42,
      {},
    ]) {
      expect(variantOf(state)).toBe("inconnu");
      expect(labelOf(state)).toBe("État inconnu");
    }
    expect(labelOf("etat_fictif")).not.toContain("etat_fictif");
    expect(CLASSE_ETAT.inconnu).toBe("etat etat-inconnu");
  });
  it("attente : un état final passe avant, puis le propriétaire, puis la plateforme", () => {
    expect(variantOf("completed", "question")).toBe("fini");
    expect(variantOf("failed", "accord")).toBe("echec");
    expect(variantOf("running", "carte_envoi")).toBe("te_demande");
    expect(variantOf("running", "question")).toBe("te_demande");
    expect(variantOf("en_file", "accord")).toBe("te_demande");
    expect(variantOf("running", "place")).toBe("attente");
    expect(variantOf("running", "prerequis")).toBe("attente");
    expect(variantOf("awaiting_owner", "place")).toBe("te_demande");
    expect(variantOf("running", null)).toBe("encours");
    expect(variantOf("running", "attente_fictive")).toBe("encours");
  });
});

describe("durées", () => {
  it("« 45 s », « 4 min 12 s », « 1 h 05 »", () => {
    expect(formatDuree(45_000)).toBe("45 s");
    expect(formatDuree(45_999)).toBe("45 s");
    expect(formatDuree(252_000)).toBe("4 min 12 s");
    expect(formatDuree(3_900_000)).toBe("1 h 05");
    expect(formatDuree(25 * 3_600_000 + 60_000)).toBe("25 h 01");
    expect(formatDuree(0)).toBe("0 s");
  });
  it("valeur invalide : rien d'écrit", () => {
    for (const value of [-1, Number.NaN, Infinity, "45", null, undefined])
      expect(formatDuree(value)).toBe("");
  });
  it("durée d'un membre : dureeMs, sinon fin − début, sinon null", () => {
    expect(dureeOf({ dureeMs: 1000 })).toBe(1000);
    expect(
      dureeOf({
        debut: "2026-11-20T00:00:00.000Z",
        fin: "2026-11-20T00:04:12.000Z",
      }),
    ).toBe(252_000);
    expect(
      dureeOf({
        debut: "2026-11-20T00:05:00.000Z",
        fin: "2026-11-20T00:00:00.000Z",
      }),
    ).toBe(0);
    expect(dureeOf({ debut: "2026-11-20T00:00:00.000Z", fin: null })).toBe(
      null,
    );
    expect(dureeOf({ debut: "pas une date", fin: "non plus" })).toBe(null);
    expect(dureeOf({ dureeMs: -5 })).toBe(null);
    expect(dureeOf({})).toBe(null);
  });
  it("ligne « confié à agent · état · durée »", () => {
    expect(
      ligneConfie({
        agent: "agent-fictif-a",
        state: "completed",
        dureeMs: 252_000,
      }),
    ).toBe("confié à agent-fictif-a · Terminée · 4 min 12 s");
    expect(ligneConfie({ agent: "agent-fictif-a", state: "running" })).toBe(
      "confié à agent-fictif-a · En cours",
    );
    expect(ligneConfie({ state: "etat_fictif" })).toBe(
      "confié à un agent · État inconnu",
    );
  });
});

describe("membres", () => {
  const ten = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}` }));
  it("10 membres : 8 visibles et « +2 autres »", () => {
    expect(LIMITE_MEMBRES).toBe(8);
    const { visibles, caches } = membresVisibles(ten);
    expect(visibles.map((m) => m.id)).toEqual(ten.slice(0, 8).map((m) => m.id));
    expect(caches).toBe(2);
    expect(libelleAutres(caches)).toBe("+2 autres");
    expect(libelleAutres(1)).toBe("+1 autre");
    expect(libelleAutres(0)).toBe("");
    expect(membresVisibles(ten, 10)).toEqual({ visibles: ten, caches: 0 });
    expect(membresVisibles(ten.slice(0, 8)).caches).toBe(0);
    expect(membresVisibles(null as never)).toEqual({ visibles: [], caches: 0 });
  });
  it("tri par début : plus ancien d'abord, non démarrés ensuite dans leur ordre", () => {
    const sorted = trierParDebut([
      { id: "a" },
      { id: "b", debut: "2026-11-20T00:02:00.000Z" },
      { id: "c", debut: null },
      { id: "d", debut: "2026-11-20T00:01:00.000Z" },
      { id: "e", debut: "2026-11-20T00:01:00.000Z" },
    ]);
    expect(sorted.map((m) => m.id)).toEqual(["d", "e", "b", "a", "c"]);
    const none: { id: string; debut?: string }[] = [
      { id: "x" },
      { id: "y" },
      { id: "z" },
    ];
    expect(trierParDebut(none)).toEqual(none);
  });
  it("résumé chiffré : membres, agents distincts, membres encore vivants", () => {
    expect(
      resumeEquipe([
        { agent: "agent-fictif-a", state: "completed" },
        { agent: "agent-fictif-a", state: "running" },
        { agent: "agent-fictif-b", state: "en_file" },
        null as never,
      ]),
    ).toEqual({ membres: 3, agents: 2, vivants: 2 });
  });
});
