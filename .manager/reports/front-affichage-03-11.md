# Rapport front-affichage-03-11

Branche : `front-affichage-03-11` (créée depuis `codex/browser-audit-31-10`). Commits locaux uniquement, aucun push.
Back lu seulement (`~/Downloads/agregat-back-astra`, branche `suite-astra`) : aucune modification.
API (4310) et front (5173) déjà lancés par l'utilisateur : ni démarrés ni redémarrés par moi.
Aucun texte privé (CV, lettre, offres, prompts) recopié ici : seulement des identifiants, des états et des compteurs.

## Commits
- `46d1233` [fil-conversation] : correction précédente du fil (tours passés, texte non tronqué), qui n'était pas encore commitée.
- `048953a` [front-affichage-03-11] : les dix points ci-dessous.

## Méthode
- Test rouge puis vert : `src/affichage.test.tsx`, avec un test par point. Sorties brutes dans `front-affichage-03-11-rouge.txt` (10 en échec) et `front-affichage-03-11-vert.txt` (10 réussis).
- Suite complète : `npm test` donne 10 fichiers et 152 tests réussis ; `npx tsc --noEmit` ne signale aucune erreur.
- Vrai front (5173 → API astra) : la mission 7c7edcfb a été ouverte dans le navigateur intégré et le DOM relu. Aucune mission lancée.
- Deux tests existants ont été modifiés parce que la consigne change leur attendu :
  - « A exécuté 3 commandes » devient « 3 actions » : ce sont des actions navigateur, pas des commandes de terminal.
  - « 1min 5s » devient « 1 min 5 s » : un seul format de durée.

## Points

| # | Correction | Test | Vrai front (7c7edcfb) |
|---|---|---|---|
| 1 | Cause visible sans ouvrir le détail. Le texte d'erreur que Gemini emballe dans « with response: […] » est déballé. | oui | vérifié : « ✗ career_script scan … Échec : Scanner : provider ou exécutable non autorisé » |
| 2 | Nom déduit de l'identifiant d'appel (`mcp_<serveur>_<outil>__call_…` ou `<outil>__call_…`), sinon « outil inconnu ». | oui, y compris le cas d'un identifiant UUID | vérifié : « ✗ career_offer_save … Appel d’outil refusé : params must have required property 'url' ». Le cas « outil inconnu » n'existe pas dans cette mission : non vu en réel. |
| 3 | « commandes » seulement si tous les appels sont de type ACP `execute`, sinon « actions ». | oui (les deux cas) | vérifié : « A exécuté 2 actions », etc. Le cas « commandes » n'existe pas dans cette mission : non vu en réel. |
| 4 | La durée d'un appel n'est plus arrondie à 1 s au minimum ; le groupe va du début le plus tôt à la fin la plus tardive ; un même format pour les deux (« < 0,1 s », « 1,2 s », « 1 min 5 s »). | oui | vérifié : le groupe activate_skill + update_topic (14 ms chacun) affiche « < 0,1 s » ; les autres groupes affichent 2,5 s, 12,6 s et 39,1 s. |
| 5 | Une erreur « Mission incomplète : … » est titrée « Mission incomplète », avec sa cause en titre. | oui | vérifié : « Mission incomplète — Scanner les portails du Skill (échouée) » |
| 6 | Le bloc de texte qui est l'enveloppe JSON du résultat (objet avec `summary`, avec ou sans clôture ```json) est masqué. | oui | vérifié : plus de JSON de réponse dans le fil. Il reste du JSON dans les résultats bruts des outils, repliés dans leur détail : c'est voulu. Limite : pendant que la réponse s'écrit, le JSON partiel reste visible jusqu'à ce qu'il soit complet. |
| 7 | Si le back donne `dataMode: unverified` et une portée de vérification, le badge reprend mot pour mot cette portée au lieu de « Provenance des données non vérifiée ». | oui | vérifié : les deux badges disent « Page naviguée et observée ; autres affirmations non vérifiées ». |
| 8 | Avertissement dans le composeur et sur le plan, avant le lancement. Sources : catalogue (non installé, incompatible, session ou prompt refusé au dernier test) et dernière mission terminée de l'agent si son erreur est « Limite d’usage… ». | oui | vérifié : choisir Codex sur une nouvelle mission affiche « Dernière mission Codex : Limite d’usage de Codex atteinte : réessayer à Nov 6th, 2026 12:54 PM… », puis l'agent a été remis sur Auto. L'avertissement sur la carte du plan n'a pas été vu en réel (aucun plan préparé). |
| 9 | La pastille lit `skillsSnapshot` (Skills réellement chargés), sinon `skills`, sinon « aucun ». | oui | vérifié : « Skills · career-ops » |
| 10 | Pendant « Lancement… », le bouton « Annuler le lancement » interrompt l'attente de la requête (AbortController). Un message indique que la mission peut quand même exister dans l'historique, puis l'historique est rafraîchi. | oui (requête qui ne répond jamais) | non vérifié en réel : il aurait fallu redémarrer l'API pendant un lancement. |

## Écarts avec le brief et limites
- Point 8 : `GET /api/catalog` ne transmet pas la limite d'usage. La sonde Codex indique `inference: true` et aucune erreur. La seule source réelle est l'erreur de la dernière mission Codex, d'où le libellé « Dernière mission Codex : … », qui ne prétend pas connaître l'état actuel. Une mission Codex réussie plus récente efface l'avertissement. Il serait plus fiable que le back expose la limite dans le catalogue (session back).
- Point 9 : la mission 7c7edcfb a en réalité `skills: []` et `skillsSnapshot: [career-ops]`, et non `skills: ["career-ops"]`. Le front lit maintenant le snapshot.
- Point 10 : annuler côté front n'annule pas une mission que le back aurait déjà créée. Il n'existe pas d'id pour l'annuler tant que la réponse n'est pas arrivée.

## Mémoire du fil (priorité demandée en cours de route)
- Rejeu, événement par événement et comme en direct, des flux réels 9fc3781a (1 790 événements, Claude) et 7c7edcfb (142 événements, Gemini) dans le composant d'activité : tout le texte reste présent dans le DOM, avec un contrôle tous les 100 événements. L'unique écart signalé sur 7c7edcfb venait de mon script de contrôle (une réflexion coupée par un appel refusé), pas du front. Ce test temporaire n'est pas commité.
- Mission 3e8d6eab (terminée) : les deux messages de l'agent masqués à la fin figurent mot pour mot dans la réponse affichée, donc rien n'est perdu.
- Constat pour le manager : « Offres emploi sydney » a été relancée 3 fois avec le même texte (b01769f3 Gemini, 17336e55 Codex, 7c7edcfb Gemini). Ce sont 3 nouvelles missions avec 3 sessions, sans `resumedFrom` : l'agent ne garde rien d'un essai à l'autre et le fil ne peut pas les relier. Ce n'est pas un défaut d'affichage. Choix laissé à l'utilisateur, qui a donné la priorité à l'affichage.

## Journal
- 18:57 : branche créée, correction du fil commitée, tests rouges (10/10 en échec), corrections, tests verts, contrôle sur le vrai front, rejeu des flux réels, rapport.
