# sans-reprendre-22-11 : plus de bouton « Reprendre la session »

Propriétaire (22/11) : « Pourquoi chaque fois j'appuie sur reprendre la session, ça relance carrément quelque
chose » ; puis « Le retirer » ; « la session se reprend automatiquement quand on envoie un message ».

- Constat (API 4310, lecture) : « Stages 50 maximum » (`f9d6bab9`, 04:17) a livré son résultat avec 4 sous-agents
  mais le back l'a notée `failed` (« Réponse hors contrat (simulated, summary, evidence attendus) ») ; le bouton
  apparaissait donc, et chaque clic (`POST /runs/:id/resume {}`) a lancé un nouveau tour (`a7236bb1` 04:45,
  `ca2dd53f` 04:51, tous deux en échec de la même façon). À signaler au manager du back (faux échec).
- `RunTurn.tsx` : le bouton n'existe plus pour une mission d'agent ; « Reprendre le workflow » reste pour un
  workflow arrêté ou en échec (pas de champ de réponse pour lui). Le champ « Répondre à l’agent… » (`canReply` :
  mission d'agent finie, `resumable`, pas une sous-mission) poursuit la session avec le message du propriétaire.
- Test `reponse-04.test.tsx` réécrit, vu en échec puis vert. Suite 44 fichiers, 595/595 ; build et prettier OK.
- Vu dans Chrome (5174 relancé, → 4310) sur `ca2dd53f` : pas de « Reprendre », « Répondre à l’agent… » actif.
- Branche partie de `95ae0ca` (main local de la session « New session », non poussé).
