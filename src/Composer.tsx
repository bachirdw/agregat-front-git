import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Attachment, Catalog, MissionInput } from "./types";
import { ATTACHMENT_MAX_COUNT, uploadFile } from "./api";
import { money } from "./types";
import { Icon } from "./Icon";
function size(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
// "+" menu next to the prompt: attach a file (CV…), uploaded at once to POST /api/files.
function AttachMenu({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: () => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node))
        ref.current?.removeAttribute("open");
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <details className="filter attach-menu" ref={ref}>
      <summary
        aria-label="Ajouter"
        onClick={(e) => disabled && e.preventDefault()}
        aria-disabled={disabled}
      >
        <Icon name="plus" />
      </summary>
      <div className="popover" role="menu">
        <button
          type="button"
          role="menuitem"
          disabled={disabled}
          onClick={() => {
            ref.current?.removeAttribute("open");
            onPick();
          }}
        >
          Ajouter un fichier
        </button>
        <small>PDF, DOCX, Markdown ou texte · 10 Mo max.</small>
      </div>
    </details>
  );
}
function Filter({
  name,
  value,
  children,
}: {
  name: string;
  value: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node))
        ref.current?.removeAttribute("open");
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <details className="filter" ref={ref}>
      <summary aria-label={`${name} ${value}`}>
        <span>{name}</span> <strong>{value}</strong>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="popover">
        <strong>{name}</strong>
        {children}
      </div>
    </details>
  );
}
export function Composer({
  catalog,
  input,
  onChange,
  onPlan,
  busy,
  disabled = false,
  working = false,
  reply = false,
  scope = 0,
  compact = false,
  onOpen,
  sessionSettings,
}: {
  catalog: Catalog | null;
  input: MissionInput;
  onChange: (input: MissionInput) => void;
  onPlan: () => void;
  busy: boolean;
  disabled?: boolean;
  working?: boolean;
  reply?: boolean;
  scope?: number;
  compact?: boolean;
  onOpen?: () => void;
  sessionSettings?: { agent: string; model: string; pack: string };
}) {
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<() => void>(() => {});
  measureRef.current = () => {
    const area = promptRef.current;
    if (!area) return;
    area.style.height = "auto";
    if (!area.value || compact) {
      area.style.overflowY = "hidden";
      return;
    }
    const visibleHeight = window.visualViewport?.height || window.innerHeight;
    const maxHeight = Math.max(100, Math.floor(visibleHeight * 0.4));
    const wanted = area.scrollHeight;
    area.style.height = `${Math.min(wanted, maxHeight)}px`;
    area.style.overflowY = wanted > maxHeight ? "auto" : "hidden";
  };
  useLayoutEffect(
    () => measureRef.current(),
    [input.prompt, compact, reply, disabled],
  );
  useEffect(() => {
    const resize = () => measureRef.current();
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const attachments = input.attachments || [];
  // Latest input for uploads that finish after other edits.
  const latest = useRef(input);
  latest.current = input;
  const uploadScope = useRef(scope);
  uploadScope.current = scope;
  useEffect(
    () => () => {
      uploadScope.current = Number.NaN;
    },
    [],
  );
  const addFiles = async (files: FileList | File[]) => {
    const requestedIn = uploadScope.current;
    setFileError("");
    const list = [...files];
    if (attachments.length + list.length > ATTACHMENT_MAX_COUNT) {
      setFileError(`${ATTACHMENT_MAX_COUNT} fichiers maximum par mission.`);
      return;
    }
    for (const file of list) {
      if (uploadScope.current !== requestedIn) break;
      setUploading((n) => n + 1);
      try {
        const added: Attachment = await uploadFile(file);
        if (uploadScope.current !== requestedIn) break;
        const now = latest.current;
        onChange({ ...now, attachments: [...(now.attachments || []), added] });
      } catch (e) {
        setFileError(`${file.name} : ${(e as Error).message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };
  useEffect(() => {
    const over = (event: globalThis.DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = disabled ? "none" : "copy";
      setDragging(!disabled);
    };
    const drop = (event: globalThis.DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      setDragging(false);
      if (disabled) {
        setFileError(
          "Terminez la mission ou créez-en une nouvelle pour joindre ce fichier.",
        );
        return;
      }
      if (event.dataTransfer.files.length)
        void addFiles(event.dataTransfer.files);
    };
    const leave = (event: globalThis.DragEvent) => {
      if (!event.relatedTarget) setDragging(false);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    window.addEventListener("dragleave", leave);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
      window.removeEventListener("dragleave", leave);
    };
  });
  const [budget, setBudget] = useState(String(input.budgetCents / 100));
  useEffect(
    () => setBudget(String(input.budgetCents / 100)),
    [input.budgetCents],
  );
  const set = (patch: Partial<MissionInput>) =>
    onChange({ ...input, ...patch });
  const agent = catalog?.agents.find((a) => a.id === input.agent);
  const models = agent?.probe?.models || [];
  const pack = catalog?.packs.find((p) => p.id === input.pack);
  const workflows = pack?.dags || catalog?.packs.flatMap((p) => p.dags) || [];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (input.prompt.trim() && !busy && !uploading && !disabled && catalog)
      onPlan();
  };
  return (
    <div className="composer-dock">
      <form
        className={"composer" + (dragging ? " dragging" : "")}
        data-compact={compact}
        onSubmit={submit}
        onClick={() => {
          if (compact) onOpen?.();
        }}
        aria-label="Préparer une mission"
      >
        <input
          ref={fileRef}
          type="file"
          hidden
          disabled={disabled}
          multiple
          accept=".pdf,.docx,.md,.markdown,.txt"
          aria-label="Fichier à joindre"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {(attachments.length > 0 || uploading > 0 || fileError) && (
          <div className="attachments" aria-live="polite">
            {attachments.map((a) => (
              <span className="chip" key={a.id}>
                <span>{a.name}</span>
                <small>{size(a.size)}</small>
                <button
                  type="button"
                  aria-label={`Retirer ${a.name}`}
                  onClick={() =>
                    set({
                      attachments: attachments.filter((x) => x.id !== a.id),
                    })
                  }
                >
                  <Icon name="close" />
                </button>
              </span>
            ))}
            {uploading > 0 && (
              <span className="chip pending">Envoi du fichier…</span>
            )}
            {fileError && (
              <span className="chip error" role="alert">
                {fileError}
              </span>
            )}
          </div>
        )}
        <textarea
          id="prompt"
          ref={promptRef}
          aria-label="Objectif de la mission"
          placeholder={
            reply
              ? "Répondre à l’agent…"
              : disabled
                ? working
                  ? "L’agent travaille…"
                  : "Créez une nouvelle mission pour poursuivre"
                : "Décrivez votre objectif…"
          }
          value={disabled ? "" : input.prompt}
          rows={reply || compact || sessionSettings ? 1 : 3}
          disabled={disabled}
          maxLength={8000}
          onFocus={onOpen}
          onChange={(e) => {
            onOpen?.();
            set({ prompt: e.target.value });
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        {compact && disabled && (
          <button className="compact-expand" type="button" onClick={onOpen}>
            Afficher les réglages
          </button>
        )}
        {sessionSettings && !compact && (
          <div className="session-settings" aria-label="Réglages de la mission">
            <span>Agent · {sessionSettings.agent}</span>
            <span>Modèle · {sessionSettings.model || "Défaut"}</span>
            <span>Pack · {sessionSettings.pack}</span>
            <span>Skills · non transmis</span>
            <small>Réglages de cette session</small>
          </div>
        )}
        <div className="composer-bottom">
          <AttachMenu
            disabled={disabled || uploading > 0}
            onPick={() => fileRef.current?.click()}
          />
          {!reply && (
            <div className="filters" aria-hidden={compact}>
              <Filter name="Agent" value={agent?.name || "Auto"}>
                <label>
                  Agent d’exécution
                  <select
                    aria-label="Agent"
                    value={input.agent}
                    disabled={disabled || !catalog}
                    onChange={(e) => set({ agent: e.target.value, model: "" })}
                  >
                    <option value="auto">Auto · selon les capacités</option>
                    {catalog?.agents.map((a) => (
                      <option
                        key={a.id}
                        value={a.id}
                        disabled={
                          !a.installed ||
                          !a.compatible ||
                          (!catalog.live && !a.simulated)
                        }
                      >
                        {a.name}
                        {!a.compatible ? " · indisponible" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {catalog?.live
                    ? "Agents de votre machine, comptes BYOA."
                    : "Démonstration locale · aucun modèle appelé."}
                </small>
              </Filter>
              <Filter name="Modèle" value={input.model || "Défaut"}>
                <label>
                  Modèle annoncé
                  <select
                    aria-label="Modèle"
                    value={input.model}
                    disabled={disabled || !catalog?.live || !models.length}
                    onChange={(e) => set({ model: e.target.value })}
                  >
                    <option value="">Défaut du fournisseur</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {models.length
                    ? "Annoncés au dernier test de session."
                    : "Aucun modèle connu pour cet agent. Choisissez un agent réel testé."}
                </small>
              </Filter>
              <Filter name="Skills" value={String(input.skills.length)}>
                {catalog?.skills.map((s) => (
                  <label className="check" key={s.id}>
                    <input
                      type="checkbox"
                      checked={input.skills.includes(s.id)}
                      disabled={disabled || !s.active || !s.integrity}
                      onChange={(e) =>
                        set({
                          skills: e.target.checked
                            ? [...input.skills, s.id]
                            : input.skills.filter((id) => id !== s.id),
                        })
                      }
                    />
                    <span>
                      {s.name}
                      <small>
                        {s.active && s.integrity
                          ? "Actif"
                          : "À installer ou activer dans Skills"}
                      </small>
                    </span>
                  </label>
                ))}
                {!catalog?.skills.length && (
                  <small>Aucun Skill disponible.</small>
                )}
              </Filter>
              <Filter name="Pack" value={pack?.name || "Auto"}>
                <label>
                  Domain Pack
                  <select
                    aria-label="Pack"
                    value={input.pack}
                    disabled={disabled}
                    onChange={(e) =>
                      set({
                        pack: e.target.value,
                        workflow: "auto",
                        ...(e.target.value === "career-ops"
                          ? { agent: "gemini", model: "" }
                          : {}),
                      })
                    }
                  >
                    <option value="auto">Auto · selon l’objectif</option>
                    {catalog?.packs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {pack?.description || "Le plan expliquera le pack retenu."}
                </small>
              </Filter>
              <Filter
                name="Mode"
                value={input.mode === "workflow" ? "Workflow" : "Agent unique"}
              >
                <label>
                  Exécution
                  <select
                    aria-label="Mode"
                    value={input.mode}
                    disabled={disabled}
                    onChange={(e) =>
                      set({ mode: e.target.value as MissionInput["mode"] })
                    }
                  >
                    <option value="agent">Agent unique</option>
                    <option value="workflow">Workflow DAG</option>
                  </select>
                </label>
                <small>Le workflow conserve les étapes et leurs accords.</small>
              </Filter>
              {input.mode === "workflow" && (
                <Filter
                  name="Workflow"
                  value={
                    input.workflow === "auto"
                      ? "Auto"
                      : workflows.find((w) => w.id === input.workflow)?.title ||
                        "Auto"
                  }
                >
                  <label>
                    Recette
                    <select
                      aria-label="Workflow"
                      value={input.workflow}
                      disabled={disabled}
                      onChange={(e) => set({ workflow: e.target.value })}
                    >
                      <option value="auto">
                        Auto · proposé selon l’objectif
                      </option>
                      {workflows.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </Filter>
              )}
              <Filter name="Navigateur" value="Selon serveur">
                <small>
                  Le backend définit le navigateur. Le plan indique s’il est
                  simulé ou réel.
                </small>
                <button type="button" disabled>
                  Choisir un navigateur · bientôt
                </button>
              </Filter>
              <Filter
                name="Budget"
                value={money(input.budgetCents, catalog?.pricing.currency)}
              >
                <label>
                  Budget maximum (unités de devise)
                  <input
                    type="number"
                    aria-label="Budget maximum"
                    min="0"
                    max="1000"
                    step="0.01"
                    value={budget}
                    disabled={disabled}
                    onChange={(e) => {
                      setBudget(e.target.value);
                      const n = Number(e.target.value);
                      if (Number.isFinite(n) && n >= 0 && n <= 1000)
                        set({ budgetCents: Math.round(n * 100) });
                    }}
                  />
                </label>
                <small>
                  Devise : {catalog?.pricing.currency || "EUR"}. Le coût
                  fournisseur BYOA est inconnu et non refacturé.
                </small>
              </Filter>
            </div>
          )}
          <button
            className="send primary"
            type="submit"
            aria-label={reply ? "Envoyer la réponse" : "Préparer le plan"}
            disabled={
              busy ||
              uploading > 0 ||
              disabled ||
              !catalog ||
              !input.prompt.trim()
            }
          >
            {busy ? "…" : <Icon name="arrow" />}
          </button>
        </div>
      </form>
      <small className="composer-note">
        {reply
          ? "Votre réponse relance la même session de l’agent, avec son historique."
          : disabled
            ? "Cette mission ne peut pas être poursuivie. Créez une nouvelle mission."
            : "L’envoi prépare d’abord un plan. Rien n’est exécuté sans votre accord."}
      </small>
    </div>
  );
}
