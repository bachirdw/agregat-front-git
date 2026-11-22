# conversation-22-11 : répondre à l'agent sans fil qui saute ni Markdown brut

Demande du propriétaire (22/11, 17:00) : « quand tu réponds, le deuxième message a tout le contenu du premier,
au-dessus de la réponse ; des bugs dans les tableaux ; des réponses qui disparaissent et réapparaissent ». Lot
annoncé au manager (fichiers réservés) ; « New session » sans modification en cours (vérifié, dernier commit 16:16).

## Constats
1. **Tours précédents** (mission réelle `35dd5678`, lecture seule) : rendus par l'ancien composant `Turn` dans un
   cadre `career-thread` / `agent-turn`, en entier (9 895 caractères au-dessus de la réponse), style différent.
2. **Tableaux en Markdown brut** : la section « Ce qui a été trouvé » de la carte d'équipe (`TeamAnswer.tsx`)
   rendait le résultat d'un membre en `<p>` (« **11 offres** … | Agence | … |---| »).
3. **Disparition puis réapparition** : reproduite sur banc isolé (`scripts/conversation-banc.mjs`, agent fixture,
   dossiers temporaires, lecture d'une mission ralentie de 1,5 s comme sur un serveur chargé) : à l'envoi d'une
   réponse, le tour précédent et son tableau disparaissent 1,5 s (`premierDisparu: 1`, `tableauxMin: 0`) puis
   réapparaissent. Cause : `Turn` relisait `GET /runs/:id` alors que la liste porte déjà la réponse.

## Fait
- `Career.tsx` : `PastTurn` (bulle + `.reponse` comme la réponse en cours, `AgentAnswer` depuis la liste ;
  relecture seulement si la liste n'a pas la réponse ; career-ops : résultat privé par sa route ; « Détail de ce
  tour » gardé) ; `SessionHistory` : le dernier tour précédent visible, les plus anciens repliés en haut
  (« Afficher l’échange précédent » / « Afficher les N échanges précédents »).
- `TeamAnswer.tsx` : synthèse du chef et résultats des membres rendus en Markdown.
- `tests/e2e.test.mjs` : le test « relance réelle » déplie l'échange replié avant de compter les bulles.

## Vérifications
- `src/conversation-22-11.test.tsx` (3 tests) : rouges sur l'ancien code (fichiers remis à HEAD le temps du
  passage), verts après. Un premier passage rouge n'était pas valable (beforeEach qui renvoyait le mock).
- Suite 45 fichiers, 598/598 ; build OK ; prettier OK ; E2E 18/18.
- Banc ralenti après correction : `premierDisparu: 0`, tableau toujours présent, aucun Markdown brut, mission
  menée à son terme. Capture : `conversation-22-11/apres-reponse.png`.
- Chrome (5174 → 4310, lecture seule) sur `35dd5678` : tour précédent dans le style de la réponse, résultat des
  agences en tableau.

## Restes, non traités
- Quand l'agent pose une question, son texte apparaît dans le fil puis à nouveau en titre de la carte de
  question (vu sur le banc). À décider : n'afficher la question qu'une fois.
- Tableaux très larges (51 lignes × 8 colonnes) : défilement horizontal dans leur cadre, non revu.
