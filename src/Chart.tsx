// reponse-04 : graphique d'une série chiffrée écrite par l'agent dans un bloc ```chart (JSON). Petit
// composant maison (barres en HTML, courbe en SVG), sans bibliothèque. Un bloc invalide n'est jamais
// une erreur visible : parseChart rend null et le texte reste un bloc de code brut.
export type ChartSpec = {
  type: "bar" | "line";
  title: string;
  source: string;
  x: string[];
  y: number[];
  highlight: number[];
};
const MAX_POINTS = 200;
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function parseChart(text: string): ChartSpec | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const spec = raw as Record<string, unknown>;
  if (spec.type !== "bar" && spec.type !== "line") return null;
  const { x, y } = spec;
  if (!Array.isArray(x) || !Array.isArray(y)) return null;
  if (y.length < 2 || y.length > MAX_POINTS || x.length !== y.length)
    return null;
  if (!y.every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  if (!x.every((v) => typeof v === "string" || typeof v === "number"))
    return null;
  const highlight = Array.isArray(spec.highlight)
    ? spec.highlight.filter(
        (i): i is number => Number.isInteger(i) && i >= 0 && i < y.length,
      )
    : [];
  return {
    type: spec.type,
    title: typeof spec.title === "string" ? spec.title : "",
    source: typeof spec.source === "string" ? spec.source : "",
    x: x.map(String),
    y: y as number[],
    highlight,
  };
}

export function Chart({ spec }: { spec: ChartSpec }) {
  const { x, y, highlight } = spec;
  const lo = Math.min(0, ...y);
  const hi = Math.max(...y);
  const range = hi - lo || 1;
  // Height of a value in the plot, in percent from the bottom.
  const level = (v: number) => ((v - lo) / range) * 100;
  const label = spec.title || "Graphique";
  const last = y.length - 1;
  return (
    <figure className="chart">
      {(spec.title || spec.source) && (
        <figcaption className="chart-head">
          <span>{spec.title}</span>
          {spec.source && <span>{spec.source}</span>}
        </figcaption>
      )}
      <div className={"chart-plot " + spec.type} role="img" aria-label={label}>
        {spec.type === "bar" ? (
          y.map((v, i) => (
            <span
              key={i}
              className={"chart-bar" + (highlight.includes(i) ? " hi" : "")}
              style={{ height: `${Math.max(level(v), 1)}%` }}
              title={`${x[i]} · ${number.format(v)}`}
            />
          ))
        ) : (
          <>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                className="chart-line"
                points={y
                  .map((v, i) => `${(i / last) * 100},${100 - level(v)}`)
                  .join(" ")}
              />
            </svg>
            {highlight.map((i) => (
              <span
                key={i}
                className="chart-dot hi"
                style={{
                  left: `${(i / last) * 100}%`,
                  bottom: `${level(y[i])}%`,
                }}
                title={`${x[i]} · ${number.format(y[i])}`}
              />
            ))}
          </>
        )}
      </div>
      <div className="chart-foot">
        <span>
          {x[0]} · {number.format(y[0])}
        </span>
        <span>
          {x[last]} · {number.format(y[last])}
        </span>
      </div>
      {/* Les valeurs pour un lecteur d'écran. */}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {y.map((v, i) => (
            <tr key={i}>
              <th scope="row">{x[i]}</th>
              <td>{number.format(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
