// test-ui-21-11 : le schéma Mermaid est redessiné quand le thème de l'application change.
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { Markdown } from "./Markdown";
import { mermaidImage } from "./diagram";

vi.mock("./diagram", () => ({
  mermaidImage: vi.fn((_code: string, theme: string) =>
    Promise.resolve(`data:image/svg+xml,${theme}`),
  ),
}));
afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});
it("le schéma prend le thème courant, puis suit la bascule clair/sombre", async () => {
  document.documentElement.dataset.theme = "dark";
  const { container } = render(
    <Markdown text={"```mermaid\nflowchart LR\nA-->B\n```"} />,
  );
  await waitFor(() =>
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "data:image/svg+xml,dark",
    ),
  );
  act(() => {
    document.documentElement.dataset.theme = "light";
  });
  await waitFor(() =>
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "data:image/svg+xml,light",
    ),
  );
  expect(vi.mocked(mermaidImage)).toHaveBeenLastCalledWith(
    "flowchart LR\nA-->B",
    "light",
  );
});
