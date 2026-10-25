// Render the flowcharts used by the product without Mermaid's DOM/style injection.
// Mermaid validates/parses the grammar; only inert geometry and escaped text reach the image.
interface Vertex {
  id: string;
  text?: string;
  type?: string;
}
interface Edge {
  start: string;
  end: string;
  text?: string;
}
export interface FlowGraph {
  vertices: Vertex[];
  edges: Edge[];
  direction?: string;
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
const label = (text: string) =>
  text
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:nbsp|#160);/g, " ")
    .replace(/&amp;/g, "&");
export function flowImage(graph: FlowGraph) {
  const { vertices, edges } = graph;
  if (!vertices.length || vertices.length > 60 || edges.length > 120)
    throw new Error("Taille de schéma non prise en charge");
  const ids = new Set(vertices.map((v) => v.id));
  if (edges.some((e) => !ids.has(e.start) || !ids.has(e.end)))
    throw new Error("Lien vers un nœud absent");
  const indegree = new Map(
    vertices.map((v) => [v.id, edges.filter((e) => e.end === v.id).length]),
  );
  const levels = new Map(vertices.map((v) => [v.id, 0]));
  const queue = vertices
    .filter((v) => indegree.get(v.id) === 0)
    .map((v) => v.id);
  for (let i = 0; i < queue.length; i++) {
    for (const edge of edges.filter((e) => e.start === queue[i])) {
      levels.set(
        edge.end,
        Math.max(levels.get(edge.end)!, levels.get(edge.start)! + 1),
      );
      indegree.set(edge.end, indegree.get(edge.end)! - 1);
      if (indegree.get(edge.end) === 0) queue.push(edge.end);
    }
  }
  const vertical = ["TB", "TD", "BT"].includes(graph.direction || "LR"),
    reverse = ["RL", "BT"].includes(graph.direction || "LR");
  const columns = Math.max(...levels.values()) + 1;
  const rowCounts = new Map<number, number>();
  const position = new Map(
    vertices.map((v) => {
      const level = levels.get(v.id)!;
      const row = rowCounts.get(level) || 0;
      rowCounts.set(level, row + 1);
      return [v.id, { level, row }];
    }),
  );
  const rows = Math.max(...rowCounts.values());
  const width = vertical ? rows * 240 : columns * 240;
  const height = vertical ? columns * 140 : rows * 140;
  const boxWidth = 184,
    boxHeight = 80;
  const boxes = new Map(
    vertices.map((v) => {
      const { level, row } = position.get(v.id)!;
      const axis = reverse ? columns - 1 - level : level;
      return [
        v.id,
        {
          x: (vertical ? row : axis) * 240 + 28,
          y: (vertical ? axis : row) * 140 + 30,
        },
      ];
    }),
  );
  const lines = edges
    .map((e) => {
      const a = boxes.get(e.start)!,
        b = boxes.get(e.end)!;
      const x1 = a.x + boxWidth / 2,
        y1 = a.y + boxHeight / 2,
        x2 = b.x + boxWidth / 2,
        y2 = b.y + boxHeight / 2;
      const path = vertical
        ? `M${x1} ${y1 + (reverse ? -40 : 40)} L${x2} ${y2 + (reverse ? 40 : -40)}`
        : `M${x1 + (reverse ? -92 : 92)} ${y1} L${x2 + (reverse ? 92 : -92)} ${y2}`;
      return `<path d="${path}" fill="none" stroke="#6e6e73" stroke-width="1.6" marker-end="url(#arrow)"/>${e.text ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" text-anchor="middle" fill="#4c4c52" font-size="11">${escape(label(e.text))}</text>` : ""}`;
    })
    .join("");
  const nodes = vertices
    .map((v) => {
      const { x, y } = boxes.get(v.id)!;
      const title = label(v.text || v.id);
      const words = title.split(/\s+/);
      const wrapped: string[] = [];
      for (const word of words) {
        if (
          !wrapped.length ||
          wrapped[wrapped.length - 1].length + word.length > 24
        )
          wrapped.push(word);
        else wrapped[wrapped.length - 1] += " " + word;
      }
      const visible = wrapped.slice(0, 3);
      const shape =
        v.type === "diamond"
          ? `<polygon points="${x + 92},${y - 6} ${x + 190},${y + 40} ${x + 92},${y + 86} ${x - 6},${y + 40}"/>`
          : `<rect x="${x}" y="${y}" width="184" height="80" rx="${v.type === "circle" || v.type === "stadium" ? 40 : 12}"/>`;
      return `<g fill="#eef5ff" stroke="#9cbee6"><title>${escape(title)}</title>${shape}</g><text text-anchor="middle" fill="#1d1d1f" font-size="13">${visible.map((line, i) => `<tspan x="${x + 92}" y="${y + 40 + (i - (visible.length - 1) / 2) * 17}">${escape(line)}</tspan>`).join("")}</text>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="Arial,sans-serif"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6e6e73"/></marker></defs>${lines}${nodes}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
export async function mermaidImage(code: string) {
  if (code.length > 20000) throw new Error("Schéma trop long");
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    maxTextSize: 20000,
  });
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(code);
  const db = diagram.db as unknown as {
    getVertices?: () => Map<string, Vertex>;
    getEdges?: () => Edge[];
    getDirection?: () => string;
  };
  if (!db.getVertices || !db.getEdges)
    throw new Error("Ce type de schéma reste consultable en code Mermaid");
  return flowImage({
    vertices: [...db.getVertices().values()],
    edges: db.getEdges(),
    direction: db.getDirection?.(),
  });
}
