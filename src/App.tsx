import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Catalog, MissionInput, Plan, Run, RunEvent } from "./types";
import { finalStates, labels } from "./types";
import { api, ApiError, appendEvent, toApiInput, watchRun } from "./api";
import { Icon } from "./Icon";
import { Composer } from "./Composer";
import { PromptBubble } from "./PromptBubble";
import { CareerThread } from "./Career";
import { ConnectionsPanel } from "./ConnectionsPanel";
import { MissionPill } from "./MissionPill";
import { metaLine, Tracker } from "./Tracker";
import { Settings, storedName } from "./Settings";
import { useFollow } from "./follow";
import { PlanCard, RunView } from "./Mission";
import { Agents, Consumption, Packs, Skills } from "./Galleries";
type Page =
  | "home"
  | "agents"
  | "skills"
  | "packs"
  | "usage"
  | "mission"
  | "settings";
const titles: Record<Page, string> = {
  home: "Nouvelle mission",
  agents: "Agents",
  skills: "Skills",
  packs: "Domain Packs",
  usage: "Consommation",
  mission: "Mission",
  settings: "Paramètres",
};
const initial: MissionInput = {
  prompt: "",
  agent: "auto",
  pack: "auto",
  skills: [],
  model: "",
  agentMode: "",
  browser: "auto",
  browserDomains: "",
  budgetCents: 0,
  mode: "workflow",
  workflow: "auto",
  attachments: [],
};
export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [runs, setRuns] = useState<Run[]>([]),
    [run, setRun] = useState<Run | null>(null),
    [page, setPage] = useState<Page>("home");
  const [input, setInput] = useState(initial),
    [plan, setPlan] = useState<Plan | null>(null),
    [planned, setPlanned] = useState<MissionInput | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [events, setEvents] = useState<RunEvent[]>([]),
    [connection, setConnection] = useState("Connexion…"),
    [streamKey, setStreamKey] = useState(0);
  const [panel, setPanel] = useState(() => window.innerWidth > 1100),
    [side, setSide] = useState(() => window.innerWidth > 760),
    [theme, setTheme] = useState(() => {
      try {
        return (
          localStorage.getItem("agre-theme") ||
          (matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light")
        );
      } catch {
        return "light";
      }
    });
  const [usageRun, setUsageRun] = useState<Run | null>(null);
  const [immediatePrompt, setImmediatePrompt] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const current = useRef("");
  const viewVersion = useRef(0);
  const scroll = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const lastScrollTop = useRef(0);
  const lastScrollSize = useRef("");
  const [composerCompact, setComposerCompact] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  // Instructions typed during a run, sent as a follow-up once it has completed.
  const [queued, setQueued] = useState<{ runId: string; text: string }[]>([]);
  const draining = useRef(false);
  const [trackerOpen, setTrackerOpen] = useState(false),
    [trackerDetails, setTrackerDetails] = useState(false),
    [profileName, setProfileName] = useState(storedName);
  const settingsReturn = useRef<Page>("home");
  const {
    onScroll: follow,
    stuck,
    away,
    toBottom,
  } = useFollow(scroll, page === "mission", events, run?.id);
  const report = (e: unknown) =>
    setError(e instanceof Error ? e.message : String(e));
  const history = useCallback(
    async () => setRuns(await api<Run[]>("/runs")),
    [],
  );
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cat, list] = await Promise.all([
        api<Catalog>("/catalog"),
        api<Run[]>("/runs"),
      ]);
      setCatalog(cat);
      setRuns(list);
      setInput((old) => ({
        ...old,
        skills: old.skills.filter((id) =>
          cat.skills.some((s) => s.id === id && s.active && s.integrity),
        ),
      }));
    } catch (e) {
      report(e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("agre-theme", theme);
    } catch {
      /* Private browsing may disable storage. */
    }
  }, [theme]);
  useEffect(() => {
    scroll.current?.scrollTo({
      top: page === "home" && plan ? scroll.current.scrollHeight : 0,
    });
    lastScrollTop.current = 0;
    lastScrollSize.current = "";
    setComposerCompact(false);
    document.title = `agre agent · ${titles[page]}`;
  }, [page, run?.id, plan]);
  useLayoutEffect(() => {
    const main = mainRef.current;
    const feed = scroll.current;
    const dock = main?.querySelector<HTMLElement>(".composer-dock");
    if (!main || !feed) return;
    if (!dock) {
      main.style.removeProperty("--dock-h");
      return;
    }
    const measure = () => {
      const height = Math.ceil(dock.getBoundingClientRect().height);
      const previous = parseFloat(main.style.getPropertyValue("--dock-h")) || 0;
      if (height <= 0 || height === previous) return;
      // In conversation the dock is in the flex flow: growth already shrank the
      // feed before ResizeObserver fires, so include that growth in the threshold.
      const atBottom =
        stuck.current &&
        feed.scrollHeight - feed.scrollTop - feed.clientHeight <
          40 + Math.max(0, height - previous);
      main.style.setProperty("--dock-h", `${height}px`);
      if (atBottom) {
        requestAnimationFrame(() => {
          if (scroll.current === feed) feed.scrollTop = feed.scrollHeight;
        });
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => observer.disconnect();
  }, [page, plan, run?.id]);
  const go = (next: Page) => {
    viewVersion.current++;
    setPage(next);
    setError("");
    if (innerWidth <= 760) setSide(false);
  };
  const newMission = useCallback(() => {
    viewVersion.current++;
    setPage("home");
    setRun(null);
    setImmediatePrompt(null);
    current.current = "";
    setPlan(null);
    setPlanned(null);
    setInput((old) => ({ ...old, prompt: "", attachments: [] }));
    setError("");
    if (innerWidth <= 760) setSide(false);
    requestAnimationFrame(() => document.getElementById("prompt")?.focus());
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        newMission();
      }
      if (e.key === "Escape" && innerWidth <= 760) setSide(false);
      if (e.key === "Tab" && side && innerWidth <= 760) {
        const nodes = navRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        );
        if (nodes?.length) {
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [newMission, side]);
  const openRun = async (id: string) => {
    const version = ++viewVersion.current;
    current.current = id;
    setImmediatePrompt((old) => (old?.id === id ? old : null));
    setError("");
    try {
      const next = await api<Run>("/runs/" + id);
      if (current.current === id && version === viewVersion.current) {
        setRun(next);
        setPage("mission");
        setPlan(null);
        setStreamKey((k) => k + 1);
        if (innerWidth <= 760) setSide(false);
      }
    } catch (e) {
      if (version === viewVersion.current) report(e);
    }
  };
  useEffect(() => {
    if (!run) return;
    const id = run.id;
    let active = true,
      timer: ReturnType<typeof setTimeout> | undefined,
      heartbeat: ReturnType<typeof setInterval> | undefined,
      refreshing = false;
    const controller = new AbortController();
    setEvents([]);
    setConnection("Connexion au flux…");
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const next = await api<Run>(
          "/runs/" + id,
          undefined,
          controller.signal,
        );
        if (active && current.current === id) {
          setRun(next);
          setConnection((old) =>
            old.includes("perdue")
              ? "API reconnectée · journal synchronisé"
              : old,
          );
          if (finalStates.has(next.state) && heartbeat) {
            clearInterval(heartbeat);
            heartbeat = undefined;
          }
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        if (
          e instanceof ApiError &&
          (e.status === 0 || [502, 503, 504].includes(e.status))
        ) {
          setConnection("Connexion perdue · reconnexion…");
          if (!timer)
            timer = setTimeout(() => {
              timer = undefined;
              void refresh();
            }, 1000);
        } else report(e);
      } finally {
        refreshing = false;
      }
    };
    const close = watchRun(id, {
      connection: (ok) => {
        if (active) {
          setConnection(
            ok ? "Flux en direct" : "Connexion perdue · reconnexion…",
          );
          if (!ok && !timer)
            timer = setTimeout(() => {
              timer = undefined;
              void refresh();
            }, 1000);
        }
      },
      update: (event) => {
        if (!active) return;
        setEvents((old) => appendEvent(old, event));
        setRun((old) => {
          if (!old || old.id !== id) return old;
          if (event.type === "state")
            return { ...old, state: String(event.data.state) };
          if (event.type === "step") {
            const item = {
              step_id: String(event.data.stepId),
              state: String(event.data.state),
              attempt: Number(event.data.attempt || 0),
              error: event.data.error ? String(event.data.error) : undefined,
            };
            return {
              ...old,
              steps: [
                ...(old.steps || []).filter((s) => s.step_id !== item.step_id),
                item,
              ],
            };
          }
          return old;
        });
        if (event.type === "budget_exceeded")
          setError(
            String(event.data.reason || "Budget dépassé") +
              " : exécution arrêtée",
          );
        if (!timer)
          timer = setTimeout(() => {
            timer = undefined;
            void refresh();
          }, 100);
      },
      end: () => {
        if (active) {
          setConnection("Journal synchronisé");
          if (timer) clearTimeout(timer);
          void refresh();
          void history().catch(report);
        }
      },
    });
    if (!finalStates.has(run.state))
      heartbeat = setInterval(() => void refresh(), 2000);
    return () => {
      active = false;
      controller.abort();
      close();
      if (timer) clearTimeout(timer);
      if (heartbeat) clearInterval(heartbeat);
    };
    // A refresh of the same run must not reopen its SSE stream.
  }, [run?.id, streamKey, history]);
  const prepare = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const candidate = structuredClone(input);
    const version = viewVersion.current;
    try {
      const next = await api<Plan>("/plan", toApiInput(candidate));
      if (version !== viewVersion.current) return;
      setPlan(next);
      setPlanned(candidate);
      setRun(null);
      current.current = "";
      setPage("home");
    } catch (e) {
      if (version === viewVersion.current) report(e);
    } finally {
      setBusy(false);
    }
  };
  const launch = async () => {
    if (!planned || busy) return;
    const version = viewVersion.current;
    setBusy(true);
    setError("");
    try {
      const next = await api<Run>("/runs", toApiInput(planned));
      if (version === viewVersion.current) {
        if (next.pack === "career-ops")
          setImmediatePrompt({ id: next.id, text: planned.prompt });
        await openRun(next.id);
        if (viewVersion.current === version + 1 && current.current === next.id)
          setInput((old) => ({ ...old, prompt: "", attachments: [] }));
      }
      await history();
      setPlanned(null);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  };
  // Follow-up in the same agent session (e.g. answering career-ops intake questions).
  const canReply =
    page === "mission" &&
    !!run &&
    run.mode !== "workflow" &&
    finalStates.has(run.state) &&
    !!run.resumable;
  const reply = async () => {
    if (!run || !input.prompt.trim()) return;
    const prompt = input.prompt.trim();
    try {
      await action(
        `/runs/${run.id}/resume`,
        {
          prompt,
          attachments: input.attachments?.map((file) => file.id) || [],
        },
        true,
      );
      setInput((old) => ({ ...old, prompt: "", attachments: [] }));
    } catch {
      // The action already displayed the error; keep the draft for retry.
    }
  };
  const action = async (path: string, body: unknown, throwOnError = false) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api<unknown>(path, body);
      if (path.startsWith("/skills")) {
        const skills = response as Catalog["skills"];
        setCatalog((old) => (old ? { ...old, skills } : old));
        setInput((old) => ({
          ...old,
          skills: old.skills.filter((id) =>
            skills.some((s) => s.id === id && s.active && s.integrity),
          ),
        }));
        setPlan(null);
        setPlanned(null);
      } else if (path.endsWith("/resume")) {
        const resumed = response as Run;
        const prompt = (body as { prompt?: unknown })?.prompt;
        if (resumed.pack === "career-ops" && typeof prompt === "string")
          setImmediatePrompt({ id: resumed.id, text: prompt });
        await openRun((response as Run).id);
        await history();
      } else if (run) {
        const next = await api<Run>("/runs/" + run.id);
        if (current.current === run.id) setRun(next);
      }
    } catch (e) {
      report(e);
      if (throwOnError) throw e;
    } finally {
      setBusy(false);
    }
  };
  const runActive = page === "mission" && !!run && !finalStates.has(run.state);
  const usageView = catalog && (
    <Consumption
      catalog={catalog}
      runs={runs}
      selected={usageRun}
      onSelect={(id) => {
        void api<Run>("/runs/" + id)
          .then(setUsageRun)
          .catch(report);
      }}
    />
  );
  const summaryLine = page === "mission" && run ? metaLine(run, events) : "";
  const runId = run?.id;
  const runState = run?.state;
  useEffect(() => {
    if (!runId || !runState || !finalStates.has(runState) || busy) return;
    const next = queued.find((item) => item.runId === runId);
    if (!next || draining.current) return;
    draining.current = true;
    const others = (id: string) =>
      setQueued((old) =>
        old
          .filter((item) => item !== next)
          .map((item) =>
            item.runId === runId ? { ...item, runId: id } : item,
          ),
      );
    // The stream's final state arrives before `resumable`: decide on a fresh copy of the run.
    void api<Run>("/runs/" + runId)
      .then(async (fresh) => {
        if (fresh.state === "completed" && fresh.resumable) {
          await action(
            `/runs/${runId}/resume`,
            { prompt: next.text, attachments: [] },
            true,
          );
          others(current.current);
        } else {
          others(runId);
          setInput((old) => ({ ...old, prompt: next.text }));
          setError(
            `Instruction non envoyée : la mission est « ${labels[fresh.state] || fresh.state} » et ne peut pas la recevoir. Elle est remise dans ta zone de saisie.`,
          );
        }
      })
      .catch((e) => {
        others(runId);
        setInput((old) => ({ ...old, prompt: next.text }));
        report(e);
      })
      .finally(() => {
        draining.current = false;
      });
  }, [runId, runState, busy, queued]);
  const change = (next: MissionInput) => {
    if (busy) return;
    setInput(next);
    setPlan(null);
    setPlanned(null);
  };
  const choose = (patch: Partial<MissionInput>) => {
    newMission();
    setInput((old) => ({ ...old, ...patch }));
  };
  const suggestions = [
    {
      title: "Trouver des offres Python et SQL en Australie",
      note: "Najah AI · Workflow",
      prompt:
        "Rechercher et classer des offres Python et SQL en Australie (démonstration fictive)",
      pack: "najah",
      workflow: "opportunity-discovery-dag",
    },
    {
      title: "Rédiger un brouillon de lettre pour une offre",
      note: "Najah AI · brouillon à relire",
      prompt:
        "Rédiger un brouillon de lettre pour un poste de data engineer. Profil : [À COMPLÉTER]. Offre fictive.",
      pack: "najah",
      workflow: "application-draft",
    },
    {
      title: "Analyser une idée et structurer les prochaines étapes",
      note: "Général · Agent unique",
      prompt:
        "Analyser une idée et structurer les prochaines étapes : [À COMPLÉTER]",
      pack: "core",
      workflow: "auto",
    },
  ];
  return (
    <div className="app" data-ready={catalog ? "true" : "false"}>
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      {side && (
        <button
          className="side-scrim"
          aria-label="Fermer la navigation"
          onClick={() => setSide(false)}
        />
      )}
      {side && (
        <aside className="sidebar" ref={navRef} aria-label="Navigation">
          <div className="brand">
            <span className="brand-icon">a</span>
            <strong>agre agent</strong>
            <button
              className="icon-button"
              aria-label="Masquer la barre latérale"
              onClick={() => setSide(false)}
            >
              <Icon name="side" />
            </button>
          </div>
          <button className="new-mission" onClick={newMission}>
            <Icon name="plus" />
            Nouvelle mission<span>⌘K</span>
          </button>
          <nav>
            {(["agents", "skills", "packs", "usage"] as Page[]).map((p) => (
              <button
                className={page === p ? "nav-item active" : "nav-item"}
                key={p}
                onClick={() => go(p)}
                aria-label={titles[p]}
                aria-current={page === p ? "page" : undefined}
              >
                <Icon name={p} />
                {titles[p]}
                {p === "skills" &&
                  !!catalog?.skills.filter((s) => s.state === "quarantined")
                    .length && (
                    <span className="badge warning">
                      {
                        catalog.skills.filter((s) => s.state === "quarantined")
                          .length
                      }
                    </span>
                  )}
              </button>
            ))}
          </nav>
          <div className="missions-title">
            <strong>Missions</strong>
            <button
              className="icon-button"
              aria-label="Actualiser les missions"
              onClick={() => void history().catch(report)}
            >
              ↻
            </button>
          </div>
          <div className="mission-list">
            {runs.map((r) => (
              <button
                key={r.id}
                className={
                  "mission-link " +
                  (run?.id === r.id && page === "mission" ? "active" : "")
                }
                onClick={() => void openRun(r.id)}
              >
                <i className={"dot " + r.state} />
                <span title={r.prompt}>{r.title || r.prompt}</span>
                <small className={finalStates.has(r.state) ? "sr-only" : ""}>
                  {labels[r.state] || r.state}
                </small>
                {r.simulated && <small>fictif</small>}
              </button>
            ))}
            {!runs.length && (
              <small className="empty">
                Votre première mission commence ici.
              </small>
            )}
          </div>
          <div className="sidebar-account">
            <i aria-hidden="true">
              {(profileName.trim()[0] || "T").toUpperCase()}
            </i>
            <span>
              {profileName.trim() || "Ton compte"}
              <small>Local · BYOA</small>
            </span>
            <button
              className={"icon-button " + (page === "settings" ? "active" : "")}
              aria-label="Paramètres"
              aria-current={page === "settings" ? "page" : undefined}
              onClick={() => {
                if (page !== "settings") settingsReturn.current = page;
                go(page === "settings" ? settingsReturn.current : "settings");
              }}
            >
              <Icon name="settings" />
            </button>
          </div>
        </aside>
      )}
      <main
        id="main-content"
        ref={mainRef}
        className={
          (page === "mission" ? "main conversation-main" : "main") +
          (panel ? " with-panel" : "") +
          (runActive ? " run-active" : "")
        }
      >
        <div className="glow" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <header className="toolbar">
          {!side && (
            <button
              className="icon-button"
              aria-label="Afficher la barre latérale"
              onClick={() => {
                setSide(true);
                requestAnimationFrame(() =>
                  navRef.current?.querySelector("button")?.focus(),
                );
              }}
            >
              <Icon name="side" />
            </button>
          )}
          <strong>
            {page === "mission" ? run?.title || run?.prompt : titles[page]}
          </strong>
          {run && page === "mission" && (
            <span className="badge">{labels[run.state] || run.state}</span>
          )}
          <button
            className="icon-button panel-toggle"
            aria-label={
              panel
                ? "Masquer les connexions locales"
                : "Afficher les connexions locales"
            }
            aria-pressed={panel}
            onClick={() => setPanel(!panel)}
          >
            <Icon name="side" />
          </button>
          <button
            className="icon-button theme-toggle"
            aria-label="Changer de thème"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Icon name="theme" />
          </button>
        </header>
        {panel && (
          <ConnectionsPanel
            catalog={catalog}
            events={page === "mission" ? events : []}
            run={page === "mission" ? run : null}
          />
        )}
        <div
          className="scroll-content"
          ref={scroll}
          onScroll={(e) => {
            const el = e.currentTarget;
            const size = `${el.clientHeight}`;
            const resized =
              lastScrollSize.current && lastScrollSize.current !== size;
            lastScrollSize.current = size;
            // Dock resize can clamp scrollTop to the new bottom. It is layout,
            // not a request to reopen the composer or resume following output.
            if (resized) {
              lastScrollTop.current = el.scrollTop;
              return;
            }
            follow(e);
            if (page !== "mission") return;
            const nearBottom =
              el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            if (nearBottom && el.scrollTop > lastScrollTop.current + 2)
              setComposerCompact(false);
            else if (el.scrollTop < lastScrollTop.current - 2)
              setComposerCompact(true);
            lastScrollTop.current = el.scrollTop;
          }}
          onWheel={(e) => {
            const el = e.currentTarget;
            // Once a compact dock has made the feed reach its bottom, another
            // downward gesture has no scroll event; honor that explicit intent.
            if (
              page === "mission" &&
              e.deltaY > 0 &&
              el.scrollHeight - el.scrollTop - el.clientHeight < 40
            )
              setComposerCompact(false);
          }}
        >
          {error && (
            <div className="global-error" role="alert">
              <strong>Impossible de terminer l’action</strong>
              <p>{error}</p>
              <button onClick={() => setError("")}>Fermer</button>
              {!catalog && (
                <button onClick={() => void load()}>
                  Réessayer la connexion
                </button>
              )}
            </div>
          )}
          {loading && !catalog && (
            <p className="loading" role="status">
              Connexion au backend local…
            </p>
          )}
          {page === "home" && !plan && (
            <section className="home">
              <div className="home-inner">
                <h1>Que dois-je faire ?</h1>
                <p>
                  Décris une mission. L’agent prépare un plan et attend ton
                  accord avant d’exécuter quoi que ce soit.
                </p>
                <div className="suggestions">
                  {suggestions.map((s) => (
                    <button
                      key={s.title}
                      disabled={busy}
                      onClick={() => {
                        change({
                          ...input,
                          prompt: s.prompt,
                          pack: s.pack,
                          mode: s.pack === "core" ? "agent" : "workflow",
                          workflow: s.workflow,
                        });
                        document.getElementById("prompt")?.focus();
                      }}
                    >
                      <strong>{s.title}</strong>
                      <small>{s.note}</small>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
          {plan && page === "home" && (
            <div className="thread">
              <PromptBubble text={planned?.prompt || ""} />
              <PlanCard
                plan={plan}
                catalog={catalog}
                busy={busy}
                launch={() => void launch()}
                edit={() => {
                  setPlan(null);
                  setPlanned(null);
                  requestAnimationFrame(() =>
                    document.getElementById("prompt")?.focus(),
                  );
                }}
              />
            </div>
          )}
          {page === "mission" && run && (
            <div className="thread">
              {run.pack === "career-ops" ? (
                <CareerThread
                  run={run}
                  runs={runs}
                  events={events}
                  immediatePrompt={
                    immediatePrompt?.id === run.id
                      ? immediatePrompt.text
                      : undefined
                  }
                  busy={busy}
                  connection={connection}
                  stop={() => void action(`/runs/${run.id}/cancel`, {})}
                  resume={() => void action(`/runs/${run.id}/resume`, {})}
                >
                  <RunView
                    run={run}
                    events={events}
                    connection={connection}
                    busy={busy}
                    act={action}
                  />
                </CareerThread>
              ) : (
                <>
                  <PromptBubble key={run.id} text={run.prompt} />
                  <RunView
                    run={run}
                    events={events}
                    connection={connection}
                    busy={busy}
                    act={action}
                  />
                </>
              )}
              {summaryLine && (
                <button
                  className="meta-line"
                  title="Voir le détail dans le suivi"
                  onClick={() => {
                    setTrackerOpen(true);
                    setTrackerDetails(true);
                  }}
                >
                  {summaryLine}
                </button>
              )}
            </div>
          )}
          {page === "settings" && (
            <Settings
              catalog={catalog}
              usage={usageView}
              back={() => go(settingsReturn.current)}
              onName={setProfileName}
            />
          )}
          {catalog && ["agents", "skills", "packs", "usage"].includes(page) && (
            <div className="page">
              {page === "agents" && (
                <Agents
                  catalog={catalog}
                  choose={(agent, model = "") => choose({ agent, model })}
                />
              )}{" "}
              {page === "skills" && (
                <Skills catalog={catalog} busy={busy} act={action} />
              )}{" "}
              {page === "packs" && (
                <Packs
                  catalog={catalog}
                  choose={(pack) =>
                    choose({
                      pack,
                      workflow: "auto",
                    })
                  }
                />
              )}{" "}
              {page === "usage" && usageView}
            </div>
          )}
        </div>
        {page === "mission" && away && (
          <button
            className="jump-bottom"
            aria-label="Revenir en bas"
            onClick={() => {
              setComposerCompact(false);
              toBottom();
            }}
          >
            <span aria-hidden="true">↓</span> Revenir en bas
          </button>
        )}
        {page === "mission" && run && (
          <Tracker
            run={run}
            events={events}
            open={trackerOpen}
            details={trackerDetails}
            setOpen={setTrackerOpen}
            setDetails={setTrackerDetails}
          />
        )}
        {runActive && run && (
          <MissionPill
            key={run.id}
            busy={busy}
            canQueue={run.mode !== "workflow"}
            queued={queued.filter((item) => item.runId === run.id).length}
            stop={() => void action(`/runs/${run.id}/cancel`, {})}
            queue={(text) =>
              setQueued((old) => [...old, { runId: run.id, text }])
            }
          />
        )}
        {(page === "home" || page === "mission") && (
          <Composer
            scope={viewVersion.current}
            catalog={catalog}
            input={input}
            onChange={change}
            onPlan={() => void (canReply ? reply() : prepare())}
            busy={busy}
            disabled={page === "mission" && !canReply}
            working={
              page === "mission" &&
              run?.pack === "career-ops" &&
              !finalStates.has(run.state)
            }
            reply={canReply}
            compact={
              (page === "home" && !!plan) ||
              (page === "mission" && composerCompact)
            }
            onOpen={() => {
              if (page === "home" && plan) {
                setPlan(null);
                setPlanned(null);
              } else setComposerCompact(false);
            }}
            sessionSettings={
              page === "mission" && run
                ? { agent: run.agent, model: run.model || "", pack: run.pack }
                : undefined
            }
          />
        )}
      </main>
    </div>
  );
}
