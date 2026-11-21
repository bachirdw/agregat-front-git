# Rapport skill-explicite (front) : le Skill se choisit, il ne s'active jamais tout seul

## Demande
Décision du propriétaire (21/11 vers 18:45), transmise par le manager du back (session `agregat-back-c8`) : un Skill ne
s'active jamais automatiquement ; l'utilisateur le choisit dans la conversation, comme le modèle. Côté back, lot
`skill-explicite-01` lancé à 19:22 : plus aucune détection de pack d'après le prompt ; un pack ne joue que s'il est
choisi (`pack` explicite, un Skill d'un pack dans `skills`, ou l'espace). Pas encore intégré à l'API 4310.

## Fait
- `src/Composer.tsx` : le réglage « Skills » (cases à cocher, plusieurs Skills) devient « Skill », un sélecteur :
  - « Aucun Skill » par défaut ; la requête garde alors `skills: []` et le pack choisi (`auto` par défaut), comme
    avant ;
  - un Skill choisi part dans `skills: [id]`, avec son pack quand il en a un (lu dans `catalog.packs[].skills`) ;
  - revenir à « Aucun Skill » retire le pack que le Skill avait mis, mais garde un pack choisi à la main ;
  - un Skill inactif ou non vérifié reste listé mais n'est pas choisissable : « · à activer dans Skills ».
- Le bouton des réglages dit le Skill : « Auto · défaut · aucun Skill », ou le nom du Skill choisi.
- Les boutons de démonstration qui envoient `pack: "najah"` ne changent pas (choix explicite).

## Pack rangé dans « Avancé » (accord du propriétaire : « Oui, range-le »)
- Suggestion du manager du back, validée par le propriétaire : le réglage « Pack » devient le dernier réglage,
  « Avancé », avec la phrase « Le pack suit le Skill choisi ; ne le change ici que pour forcer un pack. ».
- Le sélecteur garde son libellé « Pack » : les scripts de captures et l'E2E (`choose(page, "Pack", …)`) le
  trouvent toujours ; la boucle des réglages de l'E2E passe à « Avancé ».
- Test : 1 de plus dans `src/skill-explicite.test.tsx`, en échec avant le déplacement, puis vert. Suite : 472/472 ;
  build OK.

## Pas fait, volontairement
- Le réglage « Pack » garde son option « Auto · selon l’objectif ». Elle reste vraie tant que l'API 4310 n'a pas
  `skill-explicite-01`. À renommer (« Aucun · chemin général ») quand le manager confirmera le contrat à
  l'intégration.
- Un seul Skill par mission dans l'interface. L'API accepte toujours une liste ; les missions déjà faites avec
  plusieurs Skills s'affichent comme avant.

## Vérifications
- `src/skill-explicite.test.tsx` (6), écrits d'abord : **6 en échec au départ**, puis verts.
- Adaptés : `src/reponse-04.test.tsx` (le libellé du bouton dit « aucun Skill ») et `tests/e2e.test.mjs` (pastille
  « Skill ») ; l'E2E n'est pas relancé.
- `npm test` : 30 fichiers, 471/471 ; `tsc` OK ; build OK ; prettier OK.
