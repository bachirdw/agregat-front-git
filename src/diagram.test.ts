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
// test-ui-21-11 : le schéma suit le thème de l'application (bouton lune), pas seulement le système.
it("thème sombre : fond, bord, texte et flèches lisibles sur fond sombre", () => {
  const graph = {
    vertices: [
      { id: "A", text: "Source" },
      { id: "B", text: "Résultat" },
    ],
    edges: [{ start: "A", end: "B", text: "lien" }],
  };
  const light = decodeURIComponent(flowImage(graph).split(",")[1]);
  const dark = decodeURIComponent(flowImage(graph, "dark").split(",")[1]);
  // Le clair ne change pas.
  expect(light).toContain('fill="#eef5ff"');
  expect(light).toContain('fill="#1d1d1f"');
  // Le sombre n'a plus de nœud clair ni de texte noir.
  expect(dark).not.toContain("#eef5ff");
  expect(dark).not.toContain("#1d1d1f");
  expect(dark).toContain('fill="#f5f5f7"');
  expect(dark).not.toContain("style=");
});
