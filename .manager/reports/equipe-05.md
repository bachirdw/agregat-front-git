# Rapport equipe-05 : section « Équipe » et « Ce que l'équipe a appris » (panneau Activité)

Brief : `design_handoff_conversation_agent/PROMPT-claude-code-equipe-05.md`. Maquette : `Panneau equipe v6.dc.html`.
Les deux viennent de l'archive « panneau equipe agregat agent ai.zip » (Téléchargements), extraite à part. Seuls ces
deux fichiers étaient nouveaux ; les autres sont identiques à la passation déjà versée.

## Ce qui a été fait
- **Équipe** (`src/Team.tsx`, `TeamBlock` réécrit) :
  - liste verticale, une ligne par sous-agent, jamais de grille ; groupes par étape quand `phase` existe
    (« 1. En parallèle »…), une seule liste sinon ;
  - en-tête « Équipe » et statut global à droite, nombres non nuls seulement :
    - « N en cours » ;
    - « N en attente de toi » ;
    - « N en attente d’une place ou d’un prérequis » ;
    - « N terminées » en vert ;
    - « N en échec » en rouge ;
    - « N arrêtées » ;
  - phrase grise `plan_summary` sous l'en-tête, rien si elle est absente ;
  - ligne repliée : pastille de 7 px, titre entier sur 2 lignes au plus, « Rôle · agent modèle · durée » en gris
    12 px ;
  - ligne dépliée (une seule à la fois) :
    - la raison ;
    - « Suite de … » et « Relit … » ;
    - Modèle, Jetons et Dernière action en clé/valeur ;
    - le verdict du vérificateur, le pli d'échec ;
    - « Voir le résultat » (« Suivre en direct » pour un membre en cours) et « Arrêter » pour un membre en cours ;
  - supprimés de la vue repliée : pastilles « Terminée » et rôle, « Voir à côté », ligne « Chef : … ».
- **Ce que l'équipe a appris** (`CarnetBlock` réécrit, remplace « Carnet d’équipe ») :
  - ligne d'aide grise ;
  - une note par ligne : « ! » orange (piège) ou « ✓ » vert (méthode), titre d'une phrase, « auteur · heure » ;
  - note dépliée au clic : « Ce qui s’est passé » et « Ce qu’il faut faire ».
- **Défaut existant corrigé** (`src/App.tsx`) : « Ouvrir en grand » dans la vue scindée ne rendait pas la barre
  latérale que la vue avait effacée ; il passe maintenant par la même fermeture que « Fermer ».

## Décisions et écarts avec le brief (à valider)
1. **Panneau gardé à 344 px** (maquette : 380). À 380 px, les seuils de mise en page réglés lors du test complet
   (le fil garde 560 px : 1180, 1340, 1560 px) seraient faux. Les captures sont donc à 344 px. Passer à 380 px
   demande de décaler ces seuils et leurs tests : lot à part si tu le veux.
2. **L'état reste écrit.** Règle du projet (swarm-09) : une seule table d'états, jamais la couleur seule. La pastille
   prend la couleur de cette table et porte son libellé pour le lecteur d'écran. À l'écran, le libellé n'apparaît
   dans la ligne grise que pour un état autre que « terminé » ou « en cours » (« Échec », « Arrêtée », « État
   inconnu », attente).
3. **Couleurs.**
   - « En cours » prend la couleur « en cours » de la table (bleu), comme sa pastille, et pas l'orange du brief ;
     l'orange est gardé pour « en attente de toi ».
   - Vert, orange et rouge viennent des jetons du thème (#32d74b et #ffa733 en sombre, contre #30d158 et #ff9f0a dans
     la maquette), pour rester lisibles en thème clair. Les gris sont ceux de la maquette.
4. **« Voir le résultat »** ouvre le membre dans la vue scindée (son fil complet et son résultat), ou en grand si la
   vue scindée n'est pas offerte. Sans fonction d'ouverture (fil career-ops), le résultat court reste lisible dans
   un pli de la ligne dépliée.
5. **Raison d'une tâche** : `reason` s'il existe (demandé au back), sinon `motif` (texte du chef sur la sous-mission),
   sinon une phrase tirée du code `pourquoi` du back :
   - `parallele` : « Menée en même temps que d’autres tâches pour gagner du temps. » ;
   - `specialite`, `regard_independant`, `contexte_trop_long`, `demande_proprietaire` : une phrase chacun.
6. **Notes en ancien format** : titre = première phrase, le reste de la première ligne = « Ce qui s’est passé ». La
   doc du back fixe la forme d'une leçon (`docs/api-lecons.md` : « ligne 1 le titre, ligne 2 la règle (Quand X,
   faire Y) ») : la ligne 2 et la suite vont donc dans « Ce qu’il faut faire ». Un titre de plus de 160 caractères est
   raccourci, et la ligne entière passe alors dans « Ce qui s’est passé » : rien n'est perdu.
7. **Quelles notes** : pièges et méthodes (les catégories que le back peut garder comme leçons) dans la liste. Les
   autres (décision, découverte, question) sont dans un pli « Autres notes du carnet · N », pour ne rien perdre.
8. **« Gardés en mémoire »** : la phrase du brief n'est vraie que pour les notes que le back a gardées comme leçons,
   et il ne dit pas lesquelles (`lecon_gardee` ne porte que `{ id }`). La ligne dit donc « Obstacles rencontrés et
   contournés. », suivie de « N leçons gardées en mémoire pour les prochaines missions. » quand le flux de la
   mission en compte.
9. **Noms des types** adaptés au projet (sans renommer ce qui existe) :
   - « Subagent » est `FamilyMember`, qui gagne `phase?: { index; label }` et `reason?` ;
   - `role`, `model` → `modele`, `tokens` → `usage.jetons.total`, `durationMs` → `dureeMs`, `status` → `state`
     existaient déjà ;
   - « Mission » est `Run`, qui gagne `plan_summary?` ;
   - « TeamNote » est `CarnetNote`, qui gagne `title?`, `what?`, `fix?` ; `author` et `at` existaient (`auteur`, `a`).

## Champs à demander au back (aucun n'existe aujourd'hui, vérifié dans `docs/api-equipe-vue.md`, `api-delegation.md` et sur une mission réelle)
1. `plan_summary` sur la mission mère : une phrase du chef qui explique le découpage.
2. `phase: { index, label }` sur chaque entrée de `family[]` (étape du découpage). Sans lui, une seule liste.
3. `reason` sur chaque entrée de `family[]` : une phrase du chef. Aujourd'hui, seuls `pourquoi` (un code) et parfois
   `famille.motif` (lu sur la ligne de la sous-mission) existent.
4. Pour chaque note du carnet :
   - `title`, `what`, `fix` (note structurée), ou au moins la forme « ligne 1, ligne 2 » des leçons pour les pièges ;
   - le lien vers la leçon gardée (`lecon: { id }`), pour dire note par note « gardée en mémoire ».
Le front lit déjà ces champs : dès que le back les envoie, ils s'affichent sans autre changement.

## Tests
- Nouveaux, dans `src/equipe-05.test.tsx` (15). Écrits d'abord : **14 en échec au départ**. Le 15e (« sans phase :
  une seule liste ») était déjà vrai. Ils couvrent :
  - la liste verticale groupée par étape ;
  - l'absence de grille dans la feuille de style ;
  - la ligne repliée ;
  - une seule ligne dépliée à la fois ;
  - le contenu déplié et « Voir le résultat » ;
  - « Arrêter » pour un membre en cours ;
  - le statut global ;
  - `plan_summary` absent ou présent ;
  - la note en ancien format et la forme des leçons ;
  - le nouveau format ;
  - le dépli d'une note ;
  - le tri pièges et méthodes / autres ;
  - la ligne d'aide.
- Adaptés : 41 tests existants décrivaient l'ancienne carte. Chacun garde ce qu'il protège ; seul l'endroit change (il
  faut déplier la ligne) :
  - `equipe.test.tsx` (le test de la ligne « Chef » est devenu un contrôle de son absence) ;
  - `sous-agents.test.tsx` (un test ajouté : sans vue scindée, « Suivre » ouvre en grand) ;
  - `sous-agents-app.test.tsx` ;
  - `swarm-09-relecture.test.tsx` ;
  - `swarm-11.test.tsx` ;
  - `swarm-11-relecture.test.tsx`.
- `npm test` : 29 fichiers, **462/462** (sortie : `equipe-05/npm-test.txt`).
- `npm run build` : OK, avec l'avertissement habituel de taille de bloc (sortie : `equipe-05/npm-build.txt`).
- `tsc --noEmit` et `prettier --check` : OK.
- E2E non relancé.

## Captures (thème sombre, banc isolé, données FICTIVES) : `.manager/reports/equipe-05/`
- Script : `scripts/equipe-05-captures.mjs avant|apres`.
  - Le banc : back réel `~/Downloads/agregat-back-fichiers` ; base, espace career-ops, racines et Skills temporaires ;
    aucun réseau, aucun agent.
  - L'équipe : 4 membres (2 recherches en parallèle, 1 relecture finie, 1 relecture en cours), 6 notes de carnet et
    2 leçons gardées.
- Avant : `avant-equipe-{1440,760}-sombre[-panneau|-notes].png` montrent la grille de 2 colonnes, les titres coupés
  (« Recherche tendances Instagram — agen… ») et les notes en paragraphes.
- Après : `apres-equipe-{1440,760}-sombre[-panneau|-deplie|-notes].png`, avec une ligne et une note dépliées.
- Défauts vus sur les captures et corrigés avant le commit :
  - l'heure d'une note disparaissait derrière un auteur long ;
  - l'en-tête « en cours » n'avait pas la couleur de sa pastille.

## Fichiers
- Modifiés :
  - `src/Team.tsx`, `src/types.ts`, `src/v2.css` (règles en grille et en cartes de l'équipe supprimées) ;
  - `src/ActivityPanel.tsx`, `src/App.tsx` ;
  - les 6 fichiers de tests ci-dessus.
- Ajoutés :
  - `src/equipe-05.test.tsx`, `scripts/equipe-05-captures.mjs` ;
  - `design_handoff_conversation_agent/Panneau equipe v6.dc.html` ;
  - `design_handoff_conversation_agent/PROMPT-claude-code-equipe-05.md` ;
  - les captures.
- Supprimés : aucun fichier. Les anciennes classes CSS `team-members`, `team-notes`, `team-open`, `team-chef`,
  `team-motif` et `team-jetons` (règles en grille) sont retirées ; `team-motif` et `team-jetons` restent comme
  marqueurs sur les nouveaux éléments.
- Pas touché : l'affichage des réponses dans la conversation (BRIEF 04).
- Commits :
  - `fc6d187` : code et tests ;
  - le commit suivant : maquette, script, captures, rapport.
