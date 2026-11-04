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
