// Demandes du back au propriétaire : accord d'envoi (docs/api-sends.md) et question de l'agent
// (docs/api-questions.md). Formes reprises des contrats ; toutes les valeurs sont FICTIVES.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { CareerThread } from "./Career";
import { RunView } from "./Mission";
import { OwnerRequests } from "./OwnerRequests";
import { trackerPhrase } from "./Tracker";
import { labels } from "./types";
import type { Permission, Question, Run } from "./types";
afterEach(cleanup);

// Owner mode: a final send waits with no ceiling, the back sends expiresAt: null.
const sendPermission: Permission = {
  id: "p1",
  actionClass: "send",
  capability: "email_send",
  expiresAt: null,
  tool: { title: "Envoyer à recruteur@exemple.test : candidature FICTIVE" },
  options: [
    { optionId: "allow", name: "Allow", kind: "allow_once" },
    { optionId: "deny", name: "Reject", kind: "reject_once" },
  ],
};
const run = (extra: Partial<Run>) =>
  ({
    id: "r1",
    sessionId: "s1",
    createdAt: "2026-11-05T00:00:00Z",
    prompt: "FICTIF",
    pack: "career-ops",
    mode: "agent",
    state: "running",
    plan: { steps: [], cost: { platformCents: 0, currency: "EUR" } },
    ...extra,
  }) as unknown as Run;
const proseQuestion: Question = {
  id: "q1",
  kind: "prose",
  message: "Dois-je enregistrer cette offre FICTIVE ?",
  options: ["oui", "non"],
  requestedSchema: {
    type: "object",
    properties: {
      reponse: {
        type: "string",
        title: "Réponse",
        minLength: 1,
        maxLength: 12000,
        examples: ["oui", "non"],
      },
    },
    required: ["reponse"],
  },
  toolCallId: null,
  askedAt: "2026-11-05T08:00:00.000Z",
};

describe("accord d'envoi", () => {
  it("s'affiche dans le fil career-ops, hors des détails techniques, et se décide en un clic", () => {
    const act = vi.fn(async () => {});
    render(
      <CareerThread
        run={run({
          state: "waiting_permission",
          permissions: [sendPermission],
        })}
        runs={[]}
        events={[]}
        act={act}
      >
        <RunView
          run={run({
            state: "waiting_permission",
            permissions: [sendPermission],
          })}
          events={[]}
          connection=""
          busy={false}
          act={act}
          requests={false}
        />
      </CareerThread>,
    );
    const approve = screen.getByRole("button", { name: "Approuver l’envoi" });
    expect(approve.closest("details")).toBeNull();
    expect((approve as HTMLButtonElement).disabled).toBe(false);
    // One request, one button: the copy inside the technical details is not rendered.
    expect(
      screen.getAllByRole("button", { name: "Approuver l’envoi" }),
    ).toHaveLength(1);
    const card = screen.getByRole("region", { name: "Envoi à approuver" });
    expect(card.textContent).toContain("recruteur@exemple.test");
    expect(card.textContent).toContain("email_send");
    expect(card.textContent).toContain("la mission attend votre décision");
    fireEvent.click(approve);
    expect(act).toHaveBeenCalledWith("/permissions/p1", { optionId: "allow" });
    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    expect(act).toHaveBeenCalledWith("/permissions/p1", { optionId: "deny" });
  });

  it("un accord sans expiration (expiresAt: null) reste cliquable dans la vue mission", () => {
    render(
      <RunView
        run={run({
          pack: "core",
          state: "waiting_permission",
          permissions: [sendPermission],
        })}
        events={[]}
        connection=""
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Approuver l’envoi",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(screen.queryByText("Accord expiré")).toBeNull();
  });

  it("un accord ordinaire garde les libellés de l'agent et son compte à rebours", () => {
    render(
      <OwnerRequests
        run={run({
          permissions: [
            {
              ...sendPermission,
              actionClass: "execute",
              expiresAt: Date.now() + 30_000,
              options: [
                { optionId: "ok", name: "Autoriser", kind: "allow_once" },
              ],
            },
          ],
        })}
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
    expect(
      (screen.getByRole("button", { name: "Autoriser" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(screen.getByRole("timer").textContent).toMatch(/Expire dans \d+ s/);
  });
  // 21/11 (test complet) : la carte montrait « Outil : read » et le JSON brut de l'outil.
  it("permission : l'action dite simplement, le détail technique replié", () => {
    const { container } = render(
      <OwnerRequests
        run={run({
          permissions: [
            {
              ...sendPermission,
              actionClass: "execute",
              capability: "read",
              tool: {
                title: "Lire un fichier FICTIF",
                toolCallId: "permission-FICTIVE",
                kind: "read",
              },
              options: [
                { optionId: "ok", name: "Autoriser", kind: "allow_once" },
              ],
            },
          ],
        })}
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
    const card = container.querySelector(".approval")!;
    expect(card.textContent).toMatch(/Type d’action : lecture/);
    expect(card.textContent).not.toMatch(/Outil : read/);
    const fold = card.querySelector<HTMLDetailsElement>("details")!;
    expect(fold.open).toBe(false);
    expect(fold.querySelector("summary")!.textContent).toBe(
      "Détails techniques",
    );
    expect(fold.querySelector("pre")!.textContent).toContain(
      "permission-FICTIVE",
    );
  });
});

describe("question de l'agent", () => {
  it("affiche le bandeau, la question et répond par une réponse rapide", () => {
    const act = vi.fn(async () => {});
    render(
      <OwnerRequests
        run={run({ state: "awaiting_owner", pendingQuestion: proseQuestion })}
        busy={false}
        act={act}
      />,
    );
    const form = screen.getByRole("form", { name: "Question de l’agent" });
    expect(form.textContent).toContain("L’agent attend votre réponse");
    expect(form.textContent).toContain(
      "Dois-je enregistrer cette offre FICTIVE ?",
    );
    fireEvent.click(within(form).getByRole("button", { name: "oui" }));
    expect(act).toHaveBeenCalledWith(
      "/runs/r1/answer",
      { action: "accept", content: { reponse: "oui" } },
      true,
    );
  });

  it("répond en texte libre, ou décline", async () => {
    const act = vi.fn(async () => {});
    render(
      <OwnerRequests
        run={run({ state: "awaiting_owner", pendingQuestion: proseQuestion })}
        busy={false}
        act={act}
      />,
    );
    const field = screen.getByLabelText(/Réponse/);
    expect((field as HTMLInputElement).required).toBe(true);
    fireEvent.change(field, { target: { value: "seulement en télétravail" } });
    fireEvent.click(screen.getByRole("button", { name: "Répondre" }));
    expect(act).toHaveBeenCalledWith(
      "/runs/r1/answer",
      { action: "accept", content: { reponse: "seulement en télétravail" } },
      true,
    );
    // While the answer is being sent, both buttons stay disabled (no double answer).
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Décliner" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Décliner" }));
    expect(act).toHaveBeenLastCalledWith(
      "/runs/r1/answer",
      { action: "decline" },
      true,
    );
  });

  it("construit un champ par propriété du schéma et n'envoie que les champs remplis", () => {
    const act = vi.fn(async () => {});
    const question: Question = {
      id: "q2",
      kind: "form",
      message: "Préciser la recherche FICTIVE",
      toolCallId: "toolu_FICTIF",
      askedAt: "2026-11-05T08:00:00.000Z",
      requestedSchema: {
        type: "object",
        properties: {
          ville: {
            type: "string",
            title: "Ville",
            oneOf: [
              { const: "paris", title: "Paris" },
              { const: "lyon", title: "Lyon" },
            ],
          },
          contrat: { type: "string", enum: ["CDI", "CDD"] },
          salaire: { type: "integer", title: "Salaire minimum", minimum: 0 },
          distanciel: { type: "boolean", title: "Télétravail" },
          sites: {
            type: "array",
            title: "Sites",
            items: { enum: ["indeed", "welcome"] },
          },
          note: { type: "string", title: "Note" },
        },
        required: ["ville"],
      },
    };
    render(
      <OwnerRequests
        run={run({ state: "awaiting_owner", pendingQuestion: question })}
        busy={false}
        act={act}
      />,
    );
    const ville = screen.getByLabelText(/Ville/);
    expect((ville as HTMLInputElement).required).toBe(true);
    expect(
      (screen.getByLabelText(/contrat/) as HTMLInputElement).required,
    ).toBe(false);
    fireEvent.change(ville, { target: { value: "lyon" } });
    fireEvent.change(screen.getByLabelText(/Salaire minimum/), {
      target: { value: "42000" },
    });
    fireEvent.click(screen.getByLabelText(/Télétravail/));
    fireEvent.click(screen.getByLabelText("welcome"));
    fireEvent.click(screen.getByRole("button", { name: "Répondre" }));
    expect(act).toHaveBeenCalledWith(
      "/runs/r1/answer",
      {
        action: "accept",
        content: {
          ville: "lyon",
          salaire: 42000,
          distanciel: true,
          sites: ["welcome"],
        },
      },
      true,
    );
  });

  it("une réponse refusée (400) affiche l'erreur sans fermer le formulaire", async () => {
    const act = vi.fn(async () => {
      throw new Error("reponse : 1 caractère au moins");
    });
    render(
      <OwnerRequests
        run={run({ state: "awaiting_owner", pendingQuestion: proseQuestion })}
        busy={false}
        act={act}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Réponse/), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Répondre" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "reponse : 1 caractère au moins",
      ),
    );
    expect((screen.getByLabelText(/Réponse/) as HTMLInputElement).value).toBe(
      "x",
    );
  });

  it("le fil career-ops montre la question, et l'état a un libellé", () => {
    render(
      <CareerThread
        run={run({ state: "awaiting_owner", pendingQuestion: proseQuestion })}
        runs={[]}
        events={[]}
        act={vi.fn(async () => {})}
      >
        {null}
      </CareerThread>,
    );
    expect(
      screen
        .getByRole("form", { name: "Question de l’agent" })
        .closest("details"),
    ).toBeNull();
    expect(labels.awaiting_owner).toBe("Attend votre réponse");
    expect(
      trackerPhrase(
        run({ state: "awaiting_owner", pendingQuestion: proseQuestion }),
        [],
      ),
    ).toBe("Attend ta réponse");
  });
});

// Accord de mission (13/11) : un clic vaut pour tous les envois de la mission en cours.
const missionOption = {
  optionId: "allow_mission",
  name: "Autoriser tous les envois de cette mission",
  kind: "allow_mission",
};
const grantEvent = {
  seq: 7,
  type: "send_grant",
  data: { scope: "mission" },
  at: "2026-11-13T08:00:00.000Z",
};
const GRANT_NOTICE =
  "Accord de mission actif : les envois partent sans demande";

describe("accord de mission", () => {
  it("carte sans l'option : rendu identique à avant", () => {
    const { container } = render(
      <OwnerRequests
        run={run({ permissions: [sendPermission] })}
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
    expect(container.innerHTML).toBe(
      '<section class="card approval" aria-label="Envoi à approuver"><div class="card-pad"><small class="warning">Rien ne part sans votre clic · un seul envoi</small><h2>Envoyer à recruteur@exemple.test : candidature FICTIVE</h2><p class="request-meta">Outil : <code>email_send</code></p><small role="timer">Sans délai : la mission attend votre décision.</small></div><footer><button class="primary">Approuver l’envoi</button><button class="">Refuser</button></footer></section>',
    );
  });

  it("carte avec l'option : trois boutons dans l'ordre, l'accord simple reste principal", () => {
    const act = vi.fn(async () => {});
    render(
      <OwnerRequests
        run={run({
          permissions: [
            {
              ...sendPermission,
              options: [...sendPermission.options, missionOption],
            },
          ],
        })}
        busy={false}
        act={act}
      />,
    );
    const card = screen.getByRole("region", { name: "Envoi à approuver" });
    const buttons = within(card).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Approuver l’envoi",
      "Refuser",
      "Autoriser tous les envois de cette mission",
    ]);
    expect(buttons[0].className).toBe("primary");
    expect(buttons[2].className).not.toContain("primary");
    expect(card.textContent).toContain(
      "Un clic ici : tous les envois suivants de cette mission partiront sans nouvelle demande, quel que soit le site, et seront listés au Bilan.",
    );
    fireEvent.click(buttons[2]);
    expect(act).toHaveBeenCalledWith("/permissions/p1", {
      optionId: "allow_mission",
    });
  });

  it("une sorte d'option inconnue reste ignorée", () => {
    render(
      <OwnerRequests
        run={run({
          permissions: [
            {
              ...sendPermission,
              options: [
                ...sendPermission.options,
                { optionId: "x", name: "Autre", kind: "allow_always" },
              ],
            },
          ],
        })}
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByText("Autre")).toBeNull();
  });

  it("mention d'accord actif après send_grant, absente une fois la mission terminée", () => {
    const view = (state: string) => (
      <RunView
        run={run({ pack: "core", state })}
        events={[grantEvent]}
        connection=""
        busy={false}
        act={vi.fn(async () => {})}
      />
    );
    const { rerender } = render(view("running"));
    expect(screen.getAllByText(GRANT_NOTICE)).toHaveLength(1);
    rerender(view("completed"));
    expect(screen.queryByText(GRANT_NOTICE)).toBeNull();
  });

  it("fil career-ops : mention une seule fois, et rien sans send_grant", () => {
    const thread = (state: string, events: (typeof grantEvent)[]) => (
      <CareerThread run={run({ state })} runs={[]} events={events}>
        <RunView
          run={run({ state })}
          events={events}
          connection=""
          busy={false}
          act={vi.fn(async () => {})}
          requests={false}
        />
      </CareerThread>
    );
    const { rerender } = render(thread("running", []));
    expect(screen.queryByText(GRANT_NOTICE)).toBeNull();
    rerender(thread("running", [grantEvent]));
    expect(screen.getAllByText(GRANT_NOTICE)).toHaveLength(1);
    rerender(thread("cancelled", [grantEvent]));
    expect(screen.queryByText(GRANT_NOTICE)).toBeNull();
  });
});

describe("accord de mission : revue", () => {
  const withOption = (extra: Partial<Permission> = {}): Permission => ({
    ...sendPermission,
    options: [...sendPermission.options, missionOption],
    ...extra,
  });
  it("l'en-tête ne promet plus « un seul envoi » quand l'option est là, et la note est reliée au bouton", () => {
    render(
      <OwnerRequests
        run={run({ permissions: [withOption()] })}
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
    const card = screen.getByRole("region", { name: "Envoi à approuver" });
    expect(card.textContent).not.toContain("un seul envoi");
    expect(card.textContent).toContain("toute la mission si vous l’autorisez");
    const button = screen.getByRole("button", {
      name: "Autoriser tous les envois de cette mission",
    });
    expect(button.getAttribute("aria-describedby")).toBe(
      card.querySelector(".mission-grant-note")?.id,
    );
  });
  it("désactivé pendant l'envoi ; un double clic n'envoie rien tant qu'il est désactivé", () => {
    const act = vi.fn(async () => {});
    const { rerender } = render(
      <OwnerRequests
        run={run({ permissions: [withOption()] })}
        busy={false}
        act={act}
      />,
    );
    const name = "Autoriser tous les envois de cette mission";
    fireEvent.click(screen.getByRole("button", { name }));
    rerender(
      <OwnerRequests
        run={run({ permissions: [withOption()] })}
        busy={true}
        act={act}
      />,
    );
    const button = screen.getByRole("button", { name }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(act).toHaveBeenCalledTimes(1);
  });
  it("délai expiré : bouton d'accord de mission désactivé", () => {
    render(
      <OwnerRequests
        run={run({ permissions: [withOption({ expiresAt: Date.now() - 1 })] })}
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Autoriser tous les envois de cette mission",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("reprise : sans send_grant dans les événements du run affiché, aucune mention", () => {
    render(
      <RunView
        run={run({
          pack: "core",
          state: "running",
          resumedFrom: "r0",
        } as never)}
        events={[]}
        connection=""
        busy={false}
        act={vi.fn(async () => {})}
      />,
    );
    expect(screen.queryByText(GRANT_NOTICE)).toBeNull();
  });
});
