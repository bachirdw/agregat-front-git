import type { RunEvent } from './types';
export class ApiError extends Error { constructor(message:string, public status:number) {super(message);} }
export async function api<T>(path:string, body?:unknown, signal?:AbortSignal):Promise<T> {
  let response:Response;
  try {response=await fetch('/api'+path,{signal,...(body===undefined?{}:{method:'POST',headers:{'content-type':'application/json','x-platform-request':'1'},body:JSON.stringify(body)})});}
  catch(error) {if(signal?.aborted) throw error; throw new ApiError('API locale inaccessible. Vérifiez que le backend est démarré.',0);}
  let data;
  try {data=await response.json();} catch {throw new ApiError('Réponse illisible du serveur local.',response.status);}
  if(!response.ok) throw new ApiError(data.error || `Erreur HTTP ${response.status}`,response.status);
  return data as T;
}
// EventSource carries Last-Event-ID on native reconnect. The explicit cursor also permits reopening.
export function watchRun(id:string, handlers:{update:(event:RunEvent)=>void;end:()=>void;connection:(connected:boolean)=>void}, after=0, create:(url:string)=>EventSource = url=>new EventSource(url)) {
  let sequence=after, closed=false;
  const source=create(`/api/runs/${encodeURIComponent(id)}/events?after=${after}`);
  source.onopen=()=>handlers.connection(true);
  source.onerror=()=>{if(!closed) handlers.connection(false);};
  source.addEventListener('update',raw=>{
    try {const event=JSON.parse((raw as MessageEvent).data) as RunEvent;
      if(!Number.isSafeInteger(event.seq)||event.seq<=sequence||typeof event.type!=='string'||!event.data) return;
      sequence=event.seq; handlers.connection(true); handlers.update(event);
    } catch {handlers.connection(false);}
  });
  source.addEventListener('end',()=>{closed=true;source.close();handlers.end();});
  return ()=>{closed=true;source.close();};
}
