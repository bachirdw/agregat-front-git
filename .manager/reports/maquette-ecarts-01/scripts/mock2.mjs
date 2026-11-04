import { createRequire } from "node:module"; import { writeFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const OUT = process.argv[2]; const styles = {};
const b = await chromium.launch();
for (const theme of ["light", "dark"]) {
  const p = await b.newPage({ viewport: { width: 1550, height: 960 } });
  await p.goto("file:///home/user/agregat-front-git/design/conversation-agent.html");
  await p.waitForSelector("[data-theme]"); 
  await p.evaluate((t) => document.querySelector("[data-screen-label]").setAttribute("data-theme", t), theme);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/mock-${theme}-1-fil-encours.png` });
  await p.waitForTimeout(16000);
  await p.evaluate((t) => document.querySelector("[data-screen-label]").setAttribute("data-theme", t), theme);
  await p.screenshot({ path: `${OUT}/mock-${theme}-1-fil-fin.png` });
  const btns = p.locator("button[aria-expanded]");
  await btns.nth(0).click(); await p.waitForTimeout(300);
  await p.locator("button[title='Voir la commande et sa sortie']").nth(2).click(); await p.waitForTimeout(300);
  await p.getByText("0,00 € · détails").click(); await p.waitForTimeout(300);
  await p.evaluate(() => { const s = document.querySelector("[data-screen-label] > div:nth-child(2)"); s.scrollTop = 0; });
  await p.evaluate((t) => document.querySelector("[data-screen-label]").setAttribute("data-theme", t), theme);
  await p.screenshot({ path: `${OUT}/mock-${theme}-1-fil-deplie.png` });
  styles[theme] = await p.evaluate(() => {
    const g = (e) => { if (!e) return "ABSENT"; const c = getComputedStyle(e), r = e.getBoundingClientRect();
      return Object.fromEntries([["rect", [r.x,r.y,r.width,r.height].map(Math.round).join(",")], ...["font-size","font-weight","line-height","letter-spacing","color","background-color","background-image","border-radius","padding","gap","box-shadow","max-width","animation","transition","backdrop-filter"].map(k=>[k,c.getPropertyValue(k)])]); };
    const root = document.querySelector("[data-screen-label]");
    const bubble = [...root.querySelectorAll("div")].find(d => d.style.alignSelf === "flex-end");
    return { header: g(root.querySelector("header")), bubble: g(bubble), agentP: g(root.querySelector("p")),
      activity: g(root.querySelector("button[aria-expanded]")), step: g(root.querySelector("button[title='Voir la commande et sa sortie']")),
      code: g(root.querySelector("pre")?.parentElement?.parentElement), badge: g([...root.querySelectorAll("span")].find(s => s.textContent === "Échec")),
      resume: g([...root.querySelectorAll("button")].find(s => s.textContent === "Reprendre")), dl: g(root.querySelector("dl")),
      form: g(root.querySelector("form")), textarea: g(root.querySelector("textarea")), send: g(root.querySelector("button[type=submit]")),
      column: g(root.querySelector("[data-screen-label] > div:nth-child(2) > div")), turn: g(root.querySelector("[data-screen-label] > div:nth-child(2) > div > div")) };
  });
  await p.close();
}
writeFileSync(`${OUT}/mock-styles.json`, JSON.stringify(styles, null, 1)); await b.close();
