import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Catalog, MissionInput, Run, RunEvent } from "./types";
import { finalStates, labels, ownerStates } from "./types";
import {
  api,
  API_UNREACHABLE,
  ApiError,
  appendEvent,
  sendOwnerMessage,
  toApiInput,
  watchRun,
} from "./api";
import { OWNER_DRAFT_EVENT, rememberOwnerText } from "./ownerMessages";
import { Icon } from "./Icon";
import { Composer } from "./Composer";
import { PromptBubble } from "./PromptBubble";
import { agentWarning } from "./agentStatus";
import { rememberResume } from "./resumeLinks";
import { MissionPrompt, SessionHistory, conversations } from "./Career";
import { ActivityPanel, SubagentsLine } from "./ActivityPanel";
import { MissionPill } from "./MissionPill";
import { Settings, storedName } from "./Settings";
import { useFollow } from "./follow";
import { RunTurn } from "./RunTurn";
import { SidePane } from "./SidePane";
import {
  activiteListe,
  avecDetailsDesLignes,
  missionsDeLaListe,
  POINT_ACTIVITE,
  resumeListe,
  texteResume,
} from "./status";
import { Agents, Consumption, Packs, Skills } from "./Galleries";
const ENDED_NOTICE =
  "La mission est terminée : votre message sera envoyé dans une reprise";
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
  // 21/11 : agent unique par défaut. En workflow, une mission finie ne reçoit pas de message de suite
  // (canReply) ; le workflow reste un choix dans les réglages.
  mode: "agent",
  workflow: "auto",
  attachments: [],
};
// meme-affichage-21-11 : une question à un seul champ texte libre (ni choix ni liste) se répond depuis
// le champ du bas ; les autres gardent leur formulaire dans le fil.
function proseAnswerKey(question: Run["pendingQuestion"]) {
  const fields = Object.entries(question?.requestedSchema?.properties ?? {});
  if (fields.length !== 1) return null;
  const [key, field] = fields[0];
  if (field.type !== "string" || field.enum || field.oneOf) return null;
  return key;
}
export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [runs, setRuns] = useState<Run[]>([]),
    [run, setRun] = useState<Run | null>(null),
    [page, setPage] = useState<Page>("home");
  const [input, setInput] = useState(initial),
    // The prompt being sent: the mission starts on send, with no plan to confirm.
    [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [events, setEvents] = useState<RunEvent[]>([]),
    [connection, setConnection] = useState("Connexion…"),
    [streamKey, setStreamKey] = useState(0);
  // Activité panel: open by default above 1100px. Up to 1180px the thread keeps at least 560px,
  // so the sidebar and the panel are never open together there.
  const [panel, setPanel] = useState(() => window.innerWidth > 1100),
    [side, setSide] = useState(
      () =>
        window.innerWidth > 760 &&
        !(window.innerWidth > 1100 && window.innerWidth <= 1180),
    ),
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
  // « Reprendre le texte » of an undelivered message: back into the composer.
  useEffect(() => {
    const reuse = (e: Event) => {
      const text = (e as CustomEvent<unknown>).detail;
      if (typeof text !== "string" || !text) return;
      setInput((old) => ({ ...old, prompt: text }));
      document.getElementById("prompt")?.focus();
    };
    window.addEventListener(OWNER_DRAFT_EVENT, reuse);
    return () => window.removeEventListener(OWNER_DRAFT_EVENT, reuse);
  }, []);
  const launching = useRef<AbortController | null>(null);
  // « Détails techniques » of the mission steps, in the Activité panel.
  const [stepDetails, setStepDetails] = useState(false),
    // reponse-04 : vue scindée, un membre de l'équipe suivi à côté du fil.
    [sideRunId, setSideRunId] = useState<string | null>(null),
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
  // Missions waiting for the owner (question or send approval), counted over the whole list.
  const waiting = runs.filter((r) => ownerStates.has(r.state)).length;
  const waitingBadge = waiting > 0 && (
    <span
      className="badge warning owner-count"
      aria-label={`${waiting} mission${waiting > 1 ? "s" : ""} attend${
        waiting > 1 ? "ent" : ""
      } votre réponse`}
      title="À vous de répondre"
    >
      {waiting}
    </span>
  );
  const history = useCallback(
    async () => setRuns(await api<Run[]>("/runs")),
    [],
  );
  // The list shows the state of the open mission as its refresh (SSE then re-read) learns it,
  // so an agent question or a send approval appears there without reloading the list.
  const syncList = useCallback(
    (next: Pick<Run, "id" | "state">) =>
      setRuns((old) =>
        old.some((r) => r.id === next.id && r.state !== next.state)
          ? old.map((r) => (r.id === next.id ? { ...r, state: next.state } : r))
          : old,
      ),
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
    // A mission opens at its latest content, as useFollow keeps it (both used to race: the mission
    // opened at the top or at the bottom by turns).
    const bottom = (page === "home" && starting) || page === "mission";
    scroll.current?.scrollTo({
      top: bottom ? scroll.current.scrollHeight : 0,
    });
    lastScrollTop.current = scroll.current?.scrollTop ?? 0;
    lastScrollSize.current = "";
    setComposerCompact(false);
    document.title = `agre agent · ${titles[page]}`;
  }, [page, run?.id, starting]);
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
  }, [page, starting, run?.id]);
  // The Activité panel opens only on a click (toolbar, summary line, sub-agents line), never on its own.
  // The thread keeps at least 560px: the split view hides the sidebar up to 1560px and takes the
  // panel's place up to 1340px; reopening the panel there closes the split view.
  // The sidebar the split view hid comes back when it closes (it stayed hidden before).
  const sideHidByPane = useRef(false);
  const openSide = (id: string) => {
    setSideRunId(id);
    if (innerWidth <= 1560 && side) {
      sideHidByPane.current = true;
      setSide(false);
    }
    if (innerWidth <= 1340) setPanel(false);
  };
  const closeSide = () => {
    setSideRunId(null);
    if (sideHidByPane.current && innerWidth > 760) setSide(true);
    sideHidByPane.current = false;
  };
  const showPanel = (open: boolean) => {
    setPanel(open);
    if (open && innerWidth <= 1340) setSideRunId(null);
    if (open && innerWidth <= 1180) setSide(false);
    // Under 760px the panel covers the toolbar button that opened it: focus moves to its close button.
    if (open && innerWidth <= 760)
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>(".activity-header .icon-button")
          ?.focus(),
      );
  };
  const showSide = () => {
    setSide(true);
    if (innerWidth <= 1560) setSideRunId(null);
    if (innerWidth <= 1180) setPanel(false);
    requestAnimationFrame(() =>
      navRef.current?.querySelector("button")?.focus(),
    );
  };
  // Window narrowed under 760px: the panel would become an overlay over the whole thread (the wheel
  // then scrolled the panel), so it closes. Reopened by hand there, it stays open.
  useEffect(() => {
    let wide = innerWidth > 760;
    const fit = () => {
      if (wide && innerWidth <= 760) setPanel(false);
      wide = innerWidth > 760;
    };
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);
  // Up to 980px the split view covers the screen (v2.css): what lies beneath becomes inert, so Tab
  // and screen readers no longer reach hidden buttons (test-ui-21-11).
  const [narrowSplit, setNarrowSplit] = useState(() => innerWidth <= 980);
  useEffect(() => {
    const fit = () => setNarrowSplit(innerWidth <= 980);
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);
  const coveredBySplit = !!sideRunId && page === "mission" && narrowSplit;
  // Split view open and window narrowed: the click thresholds hold on resize too (the thread fell
  // to 0 px): the sidebar gives way up to 1560 px, the panel up to 1340 px.
  useEffect(() => {
    if (!sideRunId) return;
    const fit = () => {
      if (innerWidth <= 1560)
        setSide((open) => {
          if (open) sideHidByPane.current = true;
          return false;
        });
      if (innerWidth <= 1340) setPanel(false);
    };
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, [sideRunId]);
  // Window narrowed with both open: the sidebar gives way so the thread keeps its width.
  useEffect(() => {
    if (!panel || !side) return;
    const fit = () => {
      if (innerWidth <= 1180) setSide(false);
    };
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, [panel, side]);
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
    setInput((old) => ({ ...old, prompt: "", attachments: [] }));
    setError("");
    if (innerWidth <= 760) setSide(false);
    requestAnimationFrame(() => document.getElementById("prompt")?.focus());
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      // ⌘K on a Mac (Ctrl+K there edits the text field), Ctrl+K elsewhere.
      const mac = /Mac|iPhone|iPad/.test(navigator.platform);
      if ((mac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        newMission();
      }
      // The split view covers the screen up to 980px (v2.css): Escape closes it there.
      if (e.key === "Escape" && innerWidth <= 980) setSideRunId(null);
      if (e.key === "Escape" && innerWidth <= 760) {
        setSide(false);
        // Under 760px the panel covers the thread: Escape closes it like the sidebar.
        setPanel(false);
      }
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
  // The open mission lives in the address (#mission/<id>): a reload reopens it instead of the home.
  const initialHash = useRef(location.hash);
  useEffect(() => {
    const want = page === "mission" && run ? "#mission/" + run.id : "";
    if (location.hash !== want)
      window.history.replaceState(
        null,
        "",
        want || location.pathname + location.search,
      );
  }, [page, run]);
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !catalog) return;
    restored.current = true;
    const id = initialHash.current.match(/^#mission\/([\w-]+)$/)?.[1];
    if (id) void openRun(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);
  const openRun = async (id: string) => {
    const version = ++viewVersion.current;
    setSideRunId(null);
    current.current = id;
    setImmediatePrompt((old) => (old?.id === id ? old : null));
    setError("");
    try {
      const next = await api<Run>("/runs/" + id + "?equipe=1");
      if (current.current === id && version === viewVersion.current) {
        setRun(next);
        setPage("mission");
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
          "/runs/" + id + "?equipe=1",
          undefined,
          controller.signal,
        );
        if (active && current.current === id) {
          setRun(next);
          syncList(next);
          // The API answers again: its « inaccessible » message no longer holds.
          setError((old) => (old === API_UNREACHABLE ? "" : old));
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
          if (ok) setError((old) => (old === API_UNREACHABLE ? "" : old));
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
        if (event.type === "state")
          syncList({ id, state: String(event.data.state) });
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
  }, [run?.id, streamKey, history, syncList]);
  const launch = async () => {
    if (busy || !input.prompt.trim()) return;
    const candidate = structuredClone(input);
    const version = viewVersion.current;
    const controller = new AbortController();
    launching.current = controller;
    setBusy(true);
    setError("");
    setNotice("");
    setStarting(candidate.prompt);
    try {
      const next = await api<Run>(
        "/runs",
        toApiInput(candidate),
        controller.signal,
      );
      if (version === viewVersion.current) {
        if (next.pack === "career-ops")
          setImmediatePrompt({ id: next.id, text: candidate.prompt });
        await openRun(next.id);
        if (viewVersion.current === version + 1 && current.current === next.id)
          setInput((old) => ({ ...old, prompt: "", attachments: [] }));
      }
      await history();
    } catch (e) {
      if (controller.signal.aborted) {
        // Only the wait stops: the back may still have created the run.
        setNotice(
          "Lancement annulé dans l’interface. Si l’API avait reçu la demande, la mission apparaît dans l’historique.",
        );
        void history().catch(() => {});
      } else report(e);
    } finally {
      if (launching.current === controller) launching.current = null;
      setStarting(null);
      setBusy(false);
    }
  };
  // Follow-up in the same agent session (e.g. answering career-ops intake questions).
  // A sub-mission is relaunched by its chief: the back refuses its resume (409).
  const canReply =
    page === "mission" &&
    !!run &&
    run.mode !== "workflow" &&
    finalStates.has(run.state) &&
    !!run.resumable &&
    !run.famille;
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
  // The Skills routes answer the list, or (skills-nuit-22-11) an object that carries it.
  const applySkills = (response: unknown) => {
    const skills = Array.isArray(response)
      ? (response as Catalog["skills"])
      : Array.isArray((response as { skills?: unknown } | null)?.skills)
        ? (response as { skills: Catalog["skills"] }).skills
        : null;
    if (!skills) return;
    setCatalog((old) => (old ? { ...old, skills } : old));
    setInput((old) => ({
      ...old,
      skills: old.skills.filter((id) =>
        skills.some((s) => s.id === id && s.active && s.integrity),
      ),
    }));
  };
  // skills-nuit-22-11 : import, vérification et mise à jour d'un Skill ; la réponse (compte rendu,
  // candidats d'un refus…) revient au menu Skills, qui l'affiche sur place.
  const skillRequest = async (path: string, body: unknown) => {
    setBusy(true);
    setError("");
    try {
      const response = await api<unknown>(path, body);
      applySkills(response);
      return response;
    } finally {
      setBusy(false);
    }
  };
  const action = async (path: string, body: unknown, throwOnError = false) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api<unknown>(path, body);
      if (path.startsWith("/skills")) {
        applySkills(response);
      } else if (path.endsWith("/resume")) {
        const resumed = response as Run;
        rememberResume(resumed.id, path.split("/")[2]);
        const prompt = (body as { prompt?: unknown })?.prompt;
        if (resumed.pack === "career-ops" && typeof prompt === "string")
          setImmediatePrompt({ id: resumed.id, text: prompt });
        await openRun((response as Run).id);
        await history();
      } else if (run) {
        const next = await api<Run>("/runs/" + run.id + "?equipe=1");
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
        void api<Run>("/runs/" + id + "?equipe=1")
          .then(setUsageRun)
          .catch(report);
      }}
    />
  );
  // reponse-04 : une erreur d'action sur la mission ouverte est une ligne du fil ; la bannière rouge
  // reste pour une mission réellement bloquée qui attend l'utilisateur, et hors des missions.
  const inlineError =
    page === "mission" && run && !ownerStates.has(run.state) ? error : "";
  // sous-agents-19-11 : line of voie 2 written by the back (delegation_accepted.message).
  const delegationNote =
    page === "mission"
      ? String(
          [...events]
            .reverse()
            .find(
              (event) =>
                event.type === "delegation_accepted" &&
                event.data?.via === "prompt" &&
                typeof event.data.message === "string",
            )?.data.message ?? "",
        )
      : "";
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
    void api<Run>("/runs/" + runId + "?equipe=1")
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
        setNotice((old) => (old.startsWith(ENDED_NOTICE) ? "" : old));
      });
  }, [runId, runState, busy, queued]);
  const change = (next: MissionInput) => {
    if (busy) return;
    setInput(next);
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
        <aside
          className="sidebar"
          ref={navRef}
          aria-label="Navigation"
          inert={coveredBySplit}
        >
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
            {waitingBadge}
            <button
              className="icon-button"
              aria-label="Actualiser les missions"
              onClick={() => void history().catch(report)}
            >
              ↻
            </button>
          </div>
          <div className="mission-list">
            {/* Sub-missions leave the list (their mother shows her team); the full `runs` stays for the
                counter, Consumption, the history and the agent warning. */}
            {conversations(missionsDeLaListe(runs)).map(({ run: r, turns }) => {
              const team = resumeListe(r, runs);
              // A mission with a team: one activity mark, and its words are the row's only state text.
              const activity = team && activiteListe(r, team);
              return (
                <button
                  key={r.id}
                  className={
                    "mission-link " +
                    (run?.id === r.id && page === "mission" ? "active" : "")
                  }
                  onClick={() => void openRun(r.id)}
                >
                  <i
                    className={
                      "dot " + (activity ? POINT_ACTIVITE[activity] : r.state)
                    }
                    data-activite={team ? activity || "aucune" : undefined}
                  />
                  <span title={r.prompt}>
                    {/* Sous-mission orpheline (mère hors de la liste) : le titre que son chef lui a donné. */}
                    {r.famille?.titre || r.title || r.prompt}
                  </span>
                  {team ? (
                    <>
                      {!activity && (
                        <small className="sr-only">
                          {labels[r.state] || r.state}
                        </small>
                      )}
                      <small
                        className="team-summary"
                        title={texteResume(team, activity)}
                      >
                        {texteResume(team, activity)}
                      </small>
                    </>
                  ) : (
                    <>
                      <small
                        className={
                          finalStates.has(r.state) || ownerStates.has(r.state)
                            ? "sr-only"
                            : ""
                        }
                      >
                        {labels[r.state] || r.state}
                      </small>
                      {ownerStates.has(r.state) && (
                        <small
                          className="owner-turn"
                          title="À vous de répondre"
                        >
                          À vous
                        </small>
                      )}
                    </>
                  )}
                  {turns > 1 && <small className="turns">{turns} tours</small>}
                  {r.simulated && <small>fictif</small>}
                  {r.famille && (
                    // Icône des sous-agents (comme la ligne du fil) : le titre garde la place.
                    <small
                      className="subagent-tag"
                      title="Sous-agent d’une autre mission"
                    >
                      <Icon name="grid" />
                      <span className="sr-only">sous-agent</span>
                    </small>
                  )}
                </button>
              );
            })}
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
        inert={coveredBySplit}
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
              onClick={showSide}
            >
              <Icon name="side" />
            </button>
          )}
          {!side && waitingBadge}
          <strong>
            {page === "mission"
              ? run?.famille?.titre || run?.title || run?.prompt
              : titles[page]}
          </strong>
          {run && page === "mission" && (
            <span className="badge">{labels[run.state] || run.state}</span>
          )}
          <button
            className="icon-button panel-toggle"
            aria-label={panel ? "Masquer l’activité" : "Afficher l’activité"}
            aria-pressed={panel}
            onClick={() => showPanel(!panel)}
          >
            <Icon name="panel" />
          </button>
          <button
            className="icon-button theme-toggle"
            aria-label="Changer de thème"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Icon name="theme" />
          </button>
        </header>
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
              // Back at the bottom after the dock resized: « Revenir en bas » must go.
              if (el.scrollHeight - el.scrollTop - el.clientHeight <= 2)
                follow(e);
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
          {error && !inlineError && (
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
          {notice && (
            <p className="loading" role="status">
              {notice}
            </p>
          )}
          {loading && !catalog && (
            <p className="loading" role="status">
              Connexion au backend local…
            </p>
          )}
          {page === "home" && !starting && (
            <section className="home">
              <div className="home-inner">
                <h1>Que dois-je faire ?</h1>
                <p>
                  Décris une mission : elle part dès l’envoi. Les actions
                  sensibles demandent toujours ton accord.
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
          {starting && page === "home" && (
            <div className="thread">
              <PromptBubble text={starting} />
              <div className="launching" role="status">
                <span>Lancement de la mission…</span>
                <button onClick={() => launching.current?.abort()}>
                  Annuler le lancement
                </button>
              </div>
            </div>
          )}
          {page === "mission" && run && (
            <div className="thread">
              {/* meme-affichage-21-11 : une seule façon d'afficher une mission, career-ops compris
                  (consigne et résultat privés lus par leurs routes, offres enregistrées dans la réponse). */}
              <SessionHistory run={run} runs={runs} />
              <MissionPrompt
                key={run.id}
                run={run}
                immediatePrompt={
                  immediatePrompt?.id === run.id
                    ? immediatePrompt.text
                    : undefined
                }
              />
              {/* reponse-04 : une seule réponse, façon Claude Code. */}
              <RunTurn
                // Une mission = une réponse : lignes repliées à chaque mission ouverte.
                key={"reponse-" + run.id}
                run={avecDetailsDesLignes(run, runs)}
                events={events}
                busy={busy}
                act={action}
                incident={inlineError}
                connection={connection}
              />
              {delegationNote && (
                <p className="delegation-note">{delegationNote}</p>
              )}
              {/* sous-agents-19-11 : seulement si le back fournit la famille ; ouvre le panneau. */}
              <SubagentsLine
                family={run.family}
                onOpen={() => {
                  showPanel(true);
                  // Panel already open: the line still leads to the team.
                  requestAnimationFrame(() =>
                    document
                      .querySelector(".activity-panel .activity-team")
                      ?.scrollIntoView({ block: "start" }),
                  );
                }}
              />
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
                <Skills
                  catalog={catalog}
                  busy={busy}
                  act={action}
                  request={skillRequest}
                />
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
            {/* reponse-04 : bouton rond de 32 px, une flèche, sans texte. */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 3v10M3.5 8.5L8 13l4.5-4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
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
            waiting={ownerStates.has(run.state) || !!run.pendingQuestion}
            answer={(() => {
              const key = proseAnswerKey(run.pendingQuestion);
              if (!key) return undefined;
              const id = run.id;
              return (text: string) =>
                action(
                  `/runs/${id}/answer`,
                  { action: "accept", content: { [key]: text } },
                  true,
                );
            })()}
            send={async (text) => {
              const id = run.id;
              const sent = await sendOwnerMessage(id, text, api);
              if (sent.outcome === "sent") {
                rememberOwnerText(sent.id, text);
                return null;
              }
              // Mission over in the meantime, or older back: the text waits for a resume.
              setQueued((old) => [...old, { runId: id, text }]);
              const line =
                sent.reason === "ended"
                  ? ENDED_NOTICE
                  : "Envoi en direct indisponible sur ce serveur : votre message sera envoyé dans une reprise, à la fin de la mission";
              if (sent.reason === "ended") setNotice(line);
              return line;
            }}
          />
        )}
        {(page === "home" || page === "mission") && (
          <Composer
            scope={viewVersion.current}
            catalog={catalog}
            input={input}
            onChange={change}
            onPlan={() => void (canReply ? reply() : launch())}
            agentWarning={agentWarning(input.agent, catalog, runs)}
            busy={busy}
            disabled={page === "mission" && !canReply}
            working={runActive}
            reply={canReply}
            compact={
              (page === "home" && !!starting) ||
              (page === "mission" && composerCompact)
            }
            onOpen={() => setComposerCompact(false)}
            onManageSkills={() => go("skills")}
            sessionSettings={
              page === "mission" && run
                ? {
                    agent: run.agent,
                    model: run.model || "",
                    pack: run.pack,
                    // The snapshot lists the Skills the back actually loaded for this run.
                    skills: run.skillsSnapshot?.length
                      ? run.skillsSnapshot.map((s) => s.id)
                      : run.skills || [],
                  }
                : undefined
            }
          />
        )}
      </main>
      {sideRunId && page === "mission" && (
        <SidePane
          key={sideRunId}
          id={sideRunId}
          onClose={closeSide}
          onChanged={syncList}
          onOpenFull={(id) => {
            // Même fermeture que « Fermer » : la barre latérale que la vue avait effacée revient.
            closeSide();
            void openRun(id);
          }}
        />
      )}
      {panel && (
        <ActivityPanel
          catalog={catalog}
          run={
            page === "mission" && run ? avecDetailsDesLignes(run, runs) : null
          }
          events={page === "mission" ? events : []}
          onClose={() => {
            setPanel(false);
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLButtonElement>(".panel-toggle")
                ?.focus(),
            );
          }}
          details={stepDetails}
          setDetails={setStepDetails}
          onOpenRun={(id) => void openRun(id)}
          onCancelRun={(id) => void action(`/runs/${id}/cancel`, {})}
          onOpenSide={openSide}
          busy={busy}
        />
      )}
    </div>
  );
}
