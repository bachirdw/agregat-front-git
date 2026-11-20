# BRIEF 04 — Réponse de l'agent façon Claude Code

Maquette : `Conversation agent v5.dc.html`. Elle remplace l'affichage actuel des résultats (captures du 21/11/2026).

## Principe
La réponse est **du texte**. On n'affiche un bloc visuel (tableau, graphique, fichier) que quand le contenu l'exige. Pas de cartes empilées, pas de bannières, pas de panneaux en colonnes.

## Ce qui disparaît
- La bannière rouge « Impossible de terminer l'action » devient une ligne discrète sous la ligne d'activité (`!` orange + une phrase). Une bannière rouge s'affiche seulement si la mission est réellement bloquée et attend l'utilisateur.
- Les pastilles « Plan validé », « Agent réel… », « Session ACP… », « Page observée… » sont supprimées du fil. Leurs infos vont dans le détail repliable du pied de réponse.
- Les pastilles « Résultat agent », « Analyse », « Vérification » et le titre « Synthèse » disparaissent : la réponse commence directement par le texte.
- La carte « Exécution » et la barre bleue disparaissent. Il reste une seule ligne repliable « A exécuté N actions · durée ».
- La carte « Éléments de preuve » et le panneau à 3 colonnes (Coût / Votre agent / Registre) disparaissent. Ils sont remplacés par une ligne `✓ Vérifié · 2 preuves · claude · 0,00 €` qui se déplie en liste clé/valeur.
- Les pastilles du composer (Agent, Modèle, Pack, Skills) et « Réglages de cette session » sont remplacées par un seul bouton discret « claude · défaut ».
- Le texte d'aide sous le composer est supprimé.
- « Revenir en bas » : bouton rond 32 px avec une flèche, centré au-dessus du composer, sans texte. Il ne doit jamais recouvrir le contenu de manière lisible.

## Rendu du texte de l'agent (markdown)
L'agent CLI écrit déjà du markdown. Il faut un vrai rendu markdown (ex. `react-markdown` + `remark-gfm`) :
- `##`/`###` → titres en 17 px semi-gras, 8 px d'espace au-dessus
- paragraphes en 15 px, interligne 1.62, `text-wrap: pretty`
- listes avec 6 px entre les éléments ; sources en gris (`--label3`)
- `code` inline : monospace 13 px, fond `--fill`, rayon 6 px
- **tableaux GFM** : pleine largeur, en-tête gris 500, filets 0,5 px, défilement horizontal si besoin, chiffres en `tabular-nums`. Aucune bordure extérieure ni fond de carte.
- les liens et chemins de fichiers produits → une carte fichier compacte (icône, nom, chemin tronqué)

## Graphiques : une convention à ajouter
Les agents ne produisent pas de graphiques nativement. Convention : un bloc de code ```` ```chart ```` contenant du JSON :
```json
{ "type": "bar", "title": "Taille du marché, M USD", "source": "IMARC · TCAC 7,22 %",
  "x": [2025, 2026, …, 2034], "y": [774.7, …, 1450.9], "highlight": [0, 9] }
```
Types à prendre en charge : `bar`, `line`. Si le JSON est invalide, afficher le bloc de code brut (jamais d'erreur visible). Ajouter cette convention au prompt système de l'agent : « Pour une série chiffrée de 4 valeurs ou plus, émets un bloc ```chart ; pour une comparaison, un tableau markdown. »

## Synthèse trop longue
Le paragraphe unique de la capture est illisible. Il faut ajouter au prompt système de l'agent : réponses structurées en titres, listes et tableaux ; une phrase d'ouverture ; une section « À vérifier » pour les points non confirmés.

## Ordre d'une réponse
1. Ligne d'activité repliable (+ ligne d'incident éventuelle)
2. Texte markdown (tableaux / graphiques inline)
3. Fichiers produits
4. Ligne méta repliable (vérification, preuves, agent, coût)

## Message utilisateur
Bulle à droite, max 560 px, tronquée à ~170 caractères, avec un lien « Afficher tout » / « Réduire » gris (et non bleu).

## Mesures
Colonne de 720 px, padding 32 px, 32 px entre les tours, 16 px entre les blocs d'une réponse. Composer de 656 px, rayon 20 px.
