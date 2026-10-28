import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { chromium } from "playwright-core";
process.env.AGENT_PLATFORM_NETWORK = "0";
process.env.AGENT_PLATFORM_BROWSER = "fixture";
const backend =
  process.env.AGENT_PLATFORM_BACKEND_DIR || resolve("../agregateur-agent");
const { createApp } = await import(resolve(backend, "apps/api/server.js"));
const screens = resolve(".manager/reports/front-01-screens");
mkdirSync(screens, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
async function open(t, { mobile = false, dev = false } = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), "front-01-e2e-"));
  const app = createApp({
    dataDir,
    live: false,
    webDir: dev ? null : resolve("dist"),
  });
  let browser, vite;
  t.after(async () => {
    await browser?.close();
    await vite?.close();
    await app.close();
    rmSync(dataDir, { recursive: true, force: true });
  });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  let base = `http://127.0.0.1:${app.server.address().port}`;
  if (dev) {
    const { createServer } = await import("vite");
    vite = await createServer({
      server: {
        host: "127.0.0.1",
        port: 0,
        strictPort: false,
        proxy: {
          "/api": {
            target: base,
            changeOrigin: true,
            configure(proxy) {
              proxy.on("proxyReq", (req) => req.removeHeader("origin"));
            },
          },
        },
      },
    });
    await vite.listen();
    base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  }
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 960 },
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const violations = [];
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      window.__csp.push(e.violatedDirective + ": " + e.blockedURI),
    );
  });
  await page.goto(base);
  await page.locator(".app[data-ready=true]").waitFor();
  return { page, app, errors, base, violations };
}
async function shot(page, name) {
  await page.screenshot({ path: join(screens, name + ".png"), fullPage: true });
}
async function choose(page, label, value) {
  const select = page.getByLabel(label, { exact: true });
  const details = select.locator("xpath=ancestor::details");
  if (!(await details.getAttribute("open")))
    await details.locator("summary").click();
  await select.selectOption(value);
  await select.press("Escape");
}
async function prepare(page, workflow = "opportunity-discovery-dag") {
  await page
    .getByLabel("Objectif de la mission")
    .fill(
      "Rechercher des offres Python et SQL en Australie (données fictives)",
    );
  await choose(page, "Agent", "fixture");
  await choose(page, "Pack", "najah");
  await choose(page, "Mode", "workflow");
  await choose(page, "Workflow", workflow);
  await page
    .getByRole("button", { name: "Préparer le plan", exact: true })
    .click();
  await page.getByRole("region", { name: "Plan proposé" }).waitFor();
}
async function finished(page) {
  await page
    .locator(".toolbar .badge")
    .filter({ hasText: "Terminée" })
    .waitFor({ timeout: 45000 });
  await page.getByRole("region", { name: "Résultats", exact: true }).waitFor();
}
function post(base, path, body) {
  return fetch(base + "/api" + path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-platform-request": "1" },
    body: JSON.stringify(body),
  });
}
test(
  "CV FICTIF : dépôt sur la fenêtre et bouton d'ajout visible en mode compact",
  { timeout: 60000 },
  async (t) => {
    const { page, errors } = await open(t);
    await page.route("**/api/files", async (route) => {
      const name = decodeURIComponent(route.request().headers()["x-file-name"]);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: name === "cv-fictif.pdf" ? "f1" : "f2",
          name,
          size: 8,
          type: "application/pdf",
        }),
      });
    });
    await page.evaluate(() => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File(["FICTIF"], "cv-fictif.pdf", { type: "application/pdf" }),
      );
      window.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }),
      );
      window.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }),
      );
    });
    await page.getByText("cv-fictif.pdf").waitFor();
    await page
      .locator(".composer")
      .evaluate((element) => element.setAttribute("data-compact", "true"));
    const add = page.getByLabel("Ajouter", { exact: true });
    assert.equal(await add.isVisible(), true);
    await add.click();
    const picker = page.waitForEvent("filechooser");
    await page.getByRole("menuitem", { name: "Ajouter un fichier" }).click();
    await (
      await picker
    ).setFiles({
      name: "autre-cv.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("FICTIF"),
    });
    await page.getByText("autre-cv.pdf").waitFor();
    assert.deepEqual(errors, []);
  },
);
test(
  "production réelle : accueil, filtres, plan → SSE → résultats, historique et galeries",
  { timeout: 120000 },
  async (t) => {
    const { page, app, errors, base } = await open(t);
    await shot(page, "01-accueil");
    for (const [i, name] of [
      "Agent",
      "Modèle",
      "Skills",
      "Pack",
      "Mode",
    ].entries()) {
      const summary = page
        .locator(".filter summary")
        .filter({ hasText: name })
        .first();
      await summary.click();
      await shot(page, `11-filtre-${i + 1}-${name.toLowerCase()}`);
      await summary.press("Escape");
    }
    await page
      .getByRole("button", { name: /Trouver des offres Python/ })
      .click();
    await shot(page, "07-suggestion-remplie");
    await prepare(page);
    assert.match(
      await page.locator(".plan").innerText(),
      /Données fictives|données fictives/,
    );
    await shot(page, "08-plan");
    await page.getByRole("button", { name: "Lancer", exact: true }).click();
    await page
      .getByRole("region", { name: "Exécution", exact: true })
      .waitFor();
    await shot(page, "09-execution");
    await finished(page);
    assert.match(
      await page.locator(".results").innerText(),
      /DONNÉES FICTIVES/,
    );
    assert.equal(await page.locator(".offer").count(), 3);
    assert.match(await page.locator(".usage-card").innerText(), /Intègre/);
    await shot(page, "02-mission-offres-2");
    assert.ok(
      app.store.events(app.store.list()[0].id).some((e) => e.type === "step"),
    );
    await page.locator(".timeline-heading").click();
    await page.locator(".event-log summary").click();
    assert.match(await page.locator(".event-log").innerText(), /step/);
    // Real HTTP SSE replay with the saved sequence, no client mocks.
    const id = app.store.list()[0].id,
      cursor = app.store.events(id)[1].seq;
    const replay = await (
      await fetch(base + `/api/runs/${id}/events`, {
        headers: { "Last-Event-ID": String(cursor) },
      })
    ).text();
    assert.ok(replay.includes("event: end"));
    assert.ok(!replay.includes(`id: ${cursor}\n`));
    await page.getByRole("button", { name: "Agents", exact: true }).click();
    await shot(page, "03-agents");
    await page.getByRole("button", { name: "Modèles", exact: true }).click();
    await shot(page, "03-modeles");
    await page.getByRole("button", { name: "Skills", exact: true }).click();
    await shot(page, "04-skills");
    const install = page
      .getByRole("button", { name: "Installer", exact: true })
      .first();
    await install.click();
    await page
      .getByRole("button", { name: "Désactiver", exact: true })
      .first()
      .waitFor();
    await page
      .getByRole("button", { name: "Désactiver", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Activer", exact: true })
      .first()
      .waitFor();
    await page
      .getByRole("button", { name: "Domain Packs", exact: true })
      .click();
    await shot(page, "05-domain-packs");
    await page
      .getByRole("button", { name: "Consommation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Voir la consommation" })
      .first()
      .click();
    await page.locator(".usage-card").waitFor();
    await shot(page, "06-consommation");
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => window.__csp), []);
  },
);
test(
  "accord du workflow application-draft, refus puis reprise en place",
  { timeout: 120000 },
  async (t) => {
    const { page, app, errors } = await open(t);
    await prepare(page, "application-draft");
    await page.getByRole("button", { name: "Lancer", exact: true }).click();
    await page
      .getByRole("button", { name: "Approuver", exact: true })
      .waitFor({ timeout: 45000 });
    await shot(page, "02-mission-senior-0");
    await shot(page, "10-execution-suite");
    assert.match(await page.locator(".approval").innerText(), /Aucun envoi/);
    assert.match(await page.locator(".review-output").innerText(), /\S+/);
    await page.getByRole("button", { name: "Refuser", exact: true }).click();
    await page
      .getByRole("button", { name: "Reprendre le workflow" })
      .waitFor({ timeout: 30000 });
    await shot(page, "02-mission-veille-1");
    const original = app.store.list()[0].id;
    await page.getByRole("button", { name: "Reprendre le workflow" }).click();
    await page
      .getByRole("button", { name: "Approuver", exact: true })
      .waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Approuver", exact: true }).click();
    await finished(page);
    assert.equal(app.store.list().length, 1);
    assert.equal(app.store.list()[0].id, original);
    await shot(page, "02-mission-lettre-3");
    assert.deepEqual(errors, []);
  },
);
test(
  "budget réel : estimation puis refus serveur, aucune mission créée",
  { timeout: 60000 },
  async (t) => {
    const { page, app } = await open(t);
    app.engine.pricing.centsPerUnit.tool_call = 50;
    await prepare(page);
    assert.match(
      await page.locator(".plan").innerText(),
      /Estimation supérieure au budget/,
    );
    await page.getByRole("button", { name: "Lancer", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Budget insuffisant" })
      .waitFor();
    assert.equal(app.store.list().length, 0);
    await page
      .getByRole("alert")
      .filter({ hasText: "Budget insuffisant" })
      .scrollIntoViewIfNeeded();
    await shot(page, "02-mission-comparer-4");
  },
);
test(
  "thème sombre persistant, mobile sans débordement et navigation clavier",
  { timeout: 60000 },
  async (t) => {
    const { page, errors } = await open(t, { mobile: true });
    await shot(page, "13-mobile");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page
      .getByRole("button", { name: "Afficher la barre latérale" })
      .click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".sidebar").count(), 0);
    await page.getByRole("button", { name: "Changer de thème" }).click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.reload();
    await page.locator(".app[data-ready=true]").waitFor();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.setViewportSize({ width: 1440, height: 960 });
    await page
      .getByRole("button", { name: "Afficher la barre latérale" })
      .click();
    await shot(page, "12-theme-sombre");
    await page.getByRole("button", { name: "Agents", exact: true }).click();
    await page.keyboard.press("Meta+k");
    await page
      .getByRole("heading", { name: "Que voulez-vous accomplir ?" })
      .waitFor();
    assert.deepEqual(errors, []);
  },
);
test(
  "proxy Vite : mutation avec Origin frontend réécrit, sécurité backend maintenue",
  { timeout: 90000 },
  async (t) => {
    const { page, app, base, errors } = await open(t, { dev: true });
    await prepare(page);
    await page.getByRole("button", { name: "Lancer", exact: true }).click();
    await finished(page);
    assert.equal(app.store.list().length, 1);
    const denied = await post(base, "/plan", {
      prompt: "emploi",
      agent: "fixture",
    });
    assert.equal(denied.status, 200); // proxy rewrites Host
    const direct = `http://127.0.0.1:${app.server.address().port}`;
    assert.equal(
      (
        await fetch(direct + "/api/catalog", {
          headers: { origin: "http://foreign.example" },
        })
      ).status,
      403,
    );
    assert.deepEqual(errors, []);
  },
);

test(
  "SSE réel : coupure réseau, reconnexion et revue après réouverture de la mission",
  { timeout: 90000 },
  async (t) => {
    const { page, app, errors } = await open(t);
    await prepare(page, "application-draft");
    await page.getByRole("button", { name: "Lancer", exact: true }).click();
    await page
      .getByRole("button", { name: "Approuver", exact: true })
      .waitFor({ timeout: 45000 });
    const reconnectCursors = [];
    app.server.on("request", (req) => {
      if (req.url.includes("/events") && req.headers["last-event-id"])
        reconnectCursors.push(req.headers["last-event-id"]);
    });
    await page.context().setOffline(true);
    app.server.closeAllConnections();
    await page
      .getByText("Connexion perdue · reconnexion…", { exact: true })
      .waitFor({ timeout: 25000 });
    await page.context().setOffline(false);
    await page
      .getByText("Flux en direct", { exact: true })
      .waitFor({ timeout: 25000 });
    assert.ok(
      reconnectCursors.some((cursor) => Number(cursor) > 0),
      "Reconnexion native avec Last-Event-ID",
    );
    await page.getByRole("button", { name: "Agents", exact: true }).click();
    await page.locator(".mission-link").first().click();
    await page
      .getByRole("button", { name: "Approuver", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Approuver", exact: true }).click();
    await finished(page);
    assert.equal(app.store.list()[0].state, "completed");
    assert.deepEqual(errors, []);
  },
);

test(
  "Markdown non fiable et Mermaid sous CSP de production, sans chargement externe",
  { timeout: 90000 },
  async (t) => {
    const { page, app, errors } = await open(t);
    // Explicit test fixture stored by the real backend; no model or external source is called.
    const record = {
      id: crypto.randomUUID(),
      prompt: "Test de sécurité du rendu · données de test",
      state: "completed",
      mode: "agent",
      agent: "fixture",
      pack: "core",
      model: "",
      simulated: true,
      budgetCents: 0,
      createdAt: new Date().toISOString(),
      plan: {
        steps: [],
        cost: {
          platformCents: 0,
          currency: "EUR",
          budgetCents: 0,
          withinBudget: true,
          description: "Test",
          lines: [],
        },
      },
      result: {
        simulated: true,
        summary:
          "<script>window.pwned=true</script>\n\n[Source](https://example.com) [Interdit](javascript:alert%281%29)\n\n| Colonne | Valeur |\n| --- | --- |\n| A | B |\n\n```js\nconst safe = true;\n```\n\n```mermaid\nflowchart LR\n A[Source] --> B[Résultat]\n```",
        evidence: [],
      },
    };
    app.store.create(record);
    await page.getByRole("button", { name: "Actualiser les missions" }).click();
    await page.locator(".mission-link").first().click();
    await page
      .getByRole("img", { name: "Schéma Mermaid du résultat" })
      .waitFor({ timeout: 30000 });
    assert.equal(await page.locator(".results script").count(), 0);
    assert.equal(
      await page.locator('.results a[href^="javascript"]').count(),
      0,
    );
    assert.equal(await page.locator(".results table").count(), 1);
    const image = page.getByRole("img", { name: "Schéma Mermaid du résultat" });
    assert.equal(
      await image.evaluate((el) => el.complete && el.naturalWidth > 0),
      true,
    );
    assert.deepEqual(await page.evaluate(() => window.__csp), []);
    assert.deepEqual(errors, []);
    await shot(page, "14-markdown-mermaid");
  },
);

test(
  "Skills réels : source Git refusée, quarantaine, revue par hash et activation",
  { timeout: 60000 },
  async (t) => {
    const { page, app, errors } = await open(t);
    const dir = mkdtempSync(join(tmpdir(), "front-01-skill-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    writeFileSync(
      join(dir, "SKILL.md"),
      "---\nname: security-review-sample\ndescription: Méthode de revue fictive pour test local\nlicense: MIT\n---\nVérifier les sources. Aucun script.",
    );
    const imported = app.skills.importLocal(dir);
    await page.reload();
    await page.locator(".app[data-ready=true]").waitFor();
    await page.getByRole("button", { name: "Skills", exact: true }).click();
    await page
      .getByLabel("Dépôt GitHub", { exact: true })
      .fill("https://example.com/refused");
    await page.getByRole("button", { name: "Importer en quarantaine" }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Source Git refusée" })
      .waitFor();
    await page.getByRole("button", { name: "Fermer", exact: true }).click();
    const card = page.locator(".skill-card").filter({ hasText: imported.name });
    assert.equal(
      await card
        .getByRole("button", { name: "Approuver après lecture" })
        .isEnabled(),
      false,
    );
    await card.getByRole("checkbox").check();
    await shot(page, "04-skills-quarantaine");
    await card.getByRole("button", { name: "Approuver après lecture" }).click();
    await card
      .getByRole("button", { name: "Installer", exact: true })
      .waitFor();
    await card.getByRole("button", { name: "Installer", exact: true }).click();
    await card
      .getByRole("button", { name: "Désactiver", exact: true })
      .waitFor();
    assert.equal(app.store.skill(imported.name).reviewedHash, imported.hash);
    await card.getByRole("button", { name: "Désactiver", exact: true }).click();
    await card.getByRole("button", { name: "Activer", exact: true }).waitFor();
    assert.equal(app.store.skill(imported.name).state, "installed");
    assert.deepEqual(errors, []);
  },
);

test(
  "permission ACP réelle : décision ponctuelle, autorisation permanente masquée",
  { timeout: 60000 },
  async (t) => {
    const { page, app, errors } = await open(t);
    await prepare(page, "application-draft");
    await page.getByRole("button", { name: "Lancer", exact: true }).click();
    await page
      .getByRole("button", { name: "Approuver", exact: true })
      .waitFor({ timeout: 45000 });
    const id = app.store.list()[0].id;
    const decision = app.engine.permission(
      id,
      {
        toolCall: {
          title: "Lire une page de test locale",
          toolCallId: "permission-test",
          kind: "read",
        },
        options: [
          { optionId: "once", name: "Autoriser une fois", kind: "allow_once" },
          { optionId: "deny", name: "Refuser", kind: "reject_once" },
          {
            optionId: "always",
            name: "Autoriser toujours",
            kind: "allow_always",
          },
        ],
      },
      false,
      new AbortController().signal,
    );
    const card = page.getByRole("region", { name: "Permission agent" });
    await card.waitFor();
    assert.equal(
      await card.getByRole("button", { name: "Autoriser toujours" }).count(),
      0,
    );
    await shot(page, "15-permission-acp");
    await card.getByRole("button", { name: "Refuser", exact: true }).click();
    assert.equal((await decision).outcome.optionId, "deny");
    await card.waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Approuver", exact: true }).click();
    await finished(page);
    assert.deepEqual(errors, []);
  },
);
