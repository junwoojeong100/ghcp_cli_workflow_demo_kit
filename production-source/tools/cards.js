// 영상용 타이틀/엔딩 카드를 PNG(1920x1080)로 만든다.
// 사용: node cards.js <out_dir> [metrics.json]
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.join(__dirname, "render", "node_modules", "playwright-core"));

const outDir = process.argv[2];
const metricsPath = process.argv[3];
const M = metricsPath && fs.existsSync(metricsPath) ? JSON.parse(fs.readFileSync(metricsPath, "utf-8")) : null;
fs.mkdirSync(outDir, { recursive: true });

const css = `
  * { box-sizing: border-box; margin: 0; }
  body { width: 1920px; height: 1080px; background: radial-gradient(1200px 700px at 78% 22%, #2a1a52 0%, #0D1117 60%); color: #E6EDF3;
         font-family: "Apple SD Gothic Neo", "Menlo", sans-serif; padding: 120px 140px; position: relative; overflow: hidden; }
  .kicker { color: #A371F7; font-weight: 700; font-size: 34px; letter-spacing: 1px; }
  h1 { font-size: 104px; line-height: 1.12; margin-top: 36px; font-weight: 800; }
  h1 em { font-style: normal; color: #A371F7; }
  .sub { margin-top: 44px; font-size: 42px; color: #C9D1D9; line-height: 1.5; }
  .foot { position: absolute; left: 140px; bottom: 90px; font-size: 30px; color: #8B949E; }
  .pipe { position: absolute; right: 140px; bottom: 100px; display: flex; gap: 28px; align-items: center; }
  .dot { width: 34px; height: 34px; border-radius: 50%; background: #A371F7; }
  .dot.gate { background: #F0B429; box-shadow: 0 0 0 8px rgba(240,180,41,.18); }
  .stats { display: flex; gap: 40px; margin-top: 70px; }
  .stat { background: #161B22; border: 2px solid #30363D; border-radius: 26px; padding: 38px 46px; min-width: 330px; }
  .stat b { display: block; font-size: 84px; color: #A371F7; line-height: 1.1; }
  .stat span { font-size: 32px; color: #C9D1D9; }
  .stat.amber b { color: #F0B429; }
`;

async function shot(browser, name, html) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.setContent(`<html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, name) });
  await page.close();
}

const pipe = `<div class="pipe"><i class="dot"></i><i class="dot gate"></i><i class="dot"></i><i class="dot"></i><i class="dot gate"></i><i class="dot gate"></i><i class="dot"></i></div>`;

(async () => {
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  await shot(browser, "card-title.png", `
    <div class="kicker">GITHUB COPILOT CLI × CUSTOM AGENT · 데모 영상</div>
    <h1>요건에서 배포까지,<br>AI는 일하고<br><em>사람은 결정합니다</em></h1>
    <div class="sub">현업의 변경 요청 한 장을 분석 · 설계 · 구현 · 테스트 · 리뷰 · 배포 · 운영 분석까지<br>역할별 AI 팀원이 처리하고, 사람은 3곳에서만 승인합니다.</div>
    <div class="foot">실제 Copilot CLI 세션 녹화 · 대기 시간만 배속 편집</div>${pipe}`);
  const t = M ? M.total : null;
  const mins = t ? Math.round(t.real_s / 60) : "-";
  await shot(browser, "card-end.png", `
    <div class="kicker">정리</div>
    <h1>AI는 일하고,<br><em>사람은 결정했습니다</em></h1>
    <div class="stats">
      <div class="stat"><b>${mins}분</b><span>요건 → 운영 배포·분석<br>(실제 소요)</span></div>
      <div class="stat amber"><b>3곳</b><span>사람 승인<br>설계 · 코드 · 운영 배포</span></div>
      <div class="stat"><b>${M && M.tests.total ? M.tests.total : "-"}개</b><span>테스트 통과<br>(커버리지 ${M && M.tests.coverage ? M.tests.coverage : "-"}%)</span></div>
      <div class="stat"><b>${t && t.usd ? "$" + t.usd.toFixed(2) : "-"}</b><span>세션 전체 AI 사용량<br>(${t && t.aic ? Math.round(t.aic) : "-"} 크레딧)</span></div>
    </div>
    <div class="foot">GitHub Copilot CLI × Custom Agent · 시나리오: 가상 쇼핑몰 ShopFlow · 변경 요청 CR-2026-014</div>`);
  await browser.close();
  console.log("cards saved to", outDir);
})();
