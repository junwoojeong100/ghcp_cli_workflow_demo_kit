// Takes the UI screenshots (what the business team sees as the result).
// Usage: DEMO_LANG=en|ko node ui_shots.js <base_url> <out_prefix> [--after]
const path = require("path");
const { chromium } = require(path.join(__dirname, "render", "node_modules", "playwright-core"));

const [, , baseUrl, outPrefix, ...flags] = process.argv;
const after = flags.includes("--after");
const LANG = (process.env.DEMO_LANG || "en").toLowerCase() === "ko" ? "ko" : "en";
const TXT = {
  en: { locale: "en-US", reason1: "Wrong size", reason2: "Defective product" },
  ko: { locale: "ko-KR", reason1: "사이즈가 맞지 않음", reason2: "상품 불량" },
}[LANG];
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function api(page, method, p, body, headers = {}) {
  return page.evaluate(async ([m, u, b, h]) => {
    const r = await fetch(u, { method: m, headers: { "Content-Type": "application/json", ...h }, body: b ? JSON.stringify(b) : undefined });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  }, [method, p, body || null, headers]);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: TXT.locale });
  const page = await ctx.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#customer option", { state: "attached" });

  // 1) Customer view: a VIP customer (customer 1) requests a refund for a 45-day-old order
  await page.selectOption("#customer", "1");
  await page.waitForSelector("#orders tr");
  await page.click('button[data-order="1001"]');
  await page.waitForSelector("#refund-card:not(.hidden)");
  const reason = await page.$("#refund-card textarea, #refund-card input[type=text]");
  if (reason) await reason.fill(TXT.reason1);
  await page.click("#submit-refund");
  await page.waitForSelector("#result .msg");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outPrefix}-customer.png`, clip: { x: 0, y: 0, width: 1280, height: 780 } });

  // 2) Admin console: does the high-value (₩1,350,000) refund request show up as pending approval?
  if (after) {
    await page.click('button[data-order="1002"]');
    await page.waitForSelector("#refund-card:not(.hidden)");
    const r2 = await page.$("#refund-card textarea, #refund-card input[type=text]");
    if (r2) await r2.fill(TXT.reason2);
    await page.click("#submit-refund");
    await page.waitForSelector("#result .msg");
  }
  await page.click('nav button[data-tab="admin"]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outPrefix}-admin.png`, clip: { x: 0, y: 0, width: 1280, height: 520 } });
  await browser.close();
  console.log("saved", `${outPrefix}-customer.png`, `${outPrefix}-admin.png`);
})().catch((e) => { console.error(e); process.exit(1); });
