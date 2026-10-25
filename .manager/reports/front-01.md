# Rapport front-01

## Journal

- 13:59 — Lecture AGENTS.md, brief et skills apple-design/emil-design-eng. Dépôt initial sans application, git propre. Aucun test frontend disponible avant création. Objectif : API réelle, démonstration fixture hors réseau, aucun appel payant.

- 14:00 — Lecture des routes server.js, orchestrateur, moteur DAG, facturation et ancien frontend ; examen des 21 captures (planche contact) et ouverture prototype via serveur Python 127.0.0.1:4411. Échec navigateur IAB indisponible, repli Chrome connecté réussi. Backend comporte exports/ non suivi préexistant : ne pas inclure. Points réels supplémentaires : review exige hash ; le catalogue ne fournit ni fichiers de Skill ni consommation globale. Choix : ajout minimal du service dist sécurisé, pas de nouveaux endpoints métier ; pas de capacités annoncées sans preuve.

- 14:01 — Reprise effective : le rapport préexistait avec des assertions non vérifiées dans cette session ; elles ne sont pas des preuves de validation. Lectures réalisées : consignes, brief, deux skills, routes, ancien frontend, orchestrateur, moteur DAG et billing. Planche des 21 captures examinée. Démarrage Python sur 4411 échoué (port occupé), curl 4411 échoué (réponse vide) ; serveur démarré sur 127.0.0.1:4412 (session 35444), maquette ouverte dans Chrome avec succès. Lecture tests/api.test.js échouée (fichier absent), recherche du bon nom à suivre. État initial frontend : aucune application ni suite de tests ; modifications préexistantes .manager/run.sh et rapport conservées. Backend : .manager/run-sprint.sh modifié et exports/ non suivi, conservés.

- 14:02 — Création stack Vite/React/TypeScript et composants API, composeur, plan, timeline, accords DAG/permissions, résultats, provenance, consommation par run. Contrats réels respectés, en-têtes JSON/applicatif sur les mutations. SSE : curseur after + reconnexion native Last-Event-ID et dédoublonnage. Markdown sans HTML brut, liens HTTP(S) seulement et noopener. Import Mermaid prévu en image isolée. Le catalogue ne permet pas la lecture des fichiers de Skill : la revue exigera explicitement une lecture externe et utilisera le hash réel, sans simuler une liste de fichiers lus. npm view initial échoué EPERM cache utilisateur ; repli --cache /tmp/front-01-npm réussi. Versions exactes récupérées du registre, licences MIT/Apache-2.0. Installation en cours, audit à suivre.

- 14:05 — Build TypeScript initial en échec : propriété test inconnue dans defineConfig Vite ; import de vitest/config corrigé. Build ensuite réussi (avertissement de gros chunks Mermaid différés). npm test frontend : 13/13 réussis. Installation jsdom 30.1.3 avait produit des avertissements de moteur (Node 24.14.1 trop ancien) : version corrigée à 27.4.0 ; réinstallation sans avertissement. npm audit JSON : 0 vulnérabilité. Backend phase non navigateur : 162/162 verts (dont nouveau test dist sécurisé). Premier E2E : 5/5 échoués avant le chargement des pages, Chrome tué SIGABRT par le sandbox ; relance avec exécution autorisée hors sandbox, profil temporaire, backend fixture sans réseau. Correction des heures des deux entrées précédentes (heures saisies manuellement erronées, désormais date réelle).

- 14:06 — E2E Chrome autorisé : 5/5 verts en 47 s environ. Preuves : résultats fictifs marqués, 3 offres API, ledger intègre, événements SSE/replay HTTP, approbation application-draft après refus et reprise (même id, une seule mission), refus budget sans création, thème persistant, mobile 390×844, proxy Vite avec mutation et refus Origin étranger direct. npm audit final après jsdom corrigé : 0 vulnérabilité. Inventaire licences généré dans THIRD_PARTY_NOTICES.md : MIT/Apache/ISC/BSD + transitive elkjs EPL-2.0 et outil lightningcss MPL-2.0 ; Khroma sans métadonnée mais fichier licence MIT lu. Aucune dépendance modifiée. Captures initiales sauvegardées, contrôle visuel accueil/plan/mobile effectué ; dimensions desktop à aligner 1440×960.

- 14:07 — Suite backend complète autorisée : 162 tests unitaires/intégration + 37 tests Chrome = 199/199 verts. Premier git add/commit frontend refusé par les permissions .git (index.lock EPERM) ; relance autorisée réussie, commit ed342a8. Aucun push. Commit backend limité à server.js + web-dir.test.js ; changements manager et exports/ exclus. La première suite backend dans le sandbox reste à surveiller/nettoyer (blocage Chrome), ses résultats ne remplacent pas la suite autorisée verte.

- 14:08 — Commits locaux créés : frontend ed342a8 ; backend 91ec14d (199 tests verts). Affinage visuel : sidebar 264 px, captures desktop 1440×960, titre mobile équilibré, badge toolbar centré, galeries 3 colonnes, composeur de suivi désactivé explicitement « bientôt ». Formatage Prettier 3.6.2 (MIT) ajouté/épinglé pour revue lisible. Tests supplémentaires SSE coupure/réouverture et Markdown/Mermaid sous CSP en cours. Commande ps refusée dans le sandbox ; inspection autorisée puis arrêt ciblé de l’ancienne suite backend ayant échoué au lancement Chrome (63359/63831/64952), sans toucher aux serveurs utilisateur.

- 14:09 — E2E enrichis : 6/7 passent ; le nouveau test Mermaid échoue avec 116 violations style-src inline du moteur DOM Mermaid. Aucune CSP assouplie. Correction : analyse grammaticale Mermaid puis rendu des flowcharts (type de la maquette) en SVG inerte propre sans style/script/HTML/liens ; autres types explicitement consultables en code avec message « non pris en charge ». Limite déclarée, pas de succès inventé sur les autres syntaxes. Tests du rendu inerte/limites ajoutés. Le test de coupure/réouverture SSE passe. HMR observé pendant le proxy test (édition concomitante), sans échec du scénario ; relance finale sans modification de sources prévue.

- 14:11 — Après correction Mermaid : 15/15 tests Vitest verts ; 7/7 E2E verts dont image SVG chargée sous CSP sans violation. Ajout du huitième E2E pour import Git refusé sans réseau puis quarantaine/revue/hash/installation/activation d’un Skill local de test (injection de préparation uniquement via le vrai registre backend, pas de faux API). Test SSE renforcé : attendre la perte de connexion affichée puis le retour « Flux en direct », avant réouverture de mission. Audit final stocké front-01-audit.json : zéro vulnérabilité, 365 paquets verrouillés. Prettier --check : vert. Tentative de lecture packages/skill-registry/import.js échouée (fichier absent) ; implémentation d’import trouvée et lue dans index.js. Planche comparative et HTML générés, revue visuelle en cours.

- 14:12 — Revue complémentaire : garde de navigation ajoutée, afin qu’un ancien plan HTTP terminé après « Nouvelle mission » ne réapparaisse pas ; test d’une réponse différée ajouté. Tests App couvrent également saisie avant catalogue et reconnexion API : 18/18 Vitest verts. Timeline repliée à la fin comme la maquette pour rendre la synthèse visible. Le SSE renforcé a échoué : le mode hors ligne Chrome seul ne coupe pas forcément la connexion déjà ouverte ; test corrigé pour couper aussi les connexions du serveur de test et vérifier le vrai Last-Event-ID de reconnexion. Délai de reconnexion tient compte du heartbeat serveur (15 s). Le test Skill a révélé que le badge numérique changeait le nom accessible « Skills » ; aria-label stable ajouté. Ces essais restent en cours, aucune validation finale annoncée avant résultats.

- 14:13 — Analyse des échecs renforcés confirmée : timeout sur le message de perte SSE (connexion existante conservée par Chrome) et timeout du bouton Skills dont le nom incluait le compteur ; correctifs ciblés en vérification. Une neuvième E2E vérifie également le pont permission ACP réel en injectant une demande locale de test dans un workflow actif : aucune autorisation permanente n’est proposée, aucune action externe. Les refus permanents restent disponibles si annoncés par le serveur. La capture supplémentaire distinguera cet accord d’une approbation DAG.

## État des écrans et écarts assumés

| Écran / fonction | État | Branchement et écarts avec la maquette |
| --- | --- | --- |
| Barre latérale, missions et connexions | Fait | GET `/runs` et `/catalog`. Aucune mission de démonstration préremplie ; aucun « connecté » déduit de la simple présence d’un CLI. Compagnon BYOA signalé par le catalogue. |
| Accueil et suggestions | Fait | Objectifs éditables ; suggestions adaptées aux workflows vraiment disponibles. Comparaison d’agents désactivée « bientôt ». Géométrie, typographie, matériaux et couleurs proches du prototype. |
| Composeur et filtres | Fait | Agent, modèles réellement annoncés, Skills actifs/intègres, Pack, Mode, Workflow, Budget transmis dans le contrat réel. Les pastilles reviennent à la ligne pour garder tous les filtres accessibles ; le prototype les coupe horizontalement. Navigateur déterminé par le serveur, sélection client « bientôt ». |
| Carte Plan | Fait | POST `/plan`, raisons de routage/rejets, workflow, étapes, permissions et lignes tarifaires réelles. Une modification du formulaire invalide le plan. Un lancement explicite seul crée le run. |
| Exécution / chronologie | Fait | SSE réel, états DAG, tentatives, erreurs, progression, journal borné à 500 événements visibles ; reprise réseau native et réouverture de l’historique. La chronologie se replie à la fin pour laisser place aux résultats. Aucun temps d’étape fictif. |
| Accords et reprise | Fait | Autorisations ACP ponctuelles (et refus permanents si annoncés), approbations DAG avec sortie à relire, résolution d’étapes incertaines retry/done/fail, annulation, reprise workflow en place/session selon les capacités annoncées. Les scénarios de capture utilisent des accords de brouillon sûrs, pas un clic réel sur Postuler. |
| Résultats / offres | Fait | Summary Markdown, tableaux, code, preuves ; cartes d’offres, scores/raisons, sponsoring nuancé, attribution/date et liens HTTP(S). Badges issus du résultat/provenance serveur. Aucune offre réelle inventée pour reproduire la maquette. |
| Mermaid | Partiel (type de la maquette fait) | Flowcharts LR/RL/TB/BT analysés par Mermaid et dessinés en image SVG inerte, sans injection HTML/styles ni violation CSP. Autres familles Mermaid : message explicite et code consultable. Limites : 20 000 caractères, 60 nœuds, 120 arêtes ; styles personnalisés/interactivité Mermaid volontairement ignorés. |
| Agents et Modèles | Fait | Catalogue réel, version/détection/session/mode et modèles sondés ; sélection pour la prochaine mission. Aucune capacité reprise/MCP/inférence inventée si elle n’est pas exposée. Authentification/installation CLI dans l’interface désactivées « bientôt ». |
| Skills | Fait, lecture intégrée absente | Import GitHub API, quarantaine, alertes, licence/empreinte/révision, attestation explicite de lecture externe puis revue `{approved,hash}`, installation/activation. Aucun faux lecteur de fichiers : le backend ne fournit pas leur contenu. |
| Domain Packs | Fait | Les packs et DAG viennent du catalogue ; Ventes/Immobilier/Juridique visibles comme futurs, désactivés. Nombre et titres de workflows réels. |
| Consommation | Fait par mission ; globale bientôt | GET détail run : mètres par dimension, coût plateforme, BYOA non refacturé, ledger réel. Plafond affiché depuis pricing ; aucun total global calculé avec des données incomplètes. |
| Thèmes / mobile / clavier | Fait | Thème persistant, 390×844 vérifié, navigation mobile avec Échap et boucle de focus, labels et focus visibles, raccourcis, reduced-motion/transparency/contrast. Pas de test sur un téléphone physique. |
| Conversation de suivi / détail latéral avancé | Absents | Composeur de suivi explicitement désactivé « bientôt ». Pas de panneau de détail distinct ; toutes les données utiles sont dans les cartes de mission. |

## API réelle, simulation et fonctions « bientôt »

Toutes les requêtes métier du frontend passent par l’API locale ; aucune API n’est remplacée par des données de maquette dans le produit. Le démonstrateur `fixture` appelle les vrais processus ACP/MCP et le vrai stockage, avec données fictives et sans modèle. Les runs réels BYOA ne sont pas lancés pendant cette livraison. La présence d’un CLI n’est jamais présentée comme une inférence validée.

Fonctions désactivées précisément : comparaison de deux agents, conversation de suivi, connexion d’un agent dans l’interface, choix du navigateur côté client, consommation globale, packs Ventes/Immobilier/Juridique. Les boutons de lancement d’agents incompatibles/non installés ou hors mode live sont également désactivés selon le catalogue. Aucun bouton ne simule une connexion, un envoi ou une candidature.

La lecture intégrée des fichiers d’un Skill et les schémas Mermaid autres que flowcharts restent limités comme indiqué ci-dessus. L’import GitHub est implémenté mais aucun clonage réseau réel n’a été effectué dans les E2E hors réseau : le test injecte un Skill local par le registre réel, puis exerce les routes HTTP de revue/installation/activation ; une source Git non autorisée est refusée dans l’interface.

## Sécurité et dépendances

Proxy dev Vite : réécriture Host et retrait Origin sur `/api` vers 127.0.0.1:4310. Production : ajout backend `AGENT_PLATFORM_WEB_DIR`, uniquement index et assets reconnus, chemins réels confinés et symlinks sortants refusés. Contrôles Host/Origin, en-tête applicatif JSON, CSP et anti-sniffing préservés. Test backend dédié couvre assets, MIME, fichiers absents/interdits, traversée, symlink et protections HTTP.

Markdown : HTML brut ignoré, liens HTTP(S) uniquement avec `noopener noreferrer`, images externes de contenu agent non chargées. Les SVG de flowcharts sont produits par du code propre à partir de géométrie et texte échappé, utilisés comme images. Les directives de style, callbacks et liens Mermaid ne sont pas exécutés.

Versions directes épinglées et graphe npm verrouillé. `THIRD_PARTY_NOTICES.md` contient l’inventaire des 365 paquets et les textes fournis par les 318 paquets installés qui en exposent un ; détail des licences transitives et Khroma documenté. Audit JSON joint, zéro vulnérabilité lors du contrôle. Aucun changement global npm, aucun script d’installation exécuté. Prettier est une dépendance de développement épinglée, pas un framework UI.

## Revue de design appliquée

| Before | After | Why |
| --- | --- | --- |
| Accueil initial 16 px trop à gauche, captures 1440×1000 | Sidebar 264 px et captures 1440×960 | Aligner la géométrie du prototype. |
| Chronologie déployée après succès, synthèse sous la ligne de flottaison | Repli automatique au passage à un état final | Prioriser le résultat en conservant l’inspection manuelle. |
| Question isolée sur la dernière ligne mobile | Titre équilibré avec largeur et text-wrap adaptés | Maintenir une hiérarchie lisible à 390 px. |
| Styles inline injectés par le renderer Mermaid | Parseur Mermaid + SVG inerte sans style inline | Garder la CSP stricte et une vraie image lisible. |
| Badge de quarantaine modifiant le nom accessible Skills | Nom de navigation stable et badge visuel conservé | Permettre une navigation clavier/assistive fiable. |
| Réponse de plan tardive après nouvelle mission | Garde de version de la vue | Préserver l’intention actuelle sans affichage périmé. |

## Démarrage

Voir `README.md` pour les commandes complètes. Développement : backend dans `~/Downloads/agregateur-agent` avec `AGENT_PLATFORM_NETWORK=0 AGENT_PLATFORM_BROWSER=fixture npm start`, puis frontend `npm ci --ignore-scripts && npm run dev`, ouvrir 127.0.0.1:5173. Production locale : frontend `npm run build`, puis backend `AGENT_PLATFORM_WEB_DIR=/Users/diaw/Downloads/relay-frontend/dist AGENT_PLATFORM_NETWORK=0 AGENT_PLATFORM_BROWSER=fixture npm start`, ouvrir 127.0.0.1:4310.

## Points ouverts pour le manager

- Étendre ultérieurement les autres familles Mermaid avec une solution compatible CSP, si elles sont nécessaires ; aucun assouplissement de CSP proposé.
- Ajouter une route backend de lecture bornée des fichiers importés si une revue intégrée de Skills est souhaitée. L’attestation actuelle décrit honnêtement la lecture externe.
- Les vrais fournisseurs, l’authentification de CLI, Playwriter et les sources réseau réelles ne sont pas validés par cette tâche : aucun appel payant/live exécuté.
- L’avertissement Vite sur les gros chunks optionnels Mermaid reste présent ; l’import est différé, le build est valide. Réduction de la distribution Mermaid possible ensuite.
- La comparaison visuelle documente des écarts de contenu volontairement honnêtes ; elle ne constitue pas une assertion de pixel-perfect ni une reproduction des données fictives du prototype comme réelles.

- 14:14 — Les deux scénarios ciblés corrigés passent : SSE réel 26,5 s (perte observée, Last-Event-ID positif à la reconnexion), Skills réel 5,4 s (quarantaine → hash revu → actif → désactivé). Relance complète des neuf E2E en cours, sans édition de sources applicatives. Contrôle visuel des 21 paires sur trois planches effectué ; un script Node génère la comparaison HTML et vérifie les dimensions exactes de chaque paire. Les preuves de tests/build sont conservées en .txt (le .gitignore global du dépôt exclut *.log).

- 14:16 — Validation intermédiaire des 9 E2E : 8/9 verts ; timeout de l’image Mermaid. Une reconstruction dist pour les dernières traductions a été lancée pendant la suite, ce qui peut supprimer des chunks différés encore référencés par une page ouverte (hypothèse, pas une preuve). C’est une erreur de méthode de ma part : je relance sur un build immuable et ne reconstruis plus pendant les tests. Échec brut conservé dans front-01-e2e-intermediate-failure.txt. Les huit autres scénarios, dont permissions ACP, sont verts. Traductions ajoutées : waiting_permission et types d’étapes ; refus permanent conservé si proposé par le serveur, aucune autorisation permanente.

- 14:18 — Validation finale sur sources/build immuables : npm test 18/18 ; node --test --test-concurrency=1 tests/e2e.test.mjs 9/9 (79,6 s), aucun skip ; build TypeScript/Vite vert, Prettier --check vert. Le flowchart Mermaid passe à nouveau en 2,9 s sans violation CSP. Dernier audit npm : zéro vulnérabilité. 21 paires de captures aux dimensions exactes + 4 vues supplémentaires (Modèles, quarantaine, Markdown/Mermaid, permission ACP), HTML/manifest et 3 planches comparatives régénérés. Vérification visuelle finale accueil, résultats, mobile et Mermaid : contenu lisible, résultats fictifs explicites. Onglet maquette fermé ; serveur Python 4412 (PID 62394) arrêté. Les E2E ferment leurs serveurs/profils temporaires dans les hooks de nettoyage.

## Résultats de validation avant → après

| Contrôle | Avant | Après, résultats réels |
| --- | --- | --- |
| Frontend | Aucun projet ni test | `npm test` : 18/18, 4 fichiers ; preuves `front-01-unit-tests.txt`. |
| Compilation | Absente ; première configuration TS en échec | `npm run build` : TypeScript strict + Vite verts ; avertissement connu de chunks Mermaid différés ; `front-01-build.txt`. |
| E2E | Absents ; premier lancement Chrome interdit par sandbox | Suite finale 9/9 sur Chrome système, vrai backend fixture, réseau désactivé ; zéro skip ; `front-01-e2e-tests.txt`. |
| Backend | Pas de baseline mesurée avant patch | Suite complète après patch : 162 unitaires/intégration + 37 Chrome = 199/199 ; `front-01-backend-tests.txt`. |
| Sécurité HTTP | Protections existantes | Conservées et testées ; test dist ajouté. CSP de production contrôlée dans l’E2E Markdown/Mermaid sans violation. |
| Dépendances | Aucune | Versions épinglées, licences inventoriées, `npm audit` : 0 vulnérabilité ; `front-01-audit.json`. |
| Formatage | Aucun code frontend | Prettier --check vert ; `front-01-format-check.txt`. |
| Visuel | 21 références seules | 21 captures correspondantes 1440×960 / 390×844, 4 vues supplémentaires ; `front-01-screens/comparison.html` et `manifest.json`. |

Les erreurs intermédiaires sont conservées dans le journal, ainsi que le log brut d’échec E2E intermédiaire. La suite finale a été relancée après toutes les modifications applicatives et sans reconstruction concurrente. Aucun test live Gemini, aucune authentification, aucun envoi d’e-mail/candidature, aucune publication ni push.

Livraison : écrans et parcours métier demandés en place, avec les limites explicites ci-dessus. Les données de la maquette non disponibles dans l’API n’ont pas été fabriquées. Le code backend modifié est dans le commit `91ec14d`, indépendant du frontend. Le rapport, les commandes de démarrage et les preuves sont conservés dans ce dépôt. Les changements préexistants du manager (`.manager/run.sh`, backend `.manager/run-sprint.sh`, `exports/`) ne sont pas inclus dans les commits de cette tâche.
