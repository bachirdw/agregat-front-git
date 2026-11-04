import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");
process.env.AGENT_PLATFORM_NETWORK = "0";
process.env.AGENT_PLATFORM_BROWSER = "fixture";
const OUT = process.argv[2];
const FRONT = "/home/user/agregat-front-git";
const { createApp } = await import("/home/user/agregat-back-git/apps/api/server.js");
const { createServer } = await import(FRONT + "/node_modules/vite/dist/node/index.js");
const styles = {};
const pick = async (page, name, sel) => {
  const el = page.locator(sel).first();
  if (!(await el.count())) { styles[name] = "ABSENT " + sel; return; }
  styles[name] = await el.evaluate((e) => {
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    const k = ["font-size","font-weight","line-height","letter-spacing","color","background-color","background-image","border-radius","padding","margin","gap","box-shadow","max-width","width","height","animation","transition","backdrop-filter","position","bottom"];
    return Object.fromEntries([["rect", [r.x,r.y,r.width,r.height].map(Math.round).join(",")], ...k.map((p) => [p, c.getPropertyValue(p)])]);
  });
};
async function choose(page, label, value) {
  const select = page.getByLabel(label, { exact: true });
  const details = select.locator("xpath=ancestor::details");
  if (!(await details.getAttribute("open"))) await details.locator("summary").click();
  await select.selectOption(value);
  await select.press("Escape");
}
for (const theme of ["light", "dark"]) {
  const dataDir = mkdtempSync(join(tmpdir(), "ecarts-"));
  const app = createApp({ dataDir, live: false, webDir: null });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const target = `http://127.0.0.1:${app.server.address().port}`;
  const vite = await createServer({ root: FRONT, configFile: FRONT + "/vite.config.ts", logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false, proxy: { "/api": { target, changeOrigin: true, configure(p) { p.on("proxyReq", (q) => q.removeHeader("origin")); } } } } });
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1550, height: 960 }, colorScheme: theme });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((t) => localStorage.setItem("agre-theme", t), theme);
  const shot = (n) => page.screenshot({ path: join(OUT, `app-${theme}-${n}.png`) });
  try {
    await page.goto(base);
    await page.locator(".app[data-ready=true]").waitFor();
    console.log(theme, "data-theme=", await page.evaluate(() => document.documentElement.dataset.theme));
    await shot("0-accueil");
    await pick(page, `${theme}.composer`, ".composer");
    await pick(page, `${theme}.send`, ".send.primary");
    await pick(page, `${theme}.textarea`, ".composer textarea");
    await page.getByLabel("Objectif de la mission").fill("Rechercher des offres Python et SQL en Australie (données fictives)");
    await choose(page, "Agent", "fixture"); await choose(page, "Pack", "najah"); await choose(page, "Mode", "workflow"); await choose(page, "Workflow", "application-draft");
    await page.getByRole("button", { name: "Préparer le plan", exact: true }).click();
    await page.getByRole("region", { name: "Plan proposé" }).waitFor();
    await page.getByRole("button", { name: "Lancer", exact: true }).click();
    await page.getByRole("button", { name: "Approuver", exact: true }).waitFor({ timeout: 45000 });
    await page.waitForTimeout(600);
    await shot("2-barre-flottante");
    await pick(page, `${theme}.mission-pill`, ".mission-pill");
    await pick(page, `${theme}.approval`, ".card.approval");
    await pick(page, `${theme}.tracker`, ".tracker");
    await page.locator(".card.approval").scrollIntoViewIfNeeded();
    await shot("3-autorisation-envoi");
    const id = app.store.list()[0].id;
    const decision = app.engine.permission(id, { toolCall: { title: "Lire une page de test locale", toolCallId: "p", kind: "read" },
      options: [{ optionId: "once", name: "Autoriser une fois", kind: "allow_once" }, { optionId: "deny", name: "Refuser", kind: "reject_once" }, { optionId: "always", name: "Autoriser toujours", kind: "allow_always" }] }, false, new AbortController().signal);
    const card = page.getByRole("region", { name: "Permission agent" });
    await card.waitFor(); await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    await shot("3-autorisation-acp");
    await pick(page, `${theme}.permission`, "[aria-label='Permission agent']");
    await card.getByRole("button", { name: "Refuser", exact: true }).click(); await decision;
    await page.getByRole("button", { name: "Approuver", exact: true }).click();
    await page.locator(".toolbar .badge").filter({ hasText: "Terminée" }).waitFor({ timeout: 45000 });
    await page.waitForTimeout(600);
    await page.evaluate(() => { const s = document.querySelector(".scroll-content"); if (s) s.scrollTop = 0; });
    await shot("1-fil-haut");
    await page.evaluate(() => { const s = document.querySelector(".scroll-content"); if (s) s.scrollTop = s.scrollHeight; });
    await shot("1-fil-bas");
    for (const [n, s] of [["thread", ".thread"], ["user-bubble", ".thread .user, .thread [class*=user]"], ["toolbar", ".toolbar"], ["badge", ".toolbar .badge"], ["meta-line", ".meta-line"], ["tracker-done", ".tracker"], ["tracker-head", ".tracker-head"], ["results", "[aria-label='Résultats']"], ["timeline", ".card.timeline"], ["step", ".step"]]) await pick(page, `${theme}.${n}`, s);
    await page.locator(".meta-line").click().catch(() => {});
    await page.waitForTimeout(400);
    await shot("4-suivi-details");
    await page.getByRole("button", { name: "Paramètres" }).click();
    await page.waitForTimeout(500);
    await shot("5-parametres");
    await pick(page, `${theme}.settings`, ".settings");
    writeFileSync(join(OUT, `app-${theme}-dom.txt`), await page.evaluate(() => document.body.innerText));
  } catch (e) { console.log("ERREUR", theme, e.message); await shot("erreur"); }
  console.log(theme, "pageerrors", errors);
  await browser.close(); await vite.close(); await app.close(); rmSync(dataDir, { recursive: true, force: true });
}
writeFileSync(join(OUT, "app-styles.json"), JSON.stringify(styles, null, 1));
process.exit(0);
