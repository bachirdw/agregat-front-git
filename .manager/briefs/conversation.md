# conversation — Affichage « à la Claude Code » (demande de l'utilisateur, 27/10 au soir) — cahier des charges

Codé par le manager : `[conversation-a]` à `[conversation-d]` (`src/Career.tsx`, `src/follow.ts`, `src/App.tsx`,
`src/style.css`, `src/conversation.test.tsx`). Plan validé par l'utilisateur (points 1 à 3). Branché uniquement sur
les événements ACP déjà émis (agent_message_chunk, agent_thought_chunk, tool_call, tool_call_update, état `failed`,
route `/runs/:id/cancel`) : aucune logique d'agent modifiée.

1. Réponse en streaming ; pendant l'attente, indicateur discret « Réflexion… » / « Exécution… ».
2. Bloc « ▸ Réflexion » replié par défaut ; au clic, raisonnement en texte grisé ; indicateur dans le bloc pendant la
   réflexion, puis reste replié.
3. Une ligne par action : icône d'état (spinner / ✓ / ✗ rouge) + nom court + résumé ; au clic, paramètres et résultat
   en monospace avec défilement ; actions consécutives regroupées « N actions » repliées.
4. Seule la réponse finale reste visible ; les erreurs restent visibles (action en échec en rouge même groupe replié).
5. Bouton « Stop » pendant l'exécution ; défilement automatique vers le bas sauf si l'utilisateur a remonté.
Contraintes : aucune bibliothèque nouvelle, style actuel (variables CSS, thème clair/sombre), aucune fonctionnalité
non listée (proposer avant de coder).
