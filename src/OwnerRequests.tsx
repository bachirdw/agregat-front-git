import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { finalStates } from "./types";
import { Markdown } from "./Markdown";
import {
  AttachButton,
  FileChips,
  filesText,
  useAttachedFiles,
} from "./AttachFiles";
import type {
  Permission,
  Question,
  QuestionField,
  Run,
  RunEvent,
} from "./types";

export type Act = (
  path: string,
  body: unknown,
  throwOnError?: boolean,
) => Promise<void>;

// What the back asks the owner while a mission waits: a one-off agreement (a final send among
// them, docs/api-sends.md) and the agent's question (docs/api-questions.md).
export function OwnerRequests({
  run,
  busy,
  act,
}: {
  run: Run;
  busy: boolean;
  act: Act;
}) {
  return (
    <>
      {run.pendingQuestion && (
        <QuestionForm
          key={run.pendingQuestion.id}
          runId={run.id}
          question={run.pendingQuestion}
          busy={busy}
          act={act}
        />
      )}
      {run.permissions?.map((p) => (
        <PermissionCard key={p.id} permission={p} busy={busy} act={act} />
      ))}
    </>
  );
}

const expiring = (p: Permission) => Number.isFinite(p.expiresAt);
// ACP tool kinds, said simply; any other value (a tool name, « other ») stays in the technical fold.
const capabilityLabels: Record<string, string> = {
  read: "lecture",
  edit: "modification de fichier",
  delete: "suppression",
  move: "déplacement de fichier",
  search: "recherche",
  execute: "commande sur ta machine",
  fetch: "accès au web",
};

// The owner's mission agreement (`send_grant`) holds until the mission ends; there is no route
// to take it back, so nothing here offers to.
export const missionGrantActive = (events: RunEvent[], state: string) =>
  !finalStates.has(state) && events.some((e) => e.type === "send_grant");
export const MISSION_GRANT_NOTICE =
  "Accord de mission actif : les envois partent sans demande";

function PermissionCard({
  permission: p,
  busy,
  act,
}: {
  permission: Permission;
  busy: boolean;
  act: Act;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiring(p)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [p]);
  const send = p.actionClass === "send";
  const expired = expiring(p) && now >= (p.expiresAt as number);
  const title = send ? "Envoi à approuver" : "Permission agent";
  // Offered by the back on some send cards: one click for every later send of this mission.
  const mission = p.options.find((o) => o.kind === "allow_mission");
  return (
    <section className="card approval" aria-label={title}>
      <div className="card-pad">
        <small className="warning">
          {send
            ? mission
              ? "Rien ne part sans votre clic · un envoi, ou toute la mission si vous l’autorisez"
              : "Rien ne part sans votre clic · un seul envoi"
            : "Votre accord est requis · permission ponctuelle"}
        </small>
        <h2>{p.tool.title || (send ? "Envoi" : "Autorisation agent")}</h2>
        {capabilityLabels[p.capability ?? ""] ? (
          <p className="request-meta">
            Type d’action : {capabilityLabels[p.capability ?? ""]}
          </p>
        ) : (
          p.capability &&
          p.capability !== "other" && (
            <p className="request-meta">
              Outil : <code>{p.capability}</code>
            </p>
          )
        )}
        {!send && (
          <details className="fold">
            <summary>Détails techniques</summary>
            <pre>{JSON.stringify(p.tool, null, 2)}</pre>
          </details>
        )}
        <small role="timer">
          {expiring(p)
            ? expired
              ? "Accord expiré"
              : `Expire dans ${Math.ceil(((p.expiresAt as number) - now) / 1000)} s`
            : send
              ? "Sans délai : la mission attend votre décision."
              : "Une permission expirée est refusée par le serveur."}
        </small>
      </div>
      <footer>
        {p.options
          .filter((o) =>
            ["allow_once", "reject_once", "reject_always"].includes(o.kind),
          )
          .map((o) => (
            <button
              key={o.optionId}
              className={o.kind === "allow_once" ? "primary" : ""}
              disabled={busy || expired}
              onClick={() =>
                void act(`/permissions/${p.id}`, { optionId: o.optionId })
              }
            >
              {send
                ? o.kind === "allow_once"
                  ? "Approuver l’envoi"
                  : o.kind === "reject_always"
                    ? "Refuser toujours"
                    : "Refuser"
                : o.name}
            </button>
          ))}
        {mission && (
          <>
            <button
              className="mission-grant"
              aria-describedby={`mission-grant-note-${p.id}`}
              disabled={busy || expired}
              onClick={() =>
                void act(`/permissions/${p.id}`, {
                  optionId: mission.optionId,
                })
              }
            >
              {mission.name}
            </button>
            <small
              className="mission-grant-note"
              id={`mission-grant-note-${p.id}`}
            >
              Un clic ici : tous les envois suivants de cette mission partiront
              sans nouvelle demande, quel que soit le site, et seront listés au
              Bilan.
            </small>
          </>
        )}
      </footer>
    </section>
  );
}

type Value = string | boolean | string[] | undefined;

function choices(field: QuestionField) {
  if (field.oneOf) return field.oneOf.map((o) => [o.const, o.title || o.const]);
  if (field.enum) return field.enum.map((v) => [v, v]);
  if (field.items?.anyOf)
    return field.items.anyOf.map((o) => [o.const, o.title || o.const]);
  if (field.items?.enum) return field.items.enum.map((v) => [v, v]);
  return [];
}

// Only the fields the owner filled are sent (the back checks the schema and answers 400).
function content(question: Question, values: Record<string, Value>) {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(
    question.requestedSchema.properties,
  )) {
    const value = values[key];
    if (value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] =
      field.type === "number" || field.type === "integer"
        ? Number(value)
        : value;
  }
  return out;
}

function QuestionForm({
  runId,
  question,
  busy,
  act,
}: {
  runId: string;
  question: Question;
  busy: boolean;
  act: Act;
}) {
  const [values, setValues] = useState<Record<string, Value>>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  // joindre-23-11 : fichiers joints à la réponse (contrat joindre-01 : `content` et `attachments` ensemble).
  const attached = useAttachedFiles();
  const required = new Set(question.requestedSchema.required || []);
  const fields = Object.entries(question.requestedSchema.properties);
  const set = (key: string, value: Value) =>
    setValues((old) => ({ ...old, [key]: value }));
  const reply = async (body: unknown) => {
    setError("");
    setSending(true);
    try {
      await act(`/runs/${runId}/answer`, body, true);
      attached.clear();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const files = attached.files;
    const answer = content(question, values);
    // Question en texte libre laissée vide avec un fichier : le nom du fichier sert de réponse.
    const first = fields[0]?.[0];
    if (files.length && question.kind === "prose" && first && !answer[first])
      answer[first] = filesText(files);
    void reply({
      action: "accept",
      content: answer,
      ...(files.length ? { attachments: files.map((f) => f.id) } : {}),
    });
  };
  const disabled = busy || sending || attached.uploading;
  return (
    <form
      className="card approval question"
      aria-label="Question de l’agent"
      onSubmit={submit}
    >
      <div className="card-pad">
        <small className="warning" role="status">
          L’agent attend votre réponse
        </small>
        {/* affichage-23-11 : la question de l'agent est du Markdown (« **À votre avis…** ») ; en titre
            brut, ses signes s'affichaient tels quels. */}
        <div className="question-message">
          <Markdown text={question.message} />
        </div>
        {question.kind === "prose" && !!question.options?.length && (
          <div className="quick-replies">
            {question.options.map((option) => (
              <button
                type="button"
                key={option}
                disabled={disabled}
                onClick={() =>
                  void reply({
                    action: "accept",
                    content: {
                      [fields[0]?.[0] || "reponse"]: option,
                    },
                  })
                }
              >
                {option}
              </button>
            ))}
          </div>
        )}
        {fields.map(([key, field]) => (
          <Field
            key={key}
            name={key}
            field={field}
            // Un fichier joint suffit à répondre à une question en texte libre.
            required={
              required.has(key) &&
              !(question.kind === "prose" && attached.files.length > 0)
            }
            long={question.kind === "prose"}
            value={values[key]}
            set={(value) => set(key, value)}
          />
        ))}
        <FileChips attached={attached} />
        {(error || attached.error) && (
          <p className="danger" role="alert">
            {error || attached.error}
          </p>
        )}
      </div>
      <footer>
        <button type="submit" className="primary" disabled={disabled}>
          Répondre
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void reply({ action: "decline" })}
        >
          Décliner
        </button>
        <AttachButton
          attached={attached}
          disabled={disabled}
          className="question-attach"
          inputLabel="Fichier à joindre à la réponse"
        >
          {attached.uploading ? "Envoi du fichier…" : "Joindre un fichier"}
        </AttachButton>
      </footer>
    </form>
  );
}

function Field({
  name,
  field,
  required,
  long,
  value,
  set,
}: {
  name: string;
  field: QuestionField;
  required: boolean;
  long: boolean;
  value: Value;
  set: (value: Value) => void;
}) {
  const id = `question-${name}`;
  const label = (
    <>
      {field.title || name}
      {required && <span aria-hidden="true"> *</span>}
    </>
  );
  if (field.type === "boolean")
    return (
      <label className="question-field toggle" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={value === true}
          onChange={(e) => set(e.target.checked)}
        />
        {label}
      </label>
    );
  if (field.type === "array") {
    const picked = Array.isArray(value) ? value : [];
    return (
      <fieldset className="question-field">
        <legend>{label}</legend>
        {choices(field).map(([v, title]) => (
          <label key={v}>
            <input
              type="checkbox"
              checked={picked.includes(v)}
              onChange={(e) =>
                set(
                  e.target.checked
                    ? [...picked, v]
                    : picked.filter((x) => x !== v),
                )
              }
            />
            {title}
          </label>
        ))}
      </fieldset>
    );
  }
  const options = choices(field);
  const text = typeof value === "string" ? value : "";
  return (
    <label className="question-field" htmlFor={id}>
      <span>{label}</span>
      {field.description && <small>{field.description}</small>}
      {options.length ? (
        <select
          id={id}
          required={required}
          value={text}
          onChange={(e) => set(e.target.value)}
        >
          <option value="">Choisir…</option>
          {options.map(([v, title]) => (
            <option key={v} value={v}>
              {title}
            </option>
          ))}
        </select>
      ) : field.type === "number" || field.type === "integer" ? (
        <input
          id={id}
          type="number"
          required={required}
          min={field.minimum}
          max={field.maximum}
          step={field.type === "integer" ? 1 : "any"}
          value={text}
          onChange={(e) => set(e.target.value)}
        />
      ) : long || (field.maxLength ?? 0) > 200 ? (
        <textarea
          id={id}
          required={required}
          maxLength={field.maxLength}
          rows={3}
          value={text}
          onChange={(e) => set(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type="text"
          required={required}
          maxLength={field.maxLength}
          value={text}
          onChange={(e) => set(e.target.value)}
        />
      )}
    </label>
  );
}
