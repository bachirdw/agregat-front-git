# Rapport chat-mission-21-11 : écrire à l'agent pendant qu'il travaille

## Demande du propriétaire (21/11)
Capture d'une mission en cours (« Vends relay plateforme ») : le seul moyen d'écrire à l'agent était le crayon de la
pastille en bas à droite, qui ouvrait une petite bulle. Le propriétaire : « je le veux pas ici », il veut un champ de
chat qui s'affiche pour écrire à l'agent pendant qu'il travaille.

## Ce qui existait déjà (rien d'inventé)
- Back (`docs/api-message.md`, branche `reponse-04-format`) : `POST /api/runs/:id/message` remet le message dans la
  même session, sans arrêter la mission (`steering` pour Claude et Codex, sinon en fin de tour). 409 pour un workflow ou
  une mission finie.
- Front : `sendOwnerMessage` (`src/api.ts`) et `MissionPill` branchés sur cette route depuis `orienter-14-11`. Seul
  l'emplacement posait problème : la fonction marchait, mais elle était cachée derrière le crayon.

## Changement
- `src/MissionPill.tsx` : pour une mission d'agent en cours, un champ toujours visible, à la place du composer et de
  la même largeur. Il contient la saisie (« Écrire à l’agent pendant qu’il travaille… »), la ligne d'état, le bouton
  Arrêter et le bouton rond d'envoi. Le crayon, l'ouverture et la fermeture par Échap sont retirés. Les
  comportements sont gardés :
  - Entrée envoie, Maj+Entrée va à la ligne ;
  - repli sur la file locale en cas de 409 ou 404 ;
  - note « L’agent attend votre réponse ci-dessus » ;
  - erreur d'envoi affichée.
- Workflow : seul le bouton Arrêter flottant reste. Le back refuse les messages pour un workflow (409), comme avant.
- `src/v2.css` : `.mission-chat*` remplace `.mission-queue`. Le champ grandit avec le texte jusqu'à 120 px
  (`field-sizing`, sinon une ligne qui défile). « Revenir en bas » est posé au-dessus. En dessous de 760 px, la largeur
  est de 100 % moins 32 px.
- Tests adaptés : `App`, `orienter`, `orienter-contrat` et `v2`. Le test « Échap referme » est retiré (plus rien à
  refermer). Deux tests sont ajoutés : champ visible d'office sans crayon, champ vidé et toujours visible après
  l'envoi.

## Vérifications (15:05)
- `npx vitest run --maxWorkers=2` : 26 fichiers, 431/431.
- `npm run build` : OK (avertissement habituel de taille de bloc).
- `prettier --check` sur les fichiers touchés : OK.
- E2E non relancé : il ne cherche pas le crayon, et il vérifie seulement que `.mission-pill` disparaît après l'arrêt,
  ce qui reste vrai.

## Incident pendant le lot
Un script Python de remplacement en masse a tronqué quatre fichiers de test (plus de 1 000 lignes perdues). Je les ai
remis à leur état commité (`git checkout --` sur ces quatre fichiers seulement, qui ne contenaient que mes propres
modifications), puis je les ai adaptés à la main. Rien n'avait été commité.

## Surveillance de la mission en cours
J'ai lancé un agent de surveillance en lecture seule (GET uniquement vers 127.0.0.1:4310) sur la mission
`bd54ee7a`. Son journal est dans le dossier scratchpad de la session. Il n'envoie rien et ne touche à rien.
