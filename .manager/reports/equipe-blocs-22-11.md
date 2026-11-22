# equipe-blocs-22-11 — plus de ligne vide entre les blocs d'une réponse d'équipe

Suite directe du lot `conversation-22-11` (« Reprise du chantier », `b840a65`), qui rend en Markdown la synthèse de
l'agent principal et les résultats des membres dans « Ce qui a été trouvé ». Défaut relevé à la relecture
(17:20), feu vert du manager de l'arrière (session « Analyse passation 22-11-midi ») pour `src/team-answer.css` et
`src/TeamAnswer.tsx`.

## Cause

`.equipe-texte` gardait `white-space: pre-line`, prévu pour un texte brut. Or react-markdown place un « \n » entre
ses blocs. Sous `pre-line`, chacun devient une ligne vide : entre deux paragraphes, autour d'un tableau, entre les
puces d'une liste. Dans une liste aérée, la puce se retrouve même séparée de son texte.

## Correction (`src/team-answer.css`)

- Le conteneur `.markdown` et les blocs qui contiennent d'autres blocs (`ul`, `ol`, `li`, `blockquote`, `table`)
  repassent en `white-space: normal`.
- Les blocs de texte (`p`, `td`, `th`, titres, `li` sans bloc à l'intérieur) gardent `pre-line`. Un résultat en
  texte simple, sans Markdown, garde donc ses retours à la ligne, comme avant `b840a65`.

Le commentaire de `resultatLisible` (`src/TeamAnswer.tsx`), qui disait encore « reste du texte brut », est mis à
jour.

## Mesures dans Chrome (17:25)

Banc jetable non commité, servi par l'aperçu 5173 : le vrai composant `Markdown` dans une carte `.equipe-texte`,
avec les vraies feuilles `style.css`, `v2.css` et `team-answer.css`. Données FICTIVES. Largeur 560 px. La
« réponse principale » est le même texte rendu par `Markdown` hors de la carte, comme dans `RunTurn`.

| Cas | Avant | Après | Réponse principale |
| --- | --- | --- | --- |
| Deux paragraphes et un tableau | 209 px (écarts 35 et 23 px) | 163 px (12 et 0 px) | 163 px (12 et 0 px) |
| Liste avec sous-liste | 418 px (écarts 37 et 37 px) | 187 px (14 et 14 px) | 187 px (14 et 14 px) |
| Liste aérée (deux points) | 205 px, puce séparée du texte | 44 px | 44 px |
| Texte simple, trois lignes | 65 px, 3 lignes | 65 px, 3 lignes | 22 px, 1 ligne (Markdown standard) |

Après correction, les tableaux et les listes d'une carte d'équipe s'affichent exactement comme la réponse
principale. Le texte simple garde ses trois lignes.

## Vérifications

Résultats en bas de ce rapport (suite complète, build, E2E sur le back `agregat-back-reponse-04` en `1d8743a`).

## Non vérifié

- Aucune mission en équipe réelle affichée après la correction : le cas réel `2da0cae5` n'a pas été relu, pour
  ne rien solliciter sur 4310 hors lecture.
- Pas de test unitaire : jsdom ne calcule pas la mise en page. La preuve est la mesure ci-dessus.

## Résultats (17:35)

- `npx vitest run` : 45 fichiers, **598/598**.
- `npm run build` (tsc et vite) : vert. Prettier : vert sur les deux fichiers.
- E2E (`AGENT_PLATFORM_BACKEND_DIR=~/Downloads/agregat-back-reponse-04`, back en `1d8743a`) : **18/18**. Les
  captures `front-01-screens` réécrites par l'E2E sont restaurées (`git checkout`), comme d'habitude.
- Banc jetable supprimé.
