// conversation-02 : captures en sombre (en cours, accord en attente, terminée).
// Usage : node capture.mjs <avant|apres>. Backend fixture en processus (port aléatoire), Vite dev (port aléatoire).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const FRONT = resolve(HERE, "../../..");
const BACK = process.env.AGENT_PLATFORM_BACKEND_DIR || resolve(FRONT, "../agregat-back-git");
const CHROME = process.env.CHROME || "/opt/pw-browsers/chromium";
const label = process.argv[2] || "apres";
process.env.AGENT_PLATFORM_NETWORK = "0";
process.env.AGENT_PLATFORM_BROWSER = "fixture";
const { chromium } = await import(FRONT + "/node_modules/playwright-core/index.mjs");
const { createServer } = await import(FRONT + "/node_modules/vite/dist/node/index.js");
const { createApp } = await import(BACK + "/apps/api/server.js");
async function choose(page, name, value) {
  const select = page.getByLabel(name, { exact: true });
  const details = select.locator("xpath=ancestor::details");
  if (!(await details.getAttribute("open"))) await details.locator("summary").click();
  await select.selectOption(value);
  await select.press("Escape");
}
const dataDir = mkdtempSync(join(tmpdir(), "conversation-02-"));
const app = createApp({ dataDir, live: false, webDir: null });
let vite, browser;
try {
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const target = `http://127.0.0.1:${app.server.address().port}`;
  vite = await createServer({ root: FRONT, configFile: FRONT + "/vite.config.ts", logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false, proxy: { "/api": { target, changeOrigin: true, configure(p) { p.on("proxyReq", (q) => q.removeHeader("origin")); } } } } });
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: "dark" });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem("agre-theme", "dark"); } catch {} });
  const shot = (n) => page.screenshot({ path: join(HERE, `${label}-${n}.png`) });
  await page.goto(base);
  await page.locator(".app[data-ready=true]").waitFor();
  await page.getByLabel("Objectif de la mission").fill("Rechercher des offres Python et SQL en Australie (données fictives)");
  await choose(page, "Agent", "fixture"); await choose(page, "Pack", "najah"); await choose(page, "Mode", "workflow"); await choose(page, "Workflow", "application-draft");
  await page.getByRole("button", { name: "Préparer le plan", exact: true }).click();
  await page.getByRole("region", { name: "Plan proposé" }).waitFor();
  await page.getByRole("button", { name: "Lancer", exact: true }).click();
  await page.locator(".run-active").waitFor();
  await page.waitForTimeout(150);
  const waitingAlready = await page.getByRole("button", { name: "Approuver", exact: true }).count();
  await shot("1-en-cours");
  console.log(`${label} : en cours capturé (accord déjà affiché : ${waitingAlready > 0})`);
  await page.getByRole("button", { name: "Approuver", exact: true }).waitFor({ timeout: 45000 });
  const id = app.store.list()[0].id;
  const decision = app.engine.permission(id, { toolCall: { title: "Lire une page de test locale (FICTIF)", toolCallId: "conversation-02", kind: "read" },
    options: [{ optionId: "once", name: "Autoriser une fois", kind: "allow_once" }, { optionId: "deny", name: "Refuser", kind: "reject_once" }, { optionId: "always", name: "Autoriser toujours", kind: "allow_always" }] }, false, new AbortController().signal);
  await page.getByRole("button", { name: "Autoriser une fois" }).waitFor();
  await page.waitForTimeout(500);
  await shot("2-accord-en-attente");
  await page.getByRole("button", { name: "Refuser", exact: true }).last().click();
  await decision;
  await page.getByRole("button", { name: "Approuver", exact: true }).click();
  await page.locator(".toolbar .badge").filter({ hasText: "Terminée" }).waitFor({ timeout: 45000 });
  await page.waitForTimeout(800);
  await shot("3-terminee");
  console.log(`${label} : erreurs de page = ${JSON.stringify(errors)}`);
} finally {
  await browser?.close().catch(() => {});
  await vite?.close().catch(() => {});
  await app.close().catch(() => {});
  rmSync(dataDir, { recursive: true, force: true });
}
process.exit(0);
