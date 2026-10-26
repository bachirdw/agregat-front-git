# front-02 — Joindre un fichier (CV) depuis la zone de prompt (par Codex)

Rapport `.manager/reports/front-02.md` (court ; longues sorties dans des fichiers, lis seulement les résumés).
Commits `[front-02]`, tests verts. Jamais de push.

## Contexte
Le backend (`/Users/diaw/Downloads/agregat-back`) expose `POST /api/files` et accepte `attachments` dans
`/api/plan` et `/api/runs` : contrat dans `agregat-back/docs/api-attachments.md` (lis-le ; s'il n'existe pas
encore, arrête-toi et dis-le). L'utilisateur veut joindre son CV simplement, comme dans Claude.

## À faire (simple et rapide, pas de refonte)
1. Dans `src/Composer.tsx` : bouton **« + »** à gauche de la zone de saisie → petit menu avec
   **« Ajouter un fichier »** → sélecteur de fichier (PDF, DOCX, MD, TXT ; 10 Mo max). Glisser-déposer d'un
   fichier sur la zone de saisie = même effet.
2. Chaque fichier envoyé apparaît en **pastille** (nom, taille, croix pour retirer) au-dessus de la saisie ;
   état d'envoi et erreurs lisibles (type refusé, trop gros, backend indisponible).
3. Les ids des pièces jointes partent avec le plan et le lancement (`attachments`).
4. Accessible au clavier (bouton et menu focusables, Échap ferme le menu), style cohérent avec l'existant.
5. Tests : composant (ajout, retrait, erreur de type/taille), api (`uploadFile`), E2E contre le vrai backend
   avec un fichier FICTIF.

## Fin
`npm test`, lint/format du frontend (résumés), capture d'écran du bouton et d'une pastille.
