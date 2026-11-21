# meme-affichage-21-11 : une seule façon d'afficher une mission

Demande du propriétaire (21/11, 23:00), avec deux captures : une mission career-ops encore dans l'ancienne vue
(bulle, puis « Étapes du Skill », « Détails techniques », « Exécution · Flux en direct » avec le texte en double),
et la mission « hi » où son message apparaissait deux fois. « Je veux que ça s'affiche pareil tout le temps. »

## Constats
- Pas une régression : depuis le 26/10, `App.tsx` rendait `CareerThread` + `RunView` pour `pack === "career-ops"`
  et `RunTurn` pour le reste. Toutes les missions récentes étaient en `core` ; la première mission career-ops
  depuis le choix explicite du Skill (`48087a51`, 22:59, codex) a remontré l'ancienne vue.
- Double message de « hi » (`b84285a5`), lu dans son journal : question de l'agent à 10:18:59 ; message écrit
  dans le champ du bas à 10:19:14 (`owner_message`, en attente) ; le même texte retapé dans le formulaire de la
  question à 10:19:23 (`answer`) ; le message est alors remis `with_answer`. Deux champs de saisie pour une même
  question : le propriétaire a écrit deux fois.

## Fait
1. **Une seule vue** : `App.tsx` rend pour toute mission `SessionHistory` → `MissionPrompt` → `RunTurn`.
   - `MissionPrompt` (`Career.tsx`) : consigne privée lue par `GET /career/runs/:id/input` pour career-ops
     (sinon `run.prompt`, ou le texte tapé juste avant le lancement).
   - `RunTurn` : résultat privé lu par `GET /career/runs/:id/result` pour une mission career-ops terminée
     (`usePrivateResult`) ; illisible → résumé de la mission avec « Résultat privé illisible… » (comme avant) ;
     « Toutes vos offres enregistrées » (`CareerOffers`, `GET /career/offers`) sous la réponse.
   - Alertes « Agent silencieux » et « Navigateur : Chrome isolé… » en lignes d'incident, pour toutes les
     missions (avant : career-ops seulement).
   - Tours précédents d'une session : chaque tour career-ops lit sa consigne et son résultat privés.
   - Composer : « L’agent travaille… » pour toute mission en cours (avant : career-ops seulement).
   - Retirés de l'écran pour career-ops : ligne d'état « En cours 0,00 € », bouton « Stop » séparé, « Reprendre »
     sur une mission terminée, « Détails techniques (coût, journal brut) » (`RunView`). Remplacés par ce que
     montrent les autres missions : ligne méta (coût, preuves), « Arrêter la mission », « Reprendre la session »
     après un arrêt ou un échec, panneau Activité.
2. **Un message n'apparaît qu'une fois** : un `owner_message` remis `with_answer` dont le texte est celui de la
   réponse n'a plus sa bulle ; seule « Vous, en réponse » reste.
3. **Un seul champ pour répondre** : quand la question ouverte n'a qu'un champ texte libre (ni choix ni liste),
   le champ du bas devient « Répondre à l’agent… » et envoie `POST /runs/:id/answer` `{ action: "accept",
   content: { <clé>: texte } }` (bouton « Envoyer la réponse »). Les questions à choix gardent leur formulaire.

## Tests
- `src/meme-affichage.test.tsx` (4 tests, tous vus en échec avant le code) : career-ops en cours (consigne privée,
  texte une fois, ni `.career-thread` ni détails techniques) ; career-ops terminée (résultat privé et offres dans
  la réponse) ; bulle unique ; champ du bas qui répond à la question.
- `src/App.test.tsx` : 2 assertions adaptées (perte du flux lue dans la ligne d'incident de la réponse au lieu de
  l'ancienne ligne d'état career-ops).
- Suite complète 33 fichiers, 492/492 ; `npm run build` (avec `tsc`) OK ; prettier OK.
- Vu dans l'aperçu 5174 (Chrome) sur la mission réelle `48087a51` en cours, sans rien envoyer : consigne réelle
  dans la bulle, texte de l'agent une seule fois, « Réflexion… », étapes du Skill repliées, champ de chat.
- **Non vérifié** : une mission career-ops terminée réelle (résultat privé et offres) ; le champ du bas qui
  répond à une vraie question (testé seulement en unitaire).
- E2E contre `agregat-back-reponse-04` (23:15) : 18/18 ; captures restaurées après.

## Dette laissée
- `CareerThread` (`Career.tsx`) et `RunView` (`Mission.tsx`) ne sont plus affichés mais restent exportés : des
  tests de composants (`components`, `conversation`, `demandes`, `transcription`) les utilisent encore. À retirer
  avec ces tests dans un lot à part.
