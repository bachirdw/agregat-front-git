// lenteur-23-11 (oui du propriétaire, 23/11 16:33) : être prévenu quand l'agent attend, même dans une
// autre fenêtre. La permission du navigateur n'est demandée qu'au clic, jamais d'office ; accordée,
// le bouton dit « Notifications activées » ; refusée, il le dit, sans redemander.
import { useState } from "react";

type Permission = NotificationPermission | "absent";

const current = (): Permission =>
  typeof Notification === "undefined" ? "absent" : Notification.permission;

export function NotifyOwner() {
  const [permission, setPermission] = useState<Permission>(current);
  const [asking, setAsking] = useState(false);
  if (permission === "absent") return null;
  if (permission === "granted")
    return <small className="notify-owner done">Notifications activées</small>;
  if (permission === "denied")
    return (
      <small
        className="notify-owner"
        title="À rouvrir dans les réglages du site du navigateur"
      >
        Notifications bloquées par le navigateur
      </small>
    );
  return (
    <button
      type="button"
      className="notify-owner"
      disabled={asking}
      onClick={async () => {
        setAsking(true);
        try {
          await Notification.requestPermission();
        } catch {
          // Safari ancien : la promesse n'existe pas ; l'état lu ensuite suffit.
        }
        setPermission(current());
        setAsking(false);
      }}
    >
      Me prévenir quand l’agent m’attend
    </button>
  );
}
