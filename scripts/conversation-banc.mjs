// conversation-22-11 : banc isolé qui filme le fil pendant une réponse à l'agent (données FICTIVES).
// Back : createApp de AGENT_PLATFORM_BACKEND_DIR, agent « fixture », réseau coupé, career-ops, espaces et
// Skills dans un dossier temporaire (jamais l'espace réel du propriétaire). Front : Vite de ce dossier.
// Usage : AGENT_PLATFORM_BACKEND_DIR=… node scripts/conversation-banc.mjs [sortie.json]
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const tmp = mkdtempSync(join(tmpdir(), "conversation-banc-"));
for (const d of ["data", "career", "roots", "skills"])
  mkdirSync(join(tmp, d), { recursive: true });
Object.assign(process.env, {
  AGENT_PLATFORM_NETWORK: "0",
  AGENT_PLATFORM_BROWSER: "fixture",
  AGENT_PLATFORM_CAREER_WORKSPACE: join(tmp, "career"),
  AGENT_PLATFORM_WORKSPACE_ROOTS: join(tmp, "roots"),
  // Dossier propre à Relay, hors des racines déclarées (sinon le back le refuse).
  AGENT_PLATFORM_WORKSPACES_DIR: join(tmp, "relay-workspaces"),
  AGENT_PLATFORM_SKILL_ROOTS: join(tmp, "skills"),
});
const backend = process.env.AGENT_PLATFORM_BACKEND_DIR;
if (!backend) throw new Error("AGENT_PLATFORM_BACKEND_DIR manquant");
const { createApp } = await import(resolve(backend, "apps/api/server.js"));
const app = createApp({
  dataDir: join(tmp, "data"),
  live: false,
  webDir: null,
});
await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
const api = `http://127.0.0.1:${app.server.address().port}`;
const { createServer } = await import("vite");
const vite = await createServer({
  logLevel: "error",
  server: {
    host: "127.0.0.1",
    port: 0,
    strictPort: false,
    proxy: {
      "/api": {
        target: api,
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (req) => req.removeHeader("origin"));
        },
      },
    },
  },
});
await vite.listen();
const base = `http://127.0.0.1:${vite.httpServer.address().port}`;

// Un premier tour terminé, dont la réponse porte un tableau Markdown (comme les vraies missions).
const first = crypto.randomUUID();
const table = [
  "Voici les offres FICTIVES retenues :",
  "",
  "| Offre | Lieu | Score |",
  "|---|---|---|",
  ...Array.from(
    { length: 12 },
    (_, i) => `| Poste FICTIF ${i + 1} | Sydney | ${(i % 5) + 1} |`,
  ),
  "",
  "Total : 12 offres FICTIVES.",
].join("\n");
app.store.create({
  id: first,
  createdAt: new Date(Date.now() - 60000).toISOString(),
  prompt: "Question FICTIVE : trouve des offres",
  state: "completed",
  mode: "agent",
  agent: "fixture",
  pack: "core",
  model: "",
  simulated: true,
  resumable: true,
  sessionId: "banc-fictif",
  budgetCents: 0,
  plan: {
    steps: [],
    cost: {
      platformCents: 0,
      currency: "EUR",
      budgetCents: 0,
      withinBudget: true,
      description: "Fictif",
      lines: [],
    },
  },
  result: { simulated: true, summary: table, evidence: [] },
});

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const out = { base, steps: [], samples: [], errors: [] };
let page;
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => out.errors.push(String(e)));
  // Serveur chargé : la lecture d'une mission précise (GET /api/runs/<id>) prend 1,5 s, comme sur 4310
  // pendant un clone ou une mission lourde. La liste (/api/runs) et le flux restent rapides.
  const lent = Number(process.env.BANC_RETARD_MS ?? 1500);
  await page.route(/\/api\/runs\/[0-9a-f-]{36}(\?.*)?$/, async (route) => {
    if (route.request().method() === "GET")
      await new Promise((r) => setTimeout(r, lent));
    await route.continue();
  });
  await page.goto(`${base}/#mission/${first}`);
  await page.locator(".thread table").first().waitFor({ timeout: 20000 });
  out.steps.push("premier tour affiché avec son tableau");
  // Échantillonneur : toutes les 50 ms, l'état du fil.
  await page.evaluate(() => {
    const w = window;
    w.__log = [];
    const t0 = performance.now();
    setInterval(() => {
      const th = document.querySelector(".thread");
      w.__log.push({
        t: Math.round(performance.now() - t0),
        text: th ? th.innerText.length : 0,
        tables: th ? th.querySelectorAll("table").length : 0,
        bulles: th ? th.querySelectorAll(".prompt-bubble").length : 0,
        premier: th ? th.innerText.includes("Poste FICTIF 12") : false,
        brut: th ? /\|---\|/.test(th.innerText) : false,
      });
    }, 50);
  });
  await page
    .getByLabel("Objectif de la mission")
    .fill("Relance FICTIVE : et à Melbourne");
  await page.getByRole("button", { name: "Envoyer la réponse" }).click();
  await page
    .locator(".thread .prompt-bubble-text", { hasText: "Relance FICTIVE" })
    .waitFor({ timeout: 20000 });
  out.steps.push("réponse envoyée, sa bulle est dans le fil");
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".thread .prompt-bubble").length >= 2 &&
      /Terminée|En échec/.test(
        document.querySelector(".toolbar .badge")?.textContent || "",
      ),
    null,
    { timeout: 60000 },
  );
  await page.waitForTimeout(1500);
  out.samples = await page.evaluate(() => window.__log);
  await page.screenshot({
    path: join(
      process.cwd(),
      ".manager/reports/conversation-22-11/apres-reponse.png",
    ),
    fullPage: true,
  });
  out.steps.push("tour suivant terminé");
} catch (e) {
  out.errors.push(String(e));
  try {
    out.samples = await page.evaluate(() => window.__log || []);
    out.fil = await page.evaluate(() =>
      [...(document.querySelector(".thread")?.children || [])].map(
        (c) =>
          c.className + " :: " + c.innerText.replace(/\s+/g, " ").slice(0, 120),
      ),
    );
    await page.screenshot({
      path: join(
        process.cwd(),
        ".manager/reports/conversation-22-11/erreur.png",
      ),
      fullPage: true,
    });
  } catch {}
} finally {
  await browser.close();
  await vite.close();
  await app.close();
}
// Lecture : le premier tour a-t-il disparu puis réapparu ? Le tableau brut a-t-il été vu ?
const s = out.samples;
let gone = 0,
  back = 0;
for (let i = 1; i < s.length; i++) {
  if (s[i - 1].premier && !s[i].premier) gone++;
  if (!s[i - 1].premier && s[i].premier) back++;
}
out.bilan = {
  echantillons: s.length,
  premierDisparu: gone,
  premierReapparu: back,
  tableauxMin: s.length ? Math.min(...s.map((x) => x.tables)) : null,
  tableauxMax: Math.max(...s.map((x) => x.tables)),
  markdownBrutVu: s.some((x) => x.brut),
  textesMinMax: [
    Math.min(...s.map((x) => x.text)),
    Math.max(...s.map((x) => x.text)),
  ],
};
const file = process.argv[2];
if (file) writeFileSync(file, JSON.stringify(out, null, 2));
console.log(
  JSON.stringify(
    { steps: out.steps, errors: out.errors, bilan: out.bilan },
    null,
    2,
  ),
);
// Le back rend son dossier d'espaces non listable (0o300) : rouvert avant d'être supprimé.
try {
  execFileSync("chmod", ["-R", "u+rwx", tmp]);
  rmSync(tmp, { recursive: true, force: true });
} catch (e) {
  console.error("Nettoyage incomplet de " + tmp + " : " + e);
}
process.exit(0);
