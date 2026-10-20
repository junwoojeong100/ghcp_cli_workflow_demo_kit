// English edition: 25-slide deck = static slides + measured data (metrics.json) + hand-written facts (facts.json) + video/still assets
// ASCII-only source: non-ASCII symbols are written as \uXXXX escapes (keeps byte-wise greps for Hangul clean).
process.env.DEMO_LANG = "en";
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const L = require("../lib");
const S = require("./slides_static");
const T = require("./slides_steps");
const { C, FONT, MONO, text, card, pill, iconBadge, title, footer, gateBadge } = L;

const SESS = process.env.DEMO_WORK || path.resolve(__dirname, "..", "..");  // production-source/
const VIDEO = path.join(SESS, "video", "en");
const SHOTS = path.join(SESS, "shots", "en");
// Stills such as the approval-popup capture: production-source/video/en/stills, or the published video/stills at the kit root
const STILLS = [path.join(VIDEO, "stills"), path.join(SESS, "..", "video", "stills")].find((d) => fs.existsSync(d)) || path.join(VIDEO, "stills");
const M = JSON.parse(fs.readFileSync(path.join(__dirname, "metrics.json"), "utf-8"));
const F = JSON.parse(fs.readFileSync(path.join(__dirname, "facts.json"), "utf-8"));
const NOTES_FILE = process.env.DECK_NOTES || path.join(__dirname, "notes.md");
const OUT = process.argv[2] || path.join(__dirname, "deck.pptx");
const withVideo = !process.env.NO_VIDEO;

const fmtMin = (s) => { const t = Math.round(s), m = Math.floor(t / 60), r = t % 60; return m ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`; };
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
  title(s, "PART 2 \u00b7 DEMO RESULTS", "Result screens the business can see for itself");
  const colW = 5.8, gap = 0.5, x0 = 0.6;
  // English labels make the refund form wrap onto two rows, so the customer montage is taller (761 px; see tools/crop_shots.py) and the rows are stacked from the top
  const rows = [
    { head: "Customer screen", sub: "VIP customer Seoyun Han requests a refund on an order placed 45 days ago", w: 1908, h: 761, files: ["deck-before-customer.png", "deck-after-customer.png"],
      caps: [["\u2715 Refund rejected: 30 days have passed", C.RED], ["\u2713 VIP gets 60 days \u2014 accepted once a reason is entered", C.GREEN]] },
    { head: "Admin console", sub: "Refunds over \u20a91,000,000 are accepted as \u2018pending approval\u2019", w: 2048, h: 570, files: ["crop-before-admin.png", "crop-after-admin.png"],
      caps: [["\u2715 High-value refunds also processed without approval", C.RED], ["\u2713 Over \u20a91,000,000 \u2192 pending approval, not refunded yet", C.GREEN]] },
  ];
  let rowY = 1.3;
  rows.forEach((r) => {
    r.y = rowY;
    rowY += 0.42 + colW * (r.h / r.w) + 0.05 + 0.3 + 0.12;
    text(s, r.head, { x: x0, y: r.y, w: 2.2, h: 0.36, fontSize: 18, bold: true, color: C.TEXT, valign: "middle" });
    text(s, r.sub, { x: x0 + 2.3, y: r.y, w: 9.8, h: 0.36, fontSize: 14, color: C.MUTED, valign: "middle" });
    const ih = colW * (r.h / r.w);
    r.files.forEach((f, i) => {
      const x = x0 + i * (colW + gap), y = r.y + 0.42, after = i === 1;
      const p = path.join(SHOTS, f);
      if (fs.existsSync(p)) s.addImage({ path: p, x, y, w: colW, h: ih, altText: `${r.head} ${after ? "after the change (v1.1.0)" : "before the change (v1.0.0)"}: ${r.caps[i][0]}` });
      s.addShape(pptx.ShapeType.roundRect, { x, y, w: colW, h: ih, rectRadius: 0.05, fill: { type: "none" }, line: { color: after ? C.PURPLE : C.LINE, width: after ? 2 : 1.25 } });
      const pw = after ? 1.45 : 1.55;
      pill(pptx, s, x + colW - pw - 0.12, y + 0.05, pw, 0.28, after ? "After \u00b7 v1.1.0" : "Before \u00b7 v1.0.0", { fill: after ? C.PURPLE : "E6EAF0", color: after ? C.WHITE : C.MUTED, size: 12 });
      text(s, r.caps[i][0], { x, y: y + ih + 0.05, w: colW, h: 0.3, fontSize: 15, bold: true, color: r.caps[i][1], valign: "middle" });
    });
  });
  footer(s, n);
  return s;
}

async function guardSlide(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 \u00b7 GUARDRAIL DEMO", "We tried it on an AI that doesn't know the rules", { w: 12.1 });
  text(s, "Demo agent \u2018quick-fixer\u2019 \u2014 deliberately not told the rules or permissions", { x: 0.6, y: 1.26, w: 12.1, h: 0.32, fontSize: 15, color: C.MUTED });
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
  title(s, "PART 3 \u00b7 IMPACT & SAFETY", "Measured result: one session, 6 human interventions");
  const e = F.effects;
  e.stats.forEach((st, i) => {
    const x = 0.6 + (i % 2) * 3.35; const y = 1.7 + Math.floor(i / 2) * 1.95;
    card(pptx, s, x, y, 3.2, 1.75, { fill: C.WHITE, line: C.LINE, shadow: true });
    text(s, st.value, { x: x + 0.25, y: y + 0.12, w: 2.8, h: 0.9, fontSize: 40, bold: true, color: st.color === "amber" ? C.AMBER : C.PURPLE, valign: "middle" });
    text(s, st.label, { x: x + 0.25, y: y + 1.02, w: 2.8, h: 0.65, fontSize: 14, color: C.MUTED });
  });
  // Bar chart of actual time per stage (minutes)
  const labels = M.stages.map((x) => `${x.id} ${x.label}`);
  const values = M.stages.map((x) => Math.round((x.real_s / 60) * 10) / 10);
  text(s, "Actual time per stage (min)", { x: 7.45, y: 1.7, w: 5.25, h: 0.35, fontSize: 16, bold: true });
  s.addChart(pptx.charts.BAR, [{ name: "Actual time (min)", labels, values }], {
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

// Speaker notes: notes.md -> { slideNumber: "paragraph\n\nparagraph..." }
// The text under a "## N" heading is the note for slide N; any intro text before the first heading is ignored. A blank line separates paragraphs.
function loadNotes(file) {
  const notes = {};
  let cur = null;
  const raw = fs.readFileSync(file, "utf-8");
  if (/[\u27e6\u27e7]/.test(raw)) throw new Error(`${file} still contains unresolved \u27e6...\u27e7 placeholders; replace them with measured values`);
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^##\s+(\d+)\s*$/);
    if (m) { cur = Number(m[1]); notes[cur] = []; continue; }
    if (cur !== null) notes[cur].push(line.trim());
  }
  for (const k of Object.keys(notes)) notes[k] = notes[k].join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return notes;
}

// pptxgenjs writes a note as one paragraph (line breaks included), so split it into one <a:p> per line to make paragraphs show up properly in presenter view.
async function splitNoteParagraphs(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const body = /<a:p><a:r><a:rPr lang="en-US" dirty="0"\/><a:t>([\s\S]*?)<\/a:t><\/a:r><a:endParaRPr lang="en-US" dirty="0"\/><\/a:p>/;
  for (const name of Object.keys(zip.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f))) {
    const xml = await zip.file(name).async("string");
    const out = xml.replace(body, (_, t) => t.split(/\r?\n/).map((ln) => ln.trim()
      ? `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${ln.trim()}</a:t></a:r></a:p>`
      : `<a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>`).join(""));
    if (out === xml) throw new Error(`Failed to split note paragraphs: ${name}`);
    zip.file(name, out);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

(async () => {
  const pptx = L.newDeck("GitHub Copilot CLI \u00d7 Custom Agent Demo");
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
  const NOTES = loadNotes(NOTES_FILE);
  const extra = Object.keys(NOTES).filter((k) => Number(k) > pptx.slides.length);
  if (extra.length) throw new Error(`${NOTES_FILE} has notes for slides that do not exist: ${extra.join(", ")}`);
  pptx.slides.forEach((sl, i) => {
    if (!NOTES[i + 1]) throw new Error(`${NOTES_FILE} has no note for slide ${i + 1} ("## ${i + 1}")`);
    sl.addNotes(NOTES[i + 1]);
  });
  await pptx.writeFile({ fileName: OUT });
  await splitNoteParagraphs(OUT);
  console.log("saved", OUT, "slides:", n - 1);
})().catch((e) => { console.error(e); process.exit(1); });
