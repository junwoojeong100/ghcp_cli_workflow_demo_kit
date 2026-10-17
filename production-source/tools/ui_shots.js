// UI 스크린샷(현업이 눈으로 확인하는 결과)을 찍는다.
// 사용: node ui_shots.js <base_url> <out_prefix> [--after]
const path = require("path");
const { chromium } = require(path.join(__dirname, "render", "node_modules", "playwright-core"));

const [, , baseUrl, outPrefix, ...flags] = process.argv;
const after = flags.includes("--after");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function api(page, method, p, body, headers = {}) {
  return page.evaluate(async ([m, u, b, h]) => {
    const r = await fetch(u, { method: m, headers: { "Content-Type": "application/json", ...h }, body: b ? JSON.stringify(b) : undefined });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  }, [method, p, body || null, headers]);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: "ko-KR" });
  const page = await ctx.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#customer option", { state: "attached" });

  // 1) 고객 화면: VIP 고객(한서윤)의 45일 경과 주문 환불 요청
  await page.selectOption("#customer", "1");
  await page.waitForSelector("#orders tr");
  await page.click('button[data-order="1001"]');
  await page.waitForSelector("#refund-card:not(.hidden)");
  const reason = await page.$("#refund-card textarea, #refund-card input[type=text]");
  if (reason) await reason.fill("사이즈가 맞지 않음");
  await page.click("#submit-refund");
  await page.waitForSelector("#result .msg");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outPrefix}-customer.png`, clip: { x: 0, y: 0, width: 1280, height: 780 } });

  // 2) 관리자 콘솔: 고액(135만원) 환불 요청이 승인 대기에 보이는가
  if (after) {
    await page.click('button[data-order="1002"]');
    await page.waitForSelector("#refund-card:not(.hidden)");
    const r2 = await page.$("#refund-card textarea, #refund-card input[type=text]");
    if (r2) await r2.fill("상품 불량");
    await page.click("#submit-refund");
    await page.waitForSelector("#result .msg");
  }
  await page.click('nav button[data-tab="admin"]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outPrefix}-admin.png`, clip: { x: 0, y: 0, width: 1280, height: 520 } });
  await browser.close();
  console.log("saved", `${outPrefix}-customer.png`, `${outPrefix}-admin.png`);
})().catch((e) => { console.error(e); process.exit(1); });
