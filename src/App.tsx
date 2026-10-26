import { useCallback, useEffect, useRef, useState } from "react";
import type { Catalog, MissionInput, Plan, Run, RunEvent } from "./types";
import { agentStatus, labels } from "./types";
import { api, toApiInput, watchRun } from "./api";
import { Icon } from "./Icon";
import { Composer } from "./Composer";
import { PlanCard, RunView } from "./Mission";
import { Agents, Consumption, Packs, Skills } from "./Galleries";
type Page = "home" | "agents" | "skills" | "packs" | "usage" | "mission";
const titles: Record<Page, string> = {
  home: "Nouvelle mission",
  agents: "Agents",
  skills: "Skills",
  packs: "Domain Packs",
  usage: "Consommation",
  mission: "Mission",
};
const initial: MissionInput = {
  prompt: "",
  agent: "auto",
  pack: "auto",
  skills: [],
  model: "",
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
  const [side, setSide] = useState(() => window.innerWidth > 760),
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
  const current = useRef("");
  const viewVersion = useRef(0);
  const scroll = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
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
    scroll.current?.scrollTo({ top: 0 });
    document.title = `agre agent · ${titles[page]}`;
  }, [page, run?.id, plan]);
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
    current.current = "";
    setPlan(null);
    setPlanned(null);
    setInput((old) => ({ ...old, prompt: "" }));
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
      timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    setEvents([]);
    setConnection("Connexion au flux…");
    const refresh = async () => {
      try {
        const next = await api<Run>(
          "/runs/" + id,
          undefined,
          controller.signal,
        );
        if (active && current.current === id) setRun(next);
      } catch (e) {
        if (!controller.signal.aborted) report(e);
      }
    };
    const close = watchRun(id, {
      connection: (ok) => {
        if (active)
          setConnection(
            ok ? "Flux en direct" : "Connexion perdue · reconnexion…",
          );
      },
      update: (event) => {
        if (!active) return;
        setEvents((old) => [...old, event].slice(-500));
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
    return () => {
      active = false;
      controller.abort();
      close();
      if (timer) clearTimeout(timer);
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
      if (version === viewVersion.current) await openRun(next.id);
      await history();
      setPlanned(null);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  };
  const action = async (path: string, body: unknown) => {
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
        await openRun((response as Run).id);
        await history();
      } else if (run) {
        const next = await api<Run>("/runs/" + run.id);
        if (current.current === run.id) setRun(next);
      }
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  };
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
                <span>{r.prompt}</span>
                <small>
                  <i className={"dot " + r.state} />
                  {labels[r.state] || r.state}
                  {r.simulated ? " · fictif" : ""}
                </small>
              </button>
            ))}
            {!runs.length && (
              <small className="empty">
                Votre première mission commence ici.
              </small>
            )}
          </div>
          <section className="connections">
            <strong>Connexions locales</strong>
            {catalog?.agents.map((a) => (
              <div className="connection" key={a.id}>
                <i
                  className={
                    "dot " +
                    (a.simulated || a.probe?.session ? "completed" : "")
                  }
                />
                <span>{a.name}</span>
                <small title={a.reason || a.probe?.error}>
                  {agentStatus(a)}
                </small>
              </div>
            ))}
            <small>
              {catalog
                ? catalog.live
                  ? "BYOA réel activé"
                  : "Démonstration locale"
                : "Chargement du catalogue…"}
            </small>
          </section>
        </aside>
      )}
      <main id="main-content" className="main">
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
          <strong>{page === "mission" ? run?.prompt : titles[page]}</strong>
          {run && page === "mission" && (
            <span className="badge">{labels[run.state] || run.state}</span>
          )}
          <button
            className="icon-button theme-toggle"
            aria-label="Changer de thème"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Icon name="theme" />
          </button>
        </header>
        <div className="scroll-content" ref={scroll}>
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
                <h1>Que voulez-vous accomplir ?</h1>
                <p>
                  Décrivez un objectif. agre agent prépare un plan et attend
                  votre accord avant d’exécuter quoi que ce soit.
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
                  <button disabled>
                    <strong>Comparer deux agents sur la même tâche</strong>
                    <small>Bientôt</small>
                  </button>
                </div>
              </div>
            </section>
          )}
          {plan && page === "home" && (
            <div className="thread">
              <div className="prompt-bubble">{planned?.prompt}</div>
              <PlanCard
                plan={plan}
                catalog={catalog}
                busy={busy}
                launch={() => void launch()}
                edit={() => {
                  setPlan(null);
                  document.getElementById("prompt")?.focus();
                }}
              />
            </div>
          )}
          {page === "mission" && run && (
            <div className="thread">
              <div className="prompt-bubble">{run.prompt}</div>
              <RunView
                run={run}
                events={events}
                connection={connection}
                busy={busy}
                act={action}
              />
            </div>
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
                  choose={(pack) => choose({ pack, workflow: "auto" })}
                />
              )}{" "}
              {page === "usage" && (
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
              )}
            </div>
          )}
        </div>
        {(page === "home" || page === "mission") && (
          <Composer
            catalog={catalog}
            input={input}
            onChange={change}
            onPlan={() => void prepare()}
            busy={busy}
            disabled={page === "mission"}
          />
        )}
      </main>
    </div>
  );
}
