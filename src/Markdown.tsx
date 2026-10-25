import { useEffect, useId, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function safeLink(url:string|undefined) {return url && /^https?:\/\//i.test(url) ? url : undefined;}
function Diagram({code}:{code:string}) {
  const id=useId().replace(/:/g,''); const [url,setUrl]=useState(''); const [failed,setFailed]=useState(false);
  useEffect(()=>{let current=true, objectUrl='';
    if(code.length>20000) {setFailed(true);return;}
    import('mermaid').then(async({default:mermaid})=>{
      mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'neutral',suppressErrorRendering:true,flowchart:{htmlLabels:false},maxTextSize:20000});
      const {svg}=await mermaid.render('diagram'+id,code);
      // SVG is displayed as an image: scripts, links and foreign HTML cannot execute in our document.
      if(current) setUrl('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));
    }).catch(()=>{if(current)setFailed(true);});
    return ()=>{current=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[code,id]);
  return <figure className="diagram">{url&&<img src={url} alt="Schéma Mermaid du résultat"/>}<details open={failed}><summary>{failed?'Schéma non rendu · voir le code':'Code Mermaid'}</summary><pre>{code}</pre></details></figure>;
}
export function Markdown({text}:{text:string}) {return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
  a:({href,children})=>safeLink(href)?<a href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>:<span>{children}</span>,
  img:({alt})=><span>{alt ? `[Image : ${alt}]`:'[Image externe non chargée]'}</span>,
  code:({className,children})=>className==='language-mermaid'?<Diagram code={String(children).trim()}/>:<code className={className}>{children}</code>,
  pre:({children})=><div className="code-block">{children}</div>
}}>{text}</ReactMarkdown></div>;}
