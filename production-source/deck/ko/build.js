// Korean edition: 25-slide deck = static slides + measured data (metrics.json) + hand-written facts (facts.json) + video/still assets
process.env.DEMO_LANG = "ko";
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const L = require("../lib");
const S = require("./slides_static");
const T = require("./slides_steps");
const { C, FONT, MONO, text, card, pill, iconBadge, title, footer, gateBadge } = L;

const SESS = process.env.DEMO_WORK || path.resolve(__dirname, "..", "..");  // production-source/
const VIDEO = path.join(SESS, "video", "ko");
const SHOTS = path.join(SESS, "shots", "ko");
// Stills such as the approval-popup capture: production-source/video/ko/stills, or the published ko/video/stills at the kit root
const STILLS = [path.join(VIDEO, "stills"), path.join(SESS, "..", "ko", "video", "stills")].find((d) => fs.existsSync(d)) || path.join(VIDEO, "stills");
const M = JSON.parse(fs.readFileSync(path.join(__dirname, "metrics.json"), "utf-8"));
const F = JSON.parse(fs.readFileSync(path.join(__dirname, "facts.json"), "utf-8"));
const OUT = process.argv[2] || path.join(__dirname, "deck.pptx");
const withVideo = !process.env.NO_VIDEO;

const fmtMin = (s) => { const m = Math.floor(s / 60), r = Math.round(s % 60); return m ? `${m}분 ${String(r).padStart(2, "0")}초` : `${r}초`; };
const aicTxt = (v) => (v == null ? "-" : `${v.toFixed(1)}`);
const tl = fs.existsSync(path.join(VIDEO, "main.mp4.timeline.json")) ? JSON.parse(fs.readFileSync(path.join(VIDEO, "main.mp4.timeline.json"), "utf-8")) : null;
const { execFileSync } = require("child_process");
const videoSec = (id) => {
  const f = path.join(VIDEO, `slide-stage${id}.mp4`);
  if (!fs.existsSync(f)) return null;
  try { return parseFloat(execFileSync(fs.existsSync("/opt/homebrew/bin/ffprobe") ? "/opt/homebrew/bin/ffprobe" : "ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString()); } catch (e) { return null; }
};

function stepCfg(id) {
  const st = M.stages.find((x) => x.id === id);
  const f = F.steps[String(id)];
  const clip = path.join(VIDEO, `slide-stage${id}.mp4`);
  const poster = path.join(VIDEO, `slide-poster-stage${id}.png`);
  const vs = videoSec(id);
  return Object.assign({}, f, {
    step: id, agent: st.agent,
    time: { real: fmtMin(st.real_s), video: vs ? fmtMin(vs) : "-" },
    aic: aicTxt(st.aic),
    media: { clip: withVideo ? clip : null, poster },
  });
}

async function resultSlide(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 · 데모 결과", "현업이 눈으로 확인하는 결과 화면");
  const colW = 5.9, gap = 0.3, x0 = 0.6;
  const rows = [
    { y: 1.45, head: "고객 화면", sub: "VIP 한서윤님이 45일 전 주문의 환불을 요청", w: 1908, h: 670, files: ["deck-before-customer.png", "deck-after-customer.png"],
      caps: [["✕ 30일이 지나 환불 불가로 거절", C.RED], ["✓ VIP는 60일까지 가능 — 사유를 적으면 접수 완료", C.GREEN]] },
    { y: 4.42, head: "관리자 콘솔", sub: "100만원이 넘는 환불은 '승인 대기'로 접수", w: 2048, h: 570, files: ["crop-before-admin.png", "crop-after-admin.png"],
      caps: [["✕ 고액 환불도 승인 없이 바로 처리됨", C.RED], ["✓ 100만원 초과는 승인 대기 — 승인 전 환불 안 됨", C.GREEN]] },
  ];
  rows.forEach((r) => {
    text(s, r.head, { x: x0, y: r.y, w: 1.9, h: 0.36, fontSize: 18, bold: true, color: C.TEXT, valign: "middle" });
    text(s, r.sub, { x: x0 + 1.75, y: r.y, w: 10.3, h: 0.36, fontSize: 14, color: C.MUTED, valign: "middle" });
    const ih = colW * (r.h / r.w);
    r.files.forEach((f, i) => {
      const x = x0 + i * (colW + gap), y = r.y + 0.45, after = i === 1;
      const p = path.join(SHOTS, f);
      if (fs.existsSync(p)) s.addImage({ path: p, x, y, w: colW, h: ih, altText: `${r.head} ${after ? "변경 후(v1.1.0)" : "변경 전(v1.0.0)"} 화면: ${r.caps[i][0]}` });
      s.addShape(pptx.ShapeType.roundRect, { x, y, w: colW, h: ih, rectRadius: 0.05, fill: { type: "none" }, line: { color: after ? C.PURPLE : C.LINE, width: after ? 2 : 1.25 } });
      const pw = after ? 2.35 : 2.05;
      pill(pptx, s, x + colW - pw - 0.12, y + 0.05, pw, 0.28, after ? "After · 변경 후 v1.1.0" : "Before · 변경 전 v1.0.0", { fill: after ? C.PURPLE : "E6EAF0", color: after ? C.WHITE : C.MUTED, size: 12 });
      text(s, r.caps[i][0], { x, y: y + ih + 0.05, w: colW, h: 0.3, fontSize: 15, bold: true, color: r.caps[i][1], valign: "middle" });
    });
  });
  footer(s, n);
  return s;
}

async function guardSlide(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 · 안전장치 시연", "규칙을 모르는 AI에게 시켜 봤습니다", { w: 12.1 });
  text(s, "시연용 에이전트 \u2018quick-fixer\u2019 \u2014 일부러 규칙과 권한을 알려주지 않았습니다", { x: 0.6, y: 1.26, w: 12.1, h: 0.32, fontSize: 15, color: C.MUTED });
  const g = F.guard;
  const clip = path.join(VIDEO, "slide-guard.mp4"); const poster = path.join(VIDEO, "slide-poster-guard.png");
  const VX = 0.6, VY = 1.7, VW = 8.6, VH = VW / T.ASPECT;
  T.media(pptx, s, { clip: withVideo ? clip : null, poster }, VX, VY, VW, VH);
  const cx = VX + VW + 0.3, cw = 12.7 - cx, gap = 0.14, ch = (VH - 2 * gap) / 3;
  g.cases.forEach((c, i) => {
    const y = VY + i * (ch + gap);
    card(pptx, s, cx, y, cw, ch, { fill: C.RED_L, line: null });
    s.addShape(pptx.ShapeType.ellipse, { x: cx + 0.2, y: y + (ch - 0.55) / 2, w: 0.55, h: 0.55, fill: { color: C.RED }, line: { type: "none" } });
    text(s, String(i + 1), { x: cx + 0.2, y: y + (ch - 0.55) / 2, w: 0.55, h: 0.55, align: "center", valign: "middle", fontSize: 18, bold: true, color: C.WHITE });
    text(s, L.nb(c.ask), { x: cx + 0.92, y: y + 0.12, w: cw - 1.06, h: ch / 2 - 0.12, fontSize: 14, color: C.TEXT, valign: "middle" });
    text(s, L.nb(c.result), { x: cx + 0.92, y: y + ch / 2 + 0.02, w: cw - 1.06, h: ch / 2 - 0.14, fontSize: 14, bold: true, color: C.RED, valign: "middle" });
  });
  const by = VY + VH + 0.17;
  card(pptx, s, 0.6, by, 12.1, 0.6, { fill: C.PURPLE_L, line: null });
  text(s, g.message, { x: 0.9, y: by, w: 11.6, h: 0.6, fontSize: 17, bold: true, color: C.PURPLE_D, valign: "middle" });
  footer(s, n);
  return s;
}

async function effectsSlide(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 3 · 효과와 안전", "실측 결과: 한 세션, 사람 개입은 6번");
  const e = F.effects;
  e.stats.forEach((st, i) => {
    const x = 0.6 + (i % 2) * 3.35; const y = 1.7 + Math.floor(i / 2) * 1.95;
    card(pptx, s, x, y, 3.2, 1.75, { fill: C.WHITE, line: C.LINE, shadow: true });
    text(s, st.value, { x: x + 0.25, y: y + 0.12, w: 2.8, h: 0.9, fontSize: 40, bold: true, color: st.color === "amber" ? C.AMBER : C.PURPLE, valign: "middle" });
    text(s, st.label, { x: x + 0.25, y: y + 1.02, w: 2.8, h: 0.65, fontSize: 14, color: C.MUTED });
  });
  // 단계별 실제 소요(분) 막대 차트
  const labels = M.stages.map((x) => `${x.id} ${x.label}`);
  const values = M.stages.map((x) => Math.round((x.real_s / 60) * 10) / 10);
  text(s, "단계별 실제 소요 시간 (분)", { x: 7.45, y: 1.7, w: 5.25, h: 0.35, fontSize: 16, bold: true });
  s.addChart(pptx.charts.BAR, [{ name: "실제 소요(분)", labels, values }], {
    x: 7.35, y: 2.05, w: 5.4, h: 3.75, barDir: "bar", chartColors: [C.PURPLE], catAxisOrientation: "maxMin",
    showValue: true, dataLabelFontSize: 13, dataLabelFontFace: FONT, dataLabelColor: C.TEXT, dataLabelFormatCode: '0.0',
    catAxisLabelFontSize: 14, catAxisLabelFontFace: FONT, catAxisLabelColor: C.TEXT, valAxisHidden: true, valGridLine: { style: "none" },
    catGridLine: { style: "none" }, showLegend: false, barGapWidthPct: 45,
  });
  card(pptx, s, 0.6, 5.7, 6.55, 1.0, { fill: C.AMBER_L, line: null });
  text(s, e.note, { x: 0.85, y: 5.7, w: 6.1, h: 1.0, fontSize: 14, color: C.TEXT, valign: "middle" });
  card(pptx, s, 7.35, 5.9, 5.4, 0.8, { fill: C.BG, line: null });
  text(s, e.caveat, { x: 7.55, y: 5.9, w: 5.05, h: 0.8, fontSize: 12.5, color: C.MUTED, valign: "middle" });
  footer(s, n);
  return s;
}

// 발표자 노트: deck/notes.md → { 슬라이드번호: "문단\n\n문단…" }
// "## N" 제목 아래의 글이 N번 슬라이드의 노트이고, 첫 제목 앞의 안내문은 무시한다. 빈 줄은 문단 나눔.
function loadNotes(file) {
  const notes = {};
  let cur = null;
  for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^##\s+(\d+)\s*$/);
    if (m) { cur = Number(m[1]); notes[cur] = []; continue; }
    if (cur !== null) notes[cur].push(line.trim());
  }
  for (const k of Object.keys(notes)) notes[k] = notes[k].join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return notes;
}

// pptxgenjs 는 노트를 한 문단(줄바꿈 문자 포함)으로 써서, 발표자 보기에서 문단이 확실히 나뉘도록 줄마다 <a:p> 로 바꾼다.
async function splitNoteParagraphs(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const body = /<a:p><a:r><a:rPr lang="en-US" dirty="0"\/><a:t>([\s\S]*?)<\/a:t><\/a:r><a:endParaRPr lang="en-US" dirty="0"\/><\/a:p>/;
  for (const name of Object.keys(zip.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f))) {
    const xml = await zip.file(name).async("string");
    const out = xml.replace(body, (_, t) => t.split(/\r?\n/).map((ln) => ln.trim()
      ? `<a:p><a:r><a:rPr lang="ko-KR" dirty="0"/><a:t>${ln.trim()}</a:t></a:r></a:p>`
      : `<a:p><a:endParaRPr lang="ko-KR" dirty="0"/></a:p>`).join(""));
    if (out === xml) throw new Error(`노트 문단 분리 실패: ${name}`);
    zip.file(name, out);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

(async () => {
  const pptx = L.newDeck("GitHub Copilot CLI × Custom Agent 데모");
  let n = 1;
  await S.cover(pptx, n++, F.cover);
  await S.keyMessages(pptx, n++);
  await S.evolution(pptx, n++);
  await S.features(pptx, n++);
  await S.surfaces(pptx, n++);
  await S.cliIntro(pptx, n++);
  await S.customAgent(pptx, n++);
  await S.scenario(pptx, n++);
  await S.workflow(pptx, n++);
  await S.team(pptx, n++);
  await S.gates(pptx, n++, { dialogImage: path.join(STILLS, "gate-prod-1.png") });
  for (let id = 1; id <= 7; id++) await T.stepSlide(pptx, n++, stepCfg(id));
  await resultSlide(pptx, n++);
  await guardSlide(pptx, n++);
  await effectsSlide(pptx, n++);
  await S.safety(pptx, n++, F.safety);
  await S.values(pptx, n++);
  await S.roadmap(pptx, n++);
  await S.closing(pptx, n++);
  const NOTES = loadNotes(path.join(__dirname, "notes.md"));
  const extra = Object.keys(NOTES).filter((k) => Number(k) > pptx.slides.length);
  if (extra.length) throw new Error(`deck/notes.md 에 없는 슬라이드의 노트가 있습니다: ${extra.join(", ")}`);
  pptx.slides.forEach((sl, i) => {
    if (!NOTES[i + 1]) throw new Error(`deck/notes.md 에 ${i + 1}번 슬라이드 노트("## ${i + 1}")가 없습니다`);
    sl.addNotes(NOTES[i + 1]);
  });
  await pptx.writeFile({ fileName: OUT });
  await splitNoteParagraphs(OUT);
  console.log("saved", OUT, "slides:", n - 1);
})().catch((e) => { console.error(e); process.exit(1); });
