# Lot `affichage-23-11` — réponse lisible « comme sur Claude Code »

Demande du propriétaire (23/11, 17:45, trois captures de la conversation « Stages 50 maximum ») : le résultat est
incompréhensible, le format devrait rester clair comme sur Claude Code.

## Constat (lecture seule par l'API et Chrome sans écran, aucune requête autre que GET)

- Capture 3 : c'est le tour précédent `1bb0ead0` (annulé, « tat rluver ») affiché au-dessus de `05f7a8f7`. Son
  `result.summary` n'est que le Bilan de la plateforme (pas de `answer` ni de `platformNotes`). Le découpage
  `splitSummary` remontait depuis la fin et s'arrêtait sur des lignes qu'il ne reconnaît pas (« 1. « … » — »,
  « > … », « Sous-missions (3) : ») : tout le Bilan passait pour la réponse de l'agent et était rendu en Markdown,
  qui colle les lignes simples en un seul paragraphe.
- Capture 1 : tableau en `width: max-content` qui défile horizontalement ; la colonne de droite (et une colonne
  « Annonce ») était hors de vue, sans barre visible sur macOS.
- Le Bilan de `1bb0ead0` liste les sous-missions de la recherche précédente : défaut du back déjà noté (E229).

## Corrections

1. `Bilan.tsx` `splitSummary` : une ligne « Bilan » seule ouvre toujours la partie plateforme ; repliée dans
   « Détails des actions », une ligne par information (`> ` et `- ` retirés).
2. `Markdown.tsx` : un retour à la ligne simple reste un retour à la ligne (petit greffon remark, sans dépendance,
   comme Claude Code) ; blocs de code, listes, tableaux inchangés.
3. `v2.css` `.md-table table` : largeur du fil, texte des cellules à la ligne ; défilement seulement si les
   colonnes ne tiennent pas (6em au moins chacune).

## Vérifications

- `src/affichage-23-11.test.tsx` (6 tests) ; suite 630/630 ; build vert.
- Captures sur 5173 (mission `05f7a8f7`, thème sombre) : tableau à 3 colonnes entier (656 px = largeur du fil),
  tour annulé replié, détail lisible ligne par ligne.

## Suite (23/11, 18:10) — « mon message envoyé à l'agent disparaît pendant la réflexion »

- Constat sur `bbf4f4a7` (tour repris de `05f7a8f7`, lecture seule) : la bulle du message était là, mais suivie
  d'environ 1 000 px du résultat d'équipe de la recherche précédente (3 sous-missions de `3d09c063`, débutées à 05:44
  pour un tour créé à 06:56) : le back rattache à chaque tour les sous-missions de toute la conversation (E229).
- Correction front : `membresDuTour` (status.ts) — un tour repris ne montre dans le fil que les sous-missions
  lancées pendant ce tour (`debut` ≥ `createdAt` − 1 s ; un membre sans `debut` reste). Le panneau Activité garde
  toute la famille. Mesuré : bulle à 729 px, activité juste dessous à 804 px (avant : 1 837 px).
- Remarque pour le propriétaire : ce tour est parti sans Skill (pack `core`, `skills: []`), d'où « je n'ai pas
  trouvé ton CV ni ton profil ».
- Recherche web (open source) : Claude-Web-UI, claudecodeui (AGPL), kanna (MIT), opcode, assistant-ui (MIT),
  Streamdown (Vercel, Markdown incomplet pendant le flux), react-acp / acp-query (clients ACP). Non adoptés : à
  évaluer (licence, dépendances épinglées, audit).
- 633/633.
