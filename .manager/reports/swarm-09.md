# swarm-09 — Interface 1 : états, membres, chef (codeur)

Codeur, 21/11/2026, de 01 h 49 à 01 h 55 (heure locale lue par `date`). Arbre
`/Users/diaw/Downloads/agregat-front-swarm-09`, branche `swarm-09`, base `0937088`, portage `0ee9aa5`.

## Fait

- `src/status.ts` installé depuis `.manager/portage/swarm-09/status.ts` (5 lignes de licence en tête). Seul changement :
  la copie des libellés est remplacée par `{ ...labels, ...heldLabels }` (`labels` importé de `./types`, `heldLabels`
  déplacé de `Team.tsx` vers `status.ts`) : une seule table.
- `src/types.ts` : `TeamVerdict.complet?: false` ; `FamilyMember` gagne `pourquoi`, `debut`, `fin`, `dureeMs`, `depuis`,
  `inactiveDepuis` (secondes), `outils`, `dernierOutil`, `resultat`, `cause` (type `MemberCause`), `usage` (typé, non
  affiché). Tous facultatifs.
- `src/Team.tsx` :
  - `stateLabel` remplacé par `labelOf` (« État inconnu » au lieu de la valeur brute) ; pastille par
    `CLASSE_ETAT[variantOf(state, attend)]` sur le badge d'état, libellé toujours écrit ;
  - en-tête « Chef : <agent de la mère> · <labelOf(run.state)> » (pastille sur l'état) ;
  - membres triés par `debut` (`trierParDebut`, stable : sans `debut`, ordre reçu) ; 8 visibles puis bouton
    « +N autres » qui montre le reste ; le compteur porte toujours sur tous les membres ;
  - deuxième ligne : « durée X » (membre fini, `dureeMs` sinon `fin − debut`), « depuis X » (membre non fini, `depuis`) ;
    « dernière action <outil> il y a X » (membre non fini, `dernierOutil` + `inactiveDepuis`) ;
  - pli `<details>` fermé « Résultat » (membre `completed` avec `resultat`) ; pli ouvert « Échec après X : limite
    d’usage atteinte | erreur », puis `cause.message`, puis « réessayer à HH:MM » (membre fini sans succès avec
    `cause`). Texte seul (nœuds texte React), `white-space: pre-wrap` ;
  - verdict : source `absent` → « Verdict : illisible · aucun verdict écrit » ; sinon `complet === false` →
    « Verdict : à corriger · sans point précis ». Rien n'est déduit du nombre de points bloquants.
- `src/v2.css` : classes `.etat-*` (point de 8 px en `::before`, couleurs `--muted`, `--accentText`, `--orange`,
  `--green`, `--red` et fonds existants), point creux / barré / pointillé pour attente / annulé / inconnu, pulsation
  du point « en cours » coupée sous `prefers-reduced-motion`, trait vertical à gauche des membres, `.team-chef`,
  `.team-pli`, `.team-more`.

## Écarts au plan

- **`?equipe=1` non posé dans `src/App.tsx`** (voir Points à trancher) : sans lui, le back n'envoie pas les champs
  neufs ; l'écran reste juste mais ne montre ni durée, ni dernière action, ni pli résultat/échec. Le chef, la table
  d'états, le tri (inopérant sans `debut`), « +N autres » et le verdict (`complet` vient de la vue `family` sans
  paramètre) fonctionnent déjà.
- `ligneConfie` et `resumeEquipe` du portage sont installés et testés mais pas affichés : l'agent, l'état et la durée
  sont déjà sur les deux lignes du membre, et le compteur d'en-tête existe.
- `pourquoi` typé, non affiché (non demandé par les fonctionnalités a à g).
- Le chef et la classe de pastille apparaissent aussi sans champ neuf : ce sont les fonctionnalités (a) et (b), pas des
  champs du back. Les tests et l'instantané existants restent verts sans modification.
- Pas de capture d'écran (consigne du manager).

## Tests

- Référence avant toute modification : `npm test` → 16 fichiers, 270 réussis / 270.
- Ajoutés : `src/status.test.ts` (26 cas) ; `src/equipe.test.tsx` (11 cas, bloc « swarm-09 »), aucun cas existant
  modifié. Couverture de « Tests à écrire » : chaque état connu → variante et libellé ; état inconnu → « État inconnu »
  (aussi `__proto__`, `constructor`, non-texte) ; fini avec `resultat` → pli fermé, texte brut (Markdown, `<b>`,
  `<script>` non interprétés) ; échec `limite_usage` → pli ouvert, « réessayer à HH:MM » ; durée ; en cours → dernière
  action ; `complet: false` → « sans point précis » (et contrôle : sans `complet`, rien de déduit) ; 10 membres → 8 +
  « +2 autres » ; sans champ neuf → ordre, compteur, aucun texte neuf, un seul pli (verdict).
- Contrôles négatifs sur `Team.tsx` (chaque fois `git restore`, arbre revenu au commit) : sans `open` → 2 rouges ; sans
  tri → 1 rouge ; sans `complet` → 1 rouge ; sans limite de 8 → 1 rouge ; valeur brute au lieu de `labelOf` → 4 rouges.
- Fin : `npm test` → 17 fichiers, 307 réussis / 307 (270 + 37). `npm run build` → code 0 (avertissement de taille de
  morceau déjà présent). `npx prettier --check src` → « All matched files use Prettier code style! ». `dist/` ignoré
  par git.
- Incident : un premier commit a échoué (variable de chemins non découpée par zsh) et un `git restore` de contrôle
  négatif a remis `Team.tsx` à la base ; les modifications ont été réappliquées à l'identique par les scripts
  d'édition, retestées (65/65), puis commitées. Aucun effet sur le résultat.

## Points à trancher par le manager

1. **`?equipe=1` dans `src/App.tsx`.** Essayé (5 lectures GET : `openRun`, `refresh` du flux, `action` hors reprise,
   `usageView`, file d'instructions) puis retiré : 5 tests existants rougissent car leurs faux `api` comparent
   l'adresse mot pour mot (`path === \`/runs/${run.id}\``), et aucun n'est dans `src/equipe.test.tsx` :
   - `src/App.test.tsx` : « signale une perte du backend pendant une mission puis retente la lecture », « détecte une
     perte du backend même si le flux ne signale aucune erreur », « part une seule fois après une mission terminée et
     reprenable », « après une réponse, le tour précédent reste dans le fil même si le back ouvre une nouvelle session » ;
   - `src/etat-liste.test.tsx` : « un événement d'état SSE met la liste à jour avant même la relecture de la mission ».
   Retouche proposée : dans `App.tsx`, ajouter `+ "?equipe=1"` aux 5 appels `api<Run>("/runs/" + id|run.id|runId)` ;
   dans ces tests, comparer `path.split("?")[0] === \`/runs/${run.id}\`` (lignes 253, 294 de `App.test.tsx`, 126 de
   `etat-liste.test.tsx`, et les comparaisons semblables lignes 641 et 787 de `App.test.tsx`, à vérifier). À confier
   au lot qui possède ces fichiers ou à autoriser pour celui-ci.
2. Contraste réel des couleurs en mode sombre et rendu du point animé : à voir à l'écran.

## État réel

Commit `20f192b` (code et tests) puis le commit de ce rapport ; arbre propre ; rien poussé.

## Suite : décision du manager sur le point 1 (21/11, 01 h 55)

- Test ajouté d'abord dans `src/equipe.test.tsx` : « ouvrir une mission la lit par GET /runs/:id?equipe=1, jamais
  sans le paramètre ». Sortie rouge avant la retouche : `× ouvrir une mission la lit par GET /runs/:id?equipe=1…`,
  `AssertionError: expected "vi.fn()" to be called with arguments`, appel reçu `"/runs/00000000-0000-4000-8000-0000000000f0"`
  (sans paramètre) ; `Tests 1 failed | 39 passed (40)`.
- `src/App.tsx` : `+ "?equipe=1"` sur les 5 lectures GET d'une mission (lignes 286, 312, 502, 519, 542), rien d'autre.
- **Tests existants modifiés** (seulement la comparaison du chemin du faux `api`, `path.split("?")[0]`, aucune
  assertion touchée) :
  - `src/App.test.tsx` lignes 253, 294, 641, 787 (787 coupée en deux lignes par prettier) ;
  - `src/etat-liste.test.tsx` ligne 126.
  La ligne 440 d'`App.test.tsx` (`path.startsWith("/runs/")`) n'a pas besoin de changer. `src/orienter.test.tsx:398`
  (`path === "/runs/r2"`) a la même forme mais reste vert : non touché (hors autorisation).
- Fin : `npm test` → 17 fichiers, 308 réussis / 308 ; `npm run build` → code 0 ; `npx prettier --check src` → code 0.
- Le premier écart au plan (« `?equipe=1` non posé ») et le point à trancher 1 sont donc levés : les champs neufs
  arrivent à l'écran avec un back swarm-07.

## Relecture indépendante (21/11, 02 h 01)

Base `0937088`, commits relus `0ee9aa5`, `20f192b`, `176a703`, `1abfda7`. Périmètre conforme : seuls les fichiers
autorisés sont touchés ; `App.test.tsx` et `etat-liste.test.tsx` ne changent que la comparaison du chemin
(`path.split("?")[0]`), aucune assertion ; `equipe.test.tsx` n'a que des ajouts (aucune ligne retirée).

### Constats

1. **Majeur, corrigé.** `Team.tsx` `Failure` : `réessayer à {hour(retry) || retry}` affichait la valeur brute de
   `cause.reprise` quand elle n'est pas une heure. Désormais seule une heure valide est écrite (heure locale,
   `toLocaleTimeString("fr-FR")`). Test rouge d'abord (`× « réessayer à » seulement pour une heure valide…`).
2. **Majeur, préexistant (base), corrigé.** `roleLabels[role]`, `waitLabels[attend]`, `verdictLabels[valeur]`,
   `categoryLabels[...]` lisaient la chaîne du prototype : un rôle ou un verdict `__proto__` écrit par un agent faisait
   planter l'écran (`Objects are not valid as a React child`, vu rouge). Lecture par clé propre (`own()`), le texte
   brut reste affiché comme avant pour une valeur inconnue.
3. **Mineur, laissé.** Quatre des cinq lectures `?equipe=1` d'`App.tsx` n'étaient couvertes par aucun test (contrôle
   négatif vert) : garde ajoutée sur le source (`App.tsx?raw`), qui rougit pour chacune et pour un `?equipe=1` posé
   sur une route POST.
4. **Mineur, à trancher.** `src/orienter.test.tsx:398` (`path === "/runs/r2"`, hors autorisation) reste vert mais sa
   branche `/runs/r2` n'est plus jamais prise (la lecture porte `?equipe=1` et tombe sur la réponse par défaut) ;
   l'assertion du test (reprise de `r1`) garde son sens.
5. Conformes, vérifiés : en-tête de licence en première ligne de `status.ts` ; constantes de swarm (`WIDE_LIMIT` 8,
   `formatDuration` arrondi à la seconde inférieure, heures sans secondes) ; chaque état de `labels` et des états
   retenus a variante et libellé ; inconnu, `__proto__`, `constructor` → « État inconnu » ; `depuis` /
   `inactiveDepuis` en secondes, `dureeMs` en ms ; aucun `dangerouslySetInnerHTML`, ni Markdown ; aucun nom d'agent,
   de modèle, de Skill ou de site ; CSS : règles neuves seulement, variables existantes définies en clair et en sombre
   (`data-theme`), animation éteinte sous `prefers-reduced-motion`, libellé toujours écrit. `Team.tsx` complet et
   cohérent après l'incident `git restore` (diff relu en entier, build vert). Sans champ neuf, le rendu de la base est
   gardé hors chef, pastille, « État inconnu » au lieu de la valeur brute et « illisible » pour la source `absent`
   (voulus par le plan).

### Contrôles négatifs (tous rougissent, code remis à l'identique, vérifié par `cmp`)

Inconnu rendu brut (4 rouges) ; `hasOwn` → `in` (2) ; pli Échec fermé (3) ; pli Résultat ouvert (1) ; limite 9 (2) ;
`complet` ignoré (1) ; `illisible` retiré (2) ; secondes lues en ms (1) ; reprise brute (2) ; tri retiré (1) ; dernière
action sur un membre fini (1) ; état final après `attend` (1) ; chacune des 5 lectures sans `?equipe=1` (1 chacune,
avec la garde ajoutée) ; `?equipe=1` sur une route POST (1). Non testable sous jsdom : `prefers-reduced-motion`,
contraste (à voir à l'écran).

### Tests ajoutés

`src/swarm-09-relecture.test.tsx` (5) : reprise invalide ; valeurs mal typées (`__proto__`, `constructor`, NaN,
négatifs, objets, tableau, nombre, 50 000 caractères) ; rôle, attente et verdict `__proto__` ; garde des 5 lectures ;
membre fini sans « depuis » ni dernière action (« durée 1 h 05 »).

### Totaux

`npm test` : 18 fichiers, 313 réussis / 313 (308 avant la relecture) ; `npm run build` code 0 ;
`npx prettier --check src` code 0.

### Points à trancher par le manager

- Constat 4 (`orienter.test.tsx`, hors autorisation).
- Capture d'écran et contraste en mode sombre : non faits (décision du manager : il regardera l'écran).

Verdict : `bon_a_integrer`.
