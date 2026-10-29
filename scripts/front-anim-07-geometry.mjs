import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createApp } from "../../agregat-back/apps/api/server.js";

process.env.AGENT_PLATFORM_NETWORK = "0";
process.env.AGENT_PLATFORM_BROWSER = "fixture";
const front = resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(join(front, "package.json"));
const { chromium } = require("playwright-core");
const dataDir = mkdtempSync(join(tmpdir(), "front-anim-07-"));
const app = createApp({ dataDir, live: false, webDir: join(front, "dist") });
let browser;
try {
  const long = `fetchedAt: 2026-10-28T03:51:06.949Z, title: Software Engineer, url: https://example.invalid/remote-jobs/${"x".repeat(5000)}`;
  const id = crypto.randomUUID();
  app.store.create({
    id,
    prompt: "Mission FICTIVE : largeur de la ligne d’outil",
    state: "completed",
    mode: "agent",
    agent: "fixture",
    pack: "career-ops",
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
        description: "FICTIF",
        lines: [],
      },
    },
    result: { simulated: true, summary: "Résultat FICTIF", evidence: [] },
  });
  app.store.event(id, "agent", {
    sessionUpdate: "tool_call",
    toolCallId: "career-offer-save",
    title: "career_offer_save",
    status: "completed",
    rawInput: {
      fetchedAt: "2026-10-28T03:51:06.949Z",
      title: "Software Engineer",
      url: `https://example.invalid/remote-jobs/${"x".repeat(5000)}`,
    },
    rawOutput: "Résultat FICTIF",
  });
  app.store.event(id, "agent", {
    sessionUpdate: "tool_call",
    toolCallId: "second-tool",
    title: "second_tool",
    status: "completed",
    rawInput: { value: "FICTIF" },
    rawOutput: "FICTIF",
  });
  await new Promise((resolveListen, reject) =>
    app.server.listen(4321, "127.0.0.1", (error) =>
      error ? reject(error) : resolveListen(),
    ),
  );
  browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  for (const viewport of [
    { width: 1550, height: 810 },
    { width: 375, height: 812 },
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    await page.goto("http://127.0.0.1:4321");
    await page.locator(".app[data-ready=true]").waitFor();
    const showSide = page.getByRole("button", {
      name: "Afficher la barre latérale",
    });
    if (await showSide.count()) await showSide.click();
    const refresh = page.getByRole("button", {
      name: "Actualiser les missions",
    });
    if (await refresh.count()) await refresh.click();
    await page.locator(".mission-link").first().click();
    await page.locator(".career-thread .fold.tool-group").first().waitFor();
    await page.locator(".activity-tools > .fold.tool-group > summary").click();
    const inspect = async () =>
      page.evaluate(() => {
        const selectors = [
          ".thread",
          ".career-thread",
          ".agent-turn",
          ".activity",
          ".activity-tools",
          ".activity-tools > .fold.tool-group",
          ".activity-tools > .fold.tool-group > ol",
          ".activity-tools > .fold.tool-group > ol > li",
          ".activity-tools > .fold.tool-group > ol > li > .fold.tool",
          ".activity-tools > .fold.tool-group > ol > li > .fold.tool > summary",
          ".main",
          ".scroll-content",
          "html",
          "body",
        ];
        const boxes = Object.fromEntries(
          selectors.map((selector) => {
            const el = document.querySelector(selector);
            return [
              selector,
              el
                ? {
                    clientWidth: el.clientWidth,
                    scrollWidth: el.scrollWidth,
                    scrollLeft: el.scrollLeft,
                    overflowX: getComputedStyle(el).overflowX,
                  }
                : null,
            ];
          }),
        );
        const overflowing = Array.from(document.querySelectorAll(".thread *"))
          .filter(
            (el) =>
              getComputedStyle(el).overflowX === "visible" &&
              el.scrollWidth > el.clientWidth + 1,
          )
          .map((el) => ({
            tag: el.tagName,
            className: el.className,
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
          }));
        const summary = document.querySelector(
          ".activity-tools > .fold.tool-group > ol > li > .fold.tool > summary .tool-summary",
        );
        const details = document.querySelector(
          ".activity-tools > .fold.tool-group > ol > li > .fold.tool .tool-details pre",
        );
        return {
          boxes,
          overflowing,
          ellipsis: summary && {
            clientWidth: summary.clientWidth,
            scrollWidth: summary.scrollWidth,
            textOverflow: getComputedStyle(summary).textOverflow,
            whiteSpace: getComputedStyle(summary).whiteSpace,
            overflowX: getComputedStyle(summary).overflowX,
          },
          detailsWrap: details && getComputedStyle(details).overflowWrap,
          documentLeft: document.scrollingElement.scrollLeft,
        };
      });
    const collapsed = await inspect();
    console.log(JSON.stringify({ viewport, state: "collapsed", ...collapsed }));
    for (const selector of [
      ".thread",
      ".career-thread",
      ".agent-turn",
      ".activity",
      ".activity-tools",
      ".activity-tools > .fold.tool-group",
      ".activity-tools > .fold.tool-group > ol",
      ".activity-tools > .fold.tool-group > ol > li",
      ".activity-tools > .fold.tool-group > ol > li > .fold.tool",
      ".activity-tools > .fold.tool-group > ol > li > .fold.tool > summary",
    ]) {
      const box = collapsed.boxes[selector];
      assert.ok(box, `missing ${selector}`);
      assert.ok(
        box.scrollWidth <= box.clientWidth + 1,
        `${selector}: ${JSON.stringify(box)}`,
      );
    }
    assert.deepEqual(collapsed.overflowing, []);
    assert.equal(collapsed.documentLeft, 0);
    assert.equal(collapsed.ellipsis.textOverflow, "ellipsis");
    assert.equal(collapsed.ellipsis.whiteSpace, "nowrap");
    assert.equal(collapsed.ellipsis.overflowX, "hidden");
    assert.ok(collapsed.ellipsis.scrollWidth > collapsed.ellipsis.clientWidth);
    await page
      .locator(
        ".activity-tools > .fold.tool-group > ol > li > .fold.tool > summary",
      )
      .first()
      .click();
    const expanded = await inspect();
    console.log(JSON.stringify({ viewport, state: "expanded", ...expanded }));
    for (const selector of [
      ".thread",
      ".career-thread",
      ".agent-turn",
      ".activity",
      ".activity-tools",
      ".activity-tools > .fold.tool-group",
      ".activity-tools > .fold.tool-group > ol",
      ".activity-tools > .fold.tool-group > ol > li",
      ".activity-tools > .fold.tool-group > ol > li > .fold.tool",
      ".activity-tools > .fold.tool-group > ol > li > .fold.tool > summary",
    ]) {
      const box = expanded.boxes[selector];
      assert.ok(
        box.scrollWidth <= box.clientWidth + 1,
        `${selector}: ${JSON.stringify(box)}`,
      );
    }
    assert.deepEqual(expanded.overflowing, []);
    assert.equal(expanded.detailsWrap, "anywhere");
    assert.equal(expanded.documentLeft, 0);
    await page.close();
  }
} finally {
  await browser?.close();
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
}
