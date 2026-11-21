# Rapport test-ui-21-11 : test complet de l'interface et corrections

Demande du propriétaire (21/11, vers 11:45) : « l'interface ne marche pas, teste tout », avec une capture de l'accueil
(barre latérale et panneau Activité ouverts, panneau coupé au bord droit, réglages du composer empilés sur cinq lignes).
Branche `claude/bold-goldstine-171eb9`, commits `[test-ui-21-11]` (`ea44fcf` → `8a613ec`), poussée.

## Méthode
- Workflow de 4 testeurs en parallèle (opt-in « ultracode » du propriétaire), un domaine chacun : mise en page,
  composer et lancement, fil d'une mission, équipe/panneau/pages. Chaque testeur a monté **son propre banc** :
  - back `agregat-back-reponse-04` en lecture seule, base temporaire, agent `fixture`, hors réseau ;
  - espace career-ops temporaire, jamais `~/Downloads/agregat-career-ops` ;
  - Chrome sans fenêtre.
  Aucune requête vers les serveurs du propriétaire. 4 agents, environ 37 min, 413 appels d'outils.
- Chaque défaut a été reproduit au moins deux fois, avec capture et script (scratchpad de la session, `test-ui/`).
  Je n'ai corrigé qu'après relecture du code, test rouge, puis test vert.

## La capture du propriétaire
- **Panneau coupé à droite** : non reproduit sans zoom, à aucune largeur ni combinaison. Le testeur « mise en page »
  obtient la même image avec un **zoom par pincement** (trackpad) d'environ 1,15. La page est alors calculée sur
  1440 px, mais seuls 1252 px sont affichés : le panneau paraît coupé. Ce n'est pas un défaut de la mise en page
  (⌘0 ou un pincement inverse rend la vue entière).
- **Réglages empilés sur cinq lignes** : vrai défaut. Corrigé : les réglages de l'accueil sont derrière un seul
  bouton « Auto · défaut », comme dans la maquette v5 et le brief 04.

## Corrigé (49 défauts signalés ; doublons regroupés)
Composer (`ea44fcf`, `9886d25`) :
- réglages de l'accueil derrière un bouton ; menu ancré sur le composer (plus de débordement sur mobile) ;
- Échap et un clic ailleurs ferment le menu ; Échap ferme d'abord la pastille ouverte dedans ;
- fenêtres des pastilles dans le menu : alignées sur le menu, plus jamais hors de l'écran ni sous la barre latérale ;
- budget invalide : message visible, plus d'envoi muet (le formulaire est en `noValidate`, le message est le nôtre) ;
- refus de budget du back dit en euros (« estimée à 0,70 €, au-dessus de ton budget de 0,00 € ») ;
- pastille Navigateur : « Ton Chrome », « Chrome isolé », « Fictif », « Auto » au lieu des valeurs techniques ;
- dans une mission, le menu ne montre plus les pastilles du brouillon de l'accueil ;
- Ctrl+K laissé au champ de saisie sur Mac (⌘K seulement) ;
- fichiers joints : la bulle dit « N fichiers joints » (le back ne garde que leur identifiant, jamais de nom inventé) ;
- limite de 8 000 caractères atteinte : un message ; erreur de pièce jointe refermable.

Conversation (`753a461`, `8a613ec`) :
- « Réflexion… » reste affiché pendant une pensée de l'agent (la mission semblait bloquée, membres d'équipe compris) ;
- ni « Réflexion… » ni curseur clignotant quand la mission attend ta réponse ;
- tableaux markdown lisibles : colonnes à leur contenu, défilement horizontal au lieu d'en-têtes superposés ;
- formulaire de question : champ long encadré, cases à cocher à leur taille ;
- accord expiré sans réponse : une ligne « ! Accord expiré sans réponse : … » ;
- échec de workflow dit par étapes (« Étape « Relire le brouillon » en échec : … · 1 étape suivante non faite ») ;
- carte d'accord : « Type d’action : lecture », JSON brut dans un pli « Détails techniques » ;
- sous-mission : ni « Reprendre » ni réponse proposée (le back refuse, le chef relance) ;
- mission ouverte en bas (dernier contenu), plus tantôt en haut, tantôt en bas ;
- « Revenir en bas » : disparaît une fois en bas ; posé en bas pendant une mission (plus au milieu du texte) ;
- « API locale inaccessible » effacé dès que le flux ou l'API répond de nouveau ;
- mission gardée dans l'adresse (`#mission/<id>`) : un rechargement la rouvre ;
- graphiques en barres : valeurs négatives depuis une ligne zéro.

Équipe, panneau, pages (`2c908d2`, `b951513`) :
- liste : le résumé d'équipe passe sous le titre, qui se lit en entier ;
- tuiles : titres sur trois lignes au plus, infobulle, pastilles d'état qui grandissent avec leur texte ;
- membre arrêté : « Arrêtée après … », plus « Échec : erreur » ;
- compteur « à toi de répondre » à jour après une réponse dans la vue à côté ;
- vue scindée : rend la barre latérale qu'elle avait effacée ; Échap la ferme ; plein écran sous 980 px ;
  les seuils (1560 : barre, 1340 : panneau) tiennent aussi au redimensionnement (le fil tombait à 0 px) ;
- ligne « N sous-agents » : amène à la section Équipe même panneau ouvert ;
- agent jamais testé : « Détecté » (plus « Connecté »), comme la page Agents ;
- Agents, Paramètres, Skills : date lisible, états traduits, « Attention » / « Danger » ;
- Consommation : missions et sous-missions comptées à part, chaque tarif une fois ;
- Skills : une colonne quand la zone centrale est étroite (panneau ouvert) ;
- « Mission terminée · 0 étape » → « Mission terminée » ;
- favicon servi depuis `/assets/` (404 quand le back sert `dist`).

## Décisions prises (à valider par le propriétaire si besoin)
1. **Agent unique par défaut** à l'accueil (avant : Workflow). En workflow, une mission finie ne peut pas recevoir de
   message de suite ; le workflow reste un choix dans les réglages.
2. **« Reprendre la session » seulement après un arrêt ou un échec.** Sur une mission terminée, il renvoyait le même
   message (nouveau tour d'agent payant, bulle en double) ; la suite passe par le composer.
3. **« Nouvelle mission » (bouton ou ⌘K) repart d'une page vierge**, comme voulu depuis `front-02` (tests). Le
   testeur trouvait que ⌘K effaçait le brouillon ; j'ai gardé ce comportement.
4. **Mission ouverte en bas** (dernier contenu), comme une conversation.
5. **Vue scindée en plein écran sous 980 px** (avant : 760 px).

## Non corrigé (et pourquoi)
- Tutoiement et vouvoiement mélangés : le « vous » est dans tous les écrans anciens et figé par une douzaine de
  tests, les écrans récents tutoient. Choix de ton au propriétaire.
- Composer replié d'une mission : la ligne « Afficher les réglages » le rend plus haut (accès clavier voulu, testé).
- Schéma Mermaid dans un cadre gris, non adapté au thème sombre (esthétique).
- Consommation à 375 px : bouton « Voir la consommation » coupé (esthétique).
- Vue scindée en plein écran : Tab peut atteindre des boutons cachés dessous (pas de piège à focus).
- Workflow « offres en direct » sans réseau : échec de l'outil (son message est maintenant dit par étape) ; avec le
  réseau du propriétaire, non testé.
- Pack career-ops sans Skill installé : « Skill inconnu » (vu seulement dans le banc, où le Skill n'existe pas).

## Vérifications (21/11, 13:10)
- `npm test` : 26 fichiers, 430/430 ; `npm run build` OK ; `prettier` OK.
- E2E complet contre `agregat-back-reponse-04` : 18/18 (`reponse-04/e2e-complet.txt`).
- Captures « après » refaites (`reponse-04/`) et regardées : accueil, tableau, équipe, vue scindée, liste.
- **Non vérifié** : aucun vrai agent lancé (claude, codex) ; pas d'appareil tactile réel.
