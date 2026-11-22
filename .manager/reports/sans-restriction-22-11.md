# sans-restriction-22-11 — retrait de ce qui restreint, et des étiquettes « fictif » / navigateur

Décision du propriétaire (22/11 vers 16:30), en réponse à la liste des mises en garde du front : « juste ce qui
restreint. Ce qui restreint, par exemple, dans la navigation. Mais les questions ou les messages, c'est pas un
problème. Juste message qui dit oui, fictif, navigation, je sais pas quoi, ça on peut enlever. » Manager de
l'arrière prévenu (session « Analyse passation 22-11-midi ») avant le commit, à la demande du propriétaire.

## Retiré

- Skills : la case obligatoire « J'ai lu les fichiers à cette révision… » avant « Approuver et installer »
  (`Skills.tsx`) et « J'ai lu les changements de cette version… » avant d'approuver une nouvelle version
  (`SkillDetails.tsx`). Les appels sont inchangés : `/review` avec l'empreinte réelle, puis `/install`.
- Étiquettes « fictif » : liste des missions (`App.tsx`), section Candidatures du panneau Activité
  (`ActivityPanel.tsx`), « Données fictives » sous le résultat (`RunTurn.tsx`), « · FICTIF » sur les offres
  (`Career.tsx`), « fictif » dans le coût du suivi (`Tracker.tsx`, « BYOA » seulement pour une mission réelle).
- Ligne « Navigateur : Chrome isolé, non connecté à vos comptes (extension Playwriter indisponible) » (`RunTurn.tsx`).

## Gardé (à sa demande)

Questions, autres messages (agent indisponible, budget, 8 000 caractères, agent silencieux, sous-agents en échec,
accord de mission actif, Bilan), cartes d'accord du serveur. Les restrictions de navigation sont côté serveur :
transmises au manager de l'arrière.

## Vérifications

Tests adaptés là où ils vérifiaient une case ou une étiquette retirée (components, skills-composer-skills,
skills-nuit, reponse-04, activity-panel, E2E « Skills réels » et « production réelle »), sans retirer les autres
assertions (empreinte envoyée, installation après revue). Build vert ; vitest **595/595** (44 fichiers) ; E2E
**18/18** (back `agregat-back-reponse-04` ; un premier passage à 16/18 : « production réelle » attendait encore
« Données fictives », corrigé ; « défilement FICTIF » expiré sous charge, passe ensuite).
