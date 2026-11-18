// Captures activity-panel-03 : trois états (en cours, accord en attente, terminée), 1440 et 924 px,
// clair et sombre, sur le back réel en mode fixture hors réseau. Usage :
//   npm run build && node scripts/activity-panel-03-captures.mjs avant|apres
// Toutes les données affichées sont FICTIVES (agent fixture, missions marquées « FICTIF »).
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
  [resolve("../agregat-back"), join(homedir(), "Downloads/agregat-back")].find(
    (dir) => existsSync(join(dir, "apps/api/server.js")),
  );
const { createApp } = await import(resolve(backend, "apps/api/server.js"));
const out = resolve(".manager/reports/activity-panel-03");
mkdirSync(out, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dataDir = mkdtempSync(join(tmpdir(), "activity-panel-03-"));
const app = createApp({ dataDir, live: false, webDir: resolve("dist") });
let browser;
const prompts = {
  running: "Mission FICTIVE en cours : offres data engineer",
  approval: "Mission FICTIVE : lettre à approuver",
  completed: "Mission FICTIVE : offres Python et SQL",
};
async function choose(page, name, value) {
  const select = page.getByLabel(name, { exact: true });
  const details = select.locator("xpath=ancestor::details");
  if (!(await details.getAttribute("open")))
    await details.locator("summary").click();
  await select.selectOption(value);
  await select.press("Escape");
}
async function launch(page, prompt, workflow) {
  await page.getByLabel("Objectif de la mission").fill(prompt);
  await choose(page, "Agent", "fixture");
  await choose(page, "Pack", "najah");
  await choose(page, "Mode", "workflow");
  await choose(page, "Workflow", workflow);
  await page
    .getByRole("button", { name: "Lancer la mission", exact: true })
    .click();
}
function seedRunning() {
  const id = crypto.randomUUID();
  app.store.create({
    id,
    prompt: prompts.running,
    state: "running",
    mode: "agent",
    agent: "fixture",
    pack: "core",
    model: "",
    simulated: true,
    budgetCents: 0,
    createdAt: new Date().toISOString(),
    browserDomains: ["jobs.example.test"],
    missionProof: {
      reads: [
        {
          capability: "browser.navigate",
          url: "https://jobs.example.test/offres",
        },
        {
          capability: "browser.snapshot",
          url: "https://careers.example.test/data",
        },
      ],
    },
    plan: {
      steps: [],
      cost: {
        platformCents: 0,
        currency: "EUR",
        budgetCents: 0,
        withinBudget: true,
        description: "FICTIF",
        lines: [],
      },
    },
  });
  const tool = (toolCallId, title, status) =>
    app.store.event(id, "agent", {
      sessionUpdate: "tool_call",
      toolCallId,
      title,
      status,
    });
  tool("t1", "mcp__platform__browser_navigate", "completed");
  app.store.event(id, "browser_evidence", {
    title: "Offres FICTIVES",
    url: "https://jobs.example.test/offres",
  });
  tool("t2", "mcp__platform__browser_snapshot", "in_progress");
  return id;
}
async function openRun(page, prompt) {
  await page.locator(`.mission-link span[title="${prompt}"]`).click();
}
const ready = {
  running: (page) =>
    page.locator(".toolbar .badge").filter({ hasText: "En cours" }).waitFor(),
  approval: (page) =>
    page.getByRole("button", { name: "Approuver", exact: true }).waitFor(),
  completed: async (page) => {
    await page
      .locator(".toolbar .badge")
      .filter({ hasText: "Terminée" })
      .waitFor({ timeout: 45000 });
    await page
      .getByRole("region", { name: "Résultats", exact: true })
      .waitFor();
  },
};
const toggle = (page) =>
  page.locator(".toolbar .panel-toggle, .toolbar [aria-label*='panneau']").first();
try {
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  // Missions réelles du back fixture : accord en attente puis mission terminée.
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(base);
    await page.locator(".app[data-ready=true]").waitFor();
    await launch(page, prompts.approval, "application-draft");
    await ready.approval(page);
    await page.getByRole("button", { name: "Nouvelle mission" }).click();
    await launch(page, prompts.completed, "opportunity-discovery-dag");
    await ready.completed(page);
    await page.close();
  }
  seedRunning();
  const shots = [];
  for (const theme of ["light", "dark"])
    for (const width of [1440, 924]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.goto(base);
      await page.locator(".app[data-ready=true]").waitFor();
      for (const state of ["running", "approval", "completed"]) {
        await openRun(page, prompts[state]);
        await ready[state](page);
        await page.waitForTimeout(500);
        const name = `${label}-${state}-${width}-${theme}`;
        await page.screenshot({ path: join(out, name + ".png") });
        shots.push(name);
        // Après : à 1440 px, une vue de plus avec les Connecteurs dépliés (journal de la mission).
        if (label === "apres" && width === 1440) {
          const connectors = page.getByRole("button", { name: /^Connecteurs/ });
          await connectors.click();
          await page.waitForTimeout(300);
          await page.screenshot({ path: join(out, name + "-connecteurs.png") });
          shots.push(name + "-connecteurs");
          await connectors.click();
        }
        // À 924 px le panneau est fermé par défaut : capture aussi panneau ouvert.
        if (width === 924) {
          await toggle(page).click();
          await page.waitForTimeout(400);
          await page.screenshot({ path: join(out, name + "-panneau.png") });
          shots.push(name + "-panneau");
          await toggle(page).click();
          // La barre latérale peut avoir été masquée à l'ouverture du panneau.
          if (!(await page.locator(".sidebar").count()))
            await page
              .getByRole("button", { name: "Afficher la barre latérale" })
              .click();
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
