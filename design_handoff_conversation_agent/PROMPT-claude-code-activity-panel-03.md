Tu travailles sur le front `bachirdw/agregat-front-git` (branche `main`). Cette discussion est dédiée à une seule tâche : implémenter le panneau « Activité » décrit dans le brief `activity-panel-03`.

## Contexte
- Le produit sert à **postuler à des offres d'emploi** avec des agents IA. Ce n'est pas un outil de code : aucun vocabulaire de développeur dans l'interface (pas de diff, fichiers, dossier, session, commandes) hors « Détails techniques ».
- Visuel actuel : `src/v2.css` (style Apple, cartes flottantes, flou, `var(--soft)`).
- Deux éléments flottent aujourd'hui à droite : `ConnectionsPanel` (`src/ConnectionsPanel.tsx`, ouvert par `panel` dans `App.tsx`) et `Tracker` (`src/Tracker.tsx`, carte « Suivi » en bas à droite). Ils sont fusionnés en **une colonne « Activité »** à côté du fil.

## Étape 0 : créer le brief et la maquette
1. Crée le dossier `design_handoff_conversation_agent/` s'il n'existe pas.
2. Crée `design_handoff_conversation_agent/BRIEF-activity-panel-03.md` avec **exactement** le contenu entre les balises ci-dessous.
3. Je dépose moi-même `design_handoff_conversation_agent/Conversation agent v4.dc.html` (maquette de référence, à ouvrir dans un navigateur). S'il est absent, continue avec le brief seul et signale-le dans le rapport.
4. Commit local : `[activity-panel-03] brief`.

<brief>
# Brief Claude Code · activity-panel-03 : panneau « Activité » à droite (remplace Suivi + Connexions locales)

Référence visuelle : `design_handoff_conversation_agent/Conversation agent v4.dc.html` (ouvrir dans le navigateur, envoyer « Cherche des offres… » pour voir le panneau vivre).

## Constat
Aujourd'hui deux éléments flottent à droite :
- `ConnectionsPanel` (`src/ConnectionsPanel.tsx`) : carte « Connexions locales » + tableau d'activité + carte Coût, ouverte par `panel` (`App.tsx:80`, bouton `App.tsx:769`).
- `Tracker` (`src/Tracker.tsx`, rendu `App.tsx:992`) : carte « Suivi » en bas à droite, positionnée en absolu au-dessus du fil.

La maquette les fusionne en **une seule colonne « Activité »** : carte flottante (même style que `.sidebar` : 18px de rayon, `var(--soft)`, flou), **à côté** du fil, jamais par-dessus (sauf sous 760px). Ouverture/fermeture **manuelle uniquement** (bouton barre haute existant + croix dans le panneau). Le produit sert à postuler : **aucun vocabulaire de code** dans le panneau (pas de diff, fichiers, dossier, session, commandes).

## Règle absolue : aucune donnée inventée
La maquette contient des exemples simulés (sous-agents, agenda, compteurs). Dans le front, **chaque section n'apparaît que si le back fournit la donnée**. Pas de chiffre par défaut, pas de liste d'exemple. Les sections sans source back sont implémentées derrière un type optionnel et restent masquées tant que le champ est absent (cf. tableau « Contrats back »).

## À faire

### 1. Nouveau composant `src/ActivityPanel.tsx`
```
<aside className="activity-panel" aria-label="Activité">
  <header> « Activité » + bouton fermer (aria-label « Fermer le panneau ») </header>
  <div className="activity-body">
    <Section Connecteurs>         repliable, résumé à droite (« Tous connectés » / « N à reconnecter »)
    <Section Sous-agents>          si run.subagents?.length
    <Section Candidatures>         si au moins un compteur réel
    <Section Agenda>               si agenda?.length
    <Section Étapes de la mission> si run (reprend Tracker)
    <Section Documents>            si run.documents?.length
    <Section Tâches planifiées>    si schedules?.length
    <Section Sites autorisés>      toujours (état vide : « Aucun. « Toujours autoriser » ajoute un site ici. »)
  </div>
</aside>
```
Props : `catalog`, `run`, `events`, `onClose`, plus les champs optionnels ci-dessous. Sections séparées par `box-shadow: inset 0 .5px 0 var(--sep)`, titres 13px/600 `var(--text)`, padding titre `20px 0 10px`, lignes ≥ 34px, padding latéral 22px.

**Connecteurs** (repliée par défaut) — reprend la logique de `ConnectionsPanel` :
- Liste des agents prêts / non prêts (`isReady` actuel) : point vert ou orange, nom, état (« Connecté » / « À reconnecter »), dernière activité si `agent.probe.at` (format relatif « il y a 5 min »).
- « Sites consultés » : chips des hôtes distincts de `run.missionProof.reads[].url` (origine seulement).
- « Connexions pendant la mission » : `activityRows(events, run)` en grille 3 colonnes (heure · libellé · état), hauteur max 180px. Remplacer le préfixe « Outil : » par le titre décrit (`describeTool`) pour rester lisible par un non-développeur.
- La carte Coût disparaît d'ici (elle reste dans Détails techniques).

**Sous-agents** : grille 2 colonnes de tuiles (`border-radius:12px`, `var(--layer)` + `var(--layer-shadow)`). Tuile = point d'état (orange pulsé si en cours, vert terminé, rouge arrêté, gris en file) + nom + durée, puis les **3 dernières lignes d'activité en texte courant** (11px, la dernière en `var(--text)`, les autres en `var(--muted)`). Clic → la tuile passe en `grid-column: 1 / -1` et montre : tâche, étapes ✓ • ○ ✕, « Détails techniques » repliable (agent, session, preuves, coût), bouton « Arrêter ».

**Candidatures** : 4 cellules (nombre 22px/600 + libellé 11.5px muted) : offres trouvées, retenues, lettres prêtes, envoyées. Afficher seulement les compteurs fournis ; « offres trouvées » peut déjà venir de `run.result.opportunities.length`.

**Agenda** : lignes avec pavé date (jour 10px majuscule + numéro 16px, fond `var(--fill2)`, rayon 10px), titre 13px, sous-titre 12px muted.

**Étapes de la mission** : déplacer ici le contenu de `Tracker` (`trackerPhrase`, `trackerItems`, « Détails techniques » + `trackerDetails`). Garder les fonctions exportées de `Tracker.tsx` ; supprimer le rendu flottant `.tracker` de `App.tsx`. `openDetails` / `meta-line` du fil ouvre le panneau et déplie les détails.

**Documents** : lignes cliquables avec icône document, nom lisible (« Lettre · Doctolib », pas un nom de fichier technique).

**Tâches planifiées** : icône horloge (unique) ou flèches circulaires (récurrente), nom, échéance, bouton stop carré.

**Sites autorisés** : domaines « Toujours autoriser » (source actuelle des domaines mémorisés, ou `run.browserDomains`), bouton « Retirer ».

### 2. Ligne sous-agents dans le fil
Si `run.subagents?.length`, sous l'activité de `.agent-turn` : bouton discret 13px muted, icône 4 carrés + « 2 sous-agents en cours · 1/4 terminés » + chevron. Clic → ouvre le panneau. Rien d'autre dans le fil.

### 3. Mise en page (`App.tsx` + `src/v2.css`)
- `.main.with-panel` : le panneau est une **colonne flex** à côté de `.main` (plus de `position:absolute` ni de `padding-right: 300px` sur `.scroll-content`).
- Largeur 344px, `margin: 10px 10px 10px 0`.
- ≤ 1180px : masquer `.sidebar` quand le panneau est ouvert (le fil garde ≥ 560px).
- ≤ 760px : panneau en surimpression (`position:absolute; inset:0 0 0 auto; background: var(--bg)`), fond opaque.
- `MissionPill` reste ancrée en bas à droite **du fil** (pas du panneau).
- Supprimer les règles `.tracker` et `.connections-panel` devenues inutiles ; adapter `v2.test.tsx:432` qui cherche `.main.with-panel .tracker`.

### 4. Types (`src/types.ts`) — optionnels, rien ne casse si absents
```ts
export interface Subagent { id: string; name: string; state: "queued"|"running"|"completed"|"failed"|"cancelled"; task?: string; startedAt?: string; finishedAt?: string; lines?: string[]; steps?: { title: string; state: string }[]; agent?: string; model?: string }
// Run
subagents?: Subagent[];
funnel?: { found?: number; kept?: number; letters?: number; sent?: number };
documents?: { id: string; name: string; url?: string }[];
// App (hors run)
agenda?: { id: string; at: string; title: string; detail?: string }[];
schedules?: { id: string; name: string; recurring: boolean; next?: string }[];
```

## Contrats back (à signaler dans le rapport, ne pas simuler)
| Section | Source attendue | Disponible aujourd'hui |
|---|---|---|
| Connecteurs | `catalog.agents`, `activityRows`, `missionProof.reads` | Oui |
| Étapes | `Tracker.tsx` | Oui |
| Sites autorisés | domaines mémorisés | À vérifier |
| Candidatures | `run.result.opportunities` (trouvées) ; reste : `run.funnel` | Partiel |
| Sous-agents | `run.subagents` ou événements `subagent` | Non |
| Documents | `run.documents` | Non |
| Agenda, Tâches planifiées | endpoints à créer | Non |

## Tests (rouge → vert)
- Panneau fermé par défaut sous 1100px, ouvert/fermé par le bouton et la croix ; aucune ouverture automatique.
- Plus aucun `.tracker` ni `.connections-panel` dans le DOM.
- Run sans `subagents`, `funnel`, `documents` : sections absentes (pas d'état vide inventé).
- Run avec 2 sous-agents dont 1 `running` : 2 tuiles, ligne « 1 sous-agent en cours · 1/2 terminés » dans le fil ; clic tuile → `grid-column: 1 / -1` et bouton « Arrêter ».
- « Détails techniques » de l'étape contient les mêmes lignes que `trackerDetails`.
- Aucun texte « Modifications », « fichiers », « Dossier », « Session » hors Détails techniques.

## Discipline
Id `activity-panel-03`, commits locaux `[activity-panel-03]`, rapport `.manager/reports/activity-panel-03.md` (inclure le tableau des contrats back), captures avant/après en sombre et en clair à 1440px et 924px dans `.manager/reports/activity-panel-03/`. `npm test` et `npm run build` verts. Aucune dépendance nouvelle.
</brief>

## Méthode, dans cet ordre
1. **Lis avant d'écrire** : `AGENTS.md`, `src/App.tsx` (état `panel`, rendu de `ConnectionsPanel` et `Tracker`), `src/Tracker.tsx`, `src/ConnectionsPanel.tsx`, `src/types.ts`, `src/v2.css` (sections « Panneau de droite » et `.tracker`), `src/v2.test.tsx`, `src/ConnectionsPanel.test.tsx`. Résume en 10 lignes max ce que tu as compris et tes écarts éventuels avec le brief **avant** de coder.
2. **Captures « avant »** (sombre + clair, 1440px et 924px) : mission en cours, accord en attente, mission terminée.
3. **Tests rouges d'abord** : écris les tests de la section « Tests », lance `npm test`, colle la sortie qui montre qu'ils échouent. Commit `[activity-panel-03] tests rouges`.
4. **Code** par petits commits `[activity-panel-03] …` :
   a. types optionnels ;
   b. `ActivityPanel.tsx` (Connecteurs, Étapes, Sites autorisés, puis sections conditionnelles) ;
   c. branchement dans `App.tsx`, suppression du rendu `Tracker` flottant et de `ConnectionsPanel` ;
   d. CSS dans `v2.css` (nouvelle section `/* Panneau Activité */`, suppression des règles mortes) ;
   e. ligne sous-agents dans le fil.
5. **Vert** : `npm test` et `npm run build` passent. Colle les deux sorties complètes dans le rapport.
6. **Captures « après »** : mêmes états et tailles que l'étape 2.
7. **Rapport** `.manager/reports/activity-panel-03.md` : ce qui a été fait, fichiers touchés, tests ajoutés ou adaptés (un par ligne, avec la raison), tableau des contrats back, écarts avec la maquette et pourquoi, sorties `npm test` / `npm run build`.

## Règles
- Aucune donnée fictive dans le rendu. Section masquée plutôt que remplie d'exemples.
- Aucune dépendance nouvelle. Pas de refonte hors périmètre : ne touche pas au fil, au composer, aux Paramètres ni à `Mission.tsx` sauf pour la ligne sous-agents.
- Garde les exports existants (`trackerItems`, `trackerPhrase`, `trackerDetails`, `metaLine`, `activityRows`) : d'autres tests les utilisent.
- Ne pousse pas. Je pousse la branche moi-même après lecture du rapport.
- Si une info manque ou qu'un choix du brief entre en conflit avec `AGENTS.md`, arrête-toi et pose la question au lieu de deviner.

Commence par l'étape 0, puis le résumé de l'étape 1.
