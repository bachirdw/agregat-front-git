# equipe-lisible-22-11 — réponse d'une mission en équipe lisible

Demande du propriétaire, transmise par le manager de l'arrière (session « Analyse passation 22-11-midi ») :
« je ne comprends rien au format » sur la mission 2da0cae5 (annulée, 6 sous-missions). Front seul ; aucun champ
inventé : un champ absent n'affiche pas sa ligne.

## Ce qui change (mission qui a au moins un membre dans `family[]`)

De haut en bas, dans la réponse (`src/TeamAnswer.tsx`, branché dans `src/RunTurn.tsx`) :

- **A. Résultat** (4 lignes au plus) : état en mots simples (« Annulée par vous à 12:36 » quand l'erreur est
  « Annulée par l'utilisateur », « Terminée à … », « En échec à … : <erreur dite simplement> », « En cours »),
  « Durée : 29 min » (`createdAt` → `finishedAt`), « Coût annoncé par les agents : au moins 13,60 USD » (somme des
  `usage.cout` des membres + événement `usage` de la mère ; « au moins » si l'un n'annonce rien), « 4 tâches :
  2 terminées, 2 non abouties » (compté sur la dernière tentative de chaque tâche).
- **B. Ce qui a été trouvé** : la réponse de l'agent principal si le résumé en porte une (avant « Bilan »), puis une
  carte par membre terminé (`etape.libelle`, sinon `titre`) avec `resultat` en texte brut (seuls les « # » de titre en
  tête de ligne sont retirés ; une coupe à 600 caractères finit par « … » et le dit), bouton « Ouvrir » (vue côte à
  côte, `openSide` d'App). Sans membre terminé : « Aucun résultat rendu. »
- **C. Équipe** (tableau Tâche / État / Durée / Coût) : une ligne par tâche ; une reprise (`famille.reprend`, lu sur
  la ligne de la sous-mission dans `GET /api/runs` et recopié par `avecDetailsDesLignes`) en sous-ligne « Reprise :
  annulée » ; `cause.message` d'un membre en échec sous sa ligne. Pastilles : Terminée vert, En échec rouge, Annulée
  gris, En cours bleu. Sans `reprend` (back ancien), chaque membre est une tâche : rien n'est deviné d'après les titres.
- **D. Sites que le Skill n'a pas pu lire** : lignes « - Scan : » du Bilan de la mère (hors citations) et leurs
  sous-lignes, seulement s'il y en a.
- **E. Détails techniques** (replié) : Étapes du Skill, puis le Bilan complet de la mère — chaque retour à la ligne
  gardé, listes « - » et « > - » en listes, citations des membres décalées, chaque rubrique sur sa ligne (« Attente
  du chef » et « Consommation annoncée par les agents » sortis de leur paragraphe ; consommation et motifs en
  listes), noms d'outils suivis du mot simple (browser_extract (lectures de page)…).
- **F. Fil** : découpé aux outils d'équipe (`mission_*`) ; les messages écrits juste avant `mission_attendre` sont
  regroupés (le dernier visible, les précédents repliés sous « N messages d'attente précédents », rien n'est retiré) ;
  pendant la mission, « En attente de N tâches, depuis X min ». Mission finie : tout le fil (ligne d'activité
  comprise) replié sous « Déroulé (N messages) », après la carte Résultat. Le dernier message du chef n'est retiré
  du fil que si le résumé porte vraiment sa réponse (sinon « Les deux reprises sont lancées… » disparaissait).

Mission sans équipe : inchangée (comparée pixel à pixel avant/après sur une mission réelle : seules la flèche de
défilement et le composer, animés, diffèrent).

## Fichiers

`src/TeamAnswer.tsx` (nouveau), `src/team-answer.css` (nouveau, importé dans `main.tsx`), `src/RunTurn.tsx`
(`conversation(items, coupe)`, rendu en équipe, prop `onOpenMember`), `src/App.tsx` (`onOpenMember={openSide}`),
`src/types.ts` et `src/status.ts` (`reprend`), `src/Bilan.tsx` (`isPlatform` et `items` exportés),
`src/equipe-lisible.test.tsx` (16 tests, données FICTIVES de même forme que 2da0cae5).

## Vérifications

- 2da0cae5 relue sur 4310 en **lecture seule** (relais de capture qui ne transmet que les `GET` ; « Aucune écriture
  tentée » à chaque passage). Carte : « Annulée par vous à 12:36 », « Durée : 29 min », « au moins 13,60 USD »,
  « 4 tâches : 2 terminées, 2 non abouties » ; cartes SEEK et Indeed ; tableau de 4 lignes (agences et LinkedIn avec
  leur reprise) ; détails sans paragraphe collé. Captures avant/après 1440 et 768 px gardées hors du dépôt (vraies
  données du propriétaire), envoyées dans la discussion.
- Mission en cours : couverte par un test (jsdom) avec des événements FICTIFS ; pas de mission en équipe en cours sur
  4310 au moment du lot, donc pas de capture réelle.
- `npm run build` vert ; vitest **579/579** (41 fichiers) ; E2E **18/18** avec `agregat-back-reponse-04` (un premier passage à 16/18 pendant des captures en parallèle : les deux tests expirés passent seuls, puis la suite entière passe).

## Écarts assumés avec la demande

- « 4 tâches » et colonne « Tâche » au lieu de « 4 recherches » / « Recherche » : une équipe ne fait pas toujours des
  recherches.
- Cause d'un membre annulé non répétée sous sa ligne (la pastille « Annulée » la dit déjà).
- Limites côté serveur laissées telles quelles (E196 cause « Exécution privée échouée », E198, E199, E200).
