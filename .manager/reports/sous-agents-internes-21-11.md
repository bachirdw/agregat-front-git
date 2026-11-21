# sous-agents-internes-21-11 : voir les sous-agents que l'agent lance lui-même

Question du propriétaire (21/11, 23:15), capture de la mission career-ops `48087a51` : « pourquoi je vois pas
d'autres sous-agents s'activer ». Réponse « Oui, affiche-les ».

## Constats (journal réel, lecture seule)
- La mission est en « Agent unique » : aucune délégation, aucune sous-mission Relay, `family` absent. Le panneau
  Équipe ne montre que les sous-missions de la plateforme : il n'avait rien à montrer.
- Codex a lancé ses **propres** sous-agents : appels « Start / Interact with / Complete subagent <nom> »
  (`rawInput.agentPath`, `activityKind`) : `scan_australia`, `shortlist_existing`, `evaluate_harvey`. Le back les
  reconnaît (`natifs-01`, `profiles.js` `nativeSubagents`) mais ne les dit qu'en une ligne du Bilan final
  (`docs/api-delegation.md` 5.1) ; rien de structuré pendant la mission.
- Le front les affichait « Start subagent … » (anglais) et, surtout, **173 mises à jour nues**
  (`{ toolCallId: "exec-…", status: "in_progress" }`, sans titre, sans entrée, jamais finies), arrivées à partir du
  premier départ de sous-agent : les commandes des sous-agents. Elles devenaient des étapes « Outil » toujours
  « en cours » dans le panneau (et pouvaient garder « Exécution… » allumé).

## Fait (affichage seulement, données du flux)
- `Career.tsx` : `Tool.bare` (appel connu seulement par une mise à jour nue) ; `nativeActivity()` reconnaît une
  activité de sous-agent interne (forme Codex `agentPath` + `activityKind`, forme Claude Code `Agent` +
  `subagent_type`, comme le profil du back) ; `nativeSubagents()` les regroupe par nom (état vu : en cours,
  terminé, en échec ; nombre d'échanges) et compte les actions nues ; `describeTool` les nomme « Sous-agent <nom> ·
  lancé / relancé / terminé ».
- `Tracker.tsx` : les actions nues ne sont plus des étapes du panneau.
- `RunTurn.tsx` : ligne « N sous-agent(s) interne(s) de Codex » dans l'activité de la réponse (nom, état écrit,
  échanges), « N actions sans détail », « lancé(s) par l’agent lui-même : modèle et consommation non transmis ».
  Mission finie sans fin vue : « sans fin vue » (mot du back). Les actions nues ne comptent plus pour
  « Exécution… ». Ni Arrêter ni Suivre : la plateforme ne les pilote pas.
- `v2.css` : style `.internes` (discret, état écrit, couleurs du thème).

## Écarts et limites
- L'attribution des 173 actions nues aux sous-agents vient de leur forme et de leur moment (après le premier
  départ), pas d'un champ du back : le texte dit seulement « actions sans détail ».
- Le back ne fournit pas ces sous-agents en champ structuré pendant la mission : le front lit les appels bruts de
  l'agent (forme décrite par le back dans `profiles.js`). Si le manager ajoute un champ (ex. sur
  `GET /api/runs/:id`), le front devra le suivre à la place.

## Vérifications
- `src/sous-agents-internes.test.tsx` : 5 tests ; les 4 premiers vus en échec avant le code, le 5e (accord
  « lancé » au singulier) écrit après la correction.
- Suite complète 34 fichiers, 497/497 ; `npm run build` (avec `tsc`) OK ; prettier OK.
- Vu dans Chrome sur 5174 (mission réelle, lecture seule) : tour suivant `396be22c` en cours, « 1 sous-agent
  interne de Codex · verify_shortlist_count · en cours » dans le fil ; panneau « Sous-agent verify_shortlist_count
  · lancé », plus de liste d'« Outil ». Le tour précédent montre son résultat privé et la ligne du Bilan des
  3 sous-agents.
- E2E non relancé pour ce lot.
