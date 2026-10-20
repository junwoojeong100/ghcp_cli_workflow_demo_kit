// Shared deck library: colors, fonts, icons, reusable components. Language comes from DEMO_LANG (en | ko); default en.
const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");

const C = {
  INK: "0D1117", PANEL: "161B22", LINE_D: "30363D", WHITE: "FFFFFF",
  TEXT: "1F2328", MUTED: "59636E", FAINT: "8C959F", BG: "F6F8FA", LINE: "D0D7DE",
  PURPLE: "7B3FE4", PURPLE_D: "5A2EB0", PURPLE_L: "F1E9FF", VIOLET: "A371F7",
  BLUE: "0969DA", BLUE_L: "DDF4FF",
  GREEN: "1A7F37", GREEN_L: "DAFBE1",
  AMBER: "9A6700", AMBER_F: "F0B429", AMBER_L: "FFF4CC",
  RED: "CF222E", RED_L: "FFEBE9",
};
const LANG = (process.env.DEMO_LANG || "en").toLowerCase();
const KO = LANG === "ko";
const FONT = KO ? "Apple SD Gothic Neo" : "Arial";
const MONO = process.env.QA_FONTS ? "Menlo" : "Consolas";
const W = 13.333;
const H = 7.5;

const shadow = () => ({ type: "outer", color: "000000", opacity: 0.12, blur: 8, offset: 2, angle: 90 });

const iconCache = new Map();
async function icon(name, color = "#FFFFFF", size = 256) {
  const key = `${name}|${color}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const Comp = fa[name];
  if (!Comp) throw new Error(`unknown icon ${name}`);
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const data = "image/png;base64," + buf.toString("base64");
  iconCache.set(key, data);
  return data;
}

function newDeck(title) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Microsoft Scout";
  pptx.company = "Microsoft";
  pptx.subject = title;
  pptx.title = title;
  pptx.lang = KO ? "ko-KR" : "en-US";
  return pptx;
}

// 텍스트(한 덩어리)
function text(slide, str, o) {
  slide.addText(str, Object.assign({ fontFace: FONT, color: C.TEXT, fontSize: 18, margin: 0, valign: "top" }, o));
}

// 둥근 사각형 카드
function card(pptx, slide, x, y, w, h, o = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: o.radius ?? 0.14,
    fill: { color: o.fill ?? C.WHITE },
    line: o.line === null ? { type: "none" } : { color: o.line ?? C.LINE, width: o.lineW ?? 1 },
    shadow: o.shadow ? shadow() : undefined,
  });
}

// 알약(작은 라벨)
function pill(pptx, slide, x, y, w, h, label, o = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: h / 2,
    fill: { color: o.fill ?? C.PURPLE_L }, line: o.line ? { color: o.line, width: 1 } : { type: "none" },
  });
  text(slide, label, {
    x, y, w, h, align: "center", valign: "middle", fontSize: o.size ?? 12, bold: o.bold ?? true,
    color: o.color ?? C.PURPLE, fontFace: o.mono ? MONO : FONT,
  });
}

// 원형 아이콘 배지
async function iconBadge(pptx, slide, name, x, y, d, fill, iconColor = "#FFFFFF") {
  slide.addShape(pptx.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" } });
  const pad = d * 0.27;
  slide.addImage({ data: await icon(name, iconColor), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad });
}

// 제목 영역: 상단 소제목(kicker) + 메시지형 제목
function title(slide, kicker, str, o = {}) {
  const dark = !!o.dark;
  if (kicker) {
    text(slide, kicker, { x: 0.6, y: 0.36, w: 8, h: 0.3, fontSize: 13, bold: true, color: dark ? C.VIOLET : C.PURPLE, charSpacing: 1 });
  }
  text(slide, str, {
    x: 0.6, y: 0.68, w: o.w ?? 12.1, h: o.h ?? 0.8, fontSize: o.size ?? 32, bold: true,
    color: dark ? C.WHITE : C.TEXT, valign: "top",
  });
}

// 괄호 안의 공백을 줄바꿈 없는 공백(NBSP)으로 바꿔 "(서버 오류 0건)" 같은 묶음이 좁은 칸에서 줄 중간에 끊기지 않게 한다 (표시용, 원문은 그대로)
const nb = (s) => String(s).replace(/\([^)]*\)/g, (m) => m.replace(/ /g, "\u00A0"));

function footer(slide, n, o = {}) {
  const dark = !!o.dark;
  text(slide, "GitHub Copilot CLI × Custom Agent", { x: 0.6, y: 7.08, w: 6, h: 0.25, fontSize: 10, color: dark ? "6E7681" : C.FAINT });
  text(slide, String(n), { x: 12.2, y: 7.08, w: 0.55, h: 0.25, fontSize: 10, color: dark ? "6E7681" : C.FAINT, align: "right" });
  if (o.source) text(slide, o.source, { x: 0.6, y: 6.8, w: 12.1, h: 0.25, fontSize: 10, color: dark ? "6E7681" : C.FAINT });
}

const STEPS = KO ? ["분석", "설계", "구현", "테스트", "리뷰", "배포", "운영"] : ["Analyze", "Design", "Build", "Test", "Review", "Deploy", "Operate"];
// 데모 단계 트래커 (현재 단계 강조)
function tracker(pptx, slide, current, o = {}) {
  const w = 0.92, h = 0.34, gap = 0.08;
  const total = STEPS.length * w + (STEPS.length - 1) * gap;
  let x = (o.right ?? 12.73) - total;
  const y = o.y ?? 0.34;
  STEPS.forEach((s, i) => {
    const n = i + 1;
    const state = n === current ? "cur" : n < current ? "done" : "todo";
    const fill = state === "cur" ? C.PURPLE : state === "done" ? C.PURPLE_L : "EEF1F4";
    const color = state === "cur" ? C.WHITE : state === "done" ? C.PURPLE : C.FAINT;
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: h / 2, fill: { color: fill }, line: { type: "none" } });
    text(slide, `${n} ${s}`, { x, y, w, h, align: "center", valign: "middle", fontSize: 12, bold: true, color });
    x += w + gap;
  });
}

// 사람 승인 배지 (호박색)
async function gateBadge(pptx, slide, x, y, label, o = {}) {
  const w = o.w ?? 2.5, h = o.h ?? 0.46;
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: h / 2, fill: { color: C.AMBER_F }, line: { type: "none" } });
  slide.addImage({ data: await icon("FaUserCheck", "#1F2328"), x: x + 0.16, y: y + (h - 0.24) / 2, w: 0.24, h: 0.24 });
  text(slide, label, { x: x + 0.5, y, w: w - 0.58, h, valign: "middle", fontSize: o.size ?? 14, bold: true, color: C.TEXT });
}

function placeholderBox(pptx, slide, x, y, w, h, label) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: "EEF1F4" }, line: { color: C.LINE, width: 1, dashType: "dash" } });
  text(slide, label, { x, y, w, h, align: "center", valign: "middle", fontSize: 14, color: C.FAINT });
}

module.exports = { LANG, KO, pptxgen, C, FONT, MONO, W, H, shadow, icon, newDeck, text, card, pill, iconBadge, title, footer, tracker, gateBadge, placeholderBox, STEPS, nb };
