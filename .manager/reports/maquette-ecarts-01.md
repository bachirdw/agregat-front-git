# maquette-ecarts-01 — écarts visuels et d'animation, maquette / app

Statut : **liste à valider par le propriétaire. Aucune correction faite, aucun fichier de `src/` modifié.**

## Source de référence et limites (à lire avant la liste)

- **Le dossier `design_handoff_conversation_agent/` est introuvable.** Je l'ai cherché dans les deux dépôts, sur toutes leurs branches distantes après `git fetch`, et dans le conteneur : il n'y a donc ni `Conversation agent - Standalone.html`, ni `screenshots/`, ni `README.md` de valeurs. Décision du propriétaire : comparer avec **`design/conversation-agent.html`** (export Claude Design « Conversation agent » du 28/10, commit `6bcb841`).
- **Les valeurs « attendues » viennent de cet export** : j'ai décompressé son gabarit (styles en ligne et jetons `[data-theme]`), puis mesuré les styles calculés dans Chromium. Aucune valeur n'est inventée.
- **L'export du 28/10 ne contient qu'un écran : le fil de conversation** (sombre par défaut, clair en option). Il n'a **ni carte Suivi, ni demande d'autorisation, ni barre flottante, ni Paramètres**. Pour ces quatre écrans, la section C dit honnêtement qu'il n'y a pas de référence, et ne liste que les défauts visibles et les jetons globaux qui s'y appliquent.
- **Conditions de capture.** L'app tourne via le serveur de dev Vite (même configuration que `npm run dev`) branché sur le backend `agregat-back-git` en mode fixture (`AGENT_PLATFORM_NETWORK=0`, `AGENT_PLATFORM_BROWSER=fixture`, `live: false`). Aucun appel réseau ni payant, données fictives. Fenêtre 1550×960, Chromium headless, thème forcé par `agre-theme` et `colorScheme`.
- **Polices.** Le conteneur n'a pas SF Pro. La maquette et l'app utilisent la même pile de polices de secours, donc la comparaison reste valable en relatif, mais le rendu exact sur Mac n'est pas vérifié.
- **Deux fils capturés.**
  - (1) Une mission workflow `application-draft` (rendu `Mission.tsx`).
  - (2) Une conversation career-ops en mode agent, reconstituée avec les mêmes textes que la maquette, marqués FICTIF (rendu `Career.tsx`). Les messages rouges « Résultat privé indisponible » et « Espace career-ops introuvable » de cette capture viennent de la fixture (pas d'espace career-ops) : ils ne sont pas comptés comme écarts.
- **Captures et mesures** : `.manager/reports/maquette-ecarts-01/` (préfixe `mock-` pour la maquette, `app-` pour l'app, `z-` pour les agrandissements, `*-styles.json` pour les styles calculés, `scripts/` pour les scripts de capture rejouables).

Légende de la colonne **Nature** :
- **Défaut** : bug visible, indépendant de la maquette.
- **Valeur** : même élément, valeur différente.
- **Structurel** : composition différente, sans doute voulue par les itérations v2/v3, donc à arbitrer.

Thème : C = clair, S = sombre, C+S = les deux.

## A. Fil de conversation (référence : export du 28/10)

### A.1 Jetons et valeurs globales (s'appliquent à tous les écrans)

| # | Élément | Thème | Attendu (maquette) | Constaté (app) | Fichier concerné | Nature |
|---|---|---|---|---|---|---|
| A1 | Fond de page | S | `--bg` #151517 | #0e0e10. `style.css` a bien #151517, mais `v2.css` l'écrase | `src/v2.css:28` | Valeur |
| A2 | Halo coloré en haut de page | C+S | Aucun : fond uni `var(--bg)` | Trois ellipses floues orange, bleu et rose (`.glow`), animées en mission (dérive de 6 s), en `screen` sur sombre | `src/App.tsx` (`.glow`), `src/v2.css:20-25, 47-52, 195-229` | Structurel |
| A3 | Typographie de base | C+S | 15px, interligne 1,5, approche −0,01em | 14px, interligne 1,47, approche −0,008em | `src/v2.css:2-4`, `src/style.css:5-6` | Valeur |
| A4 | Couleurs d'état | C | vert #248a3d, rouge #d70015, orange #c93400 | vert #1d7f36, rouge #c8001a, orange #a84b00 | `src/style.css:21-25` | Valeur |
| A5 | Couleurs d'état | S | vert #30d158, orange #ff9f0a (rouge #ff6961) | vert #32d74b, orange #ffa733 (rouge identique) | `src/style.css:46-50` | Valeur |
| A6 | Remplissage secondaire `--fill2` | C+S | 0,06 / 0,12 | 0,07 / 0,13 | `src/style.css:15, 40` | Valeur (faible) |
| A7 | Séparateur `--sep` | S | rgba(255,255,255,.09) | .08 (clair identique, .08) | `src/v2.css:30` | Valeur (faible) |
| A8 | Fond des blocs de code `--code` | C | #f5f5f7 | #fff (sombre identique, #1c1c1e) | `src/v2.css:10` | Valeur |
| A9 | Fond de la barre du haut `--bar` | C+S | rgba(255,255,255,.8) / rgba(21,21,23,.78) | rgba(255,255,255,.62) / rgba(22,22,24,.62) | `src/v2.css:8, 32` | Valeur |
| A10 | Fond du champ `--field` | S | #232326 | #242427 | `src/v2.css:33` | Valeur (négligeable) |
| A11 | Couleur des liens | C+S | `--accent` (#0071e3 / #0a84ff) | `--accentText` (#0066cc / #5eaeff), par ex. « Afficher les réglages ». `--accent` est identique à la maquette (#0071e3 / #0a84ff) | `src/style.css:98-100` | Valeur |
| A12 | Anneau de focus | C+S | 3px `color-mix(accent 55 %, transparent)`, décalage 2px, rayon 8px | 3px accent plein, décalage 3px, sans rayon | `src/style.css:105-108` | Valeur |

### A.2 Mise en page du fil

| # | Élément | Thème | Attendu (maquette) | Constaté (app) | Fichier concerné | Nature |
|---|---|---|---|---|---|---|
| A13 | En-tête | C+S | Hauteur 52px, marges 0 20px. Titre 14px/600 et sous-titre 12px gris « dépôt · branche · agent ». Bouton pilule à droite | Hauteur 48px, marges 0 16px. Titre et badge d'état sur une ligne, pas de sous-titre | `src/App.tsx:~716`, `src/v2.css` (`.toolbar`) | Valeur et structurel |
| A14 | Composition générale | C+S | Une seule colonne centrée, sans barre latérale ni panneau | Barre latérale flottante de 216px, panneau « Connexions locales » de 276px, carte Suivi en bas à droite | `src/App.tsx`, `src/ConnectionsPanel.tsx`, `src/v2.css` | Structurel |
| A15 | Colonne du fil | C+S | Contenu de 720px, marges 28/24/32px, 24px entre deux tours | Contenu de 660px (700 − 2×20), marge haute de 70px, 18px entre deux tours | `src/v2.css:233-236`, `src/style.css:737-745` | Valeur |
| A16 | **Alignement de la bulle utilisateur** | C+S | À droite (`align-self: flex-end`) | **À gauche dans les conversations career-ops** (x 408→923 dans une colonne 408→1068). Cause : `.career-thread` est une grille, où `align-self: flex-end` n'agit pas sur l'horizontale (il faudrait `justify-self`). À droite, donc conforme, dans les missions workflow | `src/style.css:1818-1822` (et `747-759`) | **Défaut** |
| A17 | Style de la bulle utilisateur | C+S | 15px, marges 9/15px, rayon 20px, largeur max min(80 %, 560px), fond `--fill`, sans ombre | 13,5px, marges 7/13px, rayon 17px, largeur max min(78 %, 520px), ombre `--layer-shadow` et flou 12px | `src/v2.css:237-244` | Valeur |
| A18 | Contenant du tour agent | C+S | Texte posé sur le fond, sans carte | Carte `.agent-turn` : fond `--layer`, rayon 16px, marges 12/16px, ombre | `src/v2.css:245-256` | Structurel |
| A19 | Texte de l'agent | C+S | 15px, couleur `--label` | 13px dans l'activité, 14px ailleurs dans la carte | `src/style.css` / `src/v2.css` (`.activity p`) | Valeur |
| A20 | Résumé d'activité | C+S | Une ligne repliable de 14px gris : icône terminal, « A exécuté 3 commandes », « 2 erreurs » en rouge 12px, « 18s » en 12px à chiffres tabulaires, chevron à droite | Outil seul : ligne directe, sans résumé. Groupe (lu dans le code, non capturé) : « ✓ A exécuté N actions · N erreurs · durée », sans icône terminal, erreurs non colorées, chevron ▸ à gauche. Les outils en échec sont répétés sous le groupe replié (`.tool-failures`) | `src/Career.tsx:~320-350`, `src/style.css:1593-1640` | Structurel et valeur |
| A21 | Ligne d'étape ou d'outil | C+S | ✓ vert ou ✕ rouge, titre 13px, nom d'outil à droite (mono 11px), durée dans une colonne de 34px, chevron de 8px | ✓, puis le nom d'outil en mono **avant** le titre, durée « < 0,1 s » à droite, pas de chevron | `src/Career.tsx` (`ToolLine`), `src/style.css:1635-1650` | Valeur |
| A22 | Bloc commande et sortie déplié | C+S | Carte `--code` de rayon 12px avec filet de 0,5px. Commande précédée de « $ », couleur `--cmd`, 12px. Bouton « Copier » en haut à droite. Sortie en 11,5px, hauteur max 180px | Non capturé avec la fixture (pas de groupe dépliable). Le code a `.tool-details` et `CopyButton`, mais les valeurs n'ont pas été mesurées | `src/Career.tsx` | À vérifier |
| A23 | Tour précédent dans le fil | C+S | Affiché en entier : intro, activité, texte final, ligne de résultat | Replié en « Détail de ce tour », avec seulement le message d'erreur en rouge au-dessus | `src/Career.tsx` (`past-steps`, `~610-630`) | Structurel |
| A24 | Ligne de résultat | C+S | Pastille « Échec » (24px, rayon 12px, fond rouge à 14 %, texte rouge 600), message gris, bouton « 0,00 € · détails » qui déplie un `dl` Agent / Coût / Registre (fond `--fill2`, rayon 12px), « Reprendre » en pilule (26px, rayon 13px, fond `--fill`, 12px/500) | Filet séparateur, puis « Terminée 0,00 € » en texte simple sans pastille colorée. « Reprendre » en bouton rectangle arrondi. Le coût est dans « Détails techniques (coût, journal brut) », plus bas | `src/Career.tsx`, `src/v2.css` | Structurel et valeur |
| A25 | Mission workflow dans le fil | C+S | (Pas d'équivalent.) Même grammaire que A20 à A24 : texte, ligne d'activité, ligne de résultat | Carte « Exécution 4/4 », pastilles « DONNÉES FICTIVES », titre « Synthèse », « Éléments de preuve », grille de coût en trois colonnes, « 1 preuve · 0,00 € » | `src/Mission.tsx` | Structurel |
| A26 | **Badges au-dessus de la carte Exécution** | C+S | (Pas d'équivalent.) | **Le badge « Terminée » est écrasé à 40px de large et son texte déborde sur le badge suivant.** Les badges passent sur trois lignes (58px de haut). Voir `z-meta.png` | `src/Mission.tsx:279-311` (`.spread > .badge`) et le CSS `.spread` / `.badge` | **Défaut** |
| A27 | Forme de la zone de saisie | C+S | Rayon 22px, marges 8/8/8/16px, ombre `0 6px 24px rgba(0,0,0,.18)` et filet de 0,5px, largeur max 720px | Rayon 20px, marges 8/8/6/14px, ombre `0 10px 32px` à .14 (clair) ou .45 (sombre), largeur 660px | `src/v2.css` (`.composer`) | Valeur |
| A28 | Texte de la zone de saisie | C+S | 15px. Texte indicatif « Écrire à l'agent… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne) » | 13,5px. « Répondre à l'agent… » ou « Créez une nouvelle mission pour poursuivre » | `src/Composer.tsx`, `src/v2.css` | Valeur |
| A29 | Bouton Envoyer | C+S | 34px, **en bas à droite** du champ, opacité .35 quand il est inactif | 32px, **en bas à gauche** à côté de « + », opacité .55 quand il est inactif | `src/Composer.tsx`, `src/style.css:87-90` | Valeur et structurel |
| A30 | Contenu de la zone de saisie | C+S | Le champ seul | Pastilles Agent / Modèle / Pack / Skills, « Réglages de cette session », note sous le champ | `src/Composer.tsx` | Structurel |

## B. Animations du fil (référence : export du 28/10)

| # | Élément | Attendu (maquette) | Constaté (app) | Fichier concerné | Nature |
|---|---|---|---|---|---|
| B1 | Apparition d'un tour | `rise` (4px, opacité) en .24s `ease-out`, sur **tout** le tour (bulle et réponse) | `rise` en 240ms `cubic-bezier(.23,1,.32,1)` sur la bulle. Pas d'apparition mesurée sur `.agent-turn` | `src/style.css:758, 776-785` | Valeur |
| B2 | Points d'attente | Trois points de 4px **orange** (`--orange`), `dotp` en 1,1s, décalages .15 et .3s, **dans** la ligne d'activité à la place de l'icône | Trois points de 5px **gris** (couleur du texte), 1,2s, décalages .16 et .32s, sur une ligne séparée « Réflexion… » ou « Exécution… » | `src/style.css:1708-1735`, `src/Career.tsx` (`Waiting`) | Valeur |
| B3 | **Position des points « Réflexion… » dans la carte Exécution** | (Pas d'équivalent.) | **Les points sont collés au bord gauche de la carte** (x = 408 = bord de la carte, sans marge intérieure, contrairement aux autres lignes). Voir `z-dots.png` | `src/Mission.tsx:384` (`AgentActivity` dans la carte), `src/style.css:1708` (`.waiting`) | **Défaut** |
| B4 | Saisie progressive | Curseur clignotant sur l'intro, le titre de l'étape en cours, la commande en cours et le texte final | Curseur seulement sur le texte de l'agent en cours de flux. La maquette est une démo rejouée : le rythme réel dépend de l'agent | `src/Career.tsx` (`stream-caret`) | Structurel |
| B5 | Dépliage (étapes, sortie, détails du coût) | Le contenu déplié apparaît en `rise` .2s `ease-out`. Le chevron pivote de 90° en .2s `cubic-bezier(.2,.8,.2,1)`, à droite | `<details>` natif : ouverture instantanée, sans `rise`. Le chevron ▸ pivote avec la même courbe, mais **à gauche** | `src/style.css:1611-1618` | Valeur |
| B6 | Pression sur les boutons | `scale(.96)` pour les pilules, `.92` pour Envoyer, `.99` pour la ligne d'activité | `scale(.97)` partout, en 120ms `ease-out` | `src/style.css:84-86` | Valeur (faible) |
| B7 | Halo animé | Aucun | Dérive en 14s, accélérée à 6s pendant une mission (voir A2) | `src/v2.css:195-229` | Structurel |
| B8 | Mouvement réduit | Toutes les animations et transitions coupées | Idem (`style.css:1515`, plus le halo et les pastilles dans `v2.css:611`) | — | **Conforme** |

## C. Écrans sans référence dans l'export du 28/10

Carte Suivi, demande d'autorisation, barre flottante pendant une mission, Paramètres : **l'export n'a aucun de ces écrans**, je ne peux donc pas établir d'écart attendu/constaté. Les jetons A1 à A12 s'y appliquent aussi. Voici seulement les défauts visibles relevés pendant la capture.

| # | Écran / élément | Thème | Constaté | Fichier concerné | Nature |
|---|---|---|---|---|---|
| C1 | Panneau « Connexions locales », colonne État | C+S | « Autorisation requise » touche le bord droit du panneau, sans marge intérieure. Voir `z-panel.png` | `src/ConnectionsPanel.tsx`, `src/v2.css` | Défaut |
| C2 | Demande d'autorisation (accord et permission ACP) | S | Les cartes orange translucides (fond orange à 11 %, flou de 14px) laissent passer le halo. Sur la ligne d'étape « Accord requis », le texte secondaire est peu lisible sur fond orange-rose. **Contraste non mesuré, à confirmer** | `src/v2.css` (`.thread .card`, `.glow`) | À vérifier |
| C3 | Barre flottante pendant une mission | C+S | Pastille de 40×40 avec seulement le bouton d'arrêt carré (en bas à droite). La carte Suivi repliée au-dessus tronque le titre (« Attend ton accord : relire et vali… »). Apparition `v2-pop` en .3s. Rien d'anormal sans référence | `src/MissionPill.tsx`, `src/Tracker.tsx`, `src/v2.css` | Pour mémoire |
| C4 | Carte Suivi (dépliée) | C+S | Aucun défaut visible : les valeurs restent dans la carte | `src/Tracker.tsx` | — |
| C5 | Paramètres (Profil / Utilisation / Disponible) | C+S | Aucun défaut visible | `src/Settings.tsx` | — |

### Écarté après vérification
- **« Revenir en bas » encore visible en bas du fil.** Je l'ai vu sur une première capture, mais il venait de mon défilement par script (`scrollTop`). Après un défilement réel à la molette jusqu'en bas (reste = 0px), le bouton n'est plus affiché. Ce n'est pas un défaut.

## Ce que je propose de faire valider
1. **Défauts francs** (à corriger quelle que soit la maquette) : A16, A26, B3, C1.
2. **Valeurs** (réalignement sur l'export du 28/10) : A1, A3 à A13, A15, A17, A19, A21, A27 à A29, B1, B2, B5, B6. A noter : A6, A7 et A10 sont presque invisibles.
3. **Structurel, à arbitrer** (l'app a ajouté ces éléments après la maquette du 28/10, en v2/v3) : A2/B7, A14, A18, A20, A23 à A25, A30, B4.
4. **À vérifier avant de décider** : A22 et C2.
5. **Si le dossier `design_handoff_conversation_agent/` existe ailleurs**, il peut changer les points 2 et 3 : il faudra refaire la comparaison contre lui dès qu'il sera poussé.

## Journal
- 03:55 Le dossier `design_handoff_conversation_agent/` est introuvable (deux dépôts, toutes les branches distantes, conteneur). Décision du propriétaire : utiliser `design/conversation-agent.html`.
- 03:57 `npm ci` dans le front et le back, sans dépendance nouvelle. Les fichiers de verrouillage ne changent pas.
- 03:59 Export décompressé (manifeste gzip en base64 et gabarit). Il n'a qu'un écran (fil) et une propriété `theme` (`dark` / `light`).
- 04:01 Captures de l'app (mission workflow, accord, permission ACP, suivi, paramètres), clair et sombre. Aucune `pageerror`.
- 04:03 Captures de la maquette, clair et sombre (fil en cours, terminé, déplié). Styles calculés relevés.
- 04:04 Contre-vérification par mesure : points « Réflexion… » (x = bord de la carte), badges (« Terminée » de 40px) et « Revenir en bas » (écarté).
- 04:05 Conversation career-ops reconstituée (textes de la maquette, FICTIF). Bulle utilisateur à gauche : défaut A16 confirmé par mesure.
- 04:08 Rapport rédigé. Aucune modification de `src/`.
