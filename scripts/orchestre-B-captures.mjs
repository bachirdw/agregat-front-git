// Banc de captures Consommation — toutes les missions de ce banc sont FICTIVES.
// Usage : npm run build && node scripts/orchestre-B-captures.mjs avant|apres
// AVANT : reconstruire dist à la révision b9cbe19 ; un build de la refonte ne constitue pas la référence AVANT.
// Le backend réel sert dist depuis une base et des espaces temporaires. Aucun agent n'est lancé.
// Dépendances déjà présentes : playwright-core ; Chrome local, aucun téléchargement.
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const label = process.argv[2];
if (!["avant", "apres"].includes(label))
  throw new Error("Préciser avant ou apres");
const out = resolve("docs/orchestration/captures-B");
mkdirSync(out, { recursive: true });
const root = mkdtempSync(join(tmpdir(), "orchestre-B-FICTIF-"));
const forbiddenPorts = new Set([4310, 5173, 4316, 4317]);
const widths = [1440, 1024, 768];
const manifest = {
  label,
  fictif: true,
  backend: "API réelle en fixture isolée, aucun agent lancé",
  expectedSourceRevision: label === "avant" ? "b9cbe19" : null,
  baselineNote:
    "Les captures AVANT exigent un dist reconstruit à b9cbe19 ; le script ne reconstruit pas cette révision.",
  createdAt: new Date().toISOString(),
  shots: [],
  unavailable: [],
  pageErrors: [],
  layoutChecks: [],
};
let browser;
let app;
let createApp;

for (const name of ["data", "career-ops", "workspaces", "skills"])
  mkdirSync(join(root, name));
process.env.AGENT_PLATFORM_NETWORK = "0";
process.env.AGENT_PLATFORM_BROWSER = "fixture";
process.env.AGENT_PLATFORM_LIVE = "0";
process.env.AGENT_PLATFORM_OWNER_MODE = "0";
process.env.AGENT_PLATFORM_CAREER_WORKSPACE = join(root, "career-ops");
process.env.AGENT_PLATFORM_WORKSPACE_ROOTS = join(root, "workspaces");
process.env.AGENT_PLATFORM_SKILL_ROOTS = join(root, "skills");

const backend =
  process.env.AGENT_PLATFORM_BACKEND_DIR ||
  join(homedir(), "Downloads/agregat-back");
const chrome =
  process.env.AGENT_PLATFORM_CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const iso = (offset) =>
  new Date(Date.parse("2026-11-22T06:00:00Z") + offset * 1000).toISOString();

function seed() {
  const cost = (cents) => ({
    platformCents: cents,
    currency: "EUR",
    budgetCents: 1000,
    withinBudget: true,
    description: "Coût FICTIF du banc isolé",
    lines: [{ dimension: "tool_call", units: cents / 5, cents }],
  });
  const create = ({
    title,
    state = "completed",
    cents = 0,
    start = -300,
    end = -60,
    ...extra
  }) => {
    const id = randomUUID();
    app.store.create({
      id,
      prompt: title,
      title,
      state,
      mode: "agent",
      agent: "codex",
      model: "",
      pack: "core",
      simulated: true,
      dataMode: "fixture",
      budgetCents: 1000,
      createdAt: iso(start - 5),
      startedAt: iso(start),
      ...(end !== null ? { finishedAt: iso(end) } : {}),
      plan: { steps: [], cost: cost(cents) },
      ...(state === "completed"
        ? {
            result: {
              simulated: true,
              summary: "Résultat FICTIF sans action externe",
              evidence: [],
            },
          }
        : {}),
      ...extra,
    });
    if (cents) app.store.charge(id, "tool_call", cents / 5, cents, null, "EUR");
    return id;
  };
  // L'API liste les insertions récentes en premier : la mission à déplier reste dans les cinq premières.
  create({
    title: "FICTIF — Préparer la synthèse",
    cents: 100,
    start: -700,
    end: -340,
  });
  create({
    title: "FICTIF — Comparer les documents",
    state: "failed",
    cents: 25,
    error: "Erreur de fixture FICTIVE",
    start: -1000,
    end: -800,
  });
  create({
    title: "FICTIF — Classer les résultats",
    state: "waiting_user",
    cents: 25,
    start: -1300,
    end: null,
  });
  create({
    title: "FICTIF — Relire les brouillons",
    state: "running",
    start: -1600,
    end: null,
  });
  create({ title: "FICTIF — Archiver les notes", start: -1900, end: -1700 });
  const mother = create({
    title: "FICTIF — Analyse du marché local",
    cents: 150,
    estMere: true,
    multiAgent: true,
  });
  create({
    title: "FICTIF — Collecte des sources",
    cents: 50,
    start: -290,
    end: -180,
    agent: "claude",
    famille: {
      racine: mother,
      mere: mother,
      titre: "FICTIF — Collecte des sources",
      role: "chercheur",
      pourquoi: "parallele",
    },
  });
  create({
    title: "FICTIF — Vérification des sources",
    cents: 50,
    start: -170,
    end: -80,
    famille: {
      racine: mother,
      mere: mother,
      titre: "FICTIF — Vérification des sources",
      role: "verificateur",
      pourquoi: "regard_independant",
    },
  });
  return mother;
}

async function listen() {
  await new Promise((resolveListen, reject) => {
    app.server.once("error", reject);
    app.server.listen(0, "127.0.0.1", () => {
      app.server.off("error", reject);
      resolveListen();
    });
  });
  const port = app.server.address().port;
  if (forbiddenPorts.has(port))
    throw new Error(`Port réservé attribué par le système : ${port}`);
  return `http://127.0.0.1:${port}`;
}

async function capture(page, state, width) {
  if (label === "apres" && [1024, 768].includes(width)) {
    const layout = await page.locator(".cs-screen").evaluate((screen) => {
      const content = screen.querySelector(".cs-content");
      const box = content.getBoundingClientRect();
      const style = getComputedStyle(content);
      const left = box.left + parseFloat(style.paddingLeft);
      const right = box.right - parseFloat(style.paddingRight);
      const overflows = [
        ...screen.querySelectorAll(
          ".cs-missions, .cs-table, .cs-mission-columns, .cs-detail, .cs-detail-columns, .cs-kpis, .cs-kpi, .cs-account, .cs-limit",
        ),
      ]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.width &&
            rect.height &&
            (element.scrollWidth > element.clientWidth + 1 ||
              rect.left < left - 1 ||
              rect.right > right + 1)
          );
        })
        .map((element) => element.className);
      const columns = (selector) =>
        [...screen.querySelectorAll(selector)].map(
          (element) => getComputedStyle(element).display,
        );
      return {
        contentWidth: right - left,
        overflows,
        shareColumns: columns(".cs-col-share"),
        cacheColumns: columns(".cs-col-cache"),
      };
    });
    manifest.layoutChecks.push({ state, width, ...layout });
    if (layout.overflows.length)
      throw new Error(
        `Débordement horizontal à ${width}px (${state}) : ${layout.overflows.join(", ")}`,
      );
    if (
      layout.contentWidth <= 680 &&
      layout.shareColumns.some((display) => display !== "none")
    )
      throw new Error(`Colonne Part non repliée à ${width}px (${state})`);
    if (
      layout.contentWidth <= 520 &&
      layout.cacheColumns.some((display) => display !== "none")
    )
      throw new Error(`Colonne Cache non repliée à ${width}px (${state})`);
  }
  const name = `${label}-${state}-${width}-sombre.png`;
  await page.screenshot({ path: join(out, name), fullPage: true });
  manifest.shots.push(name);
}

async function openUsage(context, base) {
  const page = await context.newPage();
  page.on("pageerror", (error) => manifest.pageErrors.push(error.message));
  // La fixture ne consulte que son propre serveur local, même si l'interface change.
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(base + "/") || url.startsWith("data:")
      ? route.continue()
      : route.abort("blockedbyclient");
  });
  await page.goto(base);
  await page.locator(".app[data-ready=true]").waitFor();
  await page.getByRole("button", { name: "Consommation", exact: true }).click();
  await page
    .getByRole("heading", { name: "Consommation", exact: true })
    .waitFor();
  await page.evaluate(() => {
    const badge = document.createElement("div");
    badge.textContent = "FICTIF — banc isolé Consommation";
    badge.setAttribute("role", "note");
    Object.assign(badge.style, {
      position: "fixed",
      right: "12px",
      bottom: "12px",
      zIndex: "9999",
      padding: "5px 10px",
      borderRadius: "8px",
      color: "#ff9f0a",
      background: "#1c1c1e",
      border: "1px solid #ff9f0a",
      font: "12px system-ui",
      pointerEvents: "none",
    });
    document.body.append(badge);
  });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

try {
  if (!existsSync(resolve("dist/index.html")))
    throw new Error("Exécuter npm run build avant les captures");
  if (!existsSync(join(backend, "apps/api/server.js")))
    throw new Error(`Backend introuvable : ${backend}`);
  writeFileSync(
    join(root, "data/pricing.json"),
    JSON.stringify({
      currency: "EUR",
      centsPerUnit: { tool_call: 5 },
      monthlyCapCents: 1000,
    }),
  );
  ({ createApp } = await import(resolve(backend, "apps/api/server.js")));
  app = createApp({
    dataDir: join(root, "data"),
    live: false,
    ownerMode: false,
    webDir: resolve("dist"),
  });
  const mother = seed();
  const base = await listen();
  browser = await chromium.launch({ executablePath: chrome, headless: true });
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    try {
      await context.addInitScript(() =>
        localStorage.setItem("agre-theme", "dark"),
      );
      const page = await openUsage(context, base);
      const overview = page.getByRole("tab", { name: "Aperçu", exact: true });
      const overviewButton = page.getByRole("button", {
        name: "Aperçu",
        exact: true,
      });
      const stats = page.getByRole("tab", {
        name: "Statistiques",
        exact: true,
      });
      const statsButton = page.getByRole("button", {
        name: "Statistiques",
        exact: true,
      });
      const hasTabs = Boolean(
        (await overview.count()) || (await overviewButton.count()),
      );
      if (hasTabs) {
        await ((await overview.count()) ? overview : overviewButton).click();
        await capture(page, "apercu", width);
        await ((await stats.count()) ? stats : statsButton).click();
        await capture(page, "statistiques", width);
        const row = page
          .locator(".cs-mission-toggle")
          .filter({ hasText: /FICTIF — Analyse du marché local/ });
        await row.waitFor();
        if ((await row.getAttribute("aria-expanded")) !== "true") {
          const [detailResponse] = await Promise.all([
            page.waitForResponse((response) => {
              const url = new URL(response.url());
              return (
                url.origin === base &&
                url.pathname === `/api/runs/${mother}` &&
                url.searchParams.get("equipe") === "1" &&
                response.request().method() === "GET"
              );
            }),
            row.click(),
          ]);
          if (!detailResponse.ok())
            throw new Error(
              `Détail de la mission indisponible : HTTP ${detailResponse.status()}`,
            );
        }
        await page
          .getByText("Consommation mesurée · détail du registre", {
            exact: true,
          })
          .waitFor();
        await row.scrollIntoViewIfNeeded();
        await capture(page, "mission-depliee", width);
      } else {
        if (label === "apres")
          throw new Error(
            "Onglets Aperçu / Statistiques introuvables après la refonte",
          );
        await capture(page, "consommation", width);
        manifest.unavailable.push({
          width,
          states: ["apercu", "statistiques", "mission-depliee"],
          reason: "État AVANT : onglets et missions dépliables absents",
        });
        const detail = page
          .getByRole("button", { name: "Voir la consommation", exact: true })
          .first();
        if (await detail.count()) {
          await detail.click();
          await page
            .getByRole("heading", { name: /^Consommation :/ })
            .waitFor();
          await capture(page, "detail-existant", width);
        }
      }
      await page.close();
    } finally {
      await context.close();
    }
  }
  // Une seconde base réellement vide évite de falsifier le ledger append-only de la fixture.
  await app.close();
  app = undefined;
  mkdirSync(join(root, "empty-data"));
  app = createApp({
    dataDir: join(root, "empty-data"),
    live: false,
    ownerMode: false,
    webDir: resolve("dist"),
  });
  const emptyBase = await listen();
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    try {
      await context.addInitScript(() =>
        localStorage.setItem("agre-theme", "dark"),
      );
      const page = await openUsage(context, emptyBase);
      const stats = page.getByRole("tab", {
        name: "Statistiques",
        exact: true,
      });
      const statsButton = page.getByRole("button", {
        name: "Statistiques",
        exact: true,
      });
      if ((await stats.count()) || (await statsButton.count()))
        await ((await stats.count()) ? stats : statsButton).click();
      await page
        .getByText("Aucune mission pour le moment.", { exact: true })
        .waitFor();
      await capture(page, "liste-vide", width);
    } finally {
      await context.close();
    }
  }
  if (manifest.pageErrors.length)
    throw new Error(`Erreurs navigateur : ${manifest.pageErrors.join(" ; ")}`);
  console.log(
    `${manifest.shots.length} captures FICTIVES dans ${out} (mission ${mother})`,
  );
} catch (error) {
  manifest.error = error.stack || String(error);
  console.error(manifest.error);
  process.exitCode = 1;
} finally {
  try {
    await browser?.close();
  } finally {
    try {
      await app?.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
      writeFileSync(
        join(out, `${label}-manifest.json`),
        JSON.stringify(manifest, null, 2) + "\n",
      );
    }
  }
}
