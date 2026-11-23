import { memo, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remend from "remend";
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
// lenteur-23-11 : a streamed mission re-renders at each chunk; an unchanged text is not parsed
// again (react-markdown took about 3 s of 30 s on 3c0935ae).
// affichage-23-11 : as in Claude Code, a single line break written by the agent stays a line break
// (Markdown alone joins such lines into one paragraph). Code blocks keep their own text untouched.
type MdNode = { type: string; value?: string; children?: MdNode[] };
function lineBreaks() {
  const walk = (node: MdNode) => {
    if (!node.children) return;
    node.children = node.children.flatMap((child) => {
      if (child.type !== "text" || !child.value?.includes("\n")) {
        walk(child);
        return [child];
      }
      return child.value
        .split("\n")
        .flatMap((part, i) =>
          i === 0
            ? [{ type: "text", value: part }]
            : [{ type: "break" }, { type: "text", value: part }],
        )
        .filter((n) => n.type !== "text" || n.value);
    });
  };
  return (tree: MdNode) => walk(tree);
}
const plugins = [remarkGfm, lineBreaks];
// streamdown-23-11 : pendant que l'agent écrit, le Markdown inachevé est complété par `remend` (moteur de
// Streamdown, Vercel, Apache-2.0) : `**ton CV` s'affiche déjà en gras, un lien à moitié écrit en texte seul,
// au lieu de signes bruts qui changent d'aspect à la fin. Streamdown entier, essayé, était plus lourd
// (branche claude/essai-streamdown-23-11).
const complete = (text: string) =>
  remend(text, { linkMode: "text-only", images: false });
export const Markdown = memo(function Markdown({
  text,
  streaming = false,
}: {
  text: string;
  // Dernier texte d'une mission en cours : l'agent est encore en train de l'écrire.
  streaming?: boolean;
}) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={plugins}
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
        {streaming ? complete(text) : text}
      </ReactMarkdown>
    </div>
  );
});
