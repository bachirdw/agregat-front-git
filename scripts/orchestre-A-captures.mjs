// Captures chantier A : Skills et menu « + » du composer, 1440 / 1024 / 768 px.
// Usage : npm run build && node scripts/orchestre-A-captures.mjs avant|apres
// Banc isolé, inspiré de equipe-05 : vrai back, réseau coupé, aucun agent lancé,
// base, career-ops, espaces et contenus des Skills exclusivement temporaires.
// Toutes les fixtures portent FICTIF ; aucun dépôt Git distant n'est téléchargé.
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
const out = resolve("docs/orchestration/captures-A");
mkdirSync(out, { recursive: true });
const root = mkdtempSync(join(tmpdir(), "orchestre-A-FICTIF-"));
for (const dir of ["career", "workspaces", "skills", "data"])
  mkdirSync(join(root, dir));
process.env.AGENT_PLATFORM_NETWORK = "0";
process.env.AGENT_PLATFORM_BROWSER = "fixture";
process.env.AGENT_PLATFORM_CAREER_WORKSPACE = join(root, "career");
process.env.AGENT_PLATFORM_WORKSPACE_ROOTS = join(root, "workspaces");
process.env.AGENT_PLATFORM_SKILL_ROOTS = join(root, "skills");
const backend =
  process.env.AGENT_PLATFORM_BACKEND_DIR ||
  join(homedir(), "Downloads/agregat-back");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const prohibitedPorts = new Set([4310, 5173, 4316, 4317]);
const manifest = {
  phase: label,
  createdAt: new Date().toISOString(),
  backend,
  fixture: "FICTIF — vrai registre et vraies routes API, aucun agent ni réseau",
  widths: [1440, 1024, 768],
  shots: [],
  unavailable: [],
  pageErrors: [],
  selectedSkills: [],
  attachments: [],
};
let app;
let browser;

function skillFile(id, description) {
  const dir = join(root, "skills", id);
  mkdirSync(dir);
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${id}\ndescription: FICTIF — ${description}\nversion: 1.0.0\nlicense: MIT\n---\nFixture locale FICTIVE pour captures. Aucun script, aucun appel réseau.\n`,
  );
  return dir;
}

function seedSkills() {
  // Les définitions embarquées du banc sont elles aussi temporaires. La base et
  // les packs du développeur ne sont ni lus comme fixtures ni modifiés.
  app.skills.definitions = [
    ["fictif-recherche-web", "Méthode de recherche documentaire"],
    ["fictif-revue-documents", "Relecture des sources et des conclusions"],
    ["fictif-synthese", "Synthèse structurée de documents"],
  ].map(([id, description]) => ({
    id,
    version: "1.0.0",
    reviewed: true,
    path: join(skillFile(id, description), "SKILL.md"),
  }));
  app.skills.install("fictif-recherche-web");
  app.skills.install("fictif-revue-documents");
  app.skills.activate("fictif-revue-documents", false);
  const fixtures = [
    ["fictif-redaction", "Rédaction d’un compte rendu", "active"],
    ["fictif-verification", "Vérification avant installation", "reviewed"],
    [
      "fictif-import-a-relire",
      "Import tiers à examiner avant approbation",
      "quarantined",
    ],
    [
      "fictif-import-rejete",
      "Import tiers rejeté lors de la revue",
      "rejected",
    ],
  ];
  for (const [id, description, state] of fixtures) {
    const record = app.skills.importLocal(skillFile(id, description), {
      source: {
        type: "git",
        url: "https://github.com/FICTIF/captures-locales",
        subdir: id,
        sha: "f".repeat(40),
      },
      version: "1.0.0",
    });
    if (state === "reviewed" || state === "active")
      app.skills.review(id, { approved: true, hash: record.hash });
    if (state === "active") app.skills.install(id);
    if (state === "rejected")
      app.skills.review(id, { approved: false, hash: record.hash });
  }
}

async function shot(page, name) {
  if (manifest.pageErrors.length)
    throw new Error(`Erreur navigateur : ${manifest.pageErrors.join(" ; ")}`);
  await page.screenshot({
    path: join(out, `${label}-${name}.png`),
    fullPage: true,
  });
  manifest.shots.push(`${label}-${name}.png`);
}

async function openAdd(page) {
  const current = page.locator(".cp-add-button");
  if (await current.count()) return current.click();
  const legacy = page.locator(".composer .attach-menu > summary");
  if (await legacy.count()) return legacy.click();
  return page
    .locator(".composer")
    .getByRole("button", { name: "Ajouter", exact: true })
    .click();
}

async function openSkillDetails(page, id) {
  const row = page
    .locator("article.sk-row, .skill-card")
    .filter({ hasText: id })
    .first();
  if (!(await row.count())) throw new Error(`Ligne de Skill absente : ${id}`);
  const toggle = row.getByRole("button", {
    name: `Détails de ${id}`,
    exact: true,
  });
  if (await toggle.count()) {
    if ((await toggle.getAttribute("aria-expanded")) !== "true")
      await toggle.click();
  } else {
    manifest.unavailable.push(
      `${id} : détail déjà affiché dans la version avant`,
    );
  }
  await row.scrollIntoViewIfNeeded();
}

async function attachFixture(page, width) {
  const result = {
    width,
    file: "FICTIF-compte-rendu.md",
    status: "pending",
    http: [],
    networkErrors: [],
  };
  manifest.attachments.push(result);
  const isUpload = (request) =>
    request.method() === "POST" &&
    new URL(request.url()).pathname === "/api/files";
  const response = (answer) => {
    if (isUpload(answer.request()))
      result.http.push({
        status: answer.status(),
        statusText: answer.statusText(),
      });
  };
  const requestFailed = (request) => {
    if (isUpload(request))
      result.networkErrors.push(request.failure()?.errorText || "Échec réseau");
  };
  page.on("response", response);
  page.on("requestfailed", requestFailed);
  try {
    await page.locator('.composer input[type="file"]').setInputFiles({
      name: result.file,
      mimeType: "text/markdown",
      buffer: Buffer.from(
        "# FICTIF\nPièce jointe locale pour capture, sans donnée personnelle.\n",
      ),
    });
    const attached = page.getByRole("button", {
      name: `Retirer ${result.file}`,
      exact: true,
    });
    const uiError = page.locator(".composer").getByRole("alert").first();
    const uploaded = await Promise.race([
      attached.waitFor({ timeout: 10000 }).then(() => true),
      uiError.waitFor({ timeout: 10000 }).then(() => false),
    ]);
    if (!uploaded)
      throw new Error(
        (await uiError.textContent()) || "Échec dans l’interface",
      );
    result.status = "uploaded";
  } catch (error) {
    // La pièce jointe est optionnelle pour la capture : conserver la pastille du
    // Skill réel et les diagnostics, puis passer aux autres largeurs.
    result.status = "unavailable";
    result.error = error instanceof Error ? error.message : String(error);
    result.uiErrors = await page
      .locator(".composer")
      .getByRole("alert")
      .allTextContents();
    console.error(`${width}px — pièce jointe indisponible : ${result.error}`);
  } finally {
    page.off("response", response);
    page.off("requestfailed", requestFailed);
  }
}

try {
  if (!existsSync(join(backend, "apps/api/server.js")))
    throw new Error(`Back introuvable : ${backend}`);
  if (!existsSync(resolve("dist/index.html")))
    throw new Error("dist absent : exécuter npm run build avant les captures");
  const { createApp } = await import(resolve(backend, "apps/api/server.js"));
  app = createApp({
    dataDir: join(root, "data"),
    live: false,
    ownerMode: false,
    webDir: resolve("dist"),
  });
  seedSkills();
  // Port éphémère du système : les quatre ports partagés sont explicitement refusés.
  await new Promise((resolveListen, rejectListen) => {
    app.server.once("error", rejectListen);
    app.server.listen(0, "127.0.0.1", resolveListen);
  });
  const port = app.server.address().port;
  if (prohibitedPorts.has(port))
    throw new Error(`Port partagé refusé : ${port}`);
  manifest.port = port;
  const base = `http://127.0.0.1:${port}`;
  browser = await chromium.launch({ executablePath: chrome, headless: true });
  for (const width of manifest.widths) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => manifest.pageErrors.push(error.message));
    // Bloque aussi les sous-ressources externes du navigateur ; seul le banc local est autorisé.
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === base
        ? route.continue()
        : route.abort(),
    );
    await page.goto(base);
    await page.locator(".app[data-ready=true]").waitFor();
    await page.getByRole("button", { name: "Skills", exact: true }).click();
    await page.getByRole("heading", { name: "Skills", exact: true }).waitFor();
    await shot(page, `skills-liste-${width}`);
    await openSkillDetails(page, "fictif-redaction");
    await shot(page, `skills-ligne-depliee-${width}`);
    const add = page.getByRole("button", { name: "Ajouter", exact: true });
    if (await add.count()) {
      await add.click();
      await shot(page, `skills-menu-ajouter-${width}`);
      await page.keyboard.press("Escape");
    } else
      manifest.unavailable.push(
        `${width} : menu Ajouter absent dans la version avant`,
      );
    const quarantine = page
      .getByRole("button", {
        name: /^(?:En quarantaine|Quarantaine)(?:\s+\d+)?$/,
      })
      .first();
    if (await quarantine.count()) await quarantine.click();
    await openSkillDetails(page, "fictif-import-a-relire");
    await shot(page, `skills-quarantaine-${width}`);

    // Recharger revient à l’accueil sans lancer de mission. Sélection explicite
    // d’un Skill et envoi du fichier FICTIF via le vrai POST /api/files.
    await page.goto(base);
    await page.locator(".app[data-ready=true]").waitFor();
    await page
      .getByLabel("Objectif de la mission", { exact: true })
      .fill("FICTIF — préparer un compte rendu local");
    await openAdd(page);
    await shot(page, `composer-menu-plus-${width}`);
    const skillItem = page.getByRole("menuitemcheckbox", {
      name: "fictif-recherche-web",
      exact: true,
    });
    if (await skillItem.count()) {
      await skillItem.click();
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", {
          name: "Retirer le Skill fictif-recherche-web",
          exact: true,
        })
        .waitFor();
      manifest.selectedSkills.push({
        width,
        id: "fictif-recherche-web",
        chipVisible: true,
      });
    } else {
      await page.keyboard.press("Escape");
      const session = page.locator(".composer details.session-menu");
      if (await session.count())
        await session.locator(":scope > summary").click();
      const select = page.getByLabel("Skill", { exact: true });
      const filter = select.locator("xpath=ancestor::details[1]");
      if ((await filter.getAttribute("open")) === null)
        await filter.locator(":scope > summary").click();
      await select.selectOption("fictif-recherche-web");
      if ((await select.inputValue()) !== "fictif-recherche-web")
        throw new Error("La sélection explicite du Skill FICTIF a échoué");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      manifest.selectedSkills.push({
        width,
        id: "fictif-recherche-web",
        chipVisible: false,
      });
      manifest.unavailable.push(
        `${width} : pastille de Skill absente dans la version avant ; sélection réelle vérifiée`,
      );
    }
    await attachFixture(page, width);
    await shot(page, `composer-pastilles-${width}`);
    await context.close();
  }
  manifest.status = "ok";
  console.log(`${manifest.shots.length} captures dans ${out}`);
} catch (error) {
  manifest.status = "error";
  manifest.error = error instanceof Error ? error.stack : String(error);
  console.error(manifest.error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await app?.close();
  rmSync(root, { recursive: true, force: true });
  manifest.cleanedUp = true;
  writeFileSync(
    join(out, `manifest-${label}.json`),
    JSON.stringify(manifest, null, 2) + "\n",
  );
}
