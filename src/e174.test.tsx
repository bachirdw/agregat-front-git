// e174-01 (back, API 4310 depuis le 21/11 à 22:36, docs/api-attachments.md) : une pièce jointe n'est qu'une pièce
// jointe ; seul l'en-tête `x-skill: career-ops` sur POST /api/files, envoyé quand le Skill career-ops est choisi
// dans la conversation, en fait le nouveau cv.md. Données FICTIVES.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { uploadFile } from "./api";
import { Composer } from "./Composer";
import { TeamBlock } from "./Team";
import type { Catalog, FamilyMember, MissionInput, Run } from "./types";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  // Une réponse neuve à chaque appel : un corps ne se lit qu'une fois.
  fetchMock.mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          id: "f1",
          name: "cv.md",
          size: 12,
          type: "text/markdown",
        }),
        { status: 201 },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const file = () =>
  new File(["# CV FICTIF"], "cv.md", { type: "text/markdown" });
const headers = (call = 0) =>
  fetchMock.mock.calls[call][1].headers as Record<string, string>;

describe("POST /api/files : en-tête x-skill", () => {
  it("Skill career-ops choisi : `x-skill: career-ops` (valeur exacte)", async () => {
    await uploadFile(file(), undefined, "career-ops");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/files");
    expect(headers()["x-skill"]).toBe("career-ops");
  });
  it("sans Skill ou avec un autre : aucun en-tête x-skill (simple pièce jointe)", async () => {
    await uploadFile(file());
    await uploadFile(file(), undefined, "offer-evaluation");
    expect("x-skill" in headers(0)).toBe(false);
    expect("x-skill" in headers(1)).toBe(false);
  });
});

const catalog = {
  live: false,
  agents: [],
  packs: [
    {
      id: "career-ops",
      name: "Candidatures FICTIF",
      description: "",
      skills: [],
      dags: [],
    },
  ],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
} as unknown as Catalog;
const input = {
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
} as unknown as MissionInput;
const attach = async (props: Partial<Parameters<typeof Composer>[0]>) => {
  render(
    <Composer
      catalog={catalog}
      input={input}
      onChange={vi.fn()}
      onPlan={vi.fn()}
      busy={false}
      {...props}
    />,
  );
  fireEvent.change(screen.getByLabelText("Fichier à joindre"), {
    target: { files: [file()] },
  });
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  return headers();
};

describe("Composer : x-skill seulement quand career-ops est choisi", () => {
  it("accueil, pack career-ops choisi : x-skill envoyé", async () => {
    expect(
      (await attach({ input: { ...input, pack: "career-ops" } }))["x-skill"],
    ).toBe("career-ops");
  });
  it("accueil, Skill career-ops dans `skills` : x-skill envoyé", async () => {
    expect(
      (await attach({ input: { ...input, skills: ["career-ops"] } }))[
        "x-skill"
      ],
    ).toBe("career-ops");
  });
  it("accueil sans choix : pas de x-skill, cv.md n'est pas touché", async () => {
    expect("x-skill" in (await attach({}))).toBe(false);
  });
  it("dans une mission career-ops : x-skill envoyé, d'après le pack de la mission", async () => {
    const sent = await attach({
      reply: true,
      sessionSettings: {
        agent: "claude",
        model: "",
        pack: "career-ops",
        skills: [],
      },
    });
    expect(sent["x-skill"]).toBe("career-ops");
  });
  it("dans une mission sans career-ops : pas de x-skill, même si le brouillon de l'accueil l'avait", async () => {
    const sent = await attach({
      reply: true,
      input: { ...input, pack: "career-ops" },
      sessionSettings: { agent: "claude", model: "", pack: "core", skills: [] },
    });
    expect("x-skill" in sent).toBe(false);
  });
});

// equipe-v6-01 : `etape.numero` est calculé pour tout membre ; un titre d'étape n'a de sens qu'avec au moins
// deux étapes, ou un libellé donné par le chef.
const member = (id: string, numero: number, libelle?: string) =>
  ({
    id,
    titre: `Membre ${id} FICTIF`,
    state: "completed",
    etape: libelle ? { numero, libelle } : { numero },
  }) as FamilyMember;
const team = (family: FamilyMember[]) =>
  render(
    <TeamBlock
      run={{ id: "m", state: "completed", family } as unknown as Run}
    />,
  );

describe("étapes calculées pour tous les membres", () => {
  it("tous à l'étape 1, sans libellé : une seule liste, sans titre « Étape 1 »", () => {
    team([member("a", 1), member("b", 1)]);
    expect(screen.getAllByRole("list")).toHaveLength(1);
    expect(screen.queryByText("Étape 1")).toBeNull();
  });
  it("une seule étape mais un libellé du chef : le titre est gardé", () => {
    team([member("a", 1, "Recherches"), member("b", 1)]);
    expect(
      screen.getAllByRole("list").map((l) => l.getAttribute("aria-label")),
    ).toEqual(["1. Recherches"]);
  });
  it("deux étapes : les groupes « Étape 1 » et « Étape 2 »", () => {
    team([member("a", 1), member("b", 2)]);
    expect(
      screen.getAllByRole("list").map((l) => l.getAttribute("aria-label")),
    ).toEqual(["Étape 1", "Étape 2"]);
  });
});
