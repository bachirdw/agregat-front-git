// Captures equipe-05 (refonte de la section « Équipe » et des notes du panneau Activité) : thème sombre,
// 1440 et 760 px, panneau Activité ouvert. Usage :
//   npm run build && node scripts/equipe-05-captures.mjs avant|apres
// Banc isolé : back réel (dossier AGENT_PLATFORM_BACKEND_DIR, défaut ~/Downloads/agregat-back-fichiers),
// base, espace career-ops, racines et Skills dans un dossier temporaire, aucun réseau, aucun agent lancé.
// Toutes les données sont FICTIVES : une mission d'équipe écrite dans la base (4 membres, 6 notes de carnet).
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const label = process.argv[2];
if (!["avant", "apres"].includes(label))
  throw new Error("Préciser avant ou apres");
const root = mkdtempSync(join(tmpdir(), "equipe-05-FICTIF-"));
for (const dir of ["career", "workspaces", "skills", "data"])
  mkdirSync(join(root, dir));
process.env.AGENT_PLATFORM_NETWORK = "0";
process.env.AGENT_PLATFORM_BROWSER = "fixture";
process.env.AGENT_PLATFORM_CAREER_WORKSPACE = join(root, "career");
process.env.AGENT_PLATFORM_WORKSPACE_ROOTS = join(root, "workspaces");
process.env.AGENT_PLATFORM_SKILL_ROOTS = join(root, "skills");
const backend =
  process.env.AGENT_PLATFORM_BACKEND_DIR ||
  join(homedir(), "Downloads/agregat-back-fichiers");
if (!existsSync(join(backend, "apps/api/server.js")))
  throw new Error(`Back introuvable : ${backend}`);
const { createApp } = await import(resolve(backend, "apps/api/server.js"));
const out = resolve(".manager/reports/equipe-05");
mkdirSync(out, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const app = createApp({
  dataDir: join(root, "data"),
  live: false,
  ownerMode: false,
  webDir: resolve("dist"),
});
let browser;
const now = Date.now();
const iso = (s) => new Date(now + s * 1000).toISOString();
const prompt = "Mission FICTIVE : vendre Relay, en équipe";

function seed() {
  const mother = crypto.randomUUID();
  app.store.create({
    id: mother,
    prompt,
    state: "running",
    mode: "agent",
    agent: "claude",
    pack: "core",
    model: "",
    simulated: true,
    budgetCents: 0,
    createdAt: iso(-900),
    estMere: true,
    multiAgent: true,
    carnet: true,
    delegation: { accepted: true, via: "bouton", total: 6, parallel: 3 },
    plan: { steps: [] },
  });
  const members = [
    {
      titre: "Recherche tendances Instagram — agents IA pour TPE/PME (FICTIF)",
      role: "chercheur",
      pourquoi: "parallele",
      agent: "claude",
      model: "sonnet",
      state: "completed",
      start: -860,
      end: -662,
      tokens: 760717,
    },
    {
      titre:
        "Recherche tendances X (Twitter) — agents IA pour TPE/PME (FICTIF)",
      role: "chercheur",
      pourquoi: "parallele",
      agent: "claude",
      model: "sonnet",
      state: "completed",
      start: -858,
      end: -668,
      tokens: 704018,
    },
    {
      titre:
        "Relecture des 6 publications Relay (ton, faits, cohérence produit) (FICTIF)",
      role: "verificateur",
      pourquoi: "regard_independant",
      agent: "codex",
      model: "",
      state: "completed",
      start: -600,
      end: -177,
      tokens: 1351133,
    },
    {
      titre: "Deuxième relecture du livrable corrigé (FICTIF)",
      role: "verificateur",
      pourquoi: "regard_independant",
      agent: "codex",
      model: "",
      state: "running",
      start: -120,
    },
  ];
  const ids = [];
  for (const m of members) {
    const id = crypto.randomUUID();
    ids.push(id);
    app.store.create({
      id,
      prompt: `Consigne FICTIVE : ${m.titre}`,
      state: m.state,
      mode: "agent",
      agent: m.agent,
      pack: "core",
      model: m.model,
      simulated: true,
      budgetCents: 0,
      createdAt: iso(m.start - 2),
      startedAt: iso(m.start),
      ...(m.end ? { finishedAt: iso(m.end) } : {}),
      famille: {
        racine: mother,
        mere: mother,
        titre: m.titre,
        role: m.role,
        pourquoi: m.pourquoi,
        ...(m.role === "verificateur" ? { relit: ids.slice(0, 2) } : {}),
      },
      plan: { steps: [] },
      result:
        m.state === "completed"
          ? {
              simulated: true,
              summary: `Résultat FICTIF : ${m.titre}`,
              evidence: [],
            }
          : undefined,
    });
    if (m.tokens)
      app.store.event(mother, "child_done", {
        childId: id,
        state: m.state,
        usage: { tours: 1, jetons: { total: m.tokens } },
      });
  }
  const notes = [
    [
      "agent principal",
      undefined,
      "decision",
      "BRIEF PRODUIT FICTIF — Relay fait travailler une équipe d'agents IA sur les tâches d'une petite entreprise.\nContraintes : web public seulement, rien publier, chaque affirmation sourcée.",
      -880,
    ],
    [
      members[0].titre,
      "chercheur",
      "piege",
      "Beaucoup de pages SEO génériques d'outils IA remontent en tête des résultats Instagram FICTIFS sans citer de donnée vérifiable propre à la niche.\nQuand une recherche sur une plateforme sociale remonte surtout des pages d'outils, croiser avec des sources plus crédibles et marquer « à confirmer » tout chiffre sans deuxième source.",
      -665,
    ],
    [
      members[1].titre,
      "chercheur",
      "piege",
      "WebFetch sur x.com renvoie une erreur 402 (Payment Required), même sans connexion. Passer par WebSearch, qui renvoie souvent des extraits textuels des posts.",
      -664,
    ],
    [
      members[2].titre,
      "verificateur",
      "decouverte",
      "Relecture en cours : aucun benchmark chiffré de marché n'est attribué à Relay dans les publications FICTIVES.",
      -540,
    ],
    [
      members[2].titre,
      "verificateur",
      "piege",
      "Un pourcentage agrégé n'est pas une peur isolée\nQuand une source additionne plusieurs freins en un seul pourcentage, ne pas le présenter comme la part de dirigeants qui craignent un frein précis.",
      -500,
    ],
    [
      "agent principal",
      undefined,
      "methode",
      "Séparer les benchmarks de marché des promesses produit\nQuand on rédige pour un client, ranger les chiffres de marché sourcés à part des affirmations sur le produit, qui demandent une preuve produit.",
      -140,
    ],
  ];
  notes.forEach(([auteur, role, categorie, texte, at], i) =>
    app.store.event(mother, "carnet_note", {
      n: i + 1,
      auteur,
      ...(role ? { role } : {}),
      categorie,
      texte,
      a: iso(at),
    }),
  );
  app.store.event(mother, "lecon_gardee", { id: "l-0000000000000001" });
  app.store.event(mother, "lecon_gardee", { id: "l-0000000000000002" });
  return mother;
}

try {
  const mother = seed();
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const shots = [];
  for (const width of [1440, 760]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(`${base}/#mission/${mother}`);
    await page.locator(".app[data-ready=true]").waitFor();
    await page.locator(".toolbar").waitFor();
    if (!(await page.locator(".activity-panel").count()))
      await page.getByRole("button", { name: "Afficher l’activité" }).click();
    const panel = page.locator(".activity-panel");
    await panel.waitFor();
    // La section Équipe en haut du panneau, puis le carnet.
    const team = panel.locator('[aria-label="Équipe"]').first();
    await team.waitFor({ timeout: 10000 });
    await team.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const name = `${label}-equipe-${width}-sombre`;
    await page.screenshot({ path: join(out, name + ".png") });
    await panel.screenshot({ path: join(out, name + "-panneau.png") });
    shots.push(name, name + "-panneau");
    if (label === "apres") {
      // Une ligne d'équipe et une note dépliées.
      await team.locator("button[aria-expanded]").first().click();
      const learned = panel.locator('[aria-label="Ce que l’équipe a appris"]');
      await learned.scrollIntoViewIfNeeded();
      await learned.locator("button[aria-expanded]").first().click();
      await page.waitForTimeout(400);
      await team.scrollIntoViewIfNeeded();
      await panel.screenshot({ path: join(out, name + "-deplie.png") });
      await learned.scrollIntoViewIfNeeded();
      await panel.screenshot({ path: join(out, name + "-notes.png") });
      shots.push(name + "-deplie", name + "-notes");
    } else {
      const notes = panel.locator('[aria-label="Carnet d’équipe"]');
      if (await notes.count()) {
        await notes.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await panel.screenshot({ path: join(out, name + "-notes.png") });
        shots.push(name + "-notes");
      }
    }
    await context.close();
  }
  console.log(`${shots.length} captures dans ${out}`);
} finally {
  await browser?.close();
  await app.close();
  rmSync(root, { recursive: true, force: true });
}
