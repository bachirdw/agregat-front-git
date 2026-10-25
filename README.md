# agre agent · Frontend

Frontend français Vite + React + TypeScript, relié à l’API locale Relay. Aucun compte, tarif, résultat ou statut de connexion n’est inventé. Les démonstrations du backend sont marquées **données fictives**.

## Développement

Node.js 24+ compatible avec Vite 8. Dans `~/Downloads/agregateur-agent` :

```sh
npm ci --ignore-scripts
AGENT_PLATFORM_NETWORK=0 AGENT_PLATFORM_BROWSER=fixture npm start
```

Puis dans ce dépôt :

```sh
npm ci --ignore-scripts
npm run dev
```

Ouvrir http://127.0.0.1:5173. Le proxy Vite réécrit Host vers 127.0.0.1:4310 et retire Origin pour les appels `/api`. Les contrôles du backend restent inchangés. `AGENT_PLATFORM_API_URL=http://127.0.0.1:4311 npm run dev` permet un autre port local. Aucun serveur ne doit écouter sur une interface publique.

Utiliser une suggestion, préparer le plan, puis **Lancer**. Le démonstrateur ACP ne contacte aucun modèle. En mode Workflow, la recette `application-draft` attend une relecture humaine ; un refus ou une annulation permet une reprise dans le même run. L’historique permet de rouvrir une mission et ses accords en attente.

## Production locale

```sh
# Dans agregateur-frontend
npm run build

# Dans agregateur-agent (commit backend front-01 requis)
AGENT_PLATFORM_WEB_DIR=/Users/diaw/Downloads/agregateur-frontend/dist AGENT_PLATFORM_NETWORK=0 AGENT_PLATFORM_BROWSER=fixture npm start
```

Ouvrir http://127.0.0.1:4310. Le backend sert `index.html` et les fichiers de `assets/`, avec confinement des chemins et des liens symboliques. API, Host/Origin et CSP restent contrôlés. `npm run preview` sert seulement le build pour inspection et n’a pas de proxy API ; utiliser le backend pour un parcours fonctionnel en production.

## Vérifications

```sh
npm test                 # Vitest + Testing Library : client API, SSE, composants et sécurité Markdown
npm run build            # TypeScript strict puis compilation Vite
npm run test:e2e         # build + Chrome système, vrai backend fixture, réseau désactivé
npm audit
```

Les E2E utilisent `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, un profil jetable, des dossiers de données temporaires et des ports aléatoires sur 127.0.0.1. Ils ferment Chrome et les serveurs même en cas d’échec. L’emplacement du backend est configurable par `AGENT_PLATFORM_BACKEND_DIR`. Dans un sandbox qui interdit le lancement de Chrome, exécuter ces tests avec l’autorisation adaptée. Aucun test live fournisseur n’est exécuté.

Les captures sont dans `.manager/reports/front-01-screens/`. Le rapport détaillé, les écarts par écran et les limites figurent dans `.manager/reports/front-01.md`.

## Capacités et limites

- Missions, plans, routage, modèles annoncés, budgets, SSE, permissions ponctuelles, décisions DAG, annulation/reprise, résultats et consommation par mission : API réelle.
- Agents/Modèles, import GitHub des Skills, quarantaine/revue par hash, installation/activation et packs : catalogue/API réels.
- Le contenu des Skills n’est pas exposé par l’API : lecture externe à la révision exacte avant la case d’attestation et l’approbation. Les alertes et empreintes affichées viennent du serveur.
- Conversation de suivi, comparaison d’agents, connexion d’un CLI dans l’interface, choix navigateur côté client, consommation globale et packs futurs : **bientôt**, désactivés.
- Rendu Markdown sans HTML brut ; liens HTTP(S) avec `noopener noreferrer` ; aucune image distante d’agent chargée. Flowcharts Mermaid analysés en mode strict et rendus en SVG inerte sans injection de style. Les autres types restent consultables en code, explicitement signalés. Code consultable si un schéma échoue. Les gros chunks optionnels Mermaid déclenchent un avertissement Vite mais ne bloquent pas le build.
- Interface responsive, thème clair/sombre persistant, clavier, focus visibles et préférences de mouvement/transparence/contraste. `⌘K`/`Ctrl+K` crée une mission ; `⌘Entrée`/`Ctrl+Entrée` prépare un plan ; Échap ferme filtres/navigation mobile.

Versions directes épinglées dans `package.json`, graphe verrouillé dans `package-lock.json`. Voir `THIRD_PARTY_NOTICES.md` pour l’inventaire et les notices (régénération : `node scripts/dependency-notices.mjs`).
# agregateur-agent-front
