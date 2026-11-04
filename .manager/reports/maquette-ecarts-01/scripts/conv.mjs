import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");
process.env.AGENT_PLATFORM_NETWORK = "0"; process.env.AGENT_PLATFORM_BROWSER = "fixture";
const OUT = process.argv[2], FRONT = "/home/user/agregat-front-git";
const { createApp } = await import("/home/user/agregat-back-git/apps/api/server.js");
const { createServer } = await import(FRONT + "/node_modules/vite/dist/node/index.js");
const styles = {};
const g = (page, sel) => page.locator(sel).first().evaluate((e) => { const c = getComputedStyle(e), r = e.getBoundingClientRect();
  return [["rect",[r.x,r.y,r.width,r.height].map(Math.round).join(",")], ...["font-size","font-weight","line-height","color","background-color","border-radius","padding","gap","box-shadow","max-width","animation","transition","font-family"].map(k=>[k,c.getPropertyValue(k)])].filter(([k,v])=>v&&v!=="none"&&v!=="normal"&&v!=="0px"&&v!=="rgba(0, 0, 0, 0)"&&v!=="all").map(([k,v])=>k+"="+v).join("; "); }).catch(() => "ABSENT " + sel);
for (const theme of ["light", "dark"]) {
  const dataDir = mkdtempSync(join(tmpdir(), "conv-"));
  const app = createApp({ dataDir, live: false, webDir: null });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const target = `http://127.0.0.1:${app.server.address().port}`;
  const vite = await createServer({ root: FRONT, configFile: FRONT + "/vite.config.ts", logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false, proxy: { "/api": { target, changeOrigin: true, configure(p) { p.on("proxyReq", (q) => q.removeHeader("origin")); } } } } });
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  const mk = (id, prompt, createdAt, resumedFrom, state, summary, error) => app.store.create({ id, createdAt, prompt, state, mode: "agent", agent: "fixture", pack: "career-ops", model: "", simulated: true, resumable: true, sessionId: "fixture-thread", resumedFrom, budgetCents: 0,
    plan: { steps: [], cost: { platformCents: 0, currency: "EUR", budgetCents: 0, withinBudget: true, description: "Fictif", lines: [] } },
    result: summary ? { simulated: true, summary, evidence: [] } : undefined, error });
  const a = crypto.randomUUID(), b = crypto.randomUUID();
  mk(a, "Crée mon profil carrière à partir de mon CV, de LinkedIn et de mes notes. (FICTIF)", "2026-01-01T00:00:00.000Z", null, "failed", null, "Navigation non prouvée : aucun parcours navigateur observé");
  const ev = (id, d) => app.store.event(id, "agent", d);
  ev(a, { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Je cherche les outils pour lire les trois sources, puis je crée le profil avec des TODO pour les informations manquantes." } });
  const tools = [["t1","browser_snapshot: --tab active","completed","url: about:blank"],["t2","career_read: --sources cv.pdf,linkedin,notes.md","failed","Erreur : l'outil career_read n'est pas disponible dans cette session."],["t3","career_write: --file profile.md --todo","failed","Fichier non créé."]];
  for (const [id, title, status, out] of tools) { ev(a, { sessionUpdate: "tool_call", toolCallId: id, title, status: "in_progress", kind: "execute" }); ev(a, { sessionUpdate: "tool_call_update", toolCallId: id, status, rawOutput: out }); }
  ev(a, { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Fichier non créé : les outils career_read et career_write ne sont pas disponibles. Aucune source n'a été lue ni modifiée. (FICTIF)" } });
  mk(b, "pourquoi j'ai pas l'autorisation ? (FICTIF)", "2026-01-01T00:01:00.000Z", a, "completed", "La mission a échoué parce que l'autorisation navigateur est désactivée. (FICTIF)");
  ev(b, { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Je regarde tes deux dernières missions sur le serveur, en lecture seule." } });
  ev(b, { sessionUpdate: "tool_call", toolCallId: "d1", title: "curl: Lister les dernières missions du serveur 4310", status: "in_progress", kind: "execute" });
  ev(b, { sessionUpdate: "tool_call_update", toolCallId: "d1", status: "completed", rawOutput: "35f072af failed (FICTIF)" });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1550, height: 960 }, colorScheme: theme });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((t) => localStorage.setItem("agre-theme", t), theme);
  try {
    await page.goto(base); await page.locator(".app[data-ready=true]").waitFor();
    await page.getByRole("button", { name: "Actualiser les missions" }).click();
    await page.locator(".mission-link", { hasText: "pourquoi" }).first().click();
    await page.getByText("Je regarde tes deux").waitFor(); await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, `app-${theme}-1-conversation.png`) });
    for (const [n, s] of [["bubble", ".prompt-bubble"], ["agent-turn", ".agent-turn"], ["activity-p", ".activity-text p, .activity p"], ["tool-group", ".tool-group > summary"], ["tool", ".fold.tool > summary"], ["tool-failures", ".tool-failures"], ["career-thread", ".career-thread"], ["past", ".fold.past-steps > summary"], ["danger", ".agent-turn .danger"]]) styles[`${theme}.${n}`] = await g(page, s);
    const grp = page.locator(".tool-group > summary").first();
    if (await grp.count()) { await grp.click(); await page.waitForTimeout(300); }
    const tl = page.locator(".fold.tool > summary").nth(1);
    if (await tl.count()) { await tl.click(); await page.waitForTimeout(300); styles[`${theme}.tool-details`] = await g(page, ".tool-details"); }
    await page.screenshot({ path: join(OUT, `app-${theme}-1-conversation-deplie.png`) });
    writeFileSync(join(OUT, `app-${theme}-conv-dom.txt`), await page.locator(".thread").innerText());
  } catch (e) { console.log("ERREUR", theme, e.message); await page.screenshot({ path: join(OUT, `app-${theme}-conv-erreur.png`) }); }
  console.log(theme, "pageerrors", errors);
  await browser.close(); await vite.close(); await app.close(); rmSync(dataDir, { recursive: true, force: true });
}
writeFileSync(join(OUT, "app-conv-styles.json"), JSON.stringify(styles, null, 1)); process.exit(0);
