# Journal du chef de chantier — orchestration 06 (22/11/2026)

Une ligne par intervention : heure · chantier · décision · raison.

| Heure | Chantier | Décision | Raison |
|---|---|---|---|
| 11:55 | — | Arrêt avant lancement : 2 maquettes sur 3 absentes de Téléchargements | Pas de source de vérité pour Skills et Consommation |
| 12:01 | — | Maquettes reçues (« Skills et composer.html », « Consommation.html », « Conversation agent v5.html »), copiées dans docs/design/mockups avec leur template décodé | Les Codex doivent lire les style inline sans le moteur du bundle |
| 12:06 | A+B | Skills et Consommation sortis de Galleries.tsx (déplacement pur), une feuille CSS par chantier, prop Composer.onManageSkills | Les deux écrans vivaient dans le même fichier : conflit garanti |
| 12:06 | A+B | Codex lancé en `-s workspace-write` + `--add-dir` du .git commun, au lieu du danger-full-access de la config | Périmètre limité au worktree ; le .git est hors du worktree |
