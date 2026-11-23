// lenteur-23-11 (relecture de 6e1cb78) : missions qui attendent le propriétaire, pour le titre de l'onglet et
// la notification. Une équipe compte pour une : sa racine. Un membre qui attend (question, carte d'accord)
// laisse la mère `running` : il est lu dans `family[]` de la mission ouverte et dans `activity.awaitingOwner`
// des lignes de la liste.
import { ownerStates } from "./types";

type Row = {
  id: string;
  state: string;
  famille?: { racine?: string } | null;
  activity?: { awaitingOwner?: number } | null;
  pendingQuestion?: unknown;
  family?: Array<{
    state?: string;
    pendingQuestion?: unknown;
    pendingPermission?: unknown;
  } | null> | null;
};

const root = (r: Row) => r.famille?.racine || r.id;

export function owedMissions(runs: readonly Row[], open?: Row | null) {
  const roots = new Set<string>();
  for (const r of runs)
    if (ownerStates.has(r.state) || (r.activity?.awaitingOwner ?? 0) > 0)
      roots.add(root(r));
  if (open) {
    const member = (open.family ?? []).some(
      (m) =>
        !!m &&
        (ownerStates.has(String(m.state)) ||
          !!m.pendingQuestion ||
          !!m.pendingPermission),
    );
    const self = ownerStates.has(open.state) || !!open.pendingQuestion;
    // The open mission (re-read with its team) is fresher than the list, whose member rows are only
    // re-read at the end of a stream: it alone decides for its root.
    if (self || member) roots.add(root(open));
    else roots.delete(root(open));
  }
  return roots.size;
}
