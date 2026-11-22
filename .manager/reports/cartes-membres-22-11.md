# cartes-membres-22-11 — la carte d'un membre se répond depuis la page de la mère

Blocage signalé par le propriétaire (22/11, 15:37), transmis par le manager de l'arrière : mission mère
f9d6bab9 `running`, membre c2827b0c `waiting_permission`, `attend: "carte_envoi"` ; « je ne peux pas appuyer, je
n'ai pas de formulaire mis à disposition ». Le front disait « attend ton clic sur une carte d'envoi » sans bouton.

## Ce qui change

- `src/MemberRequests.tsx` (nouveau) : pour chaque membre qui attend le propriétaire (`attend` accord, question ou
  carte_envoi, `pendingPermission`, `pendingQuestion`, état `awaiting_owner` / `waiting_permission`), la
  sous-mission est lue (`GET /api/runs/<membre>`) et **sa carte du serveur** est affichée (`OwnerRequests` : mêmes
  boutons, même sens, `POST /api/permissions/<id>` ou `POST /api/runs/<membre>/answer`). Au-dessus : « <tâche>
  attend ton accord : envoi POST vers <site> » (méthode et site de `rawInput.args.url`, jamais le corps). Carte
  illisible : « Ouvrir la sous-mission ». Relue dès que l'attente du membre change (après un clic, la mère est
  relue par `action`, la carte disparaît).
- Placée **en tête de la réponse** de la mère (`RunTurn`, avant la carte Résultat) et **dans le panneau Équipe**
  (`ActivityPanel`, prop `act` branchée par `App`).
- Carte Résultat d'une mission en échec : la cause seule (« Réponse hors contrat (…) »), la citation de l'agent
  (« … ») reste dans la ligne d'incident du fil.

## Vérifications

- Tests (`src/cartes-membres.test.tsx`, 5) : mère `running` + membre `waiting_permission` → « Approuver l'envoi » et
  « Refuser » visibles sur la page de la mère, le clic appelle `POST /permissions/p-1 { optionId: "allow" }` ; le
  résumé ne contient pas le corps ; aucun membre en attente → rien n'est lu ; carte illisible → « Ouvrir la
  sous-mission » ; panneau Activité → même carte, « Refuser » envoie `deny`.
- 4310 en lecture seule à 15:5x : la carte de c2827b0c n'était plus en attente (membre `completed`) ; la mère
  f9d6bab9 a fini `failed` à 15:41 (« Réponse hors contrat », erreur du serveur). Aucun clic sur une vraie carte.
- Build vert ; vitest **595/595** (44 fichiers) ; E2E **18/18** (back `agregat-back-reponse-04`).
