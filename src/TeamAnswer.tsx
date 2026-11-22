import type { ReactNode } from "react";
import { isPlatform, items as splitList } from "./Bilan";
import { Markdown } from "./Markdown";
import type { FamilyMember, Run, RunEvent } from "./types";

// equipe-lisible-22-11 : réponse d'une mission en équipe lisible sans connaître les outils (demande du
// propriétaire, mission 2da0cae5). Tout vient des champs du back (`family[]` de `GET /api/runs/:id?equipe=1`,
// `famille.reprend` des lignes de `GET /api/runs`, événement `usage` de la mère, `result.summary`) : un champ
// absent n'affiche pas sa ligne. Les textes rapportés par un agent restent du texte brut.

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;
const text = (value: unknown) => (typeof value === "string" ? value : "");

// « 29 min », « 45 s », « 1 h 05 » : durée d'une mission.
export function dureeMission(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}
// « 11 min 32 s » : durée d'une tâche.
export function dureeTache(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min < 60) return sec ? `${min} min ${sec} s` : `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}
const chiffres = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// « 3,03 USD »
export const montant = (n: number, devise: string) =>
  `${chiffres.format(n)} ${devise}`;
// Coût annoncé par un agent (`usage.cout`), ou null.
export function coutDe(
  usage: unknown,
): { montant: number; devise: string } | null {
  const cout = (
    usage as { cout?: { montant?: unknown; devise?: unknown } } | null
  )?.cout;
  const n = cout?.montant;
  const devise = text(cout?.devise);
  return typeof n === "number" && Number.isFinite(n) && devise
    ? { montant: n, devise }
    : null;
}
const dernierUsage = (events: RunEvent[]) => {
  for (let i = events.length - 1; i >= 0; i--)
    if (events[i].type === "usage") return events[i].data;
  return undefined;
};
// Somme des coûts annoncés (mère comprise), par devise ; « au moins » si un agent n'annonce rien.
export function coutAnnonce(
  run: Run,
  events: RunEvent[],
): { texte: string; auMoins: boolean } | null {
  const family = membresDe(run);
  const totals = new Map<string, number>();
  let manque = false;
  for (const usage of [dernierUsage(events), ...family.map((m) => m.usage)]) {
    const c = coutDe(usage);
    if (!c) {
      manque = true;
      continue;
    }
    totals.set(c.devise, (totals.get(c.devise) ?? 0) + c.montant);
  }
  if (!totals.size) return null;
  return {
    texte: [...totals].map(([devise, n]) => montant(n, devise)).join(" + "),
    auMoins: manque,
  };
}

export const membresDe = (run: Run): FamilyMember[] =>
  (Array.isArray(run.family) ? run.family : []).filter(
    (m): m is FamilyMember => !!m && typeof m.id === "string",
  );

// Une tâche = une première tentative et ses reprises (`reprend`, en chaîne) : une reprise remplace sa
// première tentative dans le compte, elle ne s'y ajoute pas.
export type Tache = { premiere: FamilyMember; reprises: FamilyMember[] };
export function tachesDe(family: FamilyMember[]): Tache[] {
  const byId = new Map(family.map((m) => [m.id, m]));
  const racine = (m: FamilyMember) => {
    let current = m;
    const vus = new Set<string>();
    while (
      current.reprend &&
      byId.has(current.reprend) &&
      !vus.has(current.id)
    ) {
      vus.add(current.id);
      current = byId.get(current.reprend)!;
    }
    return current;
  };
  const taches = new Map<string, Tache>();
  for (const m of family)
    if (racine(m).id === m.id) taches.set(m.id, { premiere: m, reprises: [] });
  for (const m of family) {
    const r = racine(m);
    if (r.id !== m.id) taches.get(r.id)?.reprises.push(m);
  }
  return [...taches.values()];
}
export const derniere = (t: Tache) => t.reprises.at(-1) ?? t.premiere;

export type Etat = "ok" | "echec" | "annulee" | "encours";
export function etatDe(state?: string): Etat {
  if (state === "completed") return "ok";
  if (state === "failed" || state === "interrupted") return "echec";
  if (state === "cancelled") return "annulee";
  return "encours";
}
export function motEtat(state?: string) {
  if (state === "interrupted") return "Interrompue";
  return {
    ok: "Terminée",
    echec: "En échec",
    annulee: "Annulée",
    encours: "En cours",
  }[etatDe(state)];
}

// « 4 tâches : 2 terminées, 2 non abouties »
export function phraseTaches(taches: Tache[]) {
  let ok = 0;
  let cours = 0;
  let non = 0;
  for (const t of taches) {
    const e = etatDe(derniere(t).state);
    if (e === "ok") ok++;
    else if (e === "encours") cours++;
    else non++;
  }
  const parts = [
    ok ? plural(ok, "terminée", "terminées") : "",
    cours ? `${cours} en cours` : "",
    non ? plural(non, "non aboutie", "non abouties") : "",
  ].filter(Boolean);
  return `${plural(taches.length, "tâche", "tâches")} : ${parts.join(", ")}`;
}

export const heure = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};
// « Annulée par vous à 12:36 », « Terminée à 12:36 », « En échec à 12:36 : … », « En cours ».
export function ligneEtat(run: Run, erreur = "") {
  const h = run.finishedAt ? heure(run.finishedAt) : "";
  const a = h ? ` à ${h}` : "";
  switch (run.state) {
    case "completed":
      return `Terminée${a}`;
    case "cancelled":
      return /^Annulée par l[’']utilisateur/.test(run.error ?? "")
        ? `Annulée par vous${a}`
        : `Annulée${a}`;
    case "failed":
      return `En échec${a}` + (erreur ? ` : ${erreur}` : "");
    case "interrupted":
      return `Interrompue${a}` + (erreur ? ` : ${erreur}` : "");
    case "awaiting_owner":
    case "waiting_permission":
      return "Attend votre réponse";
    default:
      return "En cours";
  }
}
export function dureeDeLaMission(run: Run, now = Date.now()) {
  const debut = Date.parse(run.createdAt ?? "");
  const fin = run.finishedAt ? Date.parse(run.finishedAt) : now;
  return Number.isFinite(debut) && Number.isFinite(fin) && fin >= debut
    ? dureeMission(fin - debut)
    : "";
}

// La réponse de l'agent principal, puis tout ce que la plateforme ajoute (Bilan, sous-missions, totaux…).
export function partiesDuResume(
  summary: string,
  answer?: string,
  notes?: string[],
): { avertissements: string[]; reponse: string; technique: string } {
  if (Array.isArray(notes) && typeof answer === "string") {
    const lignes = notes.map((l) => String(l));
    return {
      avertissements: lignes.filter((l) => /^Avertissement — /.test(l.trim())),
      reponse: answer.trim(),
      technique: lignes
        .filter((l) => !/^Avertissement — /.test(l.trim()))
        .join("\n"),
    };
  }
  const lignes = summary.replace(/\s+$/, "").split("\n");
  const avertissements: string[] = [];
  let debut = 0;
  while (
    debut < lignes.length &&
    /^Avertissement — /.test(lignes[debut].trim())
  )
    avertissements.push(lignes[debut++].trim());
  let coupe = lignes.findIndex((l, i) => i >= debut && l.trim() === "Bilan");
  if (coupe < 0) {
    coupe = lignes.findIndex((l, i) => i >= debut && isPlatform(l.trim()));
    if (coupe < 0)
      return {
        avertissements,
        reponse: lignes.slice(debut).join("\n").trim(),
        technique: "",
      };
  }
  while (coupe > debut && isPlatform(lignes[coupe - 1].trim())) coupe--;
  return {
    avertissements,
    reponse: lignes.slice(debut, coupe).join("\n").trim(),
    technique: lignes.slice(coupe).join("\n").trim(),
  };
}

// Lignes « - Scan : » du Bilan de la mère (hors citations) et leurs sous-lignes.
export function problemesDuScan(technique: string) {
  const lignes = technique.split("\n");
  const out: { titre: string; details: string[] }[] = [];
  for (let i = 0; i < lignes.length; i++) {
    const m = lignes[i].match(/^- Scan : (.+)$/);
    if (!m) continue;
    const details: string[] = [];
    while (i + 1 < lignes.length && /^\s{2,}- /.test(lignes[i + 1]))
      details.push(lignes[++i].replace(/^\s+- /, ""));
    out.push({ titre: m[1], details });
  }
  return out;
}

// Dans les détails, le nom d'outil garde un mot simple à côté.
const MOTS: Record<string, string> = {
  browser_navigate: "pages ouvertes",
  browser_extract: "lectures de page",
  browser_snapshot: "captures",
  browser_click: "clics",
  browser_type: "saisies",
  career_read: "lecture des fichiers du Skill",
  career_script: "script du Skill",
};
export const avecMotsSimples = (t: string) =>
  t.replace(
    /\b(browser_navigate|browser_extract|browser_snapshot|browser_click|browser_type|career_read|career_script)\b/g,
    (nom) => `${nom} (${MOTS[nom]})`,
  );

// Chaque rubrique sur sa ligne : « … jetons. Attente du chef : … » et « Consommation annoncée par les
// agents : … » commencent une ligne.
export function lignesTechniques(technique: string) {
  return avecMotsSimples(technique)
    .split("\n")
    .flatMap((ligne) => {
      const citation = ligne.match(/^((?:> ?)*)/)?.[1] ?? "";
      return ligne
        .slice(citation.length)
        .split(
          /(?<=\.) (?=(?:Attente du chef|Consommation annoncée par les agents) : )/,
        )
        .map((morceau) => citation + morceau);
    });
}
const RUBRIQUE_LISTE =
  /^(Consommation annoncée par les agents|Motifs des délégations) : (.+)$/;

function Lignes({ lignes }: { lignes: string[] }) {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lignes.length) {
    const ligne = lignes[i];
    if (/^>/.test(ligne)) {
      const bloc: string[] = [];
      while (i < lignes.length && /^>/.test(lignes[i]))
        bloc.push(lignes[i++].replace(/^> ?/, ""));
      out.push(
        <div className="tech-citation" key={"q" + i}>
          <Lignes lignes={bloc} />
        </div>,
      );
      continue;
    }
    if (/^\s*- /.test(ligne)) {
      const liste: { texte: string; sous: string[] }[] = [];
      while (i < lignes.length && /^\s*- /.test(lignes[i])) {
        const l = lignes[i++];
        if (/^\s{2,}- /.test(l) && liste.length)
          liste.at(-1)!.sous.push(l.trim().slice(2));
        else liste.push({ texte: l.trim().slice(2), sous: [] });
      }
      out.push(
        <ul key={"l" + i}>
          {liste.map((item, k) => (
            <li key={k}>
              {item.texte}
              {item.sous.length > 0 && (
                <ul>
                  {item.sous.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    i++;
    const t = ligne.trim();
    if (!t) continue;
    const enListe = t.match(RUBRIQUE_LISTE);
    if (enListe) {
      out.push(
        <div className="tech-rubrique" key={"r" + i}>
          <strong>{enListe[1]}</strong>
          <ul>
            {splitList(enListe[2].replace(/\.$/, ""), " ; ").map((s, k) => (
              <li key={k}>{s}</li>
            ))}
          </ul>
        </div>,
      );
      continue;
    }
    if (t === "Bilan") {
      out.push(
        <p className="tech-titre" key={"t" + i}>
          Bilan
        </p>,
      );
      continue;
    }
    if (/^\d+\. /.test(t)) {
      out.push(
        <p className="tech-membre" key={"m" + i}>
          {t}
        </p>,
      );
      continue;
    }
    const rubrique = t.match(/^([^:]{2,60}?) : (.*)$/);
    out.push(
      rubrique ? (
        <p className="tech-rubrique" key={"p" + i}>
          <strong>{rubrique[1]}</strong> : {rubrique[2]}
        </p>
      ) : (
        <p key={"p" + i}>{t.replace(/ :$/, "")}</p>
      ),
    );
  }
  return <>{out}</>;
}
// Le Bilan complet : chaque retour à la ligne du texte est gardé, les listes « - » et « > - » en listes.
export function TexteTechnique({ texte }: { texte: string }) {
  return (
    <div className="tech-texte">
      <Lignes lignes={lignesTechniques(texte)} />
    </div>
  );
}

const PASTILLE: Record<Etat, string> = {
  ok: "ok",
  echec: "echec",
  annulee: "annulee",
  encours: "encours",
};
function Pastille({ state }: { state?: string }) {
  return (
    <span className={"equipe-pastille " + PASTILLE[etatDe(state)]}>
      {motEtat(state)}
    </span>
  );
}
const libelle = (m: FamilyMember) =>
  text(m.etape?.libelle) || text(m.titre) || "Tâche sans titre";
const dureeDe = (m: FamilyMember) =>
  typeof m.dureeMs === "number" ? dureeTache(m.dureeMs) : "";
const coutTexte = (m: FamilyMember) => {
  const c = coutDe(m.usage);
  return c ? montant(c.montant, c.devise) : "";
};
// Cause d'un membre fini sans succès, en une phrase (l'annulation se lit déjà sur la pastille).
// Le résultat d'un membre reste du texte brut (contrat du back) ; seuls les « # » de titre en tête de ligne
// sont retirés. Le back en garde 600 caractères : une coupe le dit.
export function resultatLisible(resultat: string) {
  const net = resultat.replace(/^#{1,6}\s+/gm, "").trim();
  return resultat.length >= 599 ? net.replace(/\s*\S*$/, "") + " …" : net;
}
const causeDe = (m: FamilyMember) =>
  ["failed", "interrupted"].includes(String(m.state))
    ? text(m.cause?.message)
    : "";

export function TeamAnswer({
  run,
  events,
  summary,
  erreur,
  onOpenMember,
  technique: extra,
  now = Date.now(),
}: {
  run: Run;
  events: RunEvent[];
  // `result.summary` (ou le résultat privé) ; null tant qu'il n'y en a pas.
  summary: string | null;
  // Erreur de la mission dite simplement (plainRunError), pour une mission en échec.
  erreur?: string;
  onOpenMember?: (id: string) => void;
  // Ajouté dans les détails techniques (étapes du Skill…).
  technique?: ReactNode;
  now?: number;
}) {
  const family = membresDe(run);
  const taches = tachesDe(family);
  const cout = coutAnnonce(run, events);
  const duree = dureeDeLaMission(run, now);
  const parties =
    summary !== null
      ? partiesDuResume(summary, run.result?.answer, run.result?.platformNotes)
      : null;
  const problemes = parties ? problemesDuScan(parties.technique) : [];
  const termines = family.filter((m) => m.state === "completed");
  return (
    <div className="equipe-reponse">
      <section className="equipe-resultat" aria-label="Résultat">
        <p className="equipe-etat">
          {/* La cause seule : une citation de l'agent (« … ») reste dans le fil, pas dans la carte. */}
          {ligneEtat(run, (erreur ?? "").split(" : « ")[0])}
        </p>
        {duree && <p>Durée : {duree}</p>}
        {cout && (
          <p>
            Coût annoncé par les agents : {cout.auMoins ? "au moins " : ""}
            {cout.texte}
          </p>
        )}
        {taches.length > 0 && <p>{phraseTaches(taches)}</p>}
      </section>
      {parties?.avertissements.map((ligne) => (
        <p className="answer-warning" role="alert" key={ligne}>
          {ligne}
        </p>
      ))}
      <section className="equipe-trouve" aria-label="Ce qui a été trouvé">
        <h3>Ce qui a été trouvé</h3>
        {parties?.reponse && (
          <div className="equipe-carte">
            <p className="equipe-carte-titre">Synthèse de l’agent principal</p>
            <div className="equipe-texte">
              <Markdown text={parties.reponse} />
            </div>
          </div>
        )}
        {termines.map((m) => (
          <div className="equipe-carte" key={m.id}>
            <div className="equipe-carte-tete">
              <p className="equipe-carte-titre">{libelle(m)}</p>
              {onOpenMember && (
                <button
                  type="button"
                  className="equipe-ouvrir"
                  aria-label={`Ouvrir la sous-mission ${libelle(m)}`}
                  onClick={() => onOpenMember(m.id)}
                >
                  Ouvrir
                </button>
              )}
            </div>
            {/* conversation-22-11 : le résultat d'un membre est du Markdown (tableaux, gras) : rendu. */}
            {text(m.resultat) && (
              <div className="equipe-texte">
                <Markdown text={resultatLisible(text(m.resultat))} />
              </div>
            )}
            {text(m.resultat).length >= 599 && onOpenMember && (
              <p className="equipe-suite">
                Début du résultat : « Ouvrir » montre la suite.
              </p>
            )}
          </div>
        ))}
        {!termines.length && !parties?.reponse && (
          <p className="muted">Aucun résultat rendu.</p>
        )}
      </section>
      {taches.length > 0 && (
        <section className="equipe-table" aria-label="Tâches de l’équipe">
          <h3>Équipe</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Tâche</th>
                <th scope="col">État</th>
                <th scope="col" className="num">
                  Durée
                </th>
                <th scope="col" className="num">
                  Coût
                </th>
              </tr>
            </thead>
            <tbody>
              {taches.map((t) => (
                <TacheLignes key={t.premiere.id} tache={t} />
              ))}
            </tbody>
          </table>
        </section>
      )}
      {problemes.length > 0 && (
        <section className="equipe-problemes" aria-label="Problèmes">
          <h3>Sites que le Skill n’a pas pu lire</h3>
          {problemes.map((p, i) => (
            <div key={i}>
              <p>{p.titre}</p>
              {p.details.length > 0 && (
                <ul>
                  {p.details.map((d, k) => (
                    <li key={k}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}
      {(parties?.technique || extra) && (
        <details className="fold equipe-details">
          <summary>Détails techniques</summary>
          {extra}
          {parties?.technique && <TexteTechnique texte={parties.technique} />}
        </details>
      )}
    </div>
  );
}
function TacheLignes({ tache }: { tache: Tache }) {
  const m = tache.premiere;
  const cause = causeDe(m);
  return (
    <>
      <tr>
        <th scope="row">{libelle(m)}</th>
        <td>
          <Pastille state={m.state} />
        </td>
        <td className="num">{dureeDe(m)}</td>
        <td className="num">{coutTexte(m)}</td>
      </tr>
      {cause && (
        <tr className="equipe-cause">
          <td colSpan={4}>{cause}</td>
        </tr>
      )}
      {tache.reprises.map((r) => {
        const pourquoi = causeDe(r);
        return (
          <tr className="equipe-reprise" key={r.id}>
            <td colSpan={2}>
              Reprise : {motEtat(r.state).toLocaleLowerCase("fr")}
              {pourquoi ? ` — ${pourquoi}` : ""}
            </td>
            <td className="num">{dureeDe(r)}</td>
            <td className="num">{coutTexte(r)}</td>
          </tr>
        );
      })}
    </>
  );
}
