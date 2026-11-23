# Lot `joindre-23-11` — joindre un fichier pendant une mission (front du contrat joindre-01)

Demande du propriétaire (23/11, « corrige ») : il ne pouvait pas transmettre son CV quand l'agent le demandait.
Contrat du back accepté par le manager (lot `joindre-01`, **pas encore servi sur 4310** au moment de ce lot) :
`attachments?: string[]` sur `POST /runs/:id/answer` et `/message`, `attachments: [{ id, name }]` sur les
événements `answer` et `owner_message`.

## Fait

- `MissionPill.tsx` : bouton « + » dans le champ de chat pendant la mission (réponse à une question en texte libre
  ou message) ; envoi par `POST /api/files` sans `x-skill` (simple pièce jointe) ; pastilles retirables ; un fichier
  seul part avec « Fichier joint : <nom> » pour texte (aucun mot prêté au propriétaire).
- `api.ts` `sendOwnerMessage(…, attachments)` ; `App.tsx` : `attachments` ajouté à `/answer` et `/message` seulement
  s'il y a un fichier.
- Honnêteté face à un serveur plus ancien : chaque envoi avec fichier attend son événement ; s'il revient sans
  `attachments`, l'application affiche « Fichier non transmis : ce serveur ne prend pas encore de pièce jointe
  pendant une mission… » (événement arrivé avant la réponse HTTP couvert).
- `Career.tsx` / `RunTurn.tsx` : fichiers joints affichés dans les bulles « Vous, pendant la mission » et « Vous, en
  réponse ».
- Suite (contrat confirmé par le manager : `content` et `attachments` ensemble sur `/answer`) : « + Joindre un
  fichier » dans la carte de question, texte libre comme formulaire ; une question en texte libre laissée vide avec
  un fichier répond par « Fichier joint : <nom> » (le champ n'est plus obligatoire dès qu'un fichier est joint) ;
  « Décliner » n'envoie aucun fichier. Module partagé `AttachFiles.tsx` (champ de chat et carte) ; la vérification
  de retour des fichiers se fait dans `action()` d'App pour toute réponse de la mission ouverte.
- Vu en passant : la question de l'agent s'affichait en titre brut, avec ses `**` ; elle est maintenant rendue en
  Markdown (`.question-message`).

## Vérifications

- `src/joindre-23-11.test.tsx` (12 tests) ; un test d'`orienter` mis au nouvel appel `send(texte, [])` ; 648/648 ;
  build et prettier verts. Capture du champ sur le banc. Envoi réel non essayé (le banc refuse tout POST, et 4310 ne
  sert pas encore joindre-01).

## 4310 sert joindre-01 (relance du manager à 19:50:19, `reponse-04-format` 80ad5a7)

- Adapté aux points de la relecture du back : une note `owner_message` `de: "plateforme"` (fichiers joints à une
  réponse de formulaire, messages au chef) s'affiche en ligne discrète, jamais en bulle « Vous » ; le vrai nom d'un
  fichier envoyé depuis la page est gardé par son id (mission privée : `owner_message` dit « fichier privé.pdf »).
  `attachments` n'est jamais envoyé nul ; `/message` garde toujours un texte. 2 tests de plus (14).
- Vérifié en lecture seule (Chrome sans écran, tout POST bloqué) sur 5173 → 4310 : `GET /api/runs?vue=liste` lu
  par le front, 0,79 Mo (14,3 Mo avant) ; carte « Comment fonctionne career-ops » avec le texte du back, ouverte sur
  `c87b6f11` (premier échange), repliée sur `3c0935ae` (échange repris).
- **Non vérifié** : un envoi réel de fichier (il faut une mission en cours qui pose une question) ; attend l'accord
  du propriétaire.
