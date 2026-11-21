import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mermaidImage, type DiagramTheme } from "./diagram";
import { Chart, parseChart } from "./Chart";
// Text of a hast node (the code inside a ```chart block).
type HastNode = { type?: string; value?: string; children?: HastNode[] };
const textOf = (node: HastNode | undefined): string =>
  !node
    ? ""
    : node.type === "text"
      ? (node.value ?? "")
      : (node.children ?? []).map(textOf).join("");
export function safeLink(url: string | undefined) {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}
// The app's theme (data-theme on <html>, set by the moon button), followed live.
const currentTheme = (): DiagramTheme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";
function useDocumentTheme() {
  const [theme, setTheme] = useState(currentTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(currentTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}
function Diagram({ code }: { code: string }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const theme = useDocumentTheme();
  useEffect(() => {
    let current = true;
    if (code.length > 20000) {
      setFailed(true);
      return;
    }
    mermaidImage(code, theme)
      .then((image) => {
        if (current) setUrl(image);
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [code, theme]);
  return (
    <figure className="diagram">
      {url && <img src={url} alt="Schéma Mermaid du résultat" />}
      <details open={failed}>
        <summary>
          {failed ? "Schéma non pris en charge · voir le code" : "Code Mermaid"}
        </summary>
        <pre>{code}</pre>
      </details>
    </figure>
  );
}
export function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) =>
            safeLink(href) ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children} ↗
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ alt }) => (
            <span>
              {alt ? `[Image : ${alt}]` : "[Image externe non chargée]"}
            </span>
          ),
          code: ({ className, children }) =>
            className === "language-mermaid" ? (
              <Diagram code={String(children).trim()} />
            ) : (
              <code className={className}>{children}</code>
            ),
          // reponse-04 : un bloc ```chart valide devient un graphique ; sinon il reste du code brut.
          pre: ({ node, children }) => {
            const code = node?.children?.[0] as
              | (HastNode & {
                  tagName?: string;
                  properties?: { className?: unknown };
                })
              | undefined;
            const classes = code?.properties?.className;
            if (
              code?.tagName === "code" &&
              Array.isArray(classes) &&
              classes.includes("language-chart")
            ) {
              const spec = parseChart(textOf(code));
              if (spec) return <Chart spec={spec} />;
            }
            return <div className="code-block">{children}</div>;
          },
          // reponse-04 : un tableau GFM défile horizontalement s'il le faut, sans bordure extérieure.
          table: ({ children }) => (
            <div className="md-table">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
