# demo-fictive-22-11 — le pack de démonstration ne reste plus choisi (E204)

Demande du propriétaire, transmise par le manager de l'arrière : la mission 80794f16 (« Stages 50 maximum »,
22/11 14:51) est partie avec `pack: "najah"` (données et navigateur fictifs, 3 offres inventées) alors qu'il voulait
une vraie recherche.

## Constat complémentaire (lecture seule sur 4310)

La consigne envoyée est bien le texte du propriétaire, mais en **mode `agent`** ; une suggestion de l'accueil pose
le mode `workflow`. Le pack a donc pu venir de la page Domain Packs (« Utiliser pour la prochaine mission » sur la
carte Najah AI), qui le gardait aussi, ou d'une suggestion suivie d'un changement de mode : le clic n'est pas
vérifiable. Les deux chemins sont couverts par l'avertissement avant l'envoi.

## Ce qui change

1. **Suggestion** (`src/App.tsx`) : son pack et son workflow ne valent que pour son texte. Texte modifié ou
   remplacé → `pack: "auto"`, `workflow: "auto"`, mode d'avant la suggestion (sauf si le propriétaire a lui-même
   changé pack ou workflow entre-temps : son choix reste). Envoyée telle quelle → démonstration, comme avant.
2. **Nouvelle mission** : repart toujours en `pack: "auto"`, `workflow: "auto"` (agent, modèle, Skill, navigateur
   inchangés). « Utiliser pour la prochaine mission » (Domain Packs) pose encore son pack pour la mission suivante.
3. **Avant l'envoi** (`src/Composer.tsx`) : si le pack choisi est annoncé `dataMode: "fixture"` par le catalogue (pas
   de nom codé en dur), « Démonstration fictive : aucun site réel ne sera lu (pack Najah AI). » au-dessus du bouton
   d'envoi, avec « Faire une vraie recherche » (pack et workflow en « auto », le texte reste).
4. **Après l'envoi** (`src/RunTurn.tsx`) : bandeau « Démonstration fictive : navigateur et données fictifs, aucun
   site réel n'a été lu. » en tête de la réponse d'une mission `dataMode: "fixture"`.

Fichiers : `src/App.tsx`, `src/Composer.tsx`, `src/RunTurn.tsx`, `src/types.ts` (`Pack.dataMode`),
`src/team-answer.css` (styles), `src/demo-fictive.test.tsx` (7 tests).

## Vérifications

- Tests de composant sur le corps réellement envoyé à `POST /api/runs` : suggestion puis texte remplacé →
  `pack: "auto"`, `workflow: "auto"`, `mode: "agent"` ; texte modifié d'un caractère → `auto` ; suggestion telle
  quelle → `najah` + avertissement visible ; « Faire une vraie recherche » → `auto` ; nouvelle mission après une
  démonstration → `auto` ; bandeau présent pour `fixture`, absent pour `live`.
- Aperçu 5173 sur 4310 : 80794f16 rouverte (GET) montre le bandeau ; à l'accueil, la suggestion affiche
  l'avertissement, qui disparaît dès que le texte change (rien envoyé).
- Build vert ; vitest **586/586** (42 fichiers) ; E2E **18/18** (back `agregat-back-reponse-04`).
