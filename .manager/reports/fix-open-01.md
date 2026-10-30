# fix-open-01 — provenance du navigateur dans l’interface

## Journal

- 2026-10-31 00:02 — Après le run réel Codex + Playwriter `9bf5a5a8-226c-4bca-b2ce-47ba69954893` terminé avec trois preuves, l’historique Chrome affichait encore « Provenance des données non vérifiée », le libellé statique du plan. Le backend de ce run donnait pourtant `result.provenance.data = navigateur réel` et les preuves `navigate` puis `snapshot` de `https://example.com/`. Correction limitée à `src/Mission.tsx` : afficher « Page observée · preuves navigateur » seulement si la mission est terminée, non simulée, porte cette provenance et contient au moins une preuve. Une mission simulée ou sans preuve conserve son libellé initial. Aucun rendu de données personnelles modifié.
- 2026-10-31 00:02 — Test ajouté dans `src/components.test.tsx` ; `npm test -- --run src/components.test.tsx` code 0, 32/32. Suite complète, build, format et nouveau constat visuel à faire avant commit. Les captures `front-01-screens/*.png` déjà modifiées par un autre travail ne seront pas incluses dans ce commit.
- 2026-10-31 00:12 — Chrome utilisateur : le run réel terminé affiche maintenant « Page observée · preuves navigateur » dans l'historique, avec synthèse « Example Domain », trois preuves et coût plateforme 0,00 €. `npm test` code 0, 99/99 ; `npm run build` code 0 ; `npx prettier --check` a d'abord échoué sur le nouveau test, puis est revenu vert après formatage. Première suite `npm run test:e2e` code 1 : 9 réussites, 1 test annulé par timeout de 60 s (« thème sombre persistant, mobile sans débordement et navigation clavier »). Ce scénario a réussi seul en 6,3 s (1/1). Une relance globale est nécessaire avant commit. Le warning de build sur des chunks de plus de 500 kB reste un point de performance, sans échec de build.
- 2026-10-31 00:15 — Relance globale `npm run test:e2e` code 0, 10/10, aucun ignoré ; scénario mobile 6,6 s. `npm test` 99/99, `npm run build` et Prettier verts. Inspection Chrome via l'historique du run réel : badge corrigé effectivement visible. Diff relu : seuls `src/Mission.tsx`, `src/components.test.tsx` et ce rapport sont à committer ; les captures préexistantes modifiées restent hors de ce commit.

| Avant | Après | Pourquoi |
| --- | --- | --- |
| Badge fixe « Provenance des données non vérifiée » après succès documenté | Badge « Page observée · preuves navigateur » pour un résultat réel terminé et sourcé | Éviter une contradiction dans l’historique sans prétendre que toutes les affirmations de l’agent sont vérifiées. |

## État

- Interface : correction observée dans Chrome et validée par tests de composant, suite complète et E2E.
- Backend : run réel achevé, preuve détaillée dans `agregat-back/.manager/reports/fix-open-01.md`.
- Risque : le libellé dépend de la provenance et des preuves fournies par le backend ; la validation de ces preuves reste côté backend.
- Test E2E initial : un timeout mobile sous charge, non reproduit seul ni dans la suite relancée ; surveiller sa stabilité.

## Reprise navigateur — 31/10, branche `codex/browser-audit-31-10`

- 06:37 Sydney — L'interface réelle affichait deux sections « Navigateur » : le sélecteur Playwriter/isolé/fictif fonctionne, mais une ancienne section « Selon serveur » annonçait « Choisir un navigateur · bientôt » avec un bouton désactivé. Cause : bloc JSX résiduel dans `src/Composer.tsx`. Régression ajoutée dans `src/components.test.tsx` : test ciblé rouge 0/1 (bouton trouvé), puis suppression du bloc, vert 1/1. L'API et le sélecteur actif ne sont pas modifiés. Branche séparée pour rendre la correction jetable, captures préexistantes non incluses.
- 06:38 Sydney — `npm test` 99/99, `npm run build` code 0 (avertissement de taille de chunks déjà connu). `npm run test:e2e` en cours ; résultat à consigner avant commit. Aucune mission modèle, aucun frais.
- 06:41 Sydney — `npm run test:e2e` code 0, 10/10, en Chrome isolé et données FICTIVES ; suite, build et E2E verts. Relecture du diff : seules la section morte de `Composer.tsx` et une assertion changent. `npx prettier --check` a trouvé le test mal formaté (code 1) ; `prettier --write` l'a corrigé, nouvelle vérification verte et `npm test` relancé 99/99. `git diff --check` vert. Aucune capture préexistante ne sera commitée ; aucune observation visuelle du frontend corrigé dans le Chrome utilisateur, car le Mac est verrouillé. Coût 0 $.
