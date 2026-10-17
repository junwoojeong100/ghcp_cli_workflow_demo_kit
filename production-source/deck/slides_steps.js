// 데모 단계 슬라이드(12~18) 공통 템플릿 + 결과/효과/안전 등 데이터 기반 슬라이드
const fs = require("fs");
const L = require("./lib");
const { C, FONT, MONO, text, card, pill, iconBadge, title, footer, tracker, gateBadge, placeholderBox, nb } = L;

function readB64(p) { return "image/png;base64," + fs.readFileSync(p).toString("base64"); }
const exists = (p) => p && fs.existsSync(p);

// 미디어(클립 또는 이미지) 영역
function media(pptx, slide, cfg, x, y, w, h) {
  if (exists(cfg.clip) && exists(cfg.poster)) {
    slide.addMedia({ type: "video", path: cfg.clip, x, y, w, h, cover: readB64(cfg.poster) });
  } else if (exists(cfg.poster)) {
    slide.addImage({ path: cfg.poster, x, y, w, h, altText: "데모 영상 화면" });
  } else if (exists(cfg.image)) {
    slide.addImage({ path: cfg.image, x, y, w, h, sizing: { type: "contain", w, h }, altText: "데모 화면" });
  } else {
    placeholderBox(pptx, slide, x, y, w, h, "영상 클립 자리 (최종 녹화 후 삽입)");
  }
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.1, fill: { type: "none" }, line: { color: C.LINE_D, width: 1.5 } });
}

// 영상 프레임 비율: 슬라이드용 클립은 상단 헤더를 잘라낸 1880x968 (tools/make_assets.py slideclips)
const ASPECT = 1880 / 968;

async function stepSlide(pptx, n, cfg) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, `STEP ${cfg.step} · ${L.STEPS[cfg.step - 1]}`, cfg.title, { size: 30, w: 12.1, h: 0.6 });
  tracker(pptx, s, cfg.step);

  // 왼쪽: 큰 영상 + 그 아래 "무슨 일이 있었나" / 오른쪽: 에이전트 · 핵심 수치 · 소요/사용량 · 사람의 역할
  const X0 = 0.6, Y0 = 1.35, VW = 8.9, VH = VW / ASPECT;
  const RX = X0 + VW + 0.3, RW = 12.7 - RX, BOTTOM = Y0 + VH + 0.15 + 0.8;
  media(pptx, s, cfg.media || {}, X0, Y0, VW, VH);
  s.addText(cfg.bullets.map((t, k) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: k < cfg.bullets.length - 1 } })),
    { x: X0, y: Y0 + VH + 0.15, w: VW, h: 0.8, fontFace: FONT, fontSize: 14, color: C.TEXT, margin: 0, valign: "top", paraSpaceAfter: 3 });

  pill(pptx, s, RX, Y0, RW, 0.36, cfg.agent, { fill: C.PURPLE, color: C.WHITE, size: 13, mono: true });
  pill(pptx, s, RX, Y0 + 0.44, RW, 0.34, cfg.scope, { fill: C.BG, color: C.MUTED, size: 12, line: C.LINE });
  cfg.facts.forEach((f, i) => {
    const y = Y0 + 1.0 + i * 0.55;
    text(s, f.value, { x: RX, y, w: 0.85, h: 0.54, fontSize: 26, bold: true, color: C.PURPLE, valign: "middle" });
    text(s, nb(f.label), { x: RX + 0.9, y, w: RW - 0.9, h: 0.54, fontSize: 12, color: C.MUTED, valign: "middle" });
  });

  const ty = Y0 + 2.8, th = 1.28;
  card(pptx, s, RX, ty, RW, th, { fill: C.BG, line: null });
  [["실제 소요", cfg.time.real], ["영상 길이", cfg.time.video], ["AI 사용량", null]].forEach(([label, val], i) => {
    const y = ty + 0.1 + i * 0.29;
    text(s, label, { x: RX + 0.16, y, w: 1.0, h: 0.29, fontSize: 11, color: C.MUTED, bold: true, valign: "middle" });
    text(s, val ?? [{ text: String(cfg.aic), options: { fontSize: 15, bold: true, color: C.TEXT } }, { text: " 크레딧", options: { fontSize: 11, color: C.MUTED } }],
      { x: RX + 1.1, y, w: RW - 1.26, h: 0.29, fontSize: 15, bold: true, color: C.TEXT, valign: "middle" });
  });
  text(s, cfg.timeNote || "대기 시간만 배속 편집 · 1 크레딧 = $0.01", { x: RX + 0.16, y: ty + 0.99, w: RW - 0.32, h: 0.24, fontSize: 10.5, color: C.MUTED, valign: "middle" });

  const hy = ty + th + 0.14, hh = BOTTOM - hy;
  if (cfg.human) {
    card(pptx, s, RX, hy, RW, hh, { fill: C.AMBER_L, line: null });
    await gateBadge(pptx, s, RX + 0.14, hy + 0.14, cfg.human.label, { w: 1.75, h: 0.34, size: 11.5 });
    text(s, cfg.human.text, { x: RX + 0.16, y: hy + 0.52, w: RW - 0.32, h: hh - 0.62, fontSize: 12, valign: "middle", color: C.TEXT });
  } else if (cfg.note) {
    card(pptx, s, RX, hy, RW, hh, { fill: C.BG, line: null });
    text(s, cfg.note, { x: RX + 0.16, y: hy, w: RW - 0.32, h: hh, fontSize: 12, valign: "middle", color: C.MUTED });
  }
  footer(s, n);
  return s;
}

module.exports = { stepSlide, media, readB64, exists, ASPECT };
