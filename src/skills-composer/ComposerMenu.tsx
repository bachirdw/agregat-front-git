import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { Catalog } from "../types";
import { readMissingField } from "./missing";

export type ComposerGroup = "Ajouter" | "Skills" | "Plugins";
type Props = {
  open: boolean;
  group?: ComposerGroup;
  focusOnOpen: boolean;
  disabled: boolean;
  filesDisabled: boolean;
  skills: Catalog["skills"];
  selected: string[];
  budget: string;
  fixedSettings: boolean;
  onToggle: (keyboard?: boolean) => void;
  onClose: () => void;
  onPickFile: () => void;
  onPickSkill: (id: string) => void;
  onManageSkills?: () => void;
  onSetting: (label: string) => void;
};

// Ces capacités n'ont pas encore de contrat backend. Elles restent explicitement indisponibles.
export function ComposerMenu(props: Props) {
  const {
    open,
    group,
    focusOnOpen,
    disabled,
    filesDisabled,
    skills,
    selected,
    fixedSettings,
  } = props;
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const openFromEnd = useRef(false);
  const plugins = readMissingField<unknown[]>("composer.plugins");
  const goal = readMissingField<boolean>("composer.goal");
  const saveSkill = readMissingField<boolean>("composer.saveSkill");
  const planMode = readMissingField<boolean>("composer.planMode");
  const quarantined = skills.filter(
    (skill) => skill.state === "quarantined",
  ).length;
  const focusableItems = () => [
    ...(menuRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[role^="menuitem"]:not(:disabled)',
    ) || []),
  ];
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!ref.current?.contains(event.target as Node)) props.onClose();
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      props.onClose();
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, props.onClose]);
  useLayoutEffect(() => {
    if (!open) return;
    const section =
      group &&
      menuRef.current?.querySelector<HTMLElement>(`[data-group="${group}"]`);
    section &&
      typeof section.scrollIntoView === "function" &&
      section.scrollIntoView({ block: "nearest" });
    if (focusOnOpen) {
      const items = focusableItems();
      (openFromEnd.current ? items.at(-1) : items[0])?.focus();
    }
  }, [open, focusOnOpen, group]);
  const keydown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = focusableItems();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowDown"
            ? (current + 1) % items.length
            : event.key === "ArrowUp"
              ? (current - 1 + items.length) % items.length
              : -1;
    if (next >= 0) {
      event.preventDefault();
      items[next]?.focus();
    } else if (event.key === "Tab") props.onClose();
  };
  const closeThen = (action: () => void) => {
    props.onClose();
    action();
  };
  const unavailable = (icon: string, label: string, field: unknown) => (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className="cp-menu-item"
      disabled
      data-backend-missing={field === undefined || undefined}
    >
      <span className="cp-menu-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="cp-menu-label">{label}</span>
      <span className="cp-menu-hint">Bientôt</span>
    </button>
  );
  return (
    <div ref={ref} className="cp-add">
      <button
        type="button"
        ref={triggerRef}
        className="cp-add-button"
        aria-label="Ajouter"
        aria-haspopup="menu"
        aria-controls={open ? id : undefined}
        aria-expanded={open}
        disabled={disabled}
        onClick={(event) => {
          openFromEnd.current = false;
          props.onToggle(event.detail === 0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              openFromEnd.current = event.key === "ArrowUp";
              props.onToggle(true);
            } else
              (event.key === "ArrowUp"
                ? focusableItems().at(-1)
                : focusableItems()[0]
              )?.focus();
          }
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M8 3v10M3 8h10" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          id={id}
          className="cp-menu"
          role="menu"
          aria-label="Ajouter à la mission"
          data-shortcut-group={group}
          data-keyboard={focusOnOpen || !!group}
          onKeyDown={keydown}
        >
          <div
            className="cp-menu-group"
            role="group"
            aria-label="Ajouter"
            data-group="Ajouter"
          >
            <div className="cp-menu-title" aria-hidden="true">
              Ajouter
            </div>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="cp-menu-item"
              aria-label="Fichiers et dossiers"
              disabled={filesDisabled}
              onClick={() => closeThen(props.onPickFile)}
            >
              <span className="cp-menu-icon" aria-hidden="true">
                ⌘
              </span>
              <span className="cp-menu-label">Fichiers et dossiers</span>
              <span className="cp-menu-hint" />
              <span className="cp-menu-end">#</span>
            </button>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="cp-menu-item"
              disabled={fixedSettings}
              onClick={() => closeThen(() => props.onSetting("Pack"))}
            >
              <span className="cp-menu-icon" aria-hidden="true">
                ◇
              </span>
              <span className="cp-menu-label">Domain Pack</span>
              <span className="cp-menu-hint">Choisir dans les réglages</span>
            </button>
            {unavailable("◉", "Objectif", goal)}
            {unavailable("☼", "Mode plan", planMode)}
            {unavailable("●", "Enregistrer en Skill", saveSkill)}
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="cp-menu-item"
              disabled={fixedSettings}
              onClick={() => closeThen(() => props.onSetting("Budget maximum"))}
            >
              <span className="cp-menu-icon" aria-hidden="true">
                €
              </span>
              <span className="cp-menu-label">Budget max</span>
              <span className="cp-menu-hint">Plafond de la mission</span>
              <span className="cp-menu-end">{props.budget}</span>
            </button>
          </div>
          <div
            className="cp-menu-group"
            role="group"
            aria-label="Skills"
            data-group="Skills"
          >
            <div className="cp-menu-title" aria-hidden="true">
              Skills
            </div>
            {!skills.length && (
              <p className="cp-menu-empty">Aucun Skill disponible.</p>
            )}
            {skills.map((skill) => {
              const checked = selected.includes(skill.id);
              const ready = skill.active && skill.integrity;
              const description = skill.description;
              return (
                <button
                  key={skill.id}
                  type="button"
                  role="menuitemcheckbox"
                  tabIndex={-1}
                  className="cp-menu-item"
                  aria-label={skill.name}
                  aria-checked={checked}
                  disabled={disabled || fixedSettings || !ready}
                  onClick={() => props.onPickSkill(checked ? "" : skill.id)}
                >
                  <span
                    className="cp-menu-icon cp-menu-check"
                    aria-hidden="true"
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span className="cp-menu-label">{skill.name}</span>
                  <span className="cp-menu-hint">
                    {!ready
                      ? "À activer dans Skills"
                      : description || "Description non fournie"}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="cp-menu-item"
              disabled={!props.onManageSkills}
              onClick={() => closeThen(() => props.onManageSkills?.())}
            >
              <span className="cp-menu-icon" aria-hidden="true">
                +
              </span>
              <span className="cp-menu-label">Gérer les Skills</span>
              <span className="cp-menu-hint">
                {quarantined > 0 ? `${quarantined} en quarantaine` : ""}
              </span>
              <span className="cp-menu-end">/</span>
            </button>
          </div>
          <div
            className="cp-menu-group"
            role="group"
            aria-label="Plugins"
            data-group="Plugins"
          >
            <div className="cp-menu-title" aria-hidden="true">
              Plugins
            </div>
            {unavailable("+", "Ajouter un plugin", plugins)}
          </div>
        </div>
      )}
    </div>
  );
}
