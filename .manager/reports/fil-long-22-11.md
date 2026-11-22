# fil-long-22-11 : plus de pli « Déroulé » ; les plus anciens messages se replient en haut

Demande du propriétaire (22/11 après-midi, capture « Déroulé (15 messages) » sous une mission en équipe) :
« enlève le Déroulé… on peut dérouler ou masquer les messages d'en haut, pas d'en bas ; les plus anciens, si la
conversation est trop grosse ».

- Contexte : le pli venait du lot `equipe-lisible-22-11` d'une autre session (« New session », worktree
  `new-session-1f8da9`, `main` poussé à 14:15, inactive depuis 14:38). Ma branche a été avancée sur ce `main`
  (`6b3b6c3`, avance rapide ; mon travail jusqu'à `6d7d562` y était déjà).
- `RunTurn.tsx` : `OlderFolded` ; le fil (mission en équipe, en cours ou finie, et mission seule) montre les
  12 derniers messages ; au-delà, « Afficher les N messages précédents » en haut (`aria-expanded`), « Masquer les
  messages précédents » une fois ouvert. Le pli `details.deroule` et son compteur sont retirés, ainsi que ses
  styles (`team-answer.css`). Les groupes « messages d’attente précédents » du chef restent.
- Tests : `src/fil-long.test.tsx` (2) vu en échec puis vert (une attente du test corrigée : les 3 plus anciens
  sont Texte 1, Message 1, Texte 2) ; `equipe-lisible.test.tsx` : le test du Déroulé remplacé (fil visible sous la
  carte Résultat, sans pli). `components.test.tsx` reformaté (prettier : commité non formaté par l'autre session).
- Suite 42 fichiers, 581/581 ; build OK ; prettier OK.
- Vu dans Chrome (5174 → 4310) sur `bd54ee7a` : pas de « Déroulé », « Afficher les 7 messages précédents » en haut.
