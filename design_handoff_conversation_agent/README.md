# Handoff : Conversation agent (agre agent)

## À coller dans Claude Code / Cursor (prompt)

> Implémente l'écran de conversation décrit dans `design_handoff_conversation_agent/README.md` dans notre codebase, en suivant nos conventions (framework, composants, gestion d'état). Le fichier `Conversation agent - Standalone.html` est la référence visuelle : ouvre-le dans un navigateur et reproduis-le **au pixel près**, y compris toutes les animations listées dans la section « Animations ». Copie les variables CSS de la section « Design tokens » telles quelles (thèmes clair/sombre). Ne simplifie pas : le dégradé animé en haut, les cartes translucides avec flou, la pastille de skill, la carte Suivi et la barre flottante pendant le travail font partie du rendu attendu. Branche les états sur les vrais événements de l'agent (voir « Données backend »).

## Pourquoi ton rendu ne correspond pas

Les écarts viennent presque toujours de ces points :
1. **Variables CSS manquantes** : sans `--layer`, `--layerShadow`, `--soft`, `--g1/g2/g3`, `--glow`, les cartes sont plates et le dégradé n'apparaît pas.
2. **`@keyframes` absents** : `rise`, `pop`, `dotp`, `caret`, `driftA/B/C` doivent être déclarés globalement.
3. **`backdrop-filter`** : nécessaire sur la sidebar, le header et les bulles (avec le préfixe `-webkit-`).
4. **Le dégradé** est un calque absolu *derrière* le contenu (`z-index:0`), et le contenu doit avoir `z-index:1`. Le fond de la zone de scroll doit rester transparent, sinon il masque le dégradé.
5. **Police** : la pile système Apple (`-apple-system, "SF Pro Text"…`), 13,5px, `letter-spacing:-0.008em`, `-webkit-font-smoothing:antialiased`.
6. **Les animations sont liées à l'état** (agent occupé ou non). Si l'état `busy` n'existe pas chez toi, rien ne bouge.

## Fichiers de référence
Ce sont des **références de design en HTML**, pas du code de production. Recrée-les dans l'environnement du projet (React, Vue, Svelte…).
- `Conversation agent - Standalone.html` : fonctionne hors ligne, ouvre-le dans le navigateur.
- `Conversation agent.dc.html` : source lisible (template + logique en bas du fichier).
- `screenshots/` : captures en thème sombre des états clés (fil vide, agent au travail avec pastille de skill, Suivi déplié, demande d'autorisation, les 3 onglets des Paramètres). Les animations ne sont visibles que dans le fichier HTML.

## Fidélité
**Haute fidélité.** Couleurs, tailles, rayons, ombres et timings sont définitifs. Les données (missions, coûts, pourcentages, commandes) sont fictives.

## Design tokens (copier tel quel)

```css
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-size:13.5px;line-height:1.5;letter-spacing:-0.008em}
[data-theme=dark]{color-scheme:dark;--bg:#0e0e10;--side:rgba(40,40,44,.82);--card:#1e1e21;--fill:rgba(120,120,128,.24);--fill2:rgba(120,120,128,.13);--label:#f5f5f7;--label2:#a1a1a6;--label3:#7c7c82;--sep:rgba(255,255,255,.08);--accent:#0a84ff;--green:#30d158;--red:#ff6961;--orange:#ff9f0a;--code:#1c1c1e;--cmd:#64d2ff;--bar:rgba(22,22,24,.62);--field:#242427;--glow:.55;--glowBusy:.8;--g1:#ff8a3d;--g2:#2f7bff;--g3:#ff4f9e;--layer:rgba(255,255,255,.065);--layerShadow:0 0 0 1px rgba(255,255,255,.09),inset 0 1px 0 rgba(255,255,255,.06),0 10px 30px -10px rgba(0,0,0,.55),0 1px 2px rgba(0,0,0,.3);--blend:screen;--soft:0 0 0 1px rgba(255,255,255,.1),inset 0 1px 0 rgba(255,255,255,.07),0 18px 44px -10px rgba(0,0,0,.8),0 2px 6px rgba(0,0,0,.3);--shadow:0 10px 32px rgba(0,0,0,.45),0 0 0 .5px rgba(255,255,255,.1)}
[data-theme=light]{color-scheme:light;--bg:#fff;--side:rgba(243,243,246,.9);--card:#f7f7f9;--fill:rgba(120,120,128,.12);--fill2:rgba(120,120,128,.07);--label:#1d1d1f;--label2:#6e6e73;--label3:#8e8e93;--sep:rgba(0,0,0,.08);--accent:#0071e3;--green:#248a3d;--red:#d70015;--orange:#c93400;--code:#fff;--cmd:#0b5cad;--bar:rgba(255,255,255,.62);--field:#fff;--glow:.8;--glowBusy:1;--g1:#ffd9a8;--g2:#bfe0ff;--g3:#ffd1e8;--layer:rgba(255,255,255,.72);--layerShadow:0 0 0 .5px rgba(0,0,0,.06),0 10px 30px -12px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.04);--blend:normal;--soft:0 0 0 .5px rgba(0,0,0,.09),0 18px 44px -12px rgba(0,0,0,.14),0 2px 6px rgba(0,0,0,.04);--shadow:0 10px 32px rgba(0,0,0,.14),0 0 0 .5px rgba(0,0,0,.08)}
```
Le thème suit `prefers-color-scheme` par défaut (`system`), forçable en `dark`/`light`.

Rayons : sidebar 18px · bulle agent 16px · bulle utilisateur 17px · composer 20px · cartes Suivi/paramètres 14–16px · boutons 8–12px · pastilles 10–13px (pill).

## Animations

```css
@keyframes dotp{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
@keyframes caret{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
@keyframes driftA{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(8%,10%) scale(1.15)}}
@keyframes driftB{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-10%,8%) scale(1.1)}}
@keyframes driftC{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(6%,-12%) scale(1.2)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
```

| Élément | Animation |
|---|---|
| Chaque message (entrée) | `rise .24s ease-out` |
| Dépliages (étapes, détails) | `rise .2s ease-out` |
| Carte Suivi, barre flottante, popover d'instruction | `pop .3s cubic-bezier(.2,.8,.2,1)` |
| Points « en cours » (orange) | `dotp 1.1s infinite`, 3 points décalés de 0 / .15s / .3s |
| Curseur de frappe | barre 2px, `caret 1s steps(1) infinite` |
| Chevrons | `transform rotate(0→90deg)`, `transition .2s cubic-bezier(.2,.8,.2,1)` |
| Composer qui disparaît pendant le travail | `grid-template-rows 1fr→0fr .35s cubic-bezier(.2,.8,.2,1)` + `opacity .25s` |
| Carte Suivi qui se décale | `bottom 92px→64px`, `transition .35s cubic-bezier(.2,.8,.2,1)` |
| Interrupteurs | fond `.2s`, pastille `translateX(0→14px) .2s` |
| Boutons pressés | `transform:scale(.94–.98)` à l'`:active` |

### Dégradé du haut (le plus important)
Calque `position:absolute; top:0; left:0; right:0; height:300px; overflow:hidden; pointer-events:none; z-index:0` dans la colonne principale, avec :
- `mix-blend-mode: var(--blend)`
- `opacity: var(--glow)` au repos, `var(--glowBusy)` quand l'agent travaille, `transition: opacity .8s ease`
- `mask-image: linear-gradient(to bottom,#000 30%,transparent)` (+ `-webkit-mask-image`)

Trois blobs, chacun `position:absolute; width:46%; height:130%; border-radius:50%; filter:blur(28px); background:radial-gradient(closest-side, COULEUR, transparent)` :
- A : `left:-8%; top:-55%`, `var(--g1)` (pêche), `driftA`, 14s au repos / 6s en travail
- B : `right:-6%; top:-40%`, `var(--g2)` (bleu), `driftB`, 16s / 7s
- C : `left:30%; top:-20%`, `var(--g3)` (rose), `driftC`, 12s / 5s
- `animation: <nom> <durée> ease-in-out infinite`. Au repos `animation-play-state:paused`, en travail `running`.

## Écran : conversation

**Mise en page** : `display:flex; height:100vh`.
- **Sidebar flottante** 216px, `margin:10px 0 10px 10px`, rayon 18px, `background:var(--side)`, `backdrop-filter:saturate(180%) blur(24px)`, `box-shadow:var(--soft)`. Contient le logo (carré 22px rayon 7), le bouton « Nouvelle mission ⌘K » (30px, rayon 9, `--fill2`), la liste des missions (lignes 28px, point de couleur 6px, « en cours » en orange), le compte en bas avec l'engrenage (28px) qui ouvre les Paramètres. Masquée sous 760px.
- **Header** 48px, `background:var(--bar)` + `blur(20px)`, séparateur `inset 0 -.5px 0 var(--sep)` ; titre 13,5px/600 + badge statut (20px, pill, `--fill2`).
- **Fil** : colonne `max-width:660px`, centrée, `padding:22px 20px 170px`, `gap:18px`.
  - Bulle utilisateur : alignée à droite, `max-width:min(78%,520px)`, `padding:7px 13px`, rayon 17, `--fill`, `box-shadow:var(--layerShadow)`, `blur(12px)`.
  - Réponse agent : carte `padding:12px 16px`, rayon 16, `background:var(--layer)`, `box-shadow:var(--layerShadow)`, `backdrop-filter:blur(14px)`. Contient intro (frappe progressive + curseur), une ligne d'activité repliable (résumé de l'étape en cours, durée, chevron), les étapes (✓ vert / ✕ rouge / point orange) avec bloc de commande monospace 11,5px dépliable et bouton « Copier », la réponse finale, puis une ligne méta discrète (« ✓ Vérifié · 3 preuves · 0,00 € ») qui ouvre les détails du Suivi.
  - **Pastille de skill** (nouveau) : juste au-dessus de la carte agent, alignée à gauche, `margin:0 0 -2px 6px`. Pill 22px, `padding:0 10px`, rayon 11, `background:var(--layer)`, `box-shadow:var(--layerShadow)`, `blur(14px)`, monospace 11px, couleur `--label2`, point accent 5px pulsant (`dotp`), entrée `rise .25s`. Texte = nom du skill/outil (ex. `career_read`). Visible seulement au début de chaque étape (~1,6 s), cachée pendant une demande d'autorisation et une fois l'agent arrêté.
  - Demande d'autorisation (dans la carte) : bandeau rayon 12, fond `color-mix(in srgb,var(--orange) 11%,transparent)`, texte 12,5px, boutons pill 24px « Refuser », « Toujours autoriser » (`--fill`) et « Autoriser » (`--accent`, texte blanc).
- **Composer** en bas, posé sur un dégradé `linear-gradient(to bottom,transparent,var(--bg) 28px)` : champ rayon 20, `background:var(--field)`, `box-shadow:var(--shadow)`, textarea auto-hauteur (max 40vh), bouton envoyer rond 28px accent. Entrée = envoyer, Maj+Entrée = retour à la ligne. Suggestions (pills 26px) sur un fil vide. **Se replie pendant que l'agent travaille.**
- **Barre flottante pendant le travail** (bas droite, 16px) : pill 14px de rayon, `--bar` + blur, deux boutons 32px : crayon (ouvre un popover « Ajouter une instruction pour l'agent », mise en file d'attente) et stop (carré 10px rayon 2,5).
- **Carte Suivi** (bas droite, 268px, rayon 16, `--field`, `--soft`) : ligne 36px avec point d'état (orange/vert/rouge), phrase résumée (« En train de rechercher les offres… »), compteur `2/3`, chevron. Déplié : étapes majeures (○ à venir, • en cours, ✓, ✕, ! attente), puis « Détails techniques » repliable (grille clé/valeur 11,5px : Agent, Session, Navigateur, Preuves, Vérification, Coût, Registre). Les demandes d'autorisation apparaissent aussi ici.
- **Panneau droit** « Connexions locales » 276px (masqué sous 1100px) : agents connectés, journal horaire des événements, carte Coût.

## Écran : Paramètres
Recouvre la colonne principale (`rise .22s`). Header 48px avec retour, titre, et contrôle segmenté (3 onglets, fond `--fill2`, onglet actif `--field` + ombre `0 1px 3px rgba(0,0,0,.18)`). Contenu `max-width:620px`. Groupes façon iOS : titre 11,5px/600 `--label3`, carte rayon 14 `--layer`/`--layerShadow`, lignes 40px séparées par `inset 0 -.5px 0 var(--sep)`.
- **Profil** : nom, e-mail, langue ; CV (Importer), LinkedIn (Relier).
- **Utilisation** : session et semaine avec barres 5px accent ; consommation plateforme du mois.
- **Disponible** : agents connectés, interrupteurs d'outils (36×22, vert si actif), domaines toujours autorisés (Retirer).

## État
- `busy` (un agent travaille) : pilote le dégradé, le composer, la barre flottante, la position du Suivi.
- Par tour agent : progression des étapes, `waiting` (autorisation), `approved`/`denied`, `currentSkill`.
- `allowedDomains[]` (Toujours autoriser), `queue[]` (instructions en file), `trkOpen`, `trkDetails`, `openSteps{}`, `view: 'chat'|'settings'`, `tab`, `tools{}`, `theme`.
- Défilement : coller en bas tant que l'utilisateur est à moins de 40px du bas.

## Données backend attendues
Événements de flux : `text.delta`, `step.start {title, tool}`, `step.command`, `step.output`, `step.end {ok}`, `permission.request {domain, label}`, `run.end {verification, proofs, cost}`. La pastille de skill s'affiche sur `step.start` avec `tool` et disparaît après environ 1,6 s ou au `step.end`.

## Icônes
SVG inline (traits 1,5–1,8px, extrémités arrondies). Équivalents Lucide possibles : plus, settings, panel-right, terminal, chevron-right, pencil, square.
