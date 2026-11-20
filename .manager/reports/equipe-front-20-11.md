# equipe-front-20-11 — interface de l'équipe d'agents

Branche `equipe-front-20-11`, tête de départ `7b2716c`. Contrat lu : `agregat-back-equipe-essai` (tête `c1fb352`),
`docs/api-delegation.md` en entier, `packages/orchestrator/delegation.js` (`view()`, `line()`, `teamOf()`),
`carnet.js` (`view()`, `publicNote`), `roles.js` (forme du verdict), tests `equipe-01-roles` et `equipe-01-carnet`.

## Journal

- 08:50 — Départ. Base : `npx vitest run` → 15 fichiers, 242 tests verts.
- 08:50 — Écarts relevés entre le brief et l'API réelle (à `c1fb352`) :
  - la vue `family` de `GET /api/runs/:id` porte exactement `id, titre, agent, state, attend, pendingQuestion,
    pendingPermission` et, selon le cas, `role` (une **chaîne**), `relit` (ids), `verdict`. Elle ne porte **ni le
    modèle** ni le lien de **suite** (`famille.continue`) : ces deux champs sont lus s'ils viennent un jour
    (`modele`, `continue`), jamais inventés ; à ce jour, une suite se reconnaît à son titre « … (suite n) » écrit par
    la plateforme ;
  - `state` d'un membre peut valoir `en_file`, `attend_accord`, `attend_prerequis` (états retenus par la
    plateforme), en plus des états ordinaires d'une mission ;
  - `attend` : `place`, `prerequis`, `accord`, `question`, `carte_envoi` ou `null`.
- 08:52 — Tests d'abord : `src/equipe.test.tsx` (20 tests) lancé sur le code de `7b2716c` → **15 échecs, 5 verts**.
  Les 5 verts à la base sont voulus : l'instantané « mission sans équipe » (`src/__snapshots__/equipe.test.tsx.snap`,
  **écrit à ce moment, sur le code d'avant le lot**), l'égalité de rendu avec des champs d'équipe vides, l'absence de
  bloc pour une famille vide, pour un carnet vide, et l'absence de bouton d'ouverture sans fonction d'ouverture.
- 08:53 — Changement :
  - `src/types.ts` : `MissionInput.team?` (interface seulement) ; types tolérants `FamilyMember`, `TeamVerdict`,
    `CarnetNote` ; `Run.multiAgent?`, `family?`, `activity?`, `carnet?` (tout facultatif).
  - `src/api.ts` (`toApiInput`) : `team` n'est jamais envoyé ; allumé → `multiAgent: true` et
    `delegation: { accepted: true, via: "bouton" }` (ni `total` ni `parallel` : enveloppe par défaut de la plateforme) ;
    éteint ou absent → corps inchangé.
  - `src/Composer.tsx` : filtre « Équipe » (valeur « Éteinte » / « Allumée ») qui contient l'interrupteur
    (`<input type="checkbox" role="switch">`, nom « Équipe d’agents », phrase reliée par `aria-describedby`), même
    forme que les autres filtres ; caché pour une réponse, désactivé quand le composer l'est.
  - `src/Team.tsx` (neuf) : `TeamBlock` (région « Équipe ») et `CarnetBlock` (région « Carnet d’équipe »).
  - `src/Mission.tsx` : `RunView` reçoit `openRun?` et affiche les deux blocs avant les demandes du propriétaire ;
    `src/App.tsx` lui passe `openRun` (fonction existante qui ouvre une mission par son id : un membre s'ouvre donc
    d'un clic, bouton natif, accessible au clavier).
  - `src/v2.css` : quelques classes `team-*` (listes, bouton-lien avec focus visible, verdict, notes en `pre-wrap`).
- Libellés : états des membres par la table `labels` existante (« En cours », « Terminée », « Attend votre
  réponse »…) ; états retenus par la plateforme : « En file », « Attend ton accord », « Attend un prérequis » ;
  attentes : « attend une place / ton accord / un prérequis / ta réponse / ton clic sur une carte d’envoi » ; rôles :
  chercheur, rédacteur, développeur, vérificateur, sinon le nom libre tel quel ; verdict : approuvé, à corriger,
  rejeté, et « aucun verdict écrit » quand `source` vaut `absent` ; catégories du carnet : méthode, découverte,
  décision, piège, question (inconnue : affichée telle quelle).
- Compteur : « N membres · x en cours · y finies · z en attente de toi » ; « en attente de toi » = attente `accord`,
  `question`, `carte_envoi`, ou état `awaiting_owner` / `waiting_permission` / `attend_accord` ; « finies » = états
  finaux ; « en cours » = le reste, **y compris les membres en file ou qui attendent un prérequis** (choix à revoir si
  le propriétaire veut les distinguer).
- 08:54 — Résultats réels :
  - `npx vitest run src/equipe.test.tsx` : 20 verts ;
  - `npx vitest run` (suite complète) : **16 fichiers, 262 tests verts** (242 avant + 20) ;
  - `npx tsc --noEmit` : OK ; `npm run build` : OK (avertissement habituel de taille de bloc > 500 kB, déjà présent) ;
  - `npx prettier --check src` : OK.
- Contrôle négatif (requête) : `toApiInput` forcé à toujours ajouter l'équipe → 2 échecs (corps exact éteint, au niveau
  de `toApiInput` et depuis `App`), remis en place → 20 verts.

## Écarts avec le brief (API réelle à `c1fb352`)

- **Modèle d'un membre** : la vue `family` ne le porte pas. Le front l'affiche seulement si un champ `modele` arrive un
  jour ; aujourd'hui seul l'agent est montré. Un test prouve que rien n'est inventé.
- **« suite de … »** : la vue ne porte pas `famille.continue`. Le front l'affiche si `continue` arrive (test) ;
  aujourd'hui la suite se lit à son titre « … (suite n) » écrit par la plateforme. Ajout côté back nécessaire (une ligne
  dans `teamOf()` ou `view()` : `modele`, `continue`), non fait (back figé, hors périmètre).
- `pendingQuestion` / `pendingPermission` d'un membre ne sont pas affichés en détail : l'attente (`attend`) suffit à dire
  ce qui est attendu ; la carte elle-même s'ouvre dans la sous-mission (clic sur son titre).
- `activity` (compteur machine) est typé mais pas affiché : le compteur demandé est celui de l'équipe.

## Non vérifié

- **Rien n'a été vu à l'écran** : aucun serveur lancé (ports fixes réservés aux essais), aucun back réel, aucune
  capture. Mise en page (desktop, mobile, thème sombre) et lecture par un lecteur d'écran à vérifier par le manager
  sur le front de démonstration avec une vraie mission multi-agent.
- L'ouverture d'un membre suppose que `GET /api/runs/<id de sous-mission>` réponde (c'est une mission ordinaire selon
  le contrat) ; prouvé seulement par simulation (appel de `openRun` avec l'id).
- Le rafraîchissement du bloc suit celui de la mission ouverte (relecture périodique existante de `GET /api/runs/:id`) ;
  aucune nouvelle source d'événements n'est écoutée (`child_state`…).

## Reste

- Côté back : ajouter `modele` et `continue` à la vue `family` si le propriétaire veut les voir.
- Enveloppe modifiable (`total`, `parallel`) : non proposée, le brief demande l'enveloppe par défaut.

## Relecture

Trois défauts rendus par un relecteur indépendant sans exécution ; chacun écrit d'abord en test (bloc « relecture :
accord, workflow et compteur » de `src/equipe.test.tsx`), lancé sur `ed9d66d` sans rien changer.

- 09:00 — Sur `ed9d66d` : **6 échecs** sur les 8 tests neufs (les 2 verts sont les contrôles négatifs : aucun
  avertissement avec workflow auto ou équipe éteinte ; un membre `running` compté « en cours »). Les trois défauts sont
  **confirmés** ; aucun réfuté.
- **Accord sans le texte du contrat, mode et accord fondus** (confirmé, corrigé) : le filtre « Équipe » montre
  désormais le texte de la section 6 du contrat, avec l'enveloppe par défaut (« Au plus 6 sous-missions Relay pour
  cette mission, 3 en même temps »), la limite d'usage atteinte plus vite, « Autoriser n'oblige pas », les deux
  reprises hors limite et les sous-agents internes hors limite. Une case « Autoriser les sous-agents » (nouveau champ
  d'interface `teamConsent`) est distincte de l'interrupteur : allumer l'interrupteur la coche (un seul geste, comme
  avant) ; la décocher envoie `multiAgent: true` **sans** clé `delegation`, et la plateforme demande l'accord par sa
  carte au premier lancement (voie 3). Éteindre l'interrupteur retire les deux. Contrôle négatif : accord coché →
  `delegation` présent ; accord sans mode → corps d'avant le lot.
- **Workflow choisi abandonné en silence** (confirmé, corrigé au plus étroit) : alerte (`role="alert"`, même classe que
  l'avertissement d'agent existant) « L’équipe remplace le workflow choisi… » quand l'équipe est allumée et qu'un
  workflow précis (≠ `auto`) est choisi. Le corps envoyé n'est pas modifié : le back reste celui qui décide.
  Contrôle négatif : workflow `auto` (réglage par défaut) ou équipe éteinte → aucune alerte.
- **Compteur « en cours » faux** (confirmé, corrigé) : les membres en file (`en_file` / `attend: place`) ou qui
  attendent un prérequis (`attend_prerequis` / `attend: prerequis`) sont comptés à part, « x en attente d’une place
  ou d’un prérequis », affiché seulement s'il y en a. Le test « compteur en tête », qui figeait la mauvaise valeur,
  attend maintenant « 7 membres · 0 en cours · 2 en attente d’une place ou d’un prérequis · 2 finies · 3 en attente
  de toi ». L'état ordinaire `queued` reste compté « en cours » (non signalé, inchangé).
- Résultats réels après correction : `npx vitest run src/equipe.test.tsx` 28 verts ; suite complète **16 fichiers,
  270 tests verts** ; `npx tsc --noEmit` OK ; `npx prettier --check src` OK ; `npm run build` OK (avertissement
  habituel de taille de bloc). `tests/e2e.test.mjs` non lancé (il demande un serveur, ports réservés aux essais).
- Commit : `03246d6`.

### À décider par le manager

- **Case d'accord cochée d'office en allumant l'interrupteur** : choix gardé pour ne pas changer le geste prévu par
  le brief. Le contrat (voie 1) parle d'une case que le propriétaire coche ; la laisser décochée par défaut ferait
  passer par la carte (voie 3) à chaque mission.
- **Enveloppe modifiable** (`total`, `parallel`) : le texte dit « 6 / 3 », valeurs par défaut de la plateforme ; si le
  back change ses défauts, le texte du front devra suivre (aucune lecture de l'enveloppe par l'API aujourd'hui).
- **Rien vu à l'écran** : la case, le texte plus long et l'alerte n'ont été vérifiés que par jsdom.
