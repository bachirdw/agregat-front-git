import { expect, it } from "vitest";
import { flowImage } from "./diagram";
it("flowchart inerte : branches, cycle, labels et liens non injectables", () => {
  const url = flowImage({
    vertices: [
      { id: "A", text: "<img src=x onerror=alert(1)>Source & données" },
      { id: "B", text: "Résultat" },
      { id: "C", text: "Autre" },
    ],
    edges: [
      { start: "A", end: "B", text: "<script>texte</script>" },
      { start: "A", end: "C" },
      { start: "B", end: "A" },
    ],
    direction: "LR",
  });
  const svg = decodeURIComponent(url.split(",")[1]);
  expect(svg).toContain("Source &amp; données");
  expect(svg).not.toContain("<script>");
  expect(svg).not.toContain("<img");
  expect(svg).not.toContain("style=");
  expect(svg).toContain("viewBox=");
});
it("limite le travail et refuse une arête invalide", () => {
  expect(() => flowImage({ vertices: [], edges: [] })).toThrow();
  expect(() =>
    flowImage({
      vertices: [{ id: "A" }],
      edges: [{ start: "A", end: "missing" }],
    }),
  ).toThrow("absent");
});
