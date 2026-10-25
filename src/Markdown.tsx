import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mermaidImage } from "./diagram";
export function safeLink(url: string | undefined) {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}
function Diagram({ code }: { code: string }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    if (code.length > 20000) {
      setFailed(true);
      return;
    }
    mermaidImage(code)
      .then((image) => {
        if (current) setUrl(image);
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [code]);
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
          pre: ({ children }) => <div className="code-block">{children}</div>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
