import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Permission, Question, QuestionField, Run } from "./types";

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
  return (
    <section className="card approval" aria-label={title}>
      <div className="card-pad">
        <small className="warning">
          {send
            ? "Rien ne part sans votre clic · un seul envoi"
            : "Votre accord est requis · permission ponctuelle"}
        </small>
        <h2>{p.tool.title || (send ? "Envoi" : "Autorisation agent")}</h2>
        {p.capability && (
          <p className="request-meta">
            Outil : <code>{p.capability}</code>
          </p>
        )}
        {!send && <pre>{JSON.stringify(p.tool, null, 2)}</pre>}
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
  const required = new Set(question.requestedSchema.required || []);
  const set = (key: string, value: Value) =>
    setValues((old) => ({ ...old, [key]: value }));
  const reply = async (body: unknown) => {
    setError("");
    setSending(true);
    try {
      await act(`/runs/${runId}/answer`, body, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void reply({ action: "accept", content: content(question, values) });
  };
  const disabled = busy || sending;
  const fields = Object.entries(question.requestedSchema.properties);
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
        <h2>{question.message}</h2>
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
            required={required.has(key)}
            long={question.kind === "prose"}
            value={values[key]}
            set={(value) => set(key, value)}
          />
        ))}
        {error && (
          <p className="danger" role="alert">
            {error}
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
