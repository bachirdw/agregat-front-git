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
for (const theme of ["light"]) {
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
    const dots = await page.evaluate(() => { const w = [...document.querySelectorAll(".waiting, .thinking-dots")].map(e => { const r = e.getBoundingClientRect(); return e.className + "@" + Math.round(r.x); }); const c = document.querySelector(".card.timeline").getBoundingClientRect(); return { card: Math.round(c.x), w }; });
    console.log("DOTS", JSON.stringify(dots));
    await page.getByRole("button", { name: "Approuver", exact: true }).click();
    await page.locator(".toolbar .badge").filter({ hasText: "Terminée" }).waitFor({ timeout: 45000 });
    await page.waitForTimeout(800);
    console.log("BADGES", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll(".thread .spread > .badge")].map(e => { const r = e.getBoundingClientRect(); return [e.textContent.slice(0,14), Math.round(r.x), Math.round(r.x + r.width), Math.round(r.height), getComputedStyle(e).whiteSpace]; }))));
    await page.mouse.move(700, 500);
    for (let i = 0; i < 15; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(80); }
    await page.waitForTimeout(800);
    console.log("BOTTOM", JSON.stringify(await page.evaluate(() => { const f = [...document.querySelectorAll("*")].find(e => e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY.match(/auto|scroll/) && e.closest(".main, main")); return { cls: f && f.className, rest: f && Math.round(f.scrollHeight - f.scrollTop - f.clientHeight), jump: !!document.querySelector(".jump-bottom") }; })));
    await shot("1-fil-bas-molette");
    writeFileSync(join(OUT, `app-${theme}-dom.txt`), await page.evaluate(() => document.body.innerText));
  } catch (e) { console.log("ERREUR", theme, e.message); await shot("erreur"); }
  console.log(theme, "pageerrors", errors);
  await browser.close(); await vite.close(); await app.close(); rmSync(dataDir, { recursive: true, force: true });
}
writeFileSync(join(OUT, "app-styles.json"), JSON.stringify(styles, null, 1));
process.exit(0);
