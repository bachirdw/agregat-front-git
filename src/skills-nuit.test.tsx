// skills-nuit-22-11 : nouveautés du back de la nuit du 21 au 22/11 (docs/api-skills-import.md :
// skills-install-01/02, fiche-02, skills-maj-01 ; equipe-essai-01) dans le menu Skills et l'équipe.
// Données FICTIVES.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Skills } from "./Galleries";
import { ApiError } from "./api";
import { TeamBlock } from "./Team";
import type { Catalog, Run, Skill } from "./types";

afterEach(cleanup);
const catalog: Catalog = {
  live: false,
  agents: [],
  packs: [],
  skills: [],
  meters: {},
  pricing: { currency: "EUR", centsPerUnit: {}, monthlyCapCents: null },
};
const base: Skill = {
  id: "prospecting-fictif",
  name: "prospecting-fictif",
  version: "1.0.0",
  origin: "third-party",
  state: "quarantined",
  active: false,
  installed: false,
  integrity: true,
  hash: "a".repeat(64),
  findings: [],
  source: {
    url: "https://github.com/exemple/skills-fictifs",
    sha: "5b2b400eec1e7e1cec76245a715d0b0d4fd2a9c1",
  },
};
const show = (
  skill: Skill,
  request: (path: string, body: unknown) => Promise<unknown> = vi.fn(
    async () => ({}),
  ),
) => {
  const act = vi.fn(async () => {});
  render(
    <Skills
      catalog={{ ...catalog, skills: [skill] }}
      busy={false}
      act={act}
      request={request}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Détails de " + skill.name }),
  );
  return { act, request };
};

describe("constats d'un Skill", () => {
  it("un constat « info » n'est pas orange", () => {
    show({
      ...base,
      findings: [
        { level: "info", message: "Navigateur : fourni (FICTIF)" },
        { level: "warning", message: "À importer aussi (FICTIF)" },
      ],
    });
    const info = screen.getByText(/Navigateur : fourni \(FICTIF\)/);
    expect(info.className).toContain("info");
    expect(info.className).not.toContain("warning");
    expect(info.textContent).toMatch(/^Info · /);
    expect(screen.getByText(/À importer aussi \(FICTIF\)/).className).toContain(
      "warning",
    );
  });
});

describe("fiche de compatibilité", () => {
  it("besoins avec verdict et lignes, licence, dépendances déjà importées ou à importer", () => {
    show({
      ...base,
      compatibilite: {
        licence: { texte: "MIT (LICENSE, racine du dépôt)" },
        besoins: [
          {
            type: "outil",
            nom: "Navigateur",
            verdict: "fourni",
            fournisseur: "navigateur de Relay",
            sources: [{ fichier: "SKILL.md", ligne: 59 }],
          },
          {
            type: "cle",
            nom: "APOLLO_API_KEY",
            verdict: "à fournir par l'utilisateur (clé)",
            sources: [{ fichier: "references/api.md", ligne: 12 }],
          },
        ],
        dependances: [
          {
            id: "cold-email-fictif",
            adresse:
              "https://github.com/exemple/skills-fictifs/tree/main/skills/cold-email-fictif",
            registre: { etat: "quarantined", memeSource: true },
          },
          {
            id: "customer-research-fictif",
            adresse:
              "https://github.com/exemple/skills-fictifs/tree/main/skills/customer-research-fictif",
          },
        ],
      },
    });
    fireEvent.click(screen.getByText("Compatibilité"));
    const panel = screen.getByRole("region", {
      name: "Compatibilité de prospecting-fictif",
    });
    expect(within(panel).getByText("Navigateur")).toBeTruthy();
    expect(within(panel).getByText("fourni")).toBeTruthy();
    expect(within(panel).getByText(/SKILL\.md, ligne 59/)).toBeTruthy();
    expect(
      within(panel).getByText("à fournir par l'utilisateur (clé)"),
    ).toBeTruthy();
    expect(
      within(panel).getByText(/MIT \(LICENSE, racine du dépôt\)/),
    ).toBeTruthy();
    expect(
      within(panel).getByText(/déjà importé \(état : en quarantaine\)/),
    ).toBeTruthy();
    const link = within(panel).getByRole("link", {
      name: /customer-research-fictif/,
    });
    expect(link.getAttribute("href")).toContain(
      "/tree/main/skills/customer-research-fictif",
    );
    expect(within(panel).getByText(/à importer aussi/)).toBeTruthy();
  });
});

describe("mise à jour sur problème", () => {
  const withUpdate = (
    miseAJour: Skill["miseAJour"],
    extra: Partial<Skill> = {},
  ) =>
    ({
      ...base,
      state: "active",
      active: true,
      installed: true,
      notification: {
        niveau: "warning",
        type: "mise-a-jour",
        texte: "Mise à jour conseillée : corrige “Portail FICTIF”",
      },
      problemes: [
        {
          cause: "Portail FICTIF : le site a changé d’adresse",
          n: 3,
          derniere: "2026-11-21T10:00:00.000Z",
          type: "cause",
        },
      ],
      miseAJour,
      ...extra,
    }) as Skill;
  const git = {
    source: "git" as const,
    depot: "https://github.com/exemple/skills-fictifs",
    disponible: true,
    versionLocale: "5b2b400",
    versionDistante: "9c1d2e3",
    raison: "Un changement corrige un problème connu (FICTIF).",
    changements: [
      {
        sha: "9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d",
        date: "2026-11-21T08:00:00.000Z",
        titre: "Fix portail FICTIF",
        pertinent: true,
        correspond: "portail",
      },
    ],
  };
  it("badge sur la carte, problèmes, changements et boutons Vérifier / Mettre à jour", async () => {
    const { request } = show(withUpdate(git));
    const badge = screen.getByText("Mise à jour conseillée");
    expect(badge.getAttribute("title")).toBe(
      "Mise à jour conseillée : corrige “Portail FICTIF”",
    );
    const panel = screen.getByRole("region", {
      name: "Mises à jour de prospecting-fictif",
    });
    expect(
      within(panel).getByText(/Portail FICTIF : le site a changé d’adresse/),
    ).toBeTruthy();
    expect(within(panel).getByText(/3 missions/)).toBeTruthy();
    const commit = within(panel).getByRole("link", {
      name: /Fix portail FICTIF/,
    });
    expect(commit.getAttribute("href")).toBe(
      "https://github.com/exemple/skills-fictifs/commit/9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d",
    );
    expect(within(panel).getByText(/corrige : portail/)).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Vérifier" }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/skills/prospecting-fictif/verifier",
        {},
      ),
    );
    fireEvent.click(
      within(panel).getByRole("button", { name: "Mettre à jour" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/skills/prospecting-fictif/mettre-a-jour",
        {},
      ),
    );
  });
  it("source locale : la marche à suivre au lieu du bouton", () => {
    show(
      withUpdate({
        source: "local",
        disponible: true,
        raison: "Version 1.19 publiée (FICTIF).",
        marche:
          "Ce Skill vient d’un dossier local : Relay ne le modifie jamais (FICTIF).",
        changements: [],
      }),
    );
    const panel = screen.getByRole("region", {
      name: "Mises à jour de prospecting-fictif",
    });
    expect(
      within(panel).getByText(/Relay ne le modifie jamais \(FICTIF\)/),
    ).toBeTruthy();
    expect(
      within(panel).queryByRole("button", { name: "Mettre à jour" }),
    ).toBeNull();
  });
  it("nouvelle version en quarantaine : revue liée à son empreinte, puis installer ; revenir en arrière", async () => {
    const candidat = {
      hash: "b".repeat(64),
      version: "1.1.0",
      etat: "quarantined",
      findings: [],
    };
    const { request } = show(
      withUpdate({
        ...git,
        candidat,
        precedentes: [
          { hash: "c".repeat(64), version: "0.9.0", sha: "1111111" },
        ],
      }),
    );
    const panel = screen.getByRole("region", {
      name: "Mises à jour de prospecting-fictif",
    });
    const approve = within(panel).getByRole("button", {
      name: "Approuver la nouvelle version",
    }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    fireEvent.click(within(panel).getByRole("checkbox"));
    fireEvent.click(approve);
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/skills/prospecting-fictif/review",
        {
          approved: true,
          hash: "b".repeat(64),
        },
      ),
    );
    fireEvent.click(
      within(panel).getByRole("button", { name: "Revenir à la version 0.9.0" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/skills/prospecting-fictif/revenir",
        {
          hash: "c".repeat(64),
        },
      ),
    );
    cleanup();
    const second = show(
      withUpdate({ ...git, candidat: { ...candidat, etat: "reviewed" } }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Installer la mise à jour" }),
    );
    await waitFor(() =>
      expect(second.request).toHaveBeenCalledWith(
        "/skills/prospecting-fictif/mettre-a-jour/installer",
        { hash: "b".repeat(64) },
      ),
    );
  });
});

describe("vérification : retours de l'essai réel", () => {
  it("versions en empreinte courte, et une ligne pendant la vérification", async () => {
    let finish: (v: unknown) => void = () => {};
    const request = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    show(
      {
        ...base,
        miseAJour: {
          source: "git",
          disponible: false,
          raison: "À jour (FICTIF).",
          versionLocale: "5b2b400eec1e7e1cec76245a715d0b0d4fd2a9c1",
          versionDistante: "5b2b400eec1e7e1cec76245a715d0b0d4fd2a9c1",
          changements: [],
        },
      },
      request,
    );
    const panel = screen.getByRole("region", {
      name: "Mises à jour de prospecting-fictif",
    });
    expect(panel.textContent).toContain("Version en place : 5b2b400");
    expect(panel.textContent).not.toContain("5b2b400eec1e7e1c");
    fireEvent.click(within(panel).getByRole("button", { name: "Vérifier" }));
    expect(
      await within(panel).findByText(/Vérification auprès du dépôt d’origine/),
    ).toBeTruthy();
    finish({ skills: [] });
    await waitFor(() =>
      expect(
        within(panel).queryByText(/Vérification auprès du dépôt d’origine/),
      ).toBeNull(),
    );
  });
});

describe("import par adresse collée", () => {
  const fill = (address: string) => {
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: /Importer depuis GitHub/ }),
    );
    fireEvent.change(screen.getByLabelText("Dépôt GitHub"), {
      target: { value: address },
    });
  };
  it("aide : l'adresse se colle telle quelle", () => {
    show(base);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: /Importer depuis GitHub/ }),
    );
    expect(screen.getByText(/Collez l’adresse telle quelle/)).toBeTruthy();
  });
  it("dépôt à plusieurs Skills : une case par candidat, « Importer la sélection », puis le compte rendu", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError("Ce dépôt contient 3 Skills (FICTIF)", 400, {
          error: "Ce dépôt contient 3 Skills (FICTIF)",
          candidats: [
            {
              id: "a-fictif",
              chemin: "skills/a-fictif",
              description: "Premier",
              adresse: "https://github.com/exemple/r/tree/main/skills/a-fictif",
              ref: "main",
            },
            {
              id: "b-fictif",
              chemin: "skills/b-fictif",
              description: "Second",
              adresse: "https://github.com/exemple/r/tree/main/skills/b-fictif",
              ref: "main",
            },
            {
              id: null,
              chemin: "skills/casse",
              description: "",
              adresse: "https://github.com/exemple/r/tree/main/skills/casse",
              ref: "main",
              erreur: "En-tête invalide",
            },
          ],
        }),
      )
      .mockResolvedValueOnce({
        skills: [],
        message: "2 Skill(s) importé(s) en quarantaine (FICTIF)",
        importes: 1,
        refuses: 1,
        rapport: [
          {
            demande: "skills/a-fictif",
            id: "a-fictif",
            chemin: "skills/a-fictif",
            statut: "importé",
          },
          {
            demande: "skills/b-fictif",
            id: "b-fictif",
            chemin: "skills/b-fictif",
            statut: "refusé",
            raison: "Nom réservé (FICTIF)",
          },
        ],
      });
    show(base, request);
    fill("https://github.com/exemple/r");
    fireEvent.click(screen.getByRole("button", { name: "Importer" }));
    await screen.findByText("Ce dépôt contient 3 Skills (FICTIF)");
    expect(
      (screen.getByRole("checkbox", { name: /casse/ }) as HTMLInputElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /a-fictif/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /b-fictif/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Importer la sélection (2)" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith("/skills/import", {
        git: "https://github.com/exemple/r",
        subdir: ".",
        choix: ["skills/a-fictif", "skills/b-fictif"],
      }),
    );
    await screen.findByText("2 Skill(s) importé(s) en quarantaine (FICTIF)");
    expect(
      screen.getByText(/b-fictif · refusé : Nom réservé \(FICTIF\)/),
    ).toBeTruthy();
  });
  it("plugin : agents et serveurs MCP « non lancé », « Importer le plugin », puis « Importer la suite »", async () => {
    const restants = Array.from({ length: 35 }, (_, i) => `skills/s${i}`);
    const request = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError("Ce dossier est un plugin (FICTIF)", 400, {
          error: "Ce dossier est un plugin (FICTIF)",
          candidats: [],
          plugin: {
            nom: "plugin-fictif",
            skills: ["skills/s0"],
            agents: [{ nom: "relecteur-fictif", description: "Relit" }],
            mcp: [{ nom: "serveur-fictif", transport: "stdio" }],
          },
        }),
      )
      .mockResolvedValueOnce({
        skills: [],
        message: "30 Skill(s) importé(s) (FICTIF)",
        importes: 30,
        refuses: 0,
        rapport: [],
        restants,
      });
    show(base, request);
    fill("https://github.com/exemple/plugin");
    fireEvent.click(screen.getByRole("button", { name: "Importer" }));
    await screen.findByText(/relecteur-fictif/);
    expect(screen.getByText(/serveur-fictif.*non lancé/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Importer le plugin" }));
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith("/skills/import", {
        git: "https://github.com/exemple/plugin",
        subdir: ".",
        plugin: true,
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Importer la suite (35 restants)",
      }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith("/skills/import", {
        git: "https://github.com/exemple/plugin",
        subdir: ".",
        choix: restants.slice(0, 30),
      }),
    );
  });
});

// Essai réel du 22/11 sur 4310 : clonage de 40 s à plus de 2 min, puis échec de clone au 2e appel.
describe("import : retours de l'essai réel", () => {
  const fill = (address: string) => {
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: /Importer depuis GitHub/ }),
    );
    fireEvent.change(screen.getByLabelText("Dépôt GitHub"), {
      target: { value: address },
    });
  };
  const refusal = () =>
    new ApiError("Ce dépôt contient 2 Skills (FICTIF)", 400, {
      error: "Ce dépôt contient 2 Skills (FICTIF)",
      candidats: [
        { id: "a-fictif", chemin: "skills/a-fictif", description: "Premier" },
        {
          id: "prospecting-fictif",
          chemin: "skills/prospecting-fictif",
          description: "Déjà là",
        },
      ],
    });
  it("pendant l'import, une ligne dit que le dépôt est en cours de téléchargement", async () => {
    let finish: (v: unknown) => void = () => {};
    const request = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    show(base, request);
    fill("https://github.com/exemple/r");
    fireEvent.click(screen.getByRole("button", { name: "Importer" }));
    expect(
      await screen.findByText(/Téléchargement du dépôt depuis GitHub/),
    ).toBeTruthy();
    finish({ skills: [], message: "Fini (FICTIF)" });
    await screen.findByText("Fini (FICTIF)");
    expect(
      screen.queryByText(/Téléchargement du dépôt depuis GitHub/),
    ).toBeNull();
  });
  it("le choix parmi les candidats n'est pas une erreur rouge ; un Skill déjà importé le dit", async () => {
    const request = vi.fn().mockRejectedValueOnce(refusal());
    show(base, request);
    fill("https://github.com/exemple/r");
    fireEvent.click(screen.getByRole("button", { name: "Importer" }));
    const line = await screen.findByText("Ce dépôt contient 2 Skills (FICTIF)");
    expect(line.className).not.toContain("danger");
    expect(line.getAttribute("role")).not.toBe("alert");
    expect(
      screen.getByRole("checkbox", {
        name: /prospecting-fictif.*déjà importé \(en quarantaine\)/,
      }),
    ).toBeTruthy();
  });
  // Lot back import-textes-01 (E195) : le serveur envoie une phrase prête à afficher, sans commande git ni
  // chemin local. Le filet de l'ancien texte ne doit pas la remplacer.
  it.each([
    "Dépôt introuvable ou privé : https://github.com/exemple/git-clone-tools. Vérifiez l'adresse ; Relay lit seulement les dépôts publics, sans identifiants.",
    "Délai dépassé : le clone du dépôt https://github.com/exemple/r n'a pas abouti en 120 s ; le dépôt est peut-être très gros ou le réseau lent : réessayez plus tard.",
    "git est introuvable sur cette machine : installez git pour lire un dépôt GitHub.",
    "Le clone du dépôt https://github.com/exemple/r a échoué (cause non reconnue) ; le détail technique est dans le journal du serveur.",
  ])(
    "un échec git du nouveau serveur s'affiche tel quel : %s",
    async (text) => {
      const request = vi
        .fn()
        .mockRejectedValueOnce(new ApiError(text, 400, { error: text }));
      show(base, request);
      fill("https://github.com/exemple/r");
      fireEvent.click(screen.getByRole("button", { name: "Importer" }));
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain(text);
      expect(screen.queryByText("Détail technique")).toBeNull();
    },
  );
  it("un échec de clone : message simple, détail replié, et la liste des candidats reste pour réessayer", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(refusal())
      .mockRejectedValueOnce(
        new ApiError(
          "Command failed: git -c core.hooksPath=/dev/null clone --depth 1 -- https://github.com/exemple/r /var/folders/xx/T/relay-skill-FICTIF/repo Cloning into '/var/folders/xx'...",
          400,
          { error: "Command failed: git … clone …" },
        ),
      );
    show(base, request);
    fill("https://github.com/exemple/r");
    fireEvent.click(screen.getByRole("button", { name: "Importer" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /a-fictif/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Importer la sélection (1)" }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "Le téléchargement du dépôt depuis GitHub a échoué",
    );
    expect(alert.textContent).not.toContain("/var/folders");
    expect(screen.getByText("Détail technique")).toBeTruthy();
    // La sélection reste, prête à être renvoyée.
    expect(
      (screen.getByRole("checkbox", { name: /a-fictif/ }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Importer la sélection (1)" }),
    ).toBeTruthy();
  });
});

describe("équipe", () => {
  it("un membre lancé sur un agent choisi par le chef le dit", () => {
    const run = {
      id: "m1",
      state: "running",
      agent: "claude",
      family: [
        {
          id: "c1",
          titre: "Relecture FICTIVE",
          agent: "codex",
          state: "running",
          agentImpose: true,
        },
      ],
    } as unknown as Run;
    render(<TeamBlock run={run} />);
    fireEvent.click(document.querySelector("button.team-row-head")!);
    expect(screen.getByText(/codex · agent choisi par le chef/)).toBeTruthy();
  });
});
