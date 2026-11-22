import { useEffect, useState } from "react";
import { api } from "./api";
import { OwnerRequests, type Act } from "./OwnerRequests";
import type { FamilyMember, Run } from "./types";

// cartes-membres-22-11 : une carte qu'un membre de l'équipe attend (envoi à approuver, accord, question)
// se répond depuis la page de la mère, sans ouvrir la sous-mission (le propriétaire, 22/11 15:37 : « je ne
// peux pas appuyer, je n'ai pas de formulaire mis à disposition »). La carte est celle du serveur, lue sur
// `GET /api/runs/<membre>` (`permissions[]`, `pendingQuestion`) ; ses boutons et leur sens ne changent pas
// (`POST /api/permissions/<id>`, `POST /api/runs/<membre>/answer`).

const ATTENTES = new Set(["accord", "question", "carte_envoi"]);
const text = (value: unknown) => (typeof value === "string" ? value : "");
const idDe = (value: unknown) =>
  text((value as { id?: unknown } | null | undefined)?.id);

export function membreEnAttente(m: FamilyMember) {
  return (
    ATTENTES.has(text(m.attend)) ||
    !!m.pendingPermission ||
    !!m.pendingQuestion ||
    ["awaiting_owner", "waiting_permission"].includes(text(m.state))
  );
}
// Ce qui change quand la carte change : on relit alors le membre.
const signature = (m: FamilyMember) =>
  [
    m.id,
    text(m.state),
    text(m.attend),
    idDe(m.pendingPermission),
    idDe(m.pendingQuestion),
  ].join("|");

// « POST vers www.exemple.test » : méthode et site de l'envoi, jamais son corps.
export function ceQuiPart(run: Run) {
  for (const p of run.permissions ?? []) {
    const raw = (p.tool as { rawInput?: { args?: unknown; method?: unknown } })
      .rawInput;
    const args = (raw?.args ?? {}) as { url?: unknown; method?: unknown };
    const url = text(args.url);
    if (!url) continue;
    let site = "";
    try {
      site = new URL(url).host;
    } catch {
      continue;
    }
    const methode = text(args.method) || text(raw?.method);
    return `${methode ? methode.toUpperCase() + " " : ""}vers ${site}`;
  }
  return "";
}

export function MemberRequests({
  run,
  busy,
  act,
  onOpenMember,
}: {
  run: Run;
  busy: boolean;
  act: Act;
  onOpenMember?: (id: string) => void;
}) {
  const family = (Array.isArray(run.family) ? run.family : []).filter(
    (m): m is FamilyMember => !!m && typeof m.id === "string",
  );
  const attente = family.filter(membreEnAttente);
  const cle = attente.map(signature).join(";");
  const [lus, setLus] = useState<Record<string, Run | "erreur">>({});
  useEffect(() => {
    let vivant = true;
    for (const m of attente)
      api<Run>(`/runs/${m.id}`)
        .then((r) => vivant && setLus((old) => ({ ...old, [m.id]: r })))
        .catch(() => vivant && setLus((old) => ({ ...old, [m.id]: "erreur" })));
    return () => {
      vivant = false;
    };
    // `cle` résume les membres en attente et leur carte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  if (!attente.length) return null;
  return (
    <section
      className="membres-attente"
      aria-label="Sous-missions qui attendent ta réponse"
    >
      {attente.map((m) => {
        const lu = lus[m.id];
        const nom =
          text(m.etape?.libelle) || text(m.titre) || "Une sous-mission";
        const part = lu && lu !== "erreur" ? ceQuiPart(lu) : "";
        return (
          <div className="membre-attente" key={m.id}>
            <p className="membre-attente-titre">
              <strong>{nom}</strong>
              {text(m.attend) === "question"
                ? " attend ta réponse"
                : " attend ton accord"}
              {part ? ` : envoi ${part}` : ""}
            </p>
            {lu && lu !== "erreur" ? (
              <OwnerRequests run={lu} busy={busy} act={act} />
            ) : lu === "erreur" ? (
              <p className="muted">
                La carte de cette sous-mission n’a pas pu être lue.
                {onOpenMember && (
                  <>
                    {" "}
                    <button type="button" onClick={() => onOpenMember(m.id)}>
                      Ouvrir la sous-mission
                    </button>
                  </>
                )}
              </p>
            ) : (
              <p className="muted">Lecture de la carte…</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
