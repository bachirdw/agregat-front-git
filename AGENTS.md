# Règles pour les agents qui codent ce frontend

Tu es supervisé par un manager (Claude) qui relit chaque commit, relance les tests et lit tes rapports.
Il préfère une erreur avouée à un succès inventé.

## Contexte
- Ce dépôt : `~/Downloads/agregateur-frontend` — le NOUVEAU frontend de la plateforme.
- Backend existant (à ne pas casser) : `~/Downloads/agregateur-agent` — API HTTP locale 127.0.0.1:4310,
  voir son `README.md`, `apps/api/server.js`, `apps/web/app.js` (ancien frontend, référence de comportement).
- Maquette de référence : `design/maquette.html` (prototype interactif) et `design/screens/*.png` (captures).
- Skills de design : `~/Downloads/agregateur-agent/.claude/skills/apple-design/SKILL.md` et
  `.../emil-design-eng/SKILL.md` — à lire et appliquer.
- Langue : interface et rapports en français (accents corrects) ; code et identifiants en anglais.

## Rapport obligatoire (ne rien cacher)
Mets à jour AU FIL DE L'EAU `.manager/reports/<id>.md` (id donné par le brief) : journal horodaté
(`date +%H:%M`), commandes importantes et résultats réels y compris les échecs, décisions, écarts avec la
maquette, ce qui est branché sur l'API réelle vs simulé, questions pour le manager. Ta limite d'usage peut
couper la session à tout moment : rien ne doit être perdu.

## Discipline
- Commits locaux fréquents (préfixe `[<id>]`), jamais de push, jamais de réécriture d'historique.
- Tests verts à chaque commit (frontend ET backend si tu touches le backend : `npm test` dans les deux).
- Aucune donnée inventée présentée comme réelle : tout ce qui vient de la maquette mais n'existe pas dans
  l'API doit être visiblement marqué (« bientôt », désactivé) ou implémenté réellement côté backend avec tests.
- Interdits : envoyer des e-mails, postuler, publier, lire des fichiers d'identifiants, modifier la
  configuration globale de l'utilisateur, appels payants (aucun test live Gemini sans accord du manager).
- Dépendances npm : versions épinglées, licences vérifiées, `npm audit` documenté.
- Serveurs uniquement sur 127.0.0.1 ; arrête les processus que tu démarres.
