# Lot `streamdown-23-11` — essai de Streamdown, retenu : `remend` seul

Demande du propriétaire (23/11, « Oui, l'essayer ») après la recherche sur l'affichage « à la Claude Code ».

## Essai de Streamdown 2.7.1 (Vercel, Apache-2.0)

- 2.8.0 trop récente (6 jours) : 2.7.1 (19/10) épinglée ; `npm audit` : 0 vulnérabilité.
- Branché à la place de react-markdown en gardant nos composants (liens, tableaux, code, graphiques, Mermaid),
  `controls={false}`, `linkSafety` désactivé, `skipHtml`. Deux défauts sans Tailwind : gras rendu en
  `<span class="font-semibold">` (donc sans gras ici) et classes Tailwind sur chaque balise → balises simples
  imposées ; enveloppe `div` ajoutée → rendue transparente (`display: contents`).
- Mesures sur le banc de rejeu (mission `3c0935ae`, Chrome sans écran, mode dev) :

| | react-markdown (avant) | Streamdown | react-markdown + remend (retenu) |
| --- | --- | --- | --- |
| Flux dense, 30 s : calcul | 9,0 s | 10,4 s | 9,1 s |
| idem : mémoire | 76 Mo | 190 à 220 Mo | 79 Mo |
| idem : tâches longues | 0,05 s | 0,05 à 0,11 s | 0 |
| Ouverture (3 671 événements) : calcul | 0,86 s | 2,1 à 2,5 s | 0,84 s |

- Non retenu ; gardé sur la branche locale `claude/essai-streamdown-23-11` (`12e5943`).

## Retenu : `remend` 1.4.0 (moteur de complétion de Streamdown, Apache-2.0, sans dépendance, 28 Ko)

- Seulement sur le dernier texte d'une mission en cours (`Markdown streaming`, passé par `RunTurn`) :
  `**ton CV` s'affiche en gras pendant l'écriture ; lien inachevé en texte seul (`linkMode: "text-only"`, aucune
  adresse inventée) ; images inachevées non touchées. Un texte terminé n'est jamais retouché.
- `npm audit` : 0 vulnérabilité ; `THIRD_PARTY_NOTICES.md` régénéré (`scripts/dependency-notices.mjs`).
- Tests : 3 ajoutés (`affichage-23-11.test.tsx`) ; 636/636 ; build vert.
- Incident de banc : après le retour de branche, le cache de Vite du banc (5174) gardait Streamdown → relancé
  avec `--force` ; le front du propriétaire (5173) vérifié intact.
