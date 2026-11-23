# Lot `lenteur-23-11` — lenteur perçue pendant les CV et lettres, présentation d'un Skill

Brief du manager de l'arrière (session « Passation 23-11 matin », 23/11 vers 15:55), à la demande du propriétaire.
Branche `claude/new-session-58f920` (worktree `.claude/worktrees/new-session-58f920`), commits locaux, rien poussé.

## Journal

- 15:58 — Front relancé sur 5173 (`npm run dev`, proxy vers 4310), `.claude/launch.json` ajouté (non commité).
- 16:00 — Mesures par `curl` sur la mission `3c0935ae` (lecture seule) : `GET /api/runs/<id>?equipe=1` = 106 Ko
  (`result` 37 Ko, `usage` 65 Ko) ; flux `events?after=0` = 4,47 Mo, 3 671 événements, servi en 0,05 s ;
  **`GET /api/runs` (liste) = 14,3 Mo**, 0,65 à 1 s, une entrée pèse jusqu'à 1,35 Mo (elle contient `result`).
- 16:03 — Banc de rejeu en lecture seule (dossier temporaire de la session, hors dépôt) : un proxy sur 127.0.0.1:4399
  rejoue le flux enregistré de `3c0935ae` à vitesse réelle comme une mission en cours, relaie le reste en GET vers
  4310 et **refuse tout ce qui n'est pas GET** ; un second front sur 5174 le vise. Mesures dans Chrome sans écran
  (playwright-core du projet, sondes posées avant le code de l'app : arrivée SSE → mutation du DOM → image
  suivante, tâches longues, CPU par CDP, requêtes). Le panneau navigateur de l'app était masqué (images ralenties) :
  ses chiffres ne sont pas retenus.
- 16:08 — Résultats avant correction (voir tableau). Profil CPU de la fenêtre la plus dense : `pretty` (ré-indentation
  JSON des résultats d'outils, refaite à chaque événement) 2,7 s, react-markdown ≈ 3 s (tous les textes reconvertis
  à chaque morceau), 157 relectures de la mission en 30 s.
- 16:12 — Corrections (ci-dessous), tests ajoutés `src/lenteur-23-11.test.tsx`.
- 16:14 — `npx vitest run` : 613/613 ; `npm run build` vert. E2E non relancés (ils demandent un back à
  `../agregat-back` ou `AGENT_PLATFORM_BACKEND_DIR` ; rien de touché côté serveur).
- 16:17 — Captures sur le banc : « Rédige <fichier de l’offre>.md · 15 s » (nom réel non recopié : donnée privée) pendant la
  rédaction ; carte « Comment fonctionne career-ops » en tête (texte d'essai injecté par le proxy, repliée car
  2ᵉ échange de la conversation).

- 16:25 — Réponse du manager : `presentation` accepté tel que proposé (`packs[]` et `skills[]` de
  `/api/catalog`), lot arrière `api-front-01` lancé ; liste légère **additive** (option de requête sur
  `GET /api/runs`, liste par défaut inchangée), nom de l'option et forme du résumé de consommation à venir, le
  front basculera ensuite ; bouton de notification : question posée au propriétaire ; relecture indépendante de
  `6e1cb78` en cours (lecture seule).

- 16:40 — Oui du propriétaire (16:33, relayé par le manager) : bouton « Me prévenir quand l’agent m’attend »
  (`src/NotifyOwner.tsx`) dans la barre du champ de chat pendant une mission. Permission demandée seulement au clic ;
  accordée → « Notifications activées » ; refusée → « Notifications bloquées par le navigateur », sans redemander ;
  navigateur sans notifications → rien ; masqué sous 760 px. 617/617, build vert, capture sur le banc conforme.

- 17:30 — Relecture indépendante de `6e1cb78` (relayée par le manager) et contrat `api-front-01` :
  - **corrigé 1** (membre qui attend) : `src/owed.ts` compte les missions qui attendent par racine d'équipe : lignes en
    attente, `activity.awaitingOwner` des lignes, `family[]` (état, `pendingQuestion`, `pendingPermission`) de la mission
    ouverte, qui décide seule pour sa racine (plus fraîche que les lignes de membres) ;
  - **corrigé 2** : rien n'est notifié avant la première liste (`loading`), une attente déjà là au chargement n'est pas
    nouvelle ;
  - **corrigé 3** : `new Notification` sous try/catch (Chrome Android) ;
  - **corrigé 4** : commentaire et test « auto » remplacés par `core` (le back enregistre le pack résolu) ;
  - **corrigé 5** : Codex « Editing file » : chemin lu dans le bloc `diff` de `content` → « Rédige <fichier> », sinon
    « Rédige un fichier » (jamais « Exécute Editing file ») ;
  - **corrigé 6** par 1 : après une réponse à un membre, la relecture de la mère (avec `family[]`) fait foi ;
  - **laissé 7** (course déjà présente : un instantané plus ancien peut écraser un état plus récent) : lot à part, il
    faudrait comparer un numéro de séquence côté API ; le battement de 2 s rétablit l'état ;
  - **corrigé 8** : nom réel d'un fichier de candidature retiré de ce rapport ; il reste dans l'historique de
    `6e1cb78` (aucune réécriture d'historique sans accord : à trancher avant tout push) ;
  - **corrigé 9** : notification aussi quand la fenêtre n'a pas le focus (`!document.hasFocus()`) ;
  - **10** : tests ajoutés (notification, retour du titre, chargement, constructeur refusé, membre en attente, Codex).
  - Liste : `App.tsx` lit `/runs?vue=liste` (sans effet sur l'API actuelle, qui ignore l'option : vérifié 200, liste
    complète) ; type `ListedRun` ; `Run.result` peut être nul et `evidence` est facultatif (déjà lu avec `?.`). Les
    simulations de liste des tests suivent la nouvelle adresse (30 lignes, 12 fichiers ; les envois `POST /runs` non
    touchés). 624/624, build vert.

## Mesures (mission `3c0935ae`, Chrome sans écran, mode dev de Vite comme chez le propriétaire)

| Situation | Avant | Après |
| --- | --- | --- |
| Ouvrir la mission terminée (3 671 événements) | flux fini en 0,43 s, 0,86 s de CPU | inchangé |
| Rédaction du CV (45 s, 0,6 événement/s) | affichage p50 36 ms, p99 70 ms ; « Exécution… » seul | « Rédige <fichier> · 23 s » |
| Fenêtre la plus dense (30 s, 2 427 événements) : CPU | 21,6 s (72 % du temps) | 9,0 s |
| idem : tâches longues (> 50 ms) | 48, 2,6 s | 1, 0,05 s |
| idem : relectures de la mission | 157 (17,3 Mo) | 16 (1,8 Mo) |
| idem : tas JS | 208 Mo | 76 Mo |
| idem : délai d'affichage p50 / p99 | 54 / 115 ms | 49 / 68 ms |
| Question de l'agent → formulaire visible | 118 ms | inchangé |
| Titre de l'onglet pendant une question | « agre agent · Mission » | « (1) À vous de répondre · agre agent · Mission » |

Ce qui n'est **pas** lent dans le front : l'ouverture d'une longue mission, le délai entre un événement et son
affichage, l'apparition d'une question. Les secondes d'attente pendant un CV viennent du modèle qui écrit le document
dans son appel d'outil (constat du manager) ; le front ne pouvait que mieux le montrer.

## Corrections (front)

1. `Career.tsx` `runningToolWait` + `Waiting` (`since`) ; `RunTurn.tsx` : la ligne d'attente nomme l'action en cours
   — « Rédige <nom du fichier> » si l'outil écrit (nom contenant write/edit/create/save/render/pdf/generate/export,
   ou `kind: edit`) et donne un chemin, sinon « Exécute <outil> » ; temps écoulé depuis le début de l'appel
   (heure du serveur, rien sous 3 s) ; « · 4 300 caractères » si le texte arrive dans `rawInput`.
2. `App.tsx` : titre de l'onglet « (n) À vous de répondre · … » tant qu'une mission attend le propriétaire ;
   notification du navigateur seulement si l'onglet est caché **et** que le propriétaire l'a déjà permise (aucune
   demande de permission ajoutée).
3. `App.tsx` : un événement `agent` (texte, appels d'outils, usage) ne déclenche plus la relecture immédiate de la
   mission ; le battement de 2 s la fait. Les autres événements (état, question, réponse, étape…) la gardent.
4. `Career.tsx` : résultat d'outil lu une fois par événement (`WeakMap`) ; `Markdown.tsx` : `memo`, un texte
   inchangé n'est plus reconverti.

## Point 2 — présentation d'un Skill (proposition au back)

- Champ proposé : **`presentation`** (chaîne Markdown courte, français, 1 à 3 phrases) dans le manifeste du pack côté
  plateforme (`domain-packs/career-ops/manifest.yaml`), jamais dans la bibliothèque du Skill.
- Exposé par **`GET /api/catalog`** (route que le front lit déjà) : `skills[].presentation` pour le Skill servi par le
  pack (`career-ops`) et `packs[].presentation`.
- Front (fait) : `SkillPresentation.tsx`, carte repliable « Comment fonctionne <Skill> » en tête du fil ; texte du
  Skill choisi (`run.skills[0]`), sinon du pack choisi ; ouverte au premier échange d'une conversation, repliée aux
  suivants ; rien sans texte (pas d'avertissement, pas de texte écrit en dur).

## Demandé au back (non fait ici)

- `GET /api/runs` (14,3 Mo) : une liste légère sans `result`, `missionProof`, `usage` détaillé ; le front relit la
  liste au chargement et à chaque fin de flux. À voir avec le manager : la page Consommation lit `usage` dans cette
  liste, il faudrait un champ résumé ou une route à part.

## Questions pour le manager / le propriétaire

- ~~Bouton « Me prévenir »~~ : oui du propriétaire, fait (16:40).

## Fichiers modifiés

`src/App.tsx`, `src/Career.tsx`, `src/RunTurn.tsx`, `src/Markdown.tsx`, `src/types.ts`, `src/style.css`,
`src/SkillPresentation.tsx` (nouveau), `src/lenteur-23-11.test.tsx` (nouveau), ce rapport, note de reprise.
