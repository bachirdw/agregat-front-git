// Essai sous-agents-19-11 : le front construit (dist) contre le back intégré qui porte la délégation
// (agregat-back contacts-13-11, arbre ~/Downloads/agregat-back-essai-13-11, en lecture seule), lancé
// dans ce processus sur une base temporaire, hors réseau, avec l'agent fictif `fixture` (aucun agent
// payant, aucune mission sur l'API du manager). Toutes les données sont FICTIVES.
//   npm run build && node scripts/sous-agents-19-11-essai.mjs
// 1. Voie 1 : la case cochée part avec la requête ; le vrai schéma du back l'accepte et l'enregistre.
// 2. Famille : une mère et trois sous-missions écrites dans la base ; `family` est calculé par le vrai
//    back (delegation.view) ; le front l'affiche, suit un changement en direct (SSE) et ouvre une fille.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

process.env.AGENT_PLATFORM_NETWORK = "0";
process.env.AGENT_PLATFORM_BROWSER = "fixture";
const backend =
  process.env.AGENT_PLATFORM_BACKEND_DIR ||
  join(homedir(), "Downloads/agregat-back-essai-13-11");
const { createApp } = await import(resolve(backend, "apps/api/server.js"));
const out = resolve(".manager/reports/sous-agents-19-11");
mkdirSync(out, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dataDir = mkdtempSync(join(tmpdir(), "sous-agents-19-11-"));
const app = createApp({ dataDir, live: false, webDir: resolve("dist") });
let browser;
const log = (line) => console.log("✓ " + line);
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
async function choose(page, name, value) {
  const select = page.getByLabel(name, { exact: true });
  const details = select.locator("xpath=ancestor::details");
  if (!(await details.getAttribute("open")))
    await details.locator("summary").click();
  await select.selectOption(value);
  await select.press("Escape");
}
const shot = (page, name) =>
  page.screenshot({ path: join(out, name + ".png") });
try {
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator(".app[data-ready=true]").waitFor();

  // 1. Voie 1 : case cochée, enveloppe 4 et 2, lancement réel par le front.
  const prompt = "Mission FICTIVE : sous-agents autorisés par la case";
  await page.getByLabel("Objectif de la mission").fill(prompt);
  await choose(page, "Agent", "fixture");
  const filter = page.locator("details.filter", { hasText: "Sous-agents" });
  await filter.locator("summary").click();
  await page
    .getByRole("checkbox", { name: "Autoriser les sous-agents" })
    .check();
  await page.getByLabel("Sous-agents au plus").fill("4");
  await page.getByLabel("Sous-agents en même temps").fill("2");
  await shot(page, "essai-case-sous-agents-1440-light");
  await filter.locator("summary").click();
  await page
    .getByRole("button", { name: "Lancer la mission", exact: true })
    .click();
  await page
    .locator(".toolbar .badge")
    .filter({ hasText: /Terminée|Échec|En cours/ })
    .first()
    .waitFor({ timeout: 45000 });
  const created = app.store.list().find((run) => run.prompt === prompt);
  assert.ok(created, "mission créée par le back");
  assert.equal(created.delegation?.accepted, true);
  assert.equal(created.delegation?.via, "bouton");
  assert.equal(created.delegation?.total, 4);
  assert.equal(created.delegation?.parallel, 2);
  assert.match(created.delegation?.acceptedAt ?? "", /Z$/);
  assert.equal(created.mode, "agent", "le back mène la mission par un agent");
  log(
    `voie 1 acceptée par le schéma réel : ${JSON.stringify(created.delegation)} ; mode ${created.mode}`,
  );
  // Pendant la mission, la pastille remplace le composeur : la case se lit dans « Nouvelle mission ».
  await page.getByRole("button", { name: /Nouvelle mission/ }).click();
  await page
    .locator("details.filter", { hasText: "Sous-agents" })
    .locator("summary")
    .click();
  assert.equal(
    await page
      .getByRole("checkbox", { name: "Autoriser les sous-agents" })
      .isChecked(),
    false,
  );
  await page
    .locator("details.filter", { hasText: "Sous-agents" })
    .locator("summary")
    .click();
  log("la case est décochée pour la mission suivante");

  // 2. Famille écrite dans la base ; le vrai back calcule `family` et `activity`.
  const now = Date.now();
  const iso = (s) => new Date(now + s * 1000).toISOString();
  const mother = crypto.randomUUID();
  const motherPrompt = "Mission FICTIVE : offres sur trois portails";
  app.store.create({
    id: mother,
    prompt: motherPrompt,
    state: "running",
    mode: "agent",
    agent: "fixture",
    pack: "core",
    model: "",
    simulated: true,
    budgetCents: 0,
    createdAt: iso(-120),
    estMere: true,
    delegation: {
      accepted: true,
      via: "bouton",
      total: 6,
      parallel: 3,
      acceptedAt: iso(-120),
    },
    plan,
  });
  const children = [
    ["SEEK", "running"],
    ["LinkedIn", "completed"],
    ["Indeed", "awaiting_owner"],
  ].map(([portal, state]) => {
    const id = crypto.randomUUID();
    app.store.create({
      id,
      prompt: `Consigne FICTIVE : offres sur ${portal}`,
      state,
      mode: "agent",
      agent: "fixture",
      pack: "core",
      model: "",
      simulated: true,
      budgetCents: 0,
      createdAt: iso(-110),
      famille: {
        racine: mother,
        mere: mother,
        titre: `Offres FICTIVES sur ${portal}`,
      },
      plan,
      ...(state === "awaiting_owner"
        ? {
            pendingQuestion: {
              id: crypto.randomUUID(),
              kind: "prose",
              message: "Quelle ville FICTIVE faut-il viser ?",
              requestedSchema: { type: "object", properties: {} },
              toolCallId: null,
              askedAt: iso(-30),
            },
          }
        : {}),
    });
    return { id, portal, state };
  });
  app.store.event(mother, "delegation_accepted", {
    via: "bouton",
    total: 6,
    parallel: 3,
    acceptedAt: iso(-120),
  });
  for (const child of children)
    app.store.event(mother, "child_launched", {
      childId: child.id,
      titre: `Offres FICTIVES sur ${child.portal}`,
      agent: "fixture",
      modele: "",
    });
  app.store.event(mother, "child_done", {
    childId: children[1].id,
    state: "completed",
    envois: { ligne: "Envoi par la plateforme : aucun envoi FICTIF." },
  });
  const view = await (await fetch(`${base}/api/runs/${mother}`)).json();
  assert.equal(view.family?.length, 3, "family calculé par le back");
  log(
    `GET /api/runs/:id du back : family = ${JSON.stringify(
      view.family.map(({ titre, state, attend }) => ({ titre, state, attend })),
    )} ; activity = ${JSON.stringify(view.activity)}`,
  );

  await page.getByRole("button", { name: "Actualiser les missions" }).click();
  await page.locator(`.mission-link span[title="${motherPrompt}"]`).click();
  const panel = page.getByRole("complementary", { name: "Activité" });
  await panel.locator(".subagent-tile").nth(2).waitFor();
  const statuses = await panel.locator(".subagent-status").allInnerTexts();
  assert.deepEqual(statuses, ["En cours", "Terminée", "Attend ta réponse"]);
  log(`tuiles du panneau : ${JSON.stringify(statuses)}`);
  const line = await page.locator(".subagents-line").innerText();
  assert.match(
    line,
    /1 sous-agent en cours · 1\/3 terminés · 1 attend ta réponse/,
  );
  log(`ligne du fil : « ${line.replace(/\s*›\s*$/, "")} »`);
  const tags = await page
    .locator(".mission-link .subagent-tag")
    .allInnerTexts();
  assert.equal(tags.length, 3);
  log("barre latérale : les 3 sous-missions sont marquées « sous-agent »");
  await shot(page, "essai-famille-1440-light");

  // Changement en direct : la sous-mission SEEK se termine (événement de la mère par le flux).
  app.store.update(children[0].id, { state: "completed" });
  app.store.event(mother, "child_done", {
    childId: children[0].id,
    state: "completed",
    envois: { ligne: "Envoi par la plateforme : aucun envoi FICTIF." },
  });
  await page
    .locator(".subagents-line", { hasText: "2/3 terminés" })
    .waitFor({ timeout: 10000 });
  assert.equal(
    await panel.locator(".subagent-status").first().innerText(),
    "Terminée",
  );
  log(
    "changement en direct suivi : la ligne passe à 2/3 terminés, la tuile à « Terminée »",
  );

  // Ouvrir la sous-mission qui attend une réponse, puis revenir à la mère.
  await panel
    .getByRole("button", { name: /Offres FICTIVES sur Indeed/ })
    .click();
  await panel.getByText(/Quelle ville FICTIVE/).waitFor();
  await panel.getByRole("button", { name: "Ouvrir la sous-mission" }).click();
  await page
    .getByText("Consigne FICTIVE : offres sur Indeed")
    .first()
    .waitFor();
  await panel
    .getByRole("button", { name: "Revenir à la mission principale" })
    .waitFor();
  await shot(page, "essai-sous-mission-1440-light");
  await panel
    .getByRole("button", { name: "Revenir à la mission principale" })
    .click();
  await page.locator(".subagents-line").waitFor();
  log(
    "sous-mission ouverte depuis sa tuile, puis retour à la mission principale",
  );

  // Captures en sombre et à 924 px (panneau ouvert, barre latérale effacée).
  await page.getByRole("button", { name: "Changer de thème" }).click();
  await shot(page, "essai-famille-1440-dark");
  await page.setViewportSize({ width: 924, height: 900 });
  await page.waitForTimeout(300);
  await shot(page, "essai-famille-924-dark");
  assert.deepEqual(errors, []);
  log("aucune erreur de page");
} finally {
  await browser?.close();
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
}
