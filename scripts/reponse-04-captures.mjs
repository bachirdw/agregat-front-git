// Captures reponse-04 (brief 04 « réponse de l'agent façon Claude Code ») : thème sombre, 1440, 924 et
// 760 px, sur le back réel en mode fixture hors réseau, chargé en lecture seule. Usage :
//   npm run build && node scripts/reponse-04-captures.mjs avant|apres
// Toutes les données affichées sont FICTIVES (agent fixture, missions marquées « FICTIF »).
// États :
// 1. terminee-workflow : vraie mission workflow fictive terminée (preuves et coût mesuré) ;
// 2. reponse-agent : réponse d'agent écrite dans la base (markdown, tableau, série chiffrée, fichier
//    écrit, une action en échec), pour voir le rendu du texte ;
// 3. equipe : mission d'équipe écrite dans la base (un membre terminé, un en échec).
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

process.env.AGENT_PLATFORM_NETWORK = "0";
process.env.AGENT_PLATFORM_BROWSER = "fixture";
const label = process.argv[2];
if (!["avant", "apres"].includes(label))
  throw new Error("Préciser avant ou apres");
const backend =
  process.env.AGENT_PLATFORM_BACKEND_DIR ||
  [
    join(homedir(), "Downloads/agregat-back-swarm"),
    resolve("../agregat-back"),
  ].find((dir) => existsSync(join(dir, "apps/api/server.js")));
const { createApp } = await import(resolve(backend, "apps/api/server.js"));
const out = resolve(".manager/reports/reponse-04");
mkdirSync(out, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dataDir = mkdtempSync(join(tmpdir(), "reponse-04-"));
const app = createApp({ dataDir, live: false, webDir: resolve("dist") });
let browser;
const plan = {
  steps: [],
  cost: {
    platformCents: 0,
    currency: "EUR",
    budgetCents: 0,
    withinBudget: true,
    description: "FICTIF",
    lines: [],
  },
};
const now = Date.now();
const iso = (s) => new Date(now + s * 1000).toISOString();
const prompts = {
  workflow: "Mission FICTIVE : offres Python et SQL",
  agent:
    "Mission FICTIVE : utilise le navigateur (browser_navigate / browser_snapshot / browser_extract) et des recherches web pour couvrir le marché australien des outils d'aide à la candidature. Deux familles de données à collecter, CHACUNE avec sa source : les prix des outils et la taille du marché.",
  team: "Mission FICTIVE : offres sur deux portails, en équipe",
};
const chart = JSON.stringify({
  type: "bar",
  title: "Taille du marché FICTIVE, M USD",
  source: "Source FICTIVE · TCAC 7,22 %",
  x: [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034],
  y: [
    774.7, 830.6, 890.6, 954.8, 1023.7, 1097.6, 1176.8, 1261.7, 1352.7, 1450.9,
  ],
  highlight: [0, 9],
});
const answer = [
  "La recherche FICTIVE est terminée. Tout est sourcé dans `australie.md` : chaque ligne porte l'URL et la date de consultation.",
  "",
  "### Prix des outils",
  "",
  "| Outil | Plan payant | Source |",
  "| --- | --- | --- |",
  "| Outil A | 29 USD/mois | officielle |",
  "| Outil B | 8–24 USD/mois | officielle |",
  "| Outil C | 40 USD/mois | officielle |",
  "| Outil D, E… | non confirmé | secondaire |",
  "",
  "### Marché (données FICTIVES)",
  "",
  "```chart",
  chart,
  "```",
  "",
  "- Adoption de l'IA : **25 %** des candidats, **76 %** des recruteurs (source FICTIVE, 14/01/2026)",
  "- ~184 candidatures par offre (source FICTIVE, avr. 2025)",
  "",
  "### À vérifier",
  "",
  "- Prix officiels des outils D et E (pages en 403)",
  "- Le chiffre « 62 % » n'est pas confirmé à la source",
].join("\n");
function seedAgent() {
  const id = crypto.randomUUID();
  app.store.create({
    id,
    prompt: prompts.agent,
    state: "completed",
    mode: "agent",
    agent: "fixture",
    pack: "core",
    model: "",
    simulated: true,
    budgetCents: 0,
    createdAt: iso(-300),
    finishedAt: iso(-48),
    plan,
    result: {
      simulated: true,
      summary: answer,
      answer,
      evidence: [
        { url: "https://outil-a.example.test/pricing", title: "Prix FICTIFS" },
        { url: "https://outil-b.example.test/pricing", title: "Prix FICTIFS" },
      ],
    },
  });
  const tool = (toolCallId, title, status, extra = {}) =>
    app.store.event(id, "agent", {
      sessionUpdate: "tool_call",
      toolCallId,
      title,
      status,
      ...extra,
    });
  tool(
    "t1",
    "browser_navigate(url: https://outil-a.example.test/pricing)",
    "completed",
  );
  tool(
    "t2",
    "browser_extract(url: https://outil-b.example.test/pricing)",
    "completed",
  );
  tool(
    "t3",
    "browser_navigate(url: https://outil-d.example.test/pricing)",
    "failed",
    {
      rawOutput: "403",
    },
  );
  tool("t4", "web_search(query: candidats IA FICTIF)", "completed");
  tool("t5", "Write australie.md", "completed", {
    kind: "edit",
    locations: [
      { path: "relay/missions/fictive/1-recherche-marche/australie.md" },
    ],
  });
  app.store.event(id, "verification", {
    scope: "Pages naviguées et observées (FICTIF)",
  });
  return id;
}
function seedTeam() {
  const mother = crypto.randomUUID();
  app.store.create({
    id: mother,
    prompt: prompts.team,
    state: "completed",
    mode: "agent",
    agent: "fixture",
    pack: "core",
    model: "",
    simulated: true,
    budgetCents: 0,
    createdAt: iso(-600),
    estMere: true,
    multiAgent: true,
    delegation: { accepted: true, via: "bouton", total: 6, parallel: 3 },
    plan,
    result: {
      simulated: true,
      summary: "Synthèse FICTIVE : 2 portails couverts, un membre relancé.",
      evidence: [],
    },
  });
  for (const [portal, state] of [
    ["portail A", "completed"],
    ["portail B", "failed"],
  ])
    app.store.create({
      id: crypto.randomUUID(),
      prompt: `Consigne FICTIVE : offres sur le ${portal}`,
      state,
      mode: "agent",
      agent: "fixture",
      pack: "core",
      model: "",
      simulated: true,
      budgetCents: 0,
      createdAt: iso(-590),
      ...(state === "failed" ? { error: "Erreur FICTIVE : page en 403" } : {}),
      famille: {
        racine: mother,
        mere: mother,
        titre: `Offres FICTIVES, ${portal}`,
      },
      plan,
      result:
        state === "completed"
          ? {
              simulated: true,
              summary: "Résultat FICTIF du membre.",
              evidence: [],
            }
          : undefined,
    });
  return mother;
}
async function choose(page, name, value) {
  const select = page.getByLabel(name, { exact: true });
  // 21/11 : à l'accueil, les réglages sont derrière le bouton « agent · modèle ».
  const menu = page.locator(".composer details.session-menu");
  if ((await menu.count()) && (await menu.getAttribute("open")) === null)
    await menu.locator("> summary").click();
  const details = select.locator("xpath=ancestor::details[1]");
  if (!(await details.getAttribute("open")))
    await details.locator("summary").click();
  await select.selectOption(value);
  await select.press("Escape");
}
async function openRun(page, prompt) {
  await page.locator(`.mission-link span[title="${prompt}"]`).click();
}
try {
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(base);
    await page.locator(".app[data-ready=true]").waitFor();
    await page.getByLabel("Objectif de la mission").fill(prompts.workflow);
    await choose(page, "Agent", "fixture");
    await choose(page, "Pack", "najah");
    await choose(page, "Mode", "workflow");
    await choose(page, "Workflow", "opportunity-discovery-dag");
    await page
      .getByRole("button", { name: "Lancer la mission", exact: true })
      .click();
    await page
      .locator(".toolbar .badge")
      .filter({ hasText: "Terminée" })
      .waitFor({ timeout: 45000 });
    await page.close();
  }
  seedAgent();
  seedTeam();
  const shots = [];
  for (const width of [1440, 924, 760]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(base);
    await page.locator(".app[data-ready=true]").waitFor();
    for (const [state, prompt] of Object.entries({
      "terminee-workflow": prompts.workflow,
      "reponse-agent": prompts.agent,
      equipe: prompts.team,
    })) {
      // Sous 761 px la barre latérale est fermée : on l'ouvre pour choisir la mission.
      if (!(await page.locator(".sidebar").count()))
        await page
          .getByRole("button", { name: "Afficher la barre latérale" })
          .click();
      await openRun(page, prompt);
      // Sous 761 px le badge d'état est masqué : on attend son texte, pas sa visibilité.
      await page.waitForFunction(
        () =>
          document.querySelector(".toolbar .badge")?.textContent === "Terminée",
      );
      await page.waitForTimeout(600);
      const name = `${label}-${state}-${width}-sombre`;
      await page.screenshot({ path: join(out, name + ".png") });
      shots.push(name);
      // Le haut du fil (badges, carte « Exécution »… avant ; ligne d'activité après).
      await page.evaluate(() =>
        document.querySelector(".scroll-content")?.scrollTo(0, 0),
      );
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(out, name + "-haut.png") });
      shots.push(name + "-haut");
      if (label === "apres" && state === "equipe" && width === 1440) {
        // Vue scindée : un membre de l'équipe suivi à côté du fil (panneau Activité ouvert à 1440 px).
        await page
          .getByRole("button", { name: /^Voir à côté/ })
          .first()
          .click();
        await page.locator(".side-pane .reponse").waitFor();
        await page.waitForTimeout(400);
        await page.screenshot({ path: join(out, name + "-vue-scindee.png") });
        shots.push(name + "-vue-scindee");
        await page
          .getByRole("button", { name: "Fermer la vue à côté" })
          .click();
      }
      if (label === "apres" && state === "reponse-agent") {
        // Ligne méta et ligne d'activité dépliées.
        for (const name of [/Vérifié|preuves/, /A exécuté/])
          await page
            .getByRole("button", { name })
            .first()
            .click()
            .catch(() => {});
        await page.waitForTimeout(300);
        await page.screenshot({ path: join(out, name + "-deplie.png") });
        shots.push(name + "-deplie");
      }
    }
    await context.close();
  }
  console.log(`${shots.length} captures dans ${out}`);
} finally {
  await browser?.close();
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
}
