Tu travailles sur le frontend React de l'agrégateur d'agents. Objectif : refondre la section « Équipe » (sous-agents) et la section des notes des sous-agents dans le panneau Activité.

Fichiers de référence dans docs/design/ :
- Panneau equipe v6.dc.html : la maquette. Lis son code source : c'est du HTML avec des styles inline. Reprends-y les valeurs exactes (tailles, couleurs, espacements, rayons). Ne copie pas sa structure <x-dc>/sc-for : réécris-la en composants React du projet.
- support.js : sert seulement à ouvrir la maquette dans un navigateur (npx serve docs/design). Ne l'importe pas dans l'app.

Problèmes actuels :
- Les sous-agents sont affichés en grille de 2 colonnes : les titres sont coupés et les cartes trop hautes.
- Trop d'informations par carte (pastilles, modèle, jetons, durée, boutons, résultat).
- L'utilisateur ne comprend pas pourquoi il y a plusieurs sous-agents.
- Les notes (« piège ») sont de longs paragraphes empilés, difficiles à lire.

À faire :

1. Section « Équipe »
   - Une liste verticale, un sous-agent par ligne, jamais de grille.
   - En-tête : « Équipe » + le statut global à droite (ex. « 4 terminées » en vert, « 2 en cours » en orange).
   - Sous l'en-tête, une phrase grise qui explique le découpage (champ `plan_summary` venant de l'agent principal). Si le champ est absent, ne rien afficher.
   - Les sous-agents sont groupés par étape (champ `phase` : numéro + libellé, ex. « 1. En parallèle », « 2. Ensuite »). Sans `phase`, une seule liste.
   - Ligne repliée : pastille de statut 7 px, titre complet sur 2 lignes max (sans troncature au milieu), puis en gris 12 px « Rôle · modèle · durée ».
   - Ligne dépliée au clic (une seule ouverte à la fois) : la raison de la tâche (`reason`), Modèle et Jetons en liste clé/valeur, un bouton « Voir le résultat ». Pour un sous-agent en cours, ajouter « Arrêter ».
   - Supprimer les pastilles « Terminée », « chercheur » et le bouton « Voir à côté » de la vue repliée.

2. Section « Ce que l'équipe a appris » (remplace l'affichage actuel des notes et pièges)
   - Une ligne d'aide grise : « Obstacles rencontrés et contournés. Ils sont gardés en mémoire pour les prochaines missions. »
   - Une note repliée : un « ! » orange, un titre d'une phrase (`title`), puis en gris « nom du sous-agent · heure ».
   - Une note dépliée au clic : deux blocs, « Ce qui s'est passé » (`what`) et « Ce qu'il faut faire » (`fix`).
   - Si une note n'a que du texte brut (ancien format), utilise sa première phrase comme titre et le reste comme `what`.

3. Types à ajouter (adapter aux noms existants dans types.ts) :
   - Subagent : `phase?: { index: number; label: string }`, `reason?: string`, `role`, `model`, `tokens`, `durationMs`, `status`
   - Mission : `plan_summary?: string`
   - TeamNote : `title`, `what`, `fix`, `author`, `at`
   Si le backend ne fournit pas encore ces champs, liste-les dans le rapport comme demandes au backend.

Méthode :
1. Lis le code existant (ActivityPanel.tsx, types.ts, les composants des sous-agents et des notes).
2. Capture l'état « avant » en mode sombre.
3. Écris d'abord les tests, qui doivent échouer au départ :
   - les sous-agents s'affichent en liste verticale, groupés par phase ;
   - une seule ligne dépliée à la fois ;
   - `plan_summary` absent → pas de phrase ;
   - une note en ancien format → titre = première phrase ;
   - une note se déplie et affiche « Ce qui s'est passé » / « Ce qu'il faut faire ».
4. Implémente.
5. Fais des commits atomiques. npm test et npm run build doivent passer ; mets leur sortie dans le rapport.
6. Prends les captures « après » en mode sombre, panneau à 380 px, à 1440 et 760 px.
7. Rapport final : fichiers modifiés et supprimés, captures avant/après, champs à demander au backend.

Ne touche pas à l'affichage des réponses dans la conversation (BRIEF 04).
