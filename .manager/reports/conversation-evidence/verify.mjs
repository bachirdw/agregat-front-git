// Vérification visuelle de l'affichage conversation (FICTIF) : Vite 5175 → back figé 4321.
// 1) vraie mission de l'agent factice ; 2) scénario career-ops scripté (EventSource simulé, routes /api simulées).
import { chromium } from 'playwright-core';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:5175';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const log = [];
const check = (ok, label) => {
  log.push(`${ok ? 'OK ' : 'ÉCHEC'} ${label}`);
  if (!ok) process.exitCode = 1;
};
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const shot = (page, name) => page.screenshot({ path: join(OUT, name) });

// 1) Vraie mission de l'agent factice (back 4311, aucun modèle).
{
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const response = await fetch(BASE + '/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-platform-request': '1' },
      body: JSON.stringify({ prompt: 'FICTIF : vérification de l’affichage', agent: 'fixture', pack: 'core' }),
    });
  if (!response.ok) throw new Error(`Création de mission : HTTP ${response.status} ${await response.text()}`);
  const created = await response.json();
  await page.goto(BASE);
  await page.getByText('FICTIF : vérification de l’affichage').first().click();
  await page.waitForFunction(() => document.body.innerText.includes('Terminée'), null, { timeout: 15000 });
  await page.waitForTimeout(300);
  check(await page.getByText('Démonstration de transport ACP/MCP', { exact: false }).isVisible(), `mission factice ${created.id} : synthèse affichée`);
  check((await page.locator('.activity .spinner').count()) === 0, 'mission finie : aucun indicateur restant');
  check((await page.locator('.activity details[open]').count()) === 0, 'mission finie : actions repliées');
  await shot(page, '0-mission-factice-reelle.png');
  await page.close();
}

// 2) Scénario career-ops scripté.
const R = '00000000-0000-4000-8000-0000000000aa';
let state = 'running';
let cancelled = 0;
const run = () => ({
  id: R, sessionId: null, createdAt: '2026-10-27T11:00:00.000Z', prompt: 'FICTIF', agent: 'gemini',
  pack: 'career-ops', state, mode: 'agent', skills: ['career-ops'], simulated: true, steps: [],
  plan: { steps: [], cost: null, workflow: null },
});
const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
await context.addInitScript((R) => {
  window.__sources = [];
  window.EventSource = class {
    constructor(url) {
      this.url = url;
      this.listeners = {};
      window.__sources.push(this);
      setTimeout(() => this.onopen?.(), 0);
    }
    addEventListener(type, fn) {
      (this.listeners[type] ||= []).push(fn);
    }
    close() {
      this.closed = true;
    }
  };
  let seq = 0;
  window.__push = (type, data) => {
    seq++;
    for (const s of window.__sources)
      if (!s.closed && s.url.includes(R))
        for (const fn of s.listeners.update || []) fn({ data: JSON.stringify({ seq, type, data }) });
  };
}, R);
const page = await context.newPage();
await page.route('**/api/**', async (route) => {
  const url = new URL(route.request().url());
  const json = (body) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  if (url.pathname === '/api/runs') return json([run()]);
  if (url.pathname === `/api/runs/${R}`) return json(run());
  if (url.pathname === `/api/runs/${R}/cancel`) {
    cancelled++;
    return json(run());
  }
  if (url.pathname === `/api/career/runs/${R}/input`) return json({ prompt: 'FICTIF : évalue une offre' });
  if (url.pathname === `/api/career/runs/${R}/result`)
    return json({ summary: '**Réponse finale FICTIVE** : offre évaluée 4,2/5.' });
  if (url.pathname === '/api/career/offers') return json({ opportunities: [] });
  return route.continue();
});
const push = (type, data) => page.evaluate(([t, d]) => window.__push(t, d), [type, data]);
const agent = (data) => push('agent', data);
const turn = page.locator('.career-thread .agent-turn');
const status = () => turn.locator('[role=status]').textContent().catch(() => null);
await page.goto(BASE);
await page.getByText('FICTIF', { exact: true }).first().click();
await page.waitForSelector('.career-thread');
await page.waitForTimeout(200);
check((await status()) === 'Réflexion…', 'attente initiale : « Réflexion… »');
check(await page.getByRole('button', { name: /Stop/ }).isVisible(), 'bouton Stop visible pendant l’exécution');
await shot(page, '1-attente.png');

await agent({ sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: 'Je compare le poste ' } });
await agent({ sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: 'à mon profil FICTIF.' } });
const thought = turn.locator('.activity-thought details.fold');
check((await thought.locator('summary').textContent()) === 'Réflexion…', 'réflexion en cours : indicateur dans le bloc');
check(!(await thought.evaluate((d) => d.open)), 'réflexion repliée par défaut');
await shot(page, '2-reflexion.png');

await agent({ sessionUpdate: 'tool_call', toolCallId: 'a', title: 'browser_snapshot()', status: 'in_progress' });
check((await status()) === 'Exécution…', 'action en cours : « Exécution… »');
check((await thought.locator('summary').textContent()) === 'Réflexion', 'réflexion terminée : reste repliée, sans indicateur');
await shot(page, '3-execution.png');

await agent({ sessionUpdate: 'tool_call_update', toolCallId: 'a', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: '- heading "Offre FICTIVE" [ref=e1]' } }] });
await agent({ sessionUpdate: 'tool_call', toolCallId: 'b', title: 'browser_click(ref: e7)', status: 'in_progress' });
await agent({ sessionUpdate: 'tool_call_update', toolCallId: 'b', status: 'failed', content: [{ type: 'content', content: { type: 'text', text: 'Action refusée par l’utilisateur : browser.click' } }] });
await agent({ sessionUpdate: 'tool_call', toolCallId: 'c', title: 'career_read(path: modes/oferta.md)', status: 'completed' });
await agent({ sessionUpdate: 'tool_call', toolCallId: 'd', title: 'mcp.platform.browser_extract', status: 'completed', rawInput: { arguments: { limit: 3 } }, rawOutput: { count: 3 } });
await page.waitForTimeout(100);
const group = turn.locator('details.tool-group');
check((await group.locator(':scope > summary').textContent()).includes('4 actions · 1 en échec'), 'groupe replié « 4 actions · 1 en échec »');
const failure = turn.locator('.tool-failures details.tool.failed');
check((await failure.count()) === 1, 'échec visible en rouge, groupe replié');
check(await failure.locator('summary').evaluate((s) => getComputedStyle(s).color === getComputedStyle(document.documentElement).getPropertyValue('--red').trim().replace(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i, (_, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`)), 'échec visible en rouge');
await shot(page, '4-groupe-replie-echec.png');

await group.locator(':scope > summary').click();
await page.waitForTimeout(100);
check((await group.locator('details.tool').count()) === 4, 'groupe déplié : 4 lignes');
check((await turn.locator('.tool-failures').count()) === 0, 'déplié : plus de doublon de l’échec');
const extract = group.locator('details.tool').nth(3);
await extract.locator('summary').click();
const pres = await extract.locator('pre').allTextContents();
check(pres.length === 2 && pres[0].includes('"limit": 3') && pres[1].includes('"count": 3'), 'détails : paramètres et résultat en monospace');
check((await extract.locator('pre').first().evaluate((p) => getComputedStyle(p).fontFamily)).match(/mono|Menlo|Courier|SF Mono/i) !== null, 'police monospace');
await shot(page, '5-details-action.png');
await page.emulateMedia({ colorScheme: 'dark' });
await shot(page, '5b-details-action-sombre.png');
await page.emulateMedia({ colorScheme: 'light' });
await group.locator(':scope > summary').click();

for (const t of ['Voici ', 'mon évaluation ', 'en cours de rédaction…'])
  await agent({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: t } });
check((await turn.locator('.activity-text').last().textContent()) === 'Voici mon évaluation en cours de rédaction…', 'texte en flux affiché au fur et à mesure');
check((await status()) === null, 'texte en flux : pas d’indicateur');
await shot(page, '6-texte-en-flux.png');

// Défilement : suit le bas, puis ne force plus après remontée.
const box = page.locator('.scroll-content');
const gap = () => box.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight);
for (let i = 0; i < 40; i++) await agent({ sessionUpdate: 'tool_call', toolCallId: `x${i}`, title: `career_read(path: ligne-${i})`, status: 'completed' });
for (let i = 0; i < 30; i++) await agent({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: `\nParagraphe FICTIF ${i}.` } });
await page.waitForTimeout(150);
check((await gap()) < 80, `défilement automatique : en bas (écart ${await gap()} px)`);
await box.evaluate((el) => el.scrollTo({ top: 0 }));
await page.waitForTimeout(100);
await agent({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '\nSuite FICTIVE.' } });
await page.waitForTimeout(150);
check((await box.evaluate((el) => el.scrollTop)) === 0, 'remonté : le défilement n’est pas forcé');
await box.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
await page.waitForTimeout(100);

await page.getByRole('button', { name: /Stop/ }).click();
await page.waitForTimeout(200);
check(cancelled === 1, 'Stop : POST /runs/:id/cancel envoyé');

state = 'completed';
await push('state', { state: 'completed' });
await page.waitForTimeout(400);
check(await page.getByText('Réponse finale FICTIVE').isVisible(), 'réponse finale visible');
check((await page.getByText('Voici mon évaluation').count()) === 0, 'texte intermédiaire masqué une fois fini');
check((await turn.locator('details[open]').count()) === 0, 'tout le reste replié');
check((await turn.locator('.tool-failures details.tool.failed').count()) === 1, 'échec toujours visible une fois fini');
check((await page.getByRole('button', { name: /Stop/ }).count()) === 0, 'Stop masqué une fois fini');
await page.locator('.agent-turn').scrollIntoViewIfNeeded();
await shot(page, '7-fini.png');
await browser.close();
console.log(log.join('\n'));
