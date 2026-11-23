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
- Non fait : « + » dans la carte de question à formulaire (schéma à champs) ; le champ de chat répond déjà aux
  questions en texte libre, cas de la capture.

## Vérifications

- `src/joindre-23-11.test.tsx` (8 tests) ; un test d'`orienter` mis au nouvel appel `send(texte, [])` ; 644/644 ;
  build et prettier verts. Capture du champ sur le banc. Envoi réel non essayé (le banc refuse tout POST, et 4310 ne
  sert pas encore joindre-01).
