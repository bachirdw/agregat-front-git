// reponse-04 : vue scindée. Un membre de l'équipe (une sous-mission, mission ordinaire du back : contrat
// docs/api-equipe-vue.md, « une sous-mission s'ouvre toujours par GET /api/runs/<id> ») suivi à côté du
// fil de sa mission principale : sa consigne, son activité et sa réponse, en direct par son propre flux.
import { useEffect, useState } from "react";
import { api, appendEvent, watchRun } from "./api";
import { Icon } from "./Icon";
import { PromptBubble } from "./PromptBubble";
import { Incident, RunTurn } from "./RunTurn";
import type { Run, RunEvent } from "./types";
import { labels } from "./types";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function SidePane({
  id,
  onClose,
  onOpenFull,
}: {
  id: string;
  onClose: () => void;
  onOpenFull: (id: string) => void;
}) {
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    setRun(null);
    setEvents([]);
    setError("");
    const refresh = () =>
      api<Run>(`/runs/${id}?equipe=1`, undefined, controller.signal)
        .then((next) => {
          if (active) setRun(next);
        })
        .catch((e) => {
          if (active && !controller.signal.aborted) setError(message(e));
        });
    void refresh();
    const close = watchRun(id, {
      connection: () => {},
      update: (event) => {
        if (!active) return;
        setEvents((old) => appendEvent(old, event));
        if (!timer)
          timer = setTimeout(() => {
            timer = undefined;
            void refresh();
          }, 300);
      },
      end: () => {
        if (active) void refresh();
      },
    });
    return () => {
      active = false;
      controller.abort();
      close();
      if (timer) clearTimeout(timer);
    };
  }, [id]);
  // The member's own actions (its questions, its send cards, stop): same routes as any mission.
  const act = async (path: string, body: unknown) => {
    setBusy(true);
    setError("");
    try {
      await api(path, body);
      setRun(await api<Run>(`/runs/${id}?equipe=1`));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const title =
    run?.famille?.titre || run?.title || run?.prompt || "Sous-agent";
  return (
    <aside className="side-pane" aria-label={`Sous-agent : ${title}`}>
      <header className="side-pane-head">
        <strong title={title}>{title}</strong>
        {run && <span className="badge">{labels[run.state] || run.state}</span>}
        <button
          type="button"
          className="icon-button"
          aria-label="Ouvrir en grand"
          title="Ouvrir en grand"
          onClick={() => onOpenFull(id)}
        >
          <Icon name="expand" />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Fermer la vue à côté"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="side-pane-body">
        <div className="thread side-thread">
          {!run && !error && (
            <p className="loading" role="status">
              Chargement du sous-agent…
            </p>
          )}
          {run && <PromptBubble text={run.prompt} />}
          {run && (
            <RunTurn
              run={run}
              events={events}
              busy={busy}
              act={act}
              incident={error}
            />
          )}
          {!run && error && <Incident text={error} />}
        </div>
      </div>
    </aside>
  );
}
