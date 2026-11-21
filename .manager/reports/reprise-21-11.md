# Note de reprise (21/11/2026, soir, fin de la conversation « passation-reprise-21-11 »)

> **Mise à jour du 21/11, 21:30 (session « reprise-chantier-1229be »)** : le code le plus récent est maintenant
> dans le worktree `~/Downloads/agregat-front/.claude/worktrees/reprise-chantier-1229be`, branche
> `claude/reprise-chantier-1229be` (**poussée sur `origin`** le 21/11 vers 21:30 à la demande du propriétaire,
> pas de pull request ; vers 22:30, **`main` local et distant avancés sans fusion jusqu'à `4d78f96`** à sa
> demande, « Oui, sur main »), partie en avance rapide de
> `claude/passation-reprise-21-11-a815c6` (`a3319be`). Lot ajouté : **defauts-21-11** (`d4dab46`, rapport
> `defauts-21-11.md`) — vue scindée plein écran rendant le dessous inerte, tableau Consommation empilé sous
> 560 px, schéma Mermaid au thème de l'application. Suite 478/478, build et prettier verts, **E2E 18/18**
> (21:24, back `agregat-back-reponse-04`). Route des fichiers **en service sur
> 4310** depuis la relance de 21:30:55 (`agregat-back-reponse-04`, `faf6c98`) ; vérifié à 21:40 avec l'identifiant
> complet d'une mission (`GET …/file?path=<absent>` → 404 « Fichier introuvable »). Un identifiant au mauvais format
> rend toujours « Route introuvable » : ce n'est pas une preuve d'absence de la route. Le commit `361c03a` de la
> session de passation (21:32) est repris ici (`-x`) : **cette branche contient tout**, la branche
> `claude/passation-reprise-21-11-a815c6` n'a plus rien en propre. L'aperçu 5173 sert toujours l'ancien worktree `passation-reprise`
> (sans ce lot).

À lire en premier par la session qui reprend. Rapports détaillés de cette conversation, dans l'ordre :
`chat-mission-21-11.md`, `fichiers-fil-21-11.md`, `equipe-05.md`, `skill-explicite.md`. Lots d'avant :
`test-ui-21-11.md`, `reponse-04.md`, `sous-agents-19-11.md`, `activity-panel-03.md`.

## 1. Où est le code
- **Front** :
  - worktree `~/Downloads/agregat-front/.claude/worktrees/passation-reprise-21-11-a815c6` ;
  - branche `claude/passation-reprise-21-11-a815c6`, **poussée sur `origin`** le 21/11 au soir à la demande du
    propriétaire (« pousse la branche pour que je voie le rendu ») ; elle contient tout `claude/bold-goldstine-171eb9`
    (lots du matin) plus cette conversation ;
  - `main`, local et distant, est inchangé (`7b2716c`). Pas de pull request ouverte.
  - L'ancien worktree `bold-goldstine-171eb9` est resté à `e6a065c`. Ne plus le prendre comme référence.
- **Aperçu du propriétaire** :
  - Vite sur 127.0.0.1:5173, lancé par `preview_start` (configuration `front` seule dans `.claude/launch.json` de ce
    worktree, non commité) depuis ce worktree : il sert directement les sources de la branche.
  - API sur 127.0.0.1:4310, **gérée par le manager du back** (session `agregat-back-c8`) depuis
    `~/Downloads/agregat-back-reponse-04`, branche `reponse-04-format`, tête `a50b247` à 20:47. **Ne jamais la
    relancer** (conflit de port) ; le manager prévient quand il la relance.
  - Le panneau du navigateur intégré est très étroit (environ 300 px) : barre latérale repliée, liste des missions
    invisible. Pour voir le rendu, ouvrir http://127.0.0.1:5173 dans Chrome (fait en fin de conversation, onglet
    laissé ouvert).
- **Back, mes branches (locales, jamais poussées)** :
  - `fichiers-21-11` (`b63323c`, dossier `~/Downloads/agregat-back-fichiers`) : route `GET /api/runs/:id/file`.
    **Relue, durcie et intégrée par le manager**, en service sur 4310 depuis 21:3x :
    - `reponse-04-format` est à `faf6c98` ; commits de relecture `8b73a90` et `a817390` dans ce dossier ;
    - 4 défauts corrigés : tube nommé, course lstat/ouverture (409), lien physique (403), dossier de mission qui est
      un lien ou trop large (403) ;
    - tout espace privé est fermé, même en mode propriétaire ;
    - suite complète du back verte (2 013/2 016, 0 échec).
    Ce dossier appartient désormais au manager : ne plus y toucher.
  - `reponse-04-format` : créée par une session d'avant, elle est maintenant la branche du manager (API 4310).
    Lecture seule.
- Le manager a demandé de **ne modifier ni `docs/api-equipe-vue.md` ni ses fichiers back** en attendant ses lots.

## 2. Règles du propriétaire (à garder)
- **Le back a toujours la priorité** :
  - le front suit le contrat du back le plus récent ;
  - on ne touche pas aux arbres du manager et on n'impose pas de contrat concurrent ;
  - on économise l'usage et la machine (tests en `nice`, `--maxWorkers=2`, pas de revue multi-agents).
- Pousser la branche front : seulement quand le propriétaire le demande (fait deux fois le 21/11 pour « voir le
  rendu »). Le back n'est jamais poussé par le front : c'est le manager qui décide.
- **Un Skill ne s'active jamais tout seul** (décision du 21/11 vers 18:45) :
  - l'utilisateur le choisit dans la zone de saisie, comme le modèle ;
  - sans choix, aucune détection d'après le prompt ;
  - la détection reste permise **à l'intérieur** d'un pack choisi (choix du workflow).
- **La discussion ne perd rien** : texte de l'agent des tours d'avant, questions de l'agent, réponses du propriétaire,
  messages pendant la mission, dans l'ordre.
- **Un utilisateur lambda doit pouvoir lire et télécharger les fichiers produits.**
- **Écrire à l'agent pendant qu'il travaille** doit être visible (champ de chat), pas caché derrière un crayon.
- Faire une passation (décisions, fichiers, état) dans cette note avant de rendre la main.
- Le propriétaire fait souvent passer ses demandes au manager du back par un « prompt » à coller. Le manager écrit
  aussi directement à cette session (messages entre sessions) ; lui répondre par `SendMessage` vers son adresse
  `uds:/tmp/cc-socks/42287.sock` (session `agregat-back-c8`).

## 3. Fait dans cette conversation (21/11, après-midi et soir)
Commits `[préfixe]` sur la branche front, dans l'ordre. Chaque lot : tests écrits d'abord et vus en échec, puis
verts ; suite complète, `tsc`, build et prettier verts au commit.

1. **chat-mission-21-11** (`2fe8b65`) : `MissionPill` devient un champ de chat toujours visible à la place du composer
   pendant une mission d'agent (« Écrire à l’agent pendant qu’il travaille… »), avec Arrêter à côté de l'envoi.
   - La route `POST /runs/:id/message` est inchangée (remise par steering pour Claude et Codex, sinon en fin de tour).
   - En workflow, seul l'arrêt flottant reste (le back refuse les messages).
2. **fil-21-11** (`9dbefbd`, corrigé dans `4881c38`) :
   - `activity(events, { exchanges: true })` rend aussi les `question` et `answer` ;
   - le texte est coupé aux changements de tour (`question`, `answer`, `verdict_turn`, `verification`, `state`) ;
   - `RunTurn` affiche une suite ordonnée : texte, « Vous, pendant la mission », « Question de l’agent » (sans doublon
     si elle est déjà en fin de texte), « Vous, en réponse » (titres des choix du formulaire) ;
   - seul le **dernier morceau de texte** est remplacé par la réponse finale ;
   - le fil career-ops (`RunView`) est inchangé.
   - Vérifié sur la mission réelle `bd54ee7a` : 4 700 → 30 000 caractères, rien ne manque.
3. **fichiers-21-11**, front (`4881c38`) :
   - cartes de fichiers produits avec « Ouvrir » (aperçu Markdown, texte ou image sous la carte, 200 000 caractères au
     plus) et « Télécharger » (blob) ;
   - chemin court relatif à `run.cwd` ;
   - un back sans la route répond « Ouverture des fichiers pas encore disponible sur ce serveur (back à mettre à
     jour) », ce qui est le cas sur 4310 aujourd'hui.
   - Back : branche `fichiers-21-11` (voir section 1). Un message à coller au manager pour l'intégration a été remis
     au propriétaire en fin de conversation.
4. **equipe-05** (`fc6d187`, `762b035`, `566a6dd`) : maquette « Panneau equipe v6 » (archive « panneau equipe
   agregat agent ai.zip », seuls 2 fichiers neufs versés dans `design_handoff_conversation_agent/`).
   - **Équipe** :
     - liste verticale, une ligne par sous-agent, groupée par `etape` ;
     - ligne dépliée au clic, une seule à la fois : raison (`motif`, sinon une phrase tirée de `pourquoi`), Modèle,
       Jetons, Dernière action, verdict, échec, « Voir le résultat » / « Suivre en direct », Arrêter ;
     - statut global en tête ;
     - phrase `decoupage`.
   - **Ce que l’équipe a appris** :
     - pièges (« ! ») et méthodes (« ✓ ») du carnet ; titre d'une phrase, puis « Ce qui s’est passé » et « Ce qu’il
       faut faire » (forme des leçons du back : ligne 2 = règle) ;
     - les autres notes vont dans le pli « Autres notes du carnet » ;
     - « N leçons gardées en mémoire » d'après les `lecon_gardee`, et « gardée en mémoire » par note si `lecon.id`.
   - **Défaut existant corrigé** : « Ouvrir en grand » rend la barre latérale effacée par la vue scindée (`App.tsx`).
   - 41 tests existants adaptés : même protection, il faut seulement déplier la ligne.
   - Captures avant/après en sombre (1440 et 760 px) dans `.manager/reports/equipe-05/`. Script :
     `scripts/equipe-05-captures.mjs avant|apres` (banc isolé sur le back `agregat-back-fichiers`).
5. **skill-explicite** (`5654a1a`, `e6a065c`, `0f73705`, `3bd2ce7`) :
   - le réglage « Skills » (cases) devient le sélecteur « Skill » : « Aucun Skill » par défaut ; le Skill part avec
     son pack (`catalog.packs[].skills`) ; un Skill inactif n'est pas choisissable ;
   - le bouton des réglages dit le Skill (« Auto · défaut · aucun Skill ») ;
   - le réglage Pack est rangé en dernier sous « Avancé » (accord du propriétaire) ; l'option `auto` s'appelle
     « Aucun · chemin général » ;
   - workflow `auto` : « Auto · choisi dans le pack selon l’objectif », avec l'aide « Sans pack choisi : chemin
     général. » ;
   - « Pack · aucun » dans les réglages d'une mission.
6. **Surveillance d'une mission réelle** : un agent en lecture seule (GET seulement) a suivi `bd54ee7a` pendant
   20 min. Rien de bloquant. Constats utiles :
   - le doublon signalé (0,72) a quand même été lancé ;
   - x.com répond 402 ;
   - le coût de la mère n'est pas rapporté ;
   - le résultat d'un membre est coupé à 600 caractères dans `family[]` (prévu par la doc).

## 4. Décisions prises (à valider par le propriétaire si besoin)
- **Panneau Activité gardé à 344 px** (maquette v6 : 380). Passer à 380 décalerait les seuils 1180, 1340 et 1560 px et
  leurs tests ; lot à part s'il le veut.
- **Équipe, accessibilité et couleurs** :
  - l'état reste écrit (lecteur d'écran, et à l'écran hors « terminé » et « en cours ») : règle swarm-09, jamais la
    couleur seule ;
  - « en cours » est bleu comme sa pastille (table d'états), l'orange est gardé pour « en attente de toi » ;
  - plus de ligne « Chef : … ».
- **Pas de « gardés en mémoire » affirmé** : sans lien note → leçon, on dit seulement le total réel.
- **Un seul Skill par mission** dans l'interface (l'API accepte une liste).
- **Fichiers** : la route back refuse career-ops (et maintenant tout espace privé, d'après la relecture du manager).
  HTML, SVG et JS sont toujours téléchargés, jamais affichés.
- Aperçu 5173 servi depuis ce worktree plutôt que `bold-goldstine`.

## 5. Contrats du back suivis par le front
- **Message à l'agent** : `POST /api/runs/:id/message` (`docs/api-message.md`) ; 409 pour une mission finie ou un
  workflow, 404 pour un back ancien : repli sur la reprise.
- **Fichiers** : `GET /api/runs/:id/file?path=…[&download=1]` (`docs/api-fichiers.md`), **en service sur 4310**
  (21:3x). Contrat inchangé pour le front ; seuls des refus 403 et 404 et un cas 409 (« Fichier remplacé pendant la
  lecture : réessayer ») s'ajoutent, affichés tels quels sous la carte.
  - Vérifié dans Chrome sur `bd54ee7a` : « Ouvrir » affiche `publications-relay.md` en Markdown.
  - Vérifié par `curl` : les 4 fichiers en `download=1` répondent 200, `attachment` avec le bon nom et le bon type.
  - Questions laissées au propriétaire par le manager : borne plus forte (seulement sous le dossier des missions),
    pièces jointes d'une mission non privée servies par la route, API sans authentification.
- **Équipe v6**, noms choisis par le manager, lot `equipe-v6-01` (branche `equipe-v6-01`, `d5f9f57`) codé, **pas encore
  intégré ni sur 4310** :
  - `decoupage` (1-300) sur la mère et dans `equipe` des lignes de la liste ;
  - `etape: { numero, libelle? }` dans `family[]` : « N. libellé » ou « Étape N », « Autres tâches » pour un membre
    sans étape valide ;
  - `motif` dans `family[]` ;
  - notes du carnet : `titre`, `situation`, `regle` et `lecon: { id }`.
  Le manager enverra les exemples JSON à l'intégration : **revérifier le front alors**.
- **Skill explicite** (`skill-explicite-01`, sur 4310 depuis 20:47) :
  - `pack: "auto"` (ou absent) avec `skills: []` = chemin général, sans détection ;
  - un pack ne joue que s'il est choisi (pack, Skill d'un pack, espace, ou DAG d'un seul pack) ;
  - le pack career-ops choisi sans son Skill est refusé (« Skill inconnu : career-ops… », affiché tel quel) ;
  - le front garde `auto` sans choix (le manager le demande).

## 6. Fichiers front modifiés dans cette conversation
- **Code** :
  - `src/MissionPill.tsx` (champ de chat) ;
  - `src/Career.tsx` (`activity()` : questions, réponses, coupure des tours ; types `AskedQuestion`, `OwnerAnswer`) ;
  - `src/RunTurn.tsx` (`conversation()`, `answerText()`, `AnswerBubble`, `FileCard` avec Ouvrir et Télécharger) ;
  - `src/Team.tsx` (`TeamBlock`, `TeamRow`, `noteParts`, `NoteRow`, `CarnetBlock` réécrits) ;
  - `src/Composer.tsx` (sélecteur Skill, Avancé, libellés du pack et du workflow) ;
  - `src/ActivityPanel.tsx` (`lessonsKept`) ;
  - `src/App.tsx` (« Ouvrir en grand ») ;
  - `src/api.ts` (`fetchRunFile`, `runFileUrl`, `FILES_UNSUPPORTED`) ;
  - `src/types.ts` (`Run.cwd`, `Run.decoupage`, `TeamSummary.decoupage`, `FamilyMember.etape`, `CarnetNote.titre`,
    `situation`, `regle` et `lecon`) ;
  - `src/v2.css` et `src/style.css`.
- **Tests neufs** : `src/fil-21-11.test.tsx`, `src/fichiers-21-11.test.tsx`, `src/equipe-05.test.tsx`,
  `src/skill-explicite.test.tsx`.
- **Tests adaptés** :
  - `src/App.test.tsx`, `orienter.test.tsx`, `orienter-contrat.test.tsx`, `v2.test.tsx` ;
  - `equipe.test.tsx`, `sous-agents.test.tsx`, `sous-agents-app.test.tsx`, `swarm-09-relecture.test.tsx`,
    `swarm-11.test.tsx`, `swarm-11-relecture.test.tsx` ;
  - `reponse-04.test.tsx` ;
  - `tests/e2e.test.mjs` (réglages « Skill », « Mode », « Avancé »).
- **Autres** :
  - `scripts/equipe-05-captures.mjs` ;
  - `design_handoff_conversation_agent/Panneau equipe v6.dc.html` et `PROMPT-claude-code-equipe-05.md` ;
  - rapports `.manager/reports/{chat-mission-21-11,fichiers-fil-21-11,equipe-05,skill-explicite}.md` et cette note ;
  - captures dans `.manager/reports/equipe-05/`.
- **Supprimés** : aucun fichier. Les anciennes classes CSS de l'équipe en grille sont retirées (`team-members`,
  `team-notes`, `team-open`, `team-chef`).

## 7. État des vérifications (21/11, 21:00)
- `npm test` : 30 fichiers, **475/475**.
- `tsc --noEmit`, `npm run build` et prettier : OK.
- Vu dans l'aperçu (5173 sur 4310, données réelles, rien lancé ni envoyé) :
  - champ de chat ;
  - fil complet de `bd54ee7a` ;
  - panneau Équipe et notes ;
  - sélecteur Skill, « Avancé », libellés du pack et du workflow.
- Banc isolé sur 4330 (back `fichiers-21-11`) : aperçu Markdown, en-têtes de téléchargement, refus hors dossier.
- **Non vérifié** :
  - E2E non relancé depuis 13:15 (18/18 alors) ;
  - aucun vrai agent lancé ;
  - « Télécharger » pas cliqué dans un navigateur (rien enregistré sur la machine) ; vérifié par les en-têtes et un
    test unitaire.

## 8. Reste à faire
1. **Attendre le manager** :
   - intégration de `equipe-v6-01` ; ensuite, comparer ses exemples JSON avec le front (`decoupage`, `etape`, `motif`,
     `titre`, `situation`, `regle`, `lecon`) et refaire les captures.
2. **Questions encore ouvertes au propriétaire** :
   - tutoiement ou vouvoiement partout (mélangés ; une douzaine de tests figent le « vous ») ;
   - refondre le fil career-ops sur `RunTurn` ? garder la vue scindée ?
   - panneau Activité à 380 px comme la maquette v6 ?
   - un champ pour écrire à un sous-agent depuis « Voir à côté » (non vérifié côté back) ?
   - « fichiers en pièces jointes à chaque réponse » : non reproduit, demander une capture si ça revient.
3. **Petits défauts laissés** (`test-ui-21-11.md`) : Mermaid, Consommation à 375 px et Tab sous la vue scindée
   sont **corrigés** (lot `defauts-21-11`). Reste « composer replié plus haut », gardé exprès (accès clavier).

## 9. Commandes utiles
- Tests : `nice -n 10 npx vitest run --maxWorkers=2` ; build : `nice -n 10 npm run build`.
- Captures de l'équipe : `npm run build && node scripts/equipe-05-captures.mjs apres`.
- E2E : `AGENT_PLATFORM_BACKEND_DIR=$HOME/Downloads/agregat-back-reponse-04 nice -n 10 node --test --test-concurrency=1 tests/e2e.test.mjs`.
  Après un E2E, lancer `git checkout -- .manager/reports/front-01-screens/` (il réécrit ces captures).
- Banc isolé hors des serveurs du propriétaire : `createApp({ dataDir: <tmp>, live: false, webDir: dist })` avec
  `AGENT_PLATFORM_NETWORK=0`, `AGENT_PLATFORM_BROWSER=fixture`, et `AGENT_PLATFORM_CAREER_WORKSPACE`,
  `AGENT_PLATFORM_WORKSPACE_ROOTS`, `AGENT_PLATFORM_SKILL_ROOTS` vers un dossier temporaire. Hors contexte de test,
  l'espace career-ops par défaut est le vrai du propriétaire.
- `git rev-parse --short` n'accepte qu'une révision à la fois.
