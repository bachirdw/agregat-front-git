# Rapport fichiers-fil-21-11 : fichiers produits lisibles, discussion qui ne perd plus rien

## Demandes du propriétaire (21/11, captures de la mission réelle « Vends relay plateforme »)
1. « Un utilisateur lambda ne peut pas, ne serait-ce que télécharger ou voir le contenu des fichiers » produits
   par l'agent (cartes avec le chemin absolu seulement).
2. « Plus on avance dans une discussion, plus les messages en haut se suppriment, de l'un et de l'autre. »

## Diagnostic (vérifié, pas supposé)
- **Fichiers.**
  - Le back n'avait aucune route pour lire un fichier de mission : `/api/files` ne fait que recevoir des pièces
    jointes (POST). Sa propre doc le dit (`architecture-cible.md` : « Aucun contrat générique de livrable »).
  - Le front n'affichait que le nom et le chemin.
- **Messages disparus.** Vérifié sur la mission réelle `bd54ee7a`, devenue « Terminée », en lecture seule. Le fil
  n'y gardait que le message « oui » et la réponse finale. Trois causes, toutes dans le front :
  - `RunTurn` masquait **tout** le texte de l'agent dès que `run.result` existait ;
  - `activity()` ignorait les événements `question` et `answer` : une question répondue disparaissait avec son
    formulaire, et la réponse du propriétaire n'était jamais montrée ;
  - le texte de deux tours de suite était fusionné sans séparation (« Bon lancement 🚀Le système… »).
- **Fausses pistes écartées.**
  - Plafond de 5 000 événements du front : la mission en compte 3 189, et les morceaux de texte sont fusionnés.
  - « Flux commençant à 1 547 » (rapport de l'agent de surveillance) : les numéros d'événement sont communs à
    toutes les missions, c'est normal.
- « Fichiers en pièces jointes à chaque réponse » : sur la mission réelle, je n'ai vu qu'un bloc de 4 fichiers
  distincts, sans doublon. **Non reproduit** ; question ouverte au propriétaire.

## Back (branche locale `fichiers-21-11`, dossier `~/Downloads/agregat-back-fichiers`)
- Partie de `reponse-04-format` à `480ecc4`, la tête du manager. Le dossier du manager n'a pas été touché.
- Commit `b63323c`. Non poussé, non intégré : l'API 4310 du manager ne l'a pas.
- `GET /api/runs/:id/file?path=…[&download=1]` (contrat dans `docs/api-fichiers.md`) :
  - lecture seule, limitée au dossier de la mission, sans lien symbolique ni élément caché ;
  - HTML, SVG et JS toujours téléchargés en `octet-stream` ;
  - `CSP sandbox`, missions career-ops fermées, 20 Mo au plus.
- Tests : `tests/fichiers-mission.test.js`, 10/10.
  - Rouge vérifié : 7 échecs avec le serveur d'origine. Les 3 qui passaient sont les deux tests unitaires et le
    refus du POST.
  - Avec les `tests/api-*.test.js` : 25/25.
- Suite complète du back **non lancée** (économie de la machine).

## Front
- **`9dbefbd` (fil)**
  - `activity(events, { exchanges: true })` rend aussi `question` et `answer`. Le texte est coupé aux changements
    de tour : `question`, `answer`, `verdict_turn`, `verification`, `state`. Le fil career-ops est inchangé, sans
    l'option.
  - `RunTurn` affiche la discussion dans l'ordre :
    - texte de l'agent ;
    - « Vous, pendant la mission » ;
    - « Question de l’agent », sauf si elle est déjà écrite à la fin de son texte ;
    - « Vous, en réponse », avec les titres des choix du formulaire.
- **`4881c38`**
  - Seul le dernier morceau de texte de l'agent est remplacé par la réponse finale. Le premier essai retirait
    tout le dernier bloc, et donc plusieurs tours ; défaut vu sur le banc et corrigé.
  - Cartes de fichiers :
    - chemin court dans le dossier de la mission ;
    - « Ouvrir » (aperçu Markdown, texte ou image sous la carte, 200 000 caractères au plus) et « Télécharger » ;
    - un back sans la route affiche « Ouverture des fichiers pas encore disponible sur ce serveur (back à mettre
      à jour) ».
- Tests :
  - `src/fil-21-11.test.tsx` (10) et `src/fichiers-21-11.test.tsx` (5) ;
  - rouge vérifié : 8 échecs sur 9 avec l'ancien fil (avant le test ajouté ensuite pour plusieurs tours) et 5 sur
    5 sans les boutons ;
  - suite complète : 28 fichiers, 446/446 ; `tsc`, build et prettier OK.

## Vérification de bout en bout (banc isolé)
- Le banc :
  - mon back `fichiers-21-11` sur 127.0.0.1:4330 ;
  - base, dossier de mission et dossiers career-ops et skills temporaires, sans réseau, sans agent ;
  - il sert le `dist` du front.
- Mission FICTIVE : texte, question en texte libre et réponse, question à choix et réponse, tour de vérification,
  trois fichiers (`.md`, `.txt`, `.html`).
- Vu dans le navigateur intégré :
  - tout le fil est dans l'ordre, rien n'est collé, la réponse finale apparaît une fois ;
  - « Ouvrir » affiche le Markdown avec son tableau ;
  - le `.html` n'a que « Télécharger ».
- En-têtes vérifiés par `fetch` :
  - `.txt` téléchargé en `attachment` ;
  - `.html` en `octet-stream` avec `sandbox` ;
  - `../data/platform.sqlite` et `/etc/hosts` refusés (403).
- « Télécharger » n'a pas été cliqué dans le navigateur, pour ne rien enregistrer sur la machine ; c'est vérifié
  par les en-têtes et par le test unitaire.
- Banc arrêté, dossier temporaire effacé.

## Ce qui reste
- Intégrer `fichiers-21-11` dans le back du manager. Décision du propriétaire ou du manager, comme
  `reponse-04-format`. D'ici là, sur l'API 4310, « Ouvrir » et « Télécharger » disent que le serveur doit être
  mis à jour.
- La vue « Voir à côté » d'un sous-agent (`SidePane`) utilise aussi `RunTurn`. Elle profite du fil et des
  fichiers, mais n'a toujours pas de champ pour écrire au sous-agent.
- E2E non relancé.
