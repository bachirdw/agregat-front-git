// swarm-09 relecture : the « Équipe » block against hostile or mistyped member fields (back
// api-equipe-vue.md, swarm-07). Every value below is FICTIF.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TeamBlock } from "./Team";
import type { Run } from "./types";
import appSource from "./App.tsx?raw";

afterEach(cleanup);

const mother = (family: unknown[], patch: Record<string, unknown> = {}) =>
  ({
    id: "mere-fictive",
    agent: "agent-fictif",
    state: "running",
    family,
    ...patch,
  }) as unknown as Run;
const row = (title: string) => screen.getByRole("listitem", { name: title });

describe("swarm-09 relecture : bloc Équipe", () => {
  it("« réessayer à » seulement pour une heure valide, jamais le texte brut", () => {
    render(
      <TeamBlock
        run={mother([
          {
            id: "a",
            titre: "Reprise FICTIVE",
            state: "failed",
            cause: { type: "limite_usage", reprise: "texte-brut-fictif" },
          },
        ])}
      />,
    );
    const r = row("Reprise FICTIVE");
    expect(r.querySelector("details")!.open).toBe(true);
    expect(r.textContent).not.toContain("réessayer");
    expect(r.textContent).not.toContain("texte-brut-fictif");
  });

  it("valeurs mal typées : rien ne plante, rien d'inventé", () => {
    const long = "x".repeat(50_000);
    render(
      <TeamBlock
        run={mother(
          [
            {
              id: "a",
              titre: "Proto FICTIF",
              state: "__proto__",
              attend: "constructor",
              depuis: Number.NaN,
              inactiveDepuis: -5,
              dernierOutil: { nom: "objet" },
            },
            {
              id: "b",
              titre: "Constructeur FICTIF",
              state: "constructor",
              debut: 5,
              fin: {},
              dureeMs: "100",
            },
            {
              id: "c",
              titre: "Échec mal typé FICTIF",
              state: "failed",
              cause: [],
              resultat: 42,
              dureeMs: -1,
            },
            {
              id: "d",
              titre: "Long FICTIF",
              state: "completed",
              resultat: long,
              cause: { type: "erreur", message: "ne s'affiche pas" },
            },
          ],
          { state: "__proto__", agent: 7 },
        )}
      />,
    );
    expect(screen.getByText(/^Chef :/).textContent).toBe(
      "Chef : agent inconnu · État inconnu",
    );
    for (const title of ["Proto FICTIF", "Constructeur FICTIF"]) {
      expect(row(title).textContent).toContain("État inconnu");
      expect(row(title).textContent).not.toMatch(
        /__proto__|constructor|depuis|durée|dernière action|objet/,
      );
    }
    // An array `cause` reads as a failure without detail, never as its raw value.
    const failed = row("Échec mal typé FICTIF");
    expect(failed.querySelector("summary")!.textContent).toBe("Échec : erreur");
    expect(failed.textContent).not.toMatch(/42|durée/);
    // A completed member shows its result in full as text, never a failure fold.
    const done = row("Long FICTIF");
    expect(done.querySelectorAll("details")).toHaveLength(1);
    expect(done.querySelector("details p")!.textContent).toBe(long);
    expect(done.textContent).not.toContain("ne s'affiche pas");
  });

  it("App.tsx : les 5 lectures GET d'une mission portent ?equipe=1, aucune autre route", () => {
    // Source guard: four of the five reads (refresh, after an action, usage page, end of stream)
    // are not reached by a rendering test.
    const reads = appSource.match(/api<Run>\(\s*"\/runs\/" \+ [\w.]+[^,)]*/g);
    expect(reads).toHaveLength(5);
    for (const read of reads!) expect(read).toMatch(/ \+ "\?equipe=1"$/);
    expect(appSource.match(/\?equipe=1/g)).toHaveLength(5);
  });

  it("rôle, attente et verdict « __proto__ » écrits par un agent : rien ne plante", () => {
    render(
      <TeamBlock
        run={mother([
          {
            id: "a",
            titre: "Rôle FICTIF",
            state: "completed",
            role: "__proto__",
            attend: "__proto__",
            verdict: { valeur: "__proto__", source: "reponse" },
          },
        ])}
      />,
    );
    const r = row("Rôle FICTIF");
    expect(r.textContent).toContain("__proto__");
    expect(r.textContent).toContain("Verdict : __proto__");
  });

  it("membre fini : ni dernière action ni « depuis », la durée seule", () => {
    render(
      <TeamBlock
        run={mother([
          {
            id: "a",
            titre: "Fini FICTIF",
            state: "completed",
            debut: "2026-11-20T00:00:00.000Z",
            fin: "2026-11-20T01:05:00.000Z",
            depuis: 9999,
            inactiveDepuis: 30,
            dernierOutil: "outil_fictif",
          },
        ])}
      />,
    );
    const r = row("Fini FICTIF");
    expect(r.textContent).toContain("durée 1 h 05");
    expect(r.textContent).not.toMatch(/depuis|dernière action|outil_fictif/);
  });
});
