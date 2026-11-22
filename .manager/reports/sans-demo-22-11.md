# sans-demo-22-11 — plus aucune démonstration fictive dans le front

Décision du propriétaire (22/11, 15:15), transmise par le manager de l'arrière ; elle **remplace** E204
(`demo-fictive-22-11` : avertissement et bandeau retirés). Ses mots : « Enlève-moi tous les messages de sécurité,
démonstratifs, fictifs. […] C'est réservé que pour moi. » Côté serveur, le lot `sans-demo-01` (pas encore en service)
retirera les démonstrations du catalogue en mode propriétaire.

## Ce qui change

- `src/sansDemo.ts` : en **mode propriétaire** (`catalog.ownerMode === true`, même règle que le serveur), le catalogue
  est purgé à son chargement de ce qu'il marque comme démonstration : packs `dataMode: "fixture"` (et leurs workflows,
  sauf ceux qu'un pack réel offre aussi), agents `simulated: true`. Aucun nom codé en dur. Composer, Agents, Domain
  Packs, Consommation, Paramètres ne les voient donc plus, même tant que 4310 les renvoie.
- Envoi (`App.tsx`) : `entreeSansDemo` remet en « auto » tout pack, workflow, agent de démonstration et le navigateur
  `fixture` avant `POST /api/runs` (filet, même si l'écran ne les propose plus).
- Accueil : suggestions « Trouver des offres Python et SQL en Australie » et « Rédiger un brouillon de lettre… Offre
  fictive » retirées ; reste « Analyser une idée et structurer les prochaines étapes » (pack Général, réel).
- Composer : option « Navigateur fictif · démonstration » retirée ; avertissement « Démonstration fictive… » et bouton
  « Faire une vraie recherche » retirés.
- Réponse : bandeau « Démonstration fictive » retiré. Le Bilan du serveur reste tel quel.
- Hors mode propriétaire (bancs de test, E2E), le catalogue reste entier : l'agent simulé y fait tourner les missions.
- Tests : `src/demo-fictive.test.tsx` supprimé (sans objet), `src/sans-demo.test.tsx` (8) ; E2E : la suggestion
  cliquée devient « Analyser une idée ».

## Vérifications

- Aperçu 5173 sur le catalogue de 4310 (`ownerMode: true`, qui liste encore najah et l'agent `fixture`) : agents
  Codex, Claude Code, Gemini, OpenCode ; packs Général et Candidatures ; navigateurs Auto, Playwriter, Chrome isolé ;
  une seule suggestion. 80794f16 rouverte (GET) : plus de bandeau, « Détails des actions » du Bilan intact.
- Tests de composant : corps de `POST /api/runs` en `pack`, `workflow`, `agent`, `browser` « auto » ; ni najah ni
  `fixture` dans les listes ; Domain Packs sans le pack de démonstration ; hors mode propriétaire, l'agent simulé reste.
- Build vert ; vitest **589/589** (43 fichiers) ; E2E **18/18** (back `agregat-back-reponse-04`). Deux passages
  à 17/18 avant, chaque fois avec l'aperçu 5173 qui démarrait en même temps : « défilement FICTIF » (attente de
  30 s) passe seul deux fois (15 s, 13 s), puis la suite entière passe. Test sensible à la charge, pas lié au lot.

## Point 5 : mises en garde ajoutées par le front

Liste donnée au propriétaire dans la discussion, **sans rien retirer** en attendant sa décision (voir la réponse du
22/11 vers 16:00).
