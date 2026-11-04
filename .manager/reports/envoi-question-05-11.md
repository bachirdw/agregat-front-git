# envoi-question-05-11 — bouton d'envoi et formulaire de question

Branche `envoi-question` depuis `main` (d842e35). Contrats : `agregat-back-astra/docs/api-sends.md`
et `docs/api-questions.md` (lus, back non modifié).

## Journal
- 09:45 — Constat dans le code :
  - mission career-ops : le bouton d'accord existe (`RunView`) mais il est rangé dans « Détails techniques », replié ;
  - avec `expiresAt: null` (envoi en mode propriétaire, sans plafond), `now >= null` est vrai : le bouton était désactivé ;
  - aucun affichage de `pendingQuestion`, aucun appel à `POST /runs/:id/answer`, pas de libellé pour `awaiting_owner`.
- 09:45 — Test rouge `src/demandes.test.tsx` (module absent).
- 09:47 — Implémentation :
  - `src/OwnerRequests.tsx` : carte d'accord (libellés « Approuver l’envoi » / « Refuser » pour `actionClass: "send"`, sinon ceux de l'agent ; « Sans délai » si `expiresAt` est nul) ;
  - formulaire de question : bandeau, réponses rapides (`prose`), un champ par propriété du schéma, « Répondre » / « Décliner », erreur 400 affichée sans fermer le formulaire ;
  - `CareerThread` affiche ces demandes dans le fil ; `RunView` les affiche hors career-ops (`requests={false}` dans le fil career-ops pour ne pas doubler) ;
  - libellé `awaiting_owner` « Attend votre réponse », suivi « Attend ta réponse ».
- 09:47 — `npm test` : 162 verts (154 + 8) ; `npx tsc --noEmit` : OK ; prettier : OK.
- 09:47 — e2e complet lancé contre agregat-back-astra (avant l'ajout des deux scénarios e2e envoi/question).
- 09:53 — e2e complet (avant les nouveaux scénarios) : 16/16 contre agregat-back-astra (ddcad82).
- 09:53 — Deux scénarios e2e ajoutés. Premier passage : 17/18, « question de l'agent » en échec (formulaire jamais affiché). Cause : l'agent « fixture » du back (`tests/fixtures/agent.js`) ne pose pas de question ; c'est `tests/fixtures/fake-acp.js` (`askQuestion`) qui le fait. Le scénario remplace l'agent du plan comme le fait `tests/elicitation.test.js` du back. Relancé : 2/2 verts.
- Captures : `16-envoi-a-approuver.png`, `17-question-agent.png` (non commitées, comme les autres captures).

## Branché sur l'API réelle
- `POST /api/permissions/:id` avec l'`optionId` de l'option choisie (déjà existant, désormais visible dans le fil career-ops).
- `GET /api/runs/:id` → `permissions`, `pendingQuestion`, état `awaiting_owner` ; `POST /api/runs/:id/answer` (`accept` + champs remplis, ou `decline`).
- Rafraîchissement : inchangé (relecture de la mission à chaque événement SSE, dont `question`/`answer`/`permission`, et toutes les 2 s).

## Non fait / limites
- Brouillons (`GET /api/career/drafts`, ouverture Gmail, copie du brouillon LinkedIn) et file globale `/api/career/pending` : hors de ce lot.
- Barre latérale : l'état d'une mission en attente (accord ou question) reste « En cours » jusqu'au rechargement de la liste. Défaut antérieur, non corrigé ici.
- Jamais exercé avec un vrai agent ni dans le fil career-ops réel : seulement tests unitaires (fil career-ops) et e2e avec agents de test (vue mission hors career-ops).
