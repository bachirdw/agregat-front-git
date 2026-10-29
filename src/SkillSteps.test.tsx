import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SkillSteps } from "./SkillSteps";

afterEach(cleanup);

it("montre les étapes du Skill dans une section repliable, avec état et preuve FICTIVE", () => {
  const { container } = render(
    <SkillSteps
      progress={{
        orderDeviation: true,
        steps: [
          {
            pack: "watch",
            intent: "monitor",
            id: "fetch",
            title: "Lire la source FICTIVE",
            state: "done",
            toolCallId: "appel-FICTIF-1",
          },
          {
            pack: "watch",
            intent: "monitor",
            id: "digest",
            title: "Résumer les articles FICTIFS",
            state: "failed",
            cause: "échec signalé par l’outil",
            toolCallId: "appel-FICTIF-2",
          },
        ],
      }}
    />,
  );
  const details = container.querySelector("details")!;
  expect(details.open).toBe(false);
  expect(screen.getByText("Étapes du Skill")).toBeTruthy();
  fireEvent.click(details.querySelector("summary")!);
  expect(details.open).toBe(true);
  expect(screen.getByText(/Écart d’ordre constaté/)).toBeTruthy();
  expect(screen.getByText(/appel-FICTIF-1/)).toBeTruthy();
  expect(screen.getByText(/échec signalé par l’outil/)).toBeTruthy();
});

it("n’affiche rien sans intention retenue", () => {
  const { container } = render(<SkillSteps progress={null} />);
  expect(container.innerHTML).toBe("");
});
