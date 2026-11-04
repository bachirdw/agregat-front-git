// verif-01 : backend fixture en processus + `npm run dev` (groupe de processus à part) + playwright-core.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const FRONT = "/home/user/agregat-front-git";
const OUT = FRONT + "/.manager/reports/verif-01";
const CHROME = "/opt/pw-browsers/chromium";
const { chromium } = await import(FRONT + "/node_modules/playwright-core/index.mjs");
process.env.AGENT_PLATFORM_NETWORK = "0";
process.env.AGENT_PLATFORM_BROWSER = "fixture";
const { createApp } = await import("/home/user/agregat-back-git/apps/api/server.js");
const log = [];
const note = (s) => { log.push(s); console.log(s); };
const SEL = [".sidebar", ".toolbar", ".glow", ".glow i:nth-child(1)", ".glow i:nth-child(2)", ".glow i:nth-child(3)", ".prompt-bubble", ".agent-turn", ".skill-chip", ".tracker", ".mission-pill", ".composer"];
const PROPS = ["background", "box-shadow", "border-radius", "backdrop-filter", "animation-name", "animation-duration", "animation-play-state", "opacity", "font-family", "font-size", "mix-blend-mode"];
const measure = (page) => page.evaluate(([sel, props]) => {
  const out = { runActive: !!document.querySelector(".run-active"), theme: document.documentElement.dataset.theme };
  for (const s of sel) { const e = document.querySelector(s); out[s] = e ? Object.fromEntries(props.map((p) => [p, getComputedStyle(e).getPropertyValue(p)])) : null; }
  return out;
}, [SEL, PROPS]);
async function choose(page, label, value) {
  const select = page.getByLabel(label, { exact: true });
  const details = select.locator("xpath=ancestor::details");
  if (!(await details.getAttribute("open"))) await details.locator("summary").click();
  await select.selectOption(value);
  await select.press("Escape");
}
let dev, browser, app, dataDir;
const styles = {}, variables = {};
try {
  dataDir = mkdtempSync(join(tmpdir(), "verif-01-"));
  app = createApp({ dataDir, live: false, webDir: null });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const target = `http://127.0.0.1:${app.server.address().port}`;
  note(`backend fixture : ${target} (dataDir temporaire ${dataDir})`);
  dev = spawn("npm", ["run", "dev"], { cwd: FRONT, env: { ...process.env, AGENT_PLATFORM_API_URL: target }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let devOut = ""; dev.stdout.on("data", (d) => (devOut += d)); dev.stderr.on("data", (d) => (devOut += d));
  const base = "http://127.0.0.1:5173";
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  note(`npm run dev (pid ${dev.pid}) : ${base}`);
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  for (const [theme, fr] of [["light", "clair"], ["dark", "sombre"]]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: theme });
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((t) => { try { localStorage.setItem("agre-theme", t); } catch {} }, theme);
    const shot = (n) => page.screenshot({ path: join(OUT, "captures", `${n}-${fr}.png`) });
    styles[fr] = {};
    try {
      await page.goto(base);
      await page.locator(".app[data-ready=true]").waitFor({ timeout: 30000 });
      await page.waitForTimeout(500);
      await shot("01-accueil");
      styles[fr].repos = await measure(page);
      variables[fr] = await page.evaluate(() => {
        const names = new Set();
        const walk = (rules) => { for (const r of rules) { if (r.selectorText && /:root/.test(r.selectorText)) for (const p of r.style) if (p.startsWith("--")) names.add(p); if (r.cssRules) walk(r.cssRules); } };
        for (const s of document.styleSheets) { try { walk(s.cssRules); } catch {} }
        const cs = getComputedStyle(document.documentElement);
        return { theme: document.documentElement.dataset.theme, vars: [...names].sort().map((n) => [n, cs.getPropertyValue(n).trim()]) };
      });
      await page.getByLabel("Objectif de la mission").fill("Rechercher des offres Python et SQL en Australie (données fictives)");
      await choose(page, "Agent", "fixture"); await choose(page, "Pack", "najah"); await choose(page, "Mode", "workflow"); await choose(page, "Workflow", "application-draft");
      await page.getByRole("button", { name: "Préparer le plan", exact: true }).click();
      await page.getByRole("region", { name: "Plan proposé" }).waitFor();
      await page.getByRole("button", { name: "Lancer", exact: true }).click();
      await page.getByRole("button", { name: "Approuver", exact: true }).waitFor({ timeout: 45000 });
      await page.waitForTimeout(800);
      await shot("02-mission-en-cours");
      styles[fr].mission = await measure(page);
      note(`${fr} : mission en attente d'accord, .run-active présent = ${styles[fr].mission.runActive}, .skill-chip présent = ${styles[fr].mission[".skill-chip"] !== null}`);
      const id = app.store.list()[0].id;
      const decision = app.engine.permission(id, { toolCall: { title: "Lire une page de test locale (FICTIF)", toolCallId: "verif-01", kind: "read" },
        options: [{ optionId: "once", name: "Autoriser une fois", kind: "allow_once" }, { optionId: "deny", name: "Refuser", kind: "reject_once" }, { optionId: "always", name: "Autoriser toujours", kind: "allow_always" }] }, false, new AbortController().signal);
      const card = page.getByRole("region", { name: "Permission agent" });
      await card.waitFor(); await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
      await shot("04-demande-autorisation");
      await card.getByRole("button", { name: "Refuser", exact: true }).click(); await decision;
      await page.getByRole("button", { name: "Approuver", exact: true }).click();
      await page.locator(".toolbar .badge").filter({ hasText: "Terminée" }).waitFor({ timeout: 45000 });
      await page.waitForTimeout(800);
      await shot("05-mission-terminee");
      const tracker = page.getByRole("region", { name: "Suivi de la mission" });
      if ((await tracker.locator(".tracker-head").getAttribute("aria-expanded")) !== "true") await tracker.locator(".tracker-head").click();
      await tracker.getByRole("button", { name: /Détails techniques/ }).click();
      await tracker.locator("dl").waitFor(); await page.waitForTimeout(400);
      await shot("03-suivi-deplie");
      await page.getByRole("button", { name: "Paramètres" }).click();
      for (const [tab, n] of [["Profil", "06-parametres-profil"], ["Utilisation", "07-parametres-utilisation"], ["Disponible", "08-parametres-disponible"]]) {
        await page.getByRole("tab", { name: tab }).click(); await page.waitForTimeout(500); await shot(n);
      }
    } catch (e) { note(`ERREUR ${fr} : ${e.message.split("\n")[0]}`); await shot("erreur").catch(() => {}); }
    note(`${fr} : erreurs de page = ${JSON.stringify(errors)}`);
    await page.close();
  }
  writeFileSync(join(OUT, "styles.json"), JSON.stringify({ viewport: "1280x800", proprietes: PROPS, note: "repos = accueil sans mission ; mission = mission workflow application-draft en attente d'accord. null = élément absent.", ...styles }, null, 2) + "\n");
  const lines = [];
  for (const fr of ["clair", "sombre"]) { lines.push(`# ${fr} (data-theme=${variables[fr]?.theme})`); for (const [n, v] of variables[fr]?.vars ?? []) lines.push(`${n} = ${v}`); lines.push(""); }
  writeFileSync(join(OUT, "variables.txt"), lines.join("\n"));
  writeFileSync("/tmp/claude-0/-home-user/9d27c87d-6c6d-59c7-afad-240a6804b6bc/scratchpad/verif/devlog.txt", devOut);
} finally {
  await browser?.close().catch(() => {});
  if (dev?.pid) { try { process.kill(-dev.pid, "SIGTERM"); } catch {} }
  await new Promise((r) => setTimeout(r, 800));
  if (dev?.pid) { try { process.kill(-dev.pid, 0); note(`groupe ${dev.pid} encore vivant`); } catch { note(`npm run dev arrêté (groupe ${dev.pid})`); } }
  await app?.close().catch(() => {});
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  note("backend fixture et Chrome arrêtés");
  writeFileSync("/tmp/claude-0/-home-user/9d27c87d-6c6d-59c7-afad-240a6804b6bc/scratchpad/verif/run-log.txt", log.join("\n") + "\n");
}
process.exit(0);
