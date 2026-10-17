#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FFmpeg = '/opt/homebrew/bin/ffmpeg';
const FFprobe = '/opt/homebrew/bin/ffprobe';
const Chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEFAULT_STAGES = [
  { id: 1, label: '분석' },
  { id: 2, label: '설계' },
  { id: 3, label: '구현' },
  { id: 4, label: '테스트' },
  { id: 5, label: '리뷰' },
  { id: 6, label: '배포' },
  { id: 7, label: '운영' },
];
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const DEFAULT_MAX_FPS_CAPTURE = 12;
const FAST_MAX_FPS_CAPTURE = 6;
const DEFAULT_WORKERS = 3;
const PROGRESS_INTERVAL_MS = 3000;
const CUT_DURATION = 0.3;
const IMAGE_FADE = 0.3;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const [key, inline] = token.split('=', 2);
    if (inline !== undefined) {
      args[key.slice(2)] = inline;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key.slice(2)] = true;
    } else {
      args[key.slice(2)] = next;
      i++;
    }
  }
  return args;
}

function boolArg(value, fallback = true) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

function numArg(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampInt(value, min, max, fallback) {
  const parsed = Math.trunc(numArg(value, fallback));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function loadCast(castPath) {
  const lines = fs.readFileSync(castPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const header = JSON.parse(lines[0]);
  const events = [];
  const markers = [];
  for (let i = 1; i < lines.length; i++) {
    const [t, type, data] = JSON.parse(lines[i]);
    const event = { index: i - 1, t, type, data, marker: null };
    if (type === 'm') {
      try {
        event.marker = JSON.parse(data);
      } catch {
        event.marker = { invalid: true, raw: data };
      }
      markers.push(event);
    }
    events.push(event);
  }
  return { header, events, markers };
}

function inferWindowTitle(castPath) {
  const base = path.basename(castPath, path.extname(castPath));
  return `copilot — ${base}`;
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function initialOverlayState() {
  return {
    stages: cloneState(DEFAULT_STAGES),
    currentStageId: DEFAULT_STAGES[0].id,
    currentAgent: '',
    caption: '',
    gate: null,
    speed: 1,
    badgeText: '',
    cut: false,
    images: null,
  };
}

function upsertStage(stages, marker) {
  if (marker.id === undefined) return stages;
  const next = stages.map((stage) => ({ ...stage }));
  const idx = next.findIndex((stage) => stage.id === marker.id);
  if (idx >= 0) {
    if (marker.label) next[idx].label = marker.label;
    return next;
  }
  next.push({ id: marker.id, label: marker.label || `Stage ${marker.id}` });
  return next;
}

function normalizeImageItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, 2)
    .map((item) => ({ src: path.resolve(String(item?.src || '')), label: String(item?.label || '') }))
    .filter((item) => item.src && fs.existsSync(item.src));
}

function normalizeImagesMarker(marker) {
  const items = normalizeImageItems(marker?.items);
  if (!items.length) return null;
  return {
    items,
    caption: marker.caption !== undefined ? String(marker.caption || '') : null,
    sec: Math.max(0, Number(marker.sec) || 0),
    fit: marker.fit === 'content' ? 'content' : null,
  };
}

function applyMarker(state, marker, allowTransient = true) {
  if (!marker || typeof marker !== 'object') return;
  switch (marker.k) {
    case 'stages_def':
      if (Array.isArray(marker.stages) && marker.stages.length) {
        state.stages = marker.stages.map((stage) => ({ ...stage }));
        if (!state.stages.some((stage) => stage.id === state.currentStageId)) {
          state.currentStageId = state.stages[0]?.id ?? null;
        }
      }
      break;
    case 'stage':
      state.stages = upsertStage(state.stages, marker);
      if (marker.id !== undefined) state.currentStageId = marker.id;
      if (marker.agent !== undefined) state.currentAgent = marker.agent || '';
      break;
    case 'caption':
      state.caption = marker.text !== undefined ? String(marker.text || '') : '';
      break;
    case 'gate':
      state.gate = { label: String(marker.label || ''), text: String(marker.text || ''), tone: marker.tone === 'danger' ? 'danger' : 'default' };
      break;
    case 'gate_end':
      state.gate = null;
      break;
    case 'speed': {
      const speed = Number(marker.x);
      if (speed > 0) state.speed = speed;
      break;
    }
    case 'badge':
      state.badgeText = String(marker.text || '');
      break;
    case 'cut':
      if (allowTransient) state.cut = true;
      break;
    case 'images':
      if (allowTransient) state.images = normalizeImagesMarker(marker);
      break;
    default:
      break;
  }
}

function initialStateBefore(markers, startReal) {
  const state = initialOverlayState();
  for (const event of markers) {
    if (event.t > startReal) break;
    applyMarker(state, event.marker, false);
  }
  state.cut = false;
  state.images = null;
  return state;
}

function buildMapping(markers, endReal, startReal = 0) {
  const initial = initialStateBefore(markers, startReal);
  let speed = initial.speed || 1;
  let cursorReal = startReal;
  let cursorVideo = 0;
  const segments = [];
  const markerTimes = new Map();
  const relevant = markers.filter((event) => event.t >= startReal && event.t <= endReal + 1e-9);

  const pushPlay = (toReal) => {
    if (toReal <= cursorReal) return;
    const duration = (toReal - cursorReal) / speed;
    segments.push({ kind: 'play', realStart: cursorReal, realEnd: toReal, videoStart: cursorVideo, videoEnd: cursorVideo + duration, speed });
    cursorVideo += duration;
    cursorReal = toReal;
  };
  const pushStill = (kind, sec, extra = {}) => {
    if (!(sec > 0)) return;
    segments.push({ kind, realStart: cursorReal, realEnd: cursorReal, videoStart: cursorVideo, videoEnd: cursorVideo + sec, speed, holdAt: cursorReal, ...extra });
    cursorVideo += sec;
  };

  for (const event of relevant) {
    pushPlay(event.t);
    markerTimes.set(event.index, cursorVideo);
    const marker = event.marker || {};
    if (marker.k === 'hold') pushStill('hold', Math.max(0, Number(marker.sec) || 0));
    if (marker.k === 'cut') pushStill('cut', CUT_DURATION);
    if (marker.k === 'images') {
      const images = normalizeImagesMarker(marker);
      if (images?.sec > 0) pushStill('images', images.sec, { images });
    }
    if (marker.k === 'speed' && Number(marker.x) > 0) speed = Number(marker.x);
  }
  pushPlay(endReal);
  return { segments, totalVideo: cursorVideo, markerTimes, initialState: initial };
}

function realToVideo(real, mapping) {
  for (const segment of mapping.segments) {
    if (segment.kind === 'play' && real >= segment.realStart && real <= segment.realEnd + 1e-9) {
      return segment.videoStart + (real - segment.realStart) / segment.speed;
    }
    if (segment.kind !== 'play' && real === segment.realStart) return segment.videoStart;
  }
  return mapping.totalVideo;
}

function getStateAt(markers, real, startReal = 0) {
  const state = initialStateBefore(markers, startReal);
  for (const event of markers) {
    if (event.t > real) break;
    applyMarker(state, event.marker, false);
  }
  state.cut = false;
  state.images = null;
  return state;
}

function buildTimeline(markers, mapping, endReal, startReal = 0) {
  let stages = cloneState(DEFAULT_STAGES);
  for (const event of markers) {
    if (event.t > endReal) break;
    if (event.marker?.k === 'stages_def' && Array.isArray(event.marker.stages)) stages = event.marker.stages.map((stage) => ({ ...stage }));
    if (event.marker?.k === 'stage') stages = upsertStage(stages, event.marker);
  }
  const stageEvents = markers.filter((event) => event.marker?.k === 'stage' && event.t >= startReal && event.t <= endReal);
  if (!stageEvents.length) return [];
  return stageEvents.map((event, idx) => {
    const next = stageEvents[idx + 1];
    const realStart = event.t;
    const realEnd = next ? next.t : endReal;
    return {
      id: event.marker.id,
      label: event.marker.label || stages.find((stage) => stage.id === event.marker.id)?.label || `Stage ${event.marker.id}`,
      agent: event.marker.agent || '',
      realStart,
      realEnd,
      videoStart: realToVideo(realStart, mapping),
      videoEnd: realToVideo(realEnd, mapping),
    };
  });
}

function markerMatches(marker, ref) {
  const [kind, ...rest] = String(ref).split(':');
  const value = rest.join(':');
  if (marker.k !== kind) return false;
  if (!value) return true;
  const candidates = [marker.label, marker.id, marker.text].filter((item) => item !== undefined && item !== null).map(String);
  return candidates.some((candidate) => candidate === value || candidate.includes(value));
}

function resolveMarkerRef(markers, ref) {
  return markers.find((event) => event.marker && markerMatches(event.marker, ref));
}

function resolveStillPoint(spec, markers, endReal, timeline) {
  if (spec === 'end') return endReal;
  if (typeof spec === 'number') return spec;
  if (/^\d+(\.\d+)?$/.test(String(spec))) return Number(spec);
  if (/^mark:?\d+$/i.test(String(spec))) {
    const idx = Number(String(spec).replace(/\D+/g, ''));
    const event = markers[idx];
    if (!event) throw new Error(`mark ${idx} not found`);
    return event.t;
  }
  const matched = resolveMarkerRef(markers, spec);
  if (matched) return matched.t;
  if (/^stage-end:\d+$/i.test(String(spec))) {
    const id = Number(String(spec).split(':').at(-1));
    const stage = timeline.find((entry) => Number(entry.id) === id);
    if (!stage) throw new Error(`stage ${id} not found`);
    return stage.realEnd;
  }
  throw new Error(`unsupported still spec: ${spec}`);
}

function printMarks(markers, mapping) {
  markers.forEach((event, idx) => {
    const video = mapping.markerTimes.get(event.index) ?? realToVideo(event.t, mapping);
    console.log(`${idx}\treal=${event.t.toFixed(3)}\tvideo=${video.toFixed(3)}\t${JSON.stringify(event.marker)}`);
  });
}

function printStages(timeline) {
  timeline.forEach((stage) => {
    console.log(`${stage.id}\t${stage.label}\treal=${stage.realStart.toFixed(3)}..${stage.realEnd.toFixed(3)}\tvideo=${stage.videoStart.toFixed(3)}..${stage.videoEnd.toFixed(3)}\tagent=${stage.agent || '-'}`);
  });
}

function makeOverlay(state, extra = {}) {
  return cloneState({ ...state, ...extra });
}

function buildFramePlan(events, markers, mapping, startReal, endReal, maxFps = DEFAULT_MAX_FPS_CAPTURE, fastMaxFps = FAST_MAX_FPS_CAPTURE) {
  const startState = initialStateBefore(markers, startReal);
  const candidates = [{ videoTime: 0, eventIndex: -1, overlay: cloneState(startState), type: 'start', force: true }];
  let state = cloneState(startState);

  for (const event of events) {
    if (event.t < startReal || event.t > endReal) continue;
    if (event.type === 'm') {
      const markerVideo = mapping.markerTimes.get(event.index) ?? realToVideo(event.t, mapping);
      const marker = event.marker || {};
      if (marker.k === 'images') {
        const images = normalizeImagesMarker(marker);
        if (images?.sec > 0) {
          candidates.push({ videoTime: markerVideo, eventIndex: event.index, overlay: makeOverlay(state, { images }), type: 'images-start', force: true });
          if (images.sec > IMAGE_FADE * 2) {
            candidates.push({ videoTime: markerVideo + IMAGE_FADE, eventIndex: event.index, overlay: makeOverlay(state, { images }), type: 'images-steady', force: false });
          }
          const endVideo = markerVideo + images.sec;
          if (images.sec > IMAGE_FADE * 2) {
            candidates.push({ videoTime: Math.max(markerVideo, endVideo - IMAGE_FADE), eventIndex: event.index, overlay: makeOverlay(state, { images }), type: 'images-fade-out', force: false });
          }
          candidates.push({ videoTime: endVideo, eventIndex: event.index, overlay: cloneState(state), type: 'images-end', force: true });
        }
        continue;
      }
      applyMarker(state, marker, false);
      candidates.push({ videoTime: markerVideo, eventIndex: event.index, overlay: cloneState(state), type: `marker:${marker.k || 'unknown'}`, force: marker.k !== 'speed' && marker.k !== 'badge' && marker.k !== 'caption' ? true : false });
      if (marker.k === 'cut') {
        const cutOn = cloneState(state);
        cutOn.cut = true;
        const cutOff = cloneState(state);
        cutOff.cut = false;
        candidates.push({ videoTime: markerVideo, eventIndex: event.index, overlay: cutOn, type: 'cut-on', force: true });
        candidates.push({ videoTime: markerVideo + CUT_DURATION, eventIndex: event.index, overlay: cutOff, type: 'cut-off', force: true });
      }
      continue;
    }
    if (event.type === 'o') {
      candidates.push({ videoTime: realToVideo(event.t, mapping), eventIndex: event.index, overlay: cloneState(state), type: 'output', force: false });
    }
  }

  const endState = getStateAt(markers, endReal, startReal);
  candidates.push({ videoTime: mapping.totalVideo, eventIndex: events.filter((event) => event.t <= endReal).slice(-1)[0]?.index ?? -1, overlay: endState, type: 'end', force: true });
  candidates.sort((a, b) => a.videoTime - b.videoTime || a.eventIndex - b.eventIndex || Number(a.force) - Number(b.force));

  const collapsed = [];
  for (const candidate of candidates) {
    const prev = collapsed.at(-1);
    const sameMoment = prev && Math.abs(prev.videoTime - candidate.videoTime) < 1e-9;
    if (!sameMoment) {
      collapsed.push(candidate);
      continue;
    }
    collapsed[collapsed.length - 1] = {
      ...candidate,
      force: prev.force || candidate.force,
      eventIndex: Math.max(prev.eventIndex, candidate.eventIndex),
    };
  }

  const frames = [];
  let pending = null;
  let pendingBucket = -1;
  const flush = () => {
    if (!pending) return;
    const prev = frames.at(-1);
    const sameVisual = prev
      && prev.eventIndex === pending.eventIndex
      && prev.overlayHash === pending.overlayHash
      && Math.abs(prev.videoTime - pending.videoTime) < 1e-9;
    if (!sameVisual) frames.push(pending);
    pending = null;
  };

  for (const candidate of collapsed) {
    const overlayHash = JSON.stringify(candidate.overlay);
    const speed = candidate.overlay.speed || 1;
    const effectiveFps = speed > 4 ? Math.min(maxFps, fastMaxFps) : maxFps;
    const interval = 1 / Math.max(1, effectiveFps);
    const bucket = Math.floor(candidate.videoTime / interval + 1e-9);
    const frame = { ...candidate, overlayHash };
    if (candidate.force) {
      flush();
      frames.push(frame);
      pendingBucket = -1;
      continue;
    }
    if (!pending) {
      pending = frame;
      pendingBucket = bucket;
      continue;
    }
    if (bucket === pendingBucket) {
      pending = frame;
      continue;
    }
    flush();
    pending = frame;
    pendingBucket = bucket;
  }
  flush();

  return frames.filter((frame, idx, arr) => {
    if (idx === 0) return true;
    const prev = arr[idx - 1];
    return frame.videoTime > prev.videoTime || frame.overlayHash !== prev.overlayHash || frame.eventIndex !== prev.eventIndex;
  }).map(({ overlayHash, ...frame }) => frame);
}

function writeTimelineFile(outBase, mapping, timeline, frames, meta) {
  const payload = {
    totalVideoSeconds: mapping.totalVideo,
    totalRealSeconds: meta.endReal - meta.startReal,
    frames: frames.length,
    stages: timeline,
    segments: mapping.segments,
  };
  fs.writeFileSync(`${outBase}.timeline.json`, JSON.stringify(payload, null, 2));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removeDirContents(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

function splitIntoChunks(items, parts) {
  const chunkCount = Math.max(1, Math.min(parts, items.length || 1));
  const chunks = Array.from({ length: chunkCount }, () => []);
  const base = Math.floor(items.length / chunkCount);
  let remainder = items.length % chunkCount;
  let offset = 0;
  for (let i = 0; i < chunkCount; i++) {
    const size = base + (remainder > 0 ? 1 : 0);
    remainder -= remainder > 0 ? 1 : 0;
    chunks[i] = items.slice(offset, offset + size);
    offset += size;
  }
  return chunks.filter((chunk) => chunk.length);
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function launchBrowser() {
  return chromium.launch({ executablePath: Chrome, headless: true });
}

async function createPage(browser, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(`file://${path.join(__dirname, 'page.html')}`);
  await page.waitForFunction(() => Boolean(window.renderApi));
  return page;
}

async function validatePageLayout(page, viewportHeight = BASE_HEIGHT) {
  const metrics = await page.evaluate(() => window.renderApi.getLayoutMetrics());
  const checkedPanels = metrics.panels.filter((panel) => panel.id !== 'page-root');
  const overflow = metrics.scrollHeight > viewportHeight + 0.5 || checkedPanels.some((panel) => panel.bottom > viewportHeight - 24 + 0.5);
  if (overflow) throw new Error(`layout overflow: ${JSON.stringify(metrics)}`);
  return metrics;
}

async function initRenderPage(page, { castPath, header, overlay, fontSize, previewScale }) {
  const scale = previewScale || 1;
  const viewport = { width: Math.round(BASE_WIDTH * scale), height: Math.round(BASE_HEIGHT * scale) };
  await page.setViewportSize(viewport);
  await page.evaluate(async ({ cols, rows, title, overlay, fontSize, previewScale }) => {
    await window.renderApi.init({ cols, rows, title, fontSize, previewScale, ...overlay });
  }, { cols: header.width, rows: header.height, title: inferWindowTitle(castPath), overlay, fontSize, previewScale: scale });
  return validatePageLayout(page, viewport.height);
}

function buildOutputChunks(events) {
  return events.filter((event) => event.type === 'o').map((event) => event.data).join('');
}

async function renderAtRealTime(page, { events, markers, real, startReal = 0 }) {
  const overlay = getStateAt(markers, real, startReal);
  const output = buildOutputChunks(events.filter((event) => event.t <= real));
  await page.evaluate(async ({ output, overlay }) => {
    await window.renderApi.reset();
    if (output) await window.renderApi.appendOutput(output);
    await window.renderApi.setOverlay(overlay);
  }, { output, overlay });
}

async function captureStill(page, out, { terminalOnly = false, chrome = true, scale = 2 }) {
  if (terminalOnly) {
    await page.evaluate((options) => window.renderApi.setStillMode(options), { chrome });
    const rect = await page.evaluate((options) => window.renderApi.getStillRect(options), { chrome });
    const clip = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    await page.screenshot({ path: out, clip, scale: scale > 1 ? 'device' : 'css', omitBackground: false });
    await page.evaluate(() => window.renderApi.clearStillMode());
    return;
  }
  await page.screenshot({ path: out, scale: scale > 1 ? 'device' : 'css', omitBackground: false });
}

function runFfmpegConcat(framesDir, concatPath, outMp4, previewScale = 1) {
  const scale = previewScale || 1;
  const width = Math.round(BASE_WIDTH * scale);
  const height = Math.round(BASE_HEIGHT * scale);
  const isPreview = scale < 1;
  const result = spawnSync(FFmpeg, [
    '-y', '-f', 'concat', '-safe', '0', '-i', concatPath,
    '-vf', `fps=30,scale=${width}:${height}:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', isPreview ? 'ultrafast' : 'medium', '-crf', isPreview ? '28' : '18',
    '-movflags', '+faststart', outMp4,
  ], { cwd: framesDir, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'ffmpeg failed');
}

function probeDuration(file) {
  const result = spawnSync(FFprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' });
  return result.status === 0 ? Number(result.stdout.trim()) : NaN;
}

function progressTracker(total) {
  const started = Date.now();
  let rendered = 0;
  let lastLine = '';
  const log = (force = false) => {
    const elapsed = (Date.now() - started) / 1000;
    const rate = rendered / Math.max(elapsed, 0.001);
    const remaining = total - rendered;
    const eta = remaining > 0 && rate > 0 ? remaining / rate : 0;
    const line = `[render] ${rendered}/${total} frames | ${rate.toFixed(2)} fps | elapsed ${formatDuration(elapsed)} | eta ${formatDuration(eta)}`;
    if (force || line !== lastLine) {
      process.stderr.write(`${line}\n`);
      lastLine = line;
    }
  };
  const timer = setInterval(() => log(false), PROGRESS_INTERVAL_MS);
  return {
    tick(count = 1) {
      rendered += count;
    },
    finish() {
      clearInterval(timer);
      log(true);
    }
  };
}

async function renderStill({ castPath, out, stillSpec, terminalOnly = false, chrome = true, scale = 2, fontSize, previewScale = 1 }) {
  out = path.resolve(out);
  const { header, events, markers } = loadCast(castPath);
  const endReal = events.length ? events[events.length - 1].t : 0;
  const fullMapping = buildMapping(markers, endReal, 0);
  const timeline = buildTimeline(markers, fullMapping, endReal, 0);
  const real = resolveStillPoint(stillSpec, markers, endReal, timeline);
  const browser = await launchBrowser();
  const page = await createPage(browser, { width: Math.round(BASE_WIDTH * previewScale), height: Math.round(BASE_HEIGHT * previewScale) });
  try {
    const initialState = initialStateBefore(markers, 0);
    const metrics = await initRenderPage(page, { castPath, header, overlay: initialState, fontSize, previewScale });
    await renderAtRealTime(page, { events, markers, real });
    await captureStill(page, out, { terminalOnly, chrome, scale });
    return { real, fontSize: metrics.fontSize };
  } finally {
    await browser.close();
  }
}

async function renderStillsBatch({ castPath, jsonFile, outDir, terminalOnly = false, chrome = true, scale = 2, fontSize, previewScale = 1 }) {
  const specs = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  ensureDir(outDir);
  const { header, events, markers } = loadCast(castPath);
  const endReal = events.length ? events[events.length - 1].t : 0;
  const fullMapping = buildMapping(markers, endReal, 0);
  const timeline = buildTimeline(markers, fullMapping, endReal, 0);
  const browser = await launchBrowser();
  const page = await createPage(browser, { width: Math.round(BASE_WIDTH * previewScale), height: Math.round(BASE_HEIGHT * previewScale) });
  try {
    const initialState = initialStateBefore(markers, 0);
    await initRenderPage(page, { castPath, header, overlay: initialState, fontSize, previewScale });
    const results = [];
    for (const spec of specs) {
      const name = spec.name;
      if (!name) throw new Error('each still spec needs a name');
      let real;
      if (spec.real !== undefined) real = Number(spec.real);
      else if (spec.mark) real = resolveStillPoint(spec.mark, markers, endReal, timeline);
      else if (spec.end_of_stage !== undefined) real = resolveStillPoint(`stage-end:${spec.end_of_stage}`, markers, endReal, timeline);
      else throw new Error(`unknown still spec: ${JSON.stringify(spec)}`);
      await renderAtRealTime(page, { events, markers, real });
      const out = path.join(path.resolve(outDir), `${name}.png`);
      await captureStill(page, out, { terminalOnly, chrome, scale });
      results.push({ name, real, out });
    }
    return results;
  } finally {
    await browser.close();
  }
}

function buildChunkBootstrap(events, state, endEventIndex) {
  return {
    output: events
      .filter((event) => event.type === 'o' && event.index <= endEventIndex)
      .map((event) => event.data)
      .join(''),
    overlay: cloneState(state),
  };
}

async function prepareWorkerPage(browser, { castPath, header, initialOverlay, fontSize, previewScale }) {
  const viewport = { width: Math.round(BASE_WIDTH * previewScale), height: Math.round(BASE_HEIGHT * previewScale) };
  const page = await createPage(browser, viewport);
  await initRenderPage(page, { castPath, header, overlay: initialOverlay, fontSize, previewScale });
  return page;
}

async function bootstrapChunkPage(page, bootstrap) {
  await page.evaluate(async ({ output, overlay }) => {
    await window.renderApi.reset();
    if (output) await window.renderApi.appendOutput(output);
    await window.renderApi.setOverlay(overlay);
  }, bootstrap);
}

async function renderFrameChunk({ browser, chunk, workerId, framesDir, castPath, header, fontSize, previewScale, events, progress, chunkStates }) {
  const page = await prepareWorkerPage(browser, {
    castPath,
    header,
    initialOverlay: chunkStates[workerId].initialOverlay,
    fontSize,
    previewScale,
  });
  try {
    await bootstrapChunkPage(page, chunkStates[workerId].bootstrap);
    let lastEventIndex = chunkStates[workerId].lastEventIndex;
    for (let i = 0; i < chunk.length; i++) {
      const frame = chunk[i];
      const output = events
        .filter((event) => event.type === 'o' && event.index > lastEventIndex && event.index <= frame.eventIndex)
        .map((event) => event.data)
        .join('');
      lastEventIndex = Math.max(lastEventIndex, frame.eventIndex);
      await page.evaluate(async ({ output, overlay }) => {
        if (output) await window.renderApi.appendOutput(output);
        await window.renderApi.setOverlay(overlay);
      }, { output, overlay: frame.overlay });
      const file = `frame-${String(frame.seq).padStart(6, '0')}.png`;
      await page.screenshot({ path: path.join(framesDir, file), omitBackground: false });
      progress.tick(1);
    }
  } finally {
    await page.close();
  }
}

async function renderVideo({ castPath, out, limitSeconds, fromMark, keepFrames = false, fontSize, maxFpsCapture = DEFAULT_MAX_FPS_CAPTURE, workers = DEFAULT_WORKERS, previewScale = 1 }) {
  const renderStarted = Date.now();
  out = path.resolve(out);
  const { header, events, markers } = loadCast(castPath);
  const startReal = fromMark !== undefined ? (markers[Number(fromMark)]?.t ?? 0) : 0;
  const endReal = limitSeconds ? Math.min((events[events.length - 1]?.t ?? 0), startReal + Number(limitSeconds)) : (events[events.length - 1]?.t ?? 0);
  const mapping = buildMapping(markers, endReal, startReal);
  const timeline = buildTimeline(markers, mapping, endReal, startReal);
  const frames = buildFramePlan(events, markers, mapping, startReal, endReal, maxFpsCapture, FAST_MAX_FPS_CAPTURE)
    .map((frame, seq) => ({ ...frame, seq }));
  const framesDir = path.join(path.dirname(out), `${path.basename(out, path.extname(out))}.frames`);
  ensureDir(framesDir);
  removeDirContents(framesDir);
  writeTimelineFile(out, mapping, timeline, frames, { startReal, endReal });

  const browser = await launchBrowser();
  const progress = progressTracker(frames.length);
  let layoutMetrics;
  try {
    const probePage = await prepareWorkerPage(browser, {
      castPath,
      header,
      initialOverlay: initialStateBefore(markers, startReal),
      fontSize,
      previewScale,
    });
    layoutMetrics = await validatePageLayout(probePage, Math.round(BASE_HEIGHT * previewScale));
    await probePage.close();

    const chunks = splitIntoChunks(frames, clampInt(workers, 1, 16, DEFAULT_WORKERS));
    const chunkStates = {};
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const first = chunk[0];
      const previous = frames[first.seq - 1];
      chunkStates[idx] = previous
        ? {
            initialOverlay: previous.overlay,
            bootstrap: buildChunkBootstrap(events.filter((event) => event.t >= startReal && event.t <= endReal), previous.overlay, previous.eventIndex),
            lastEventIndex: previous.eventIndex,
          }
        : {
            initialOverlay: initialStateBefore(markers, startReal),
            bootstrap: { output: '', overlay: initialStateBefore(markers, startReal) },
            lastEventIndex: -1,
          };
      if (first.seq === 0) {
        chunkStates[idx] = {
          initialOverlay: initialStateBefore(markers, startReal),
          bootstrap: { output: '', overlay: initialStateBefore(markers, startReal) },
          lastEventIndex: -1,
        };
      }
    }

    await Promise.all(chunks.map((chunk, idx) => renderFrameChunk({
      browser,
      chunk,
      workerId: idx,
      framesDir,
      castPath,
      header,
      fontSize,
      previewScale,
      events: events.filter((event) => event.t >= startReal && event.t <= endReal),
      progress,
      chunkStates,
    })));
  } finally {
    progress.finish();
    if (browser.isConnected()) await browser.close();
  }

  const concatLines = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const next = frames[i + 1];
    const duration = next ? Math.max(0.001, next.videoTime - frame.videoTime) : 1 / 30;
    const file = `frame-${String(frame.seq).padStart(6, '0')}.png`;
    concatLines.push(`file '${file}'`);
    concatLines.push(`duration ${duration.toFixed(6)}`);
  }
  const lastFrame = `frame-${String(frames.length - 1).padStart(6, '0')}.png`;
  concatLines.push(`file '${lastFrame}'`);
  const concatPath = path.join(framesDir, 'frames.txt');
  fs.writeFileSync(concatPath, concatLines.join('\n') + '\n');
  runFfmpegConcat(framesDir, concatPath, out, previewScale);

  if (!keepFrames) {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
  const elapsed = (Date.now() - renderStarted) / 1000;
  const duration = probeDuration(out);
  return { frames: frames.length, elapsed, duration, startReal, endReal, fontSize: layoutMetrics?.fontSize, previewScale, workers };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.cast && args._.length) args.cast = args._[0];
  if (!args.cast) throw new Error('--cast is required');
  const { events, markers } = loadCast(args.cast);
  const endReal = events[events.length - 1]?.t ?? 0;
  const fullMapping = buildMapping(markers, endReal, 0);
  const fullTimeline = buildTimeline(markers, fullMapping, endReal, 0);
  if (args['list-marks']) {
    printMarks(markers, fullMapping);
    return;
  }
  if (args['list-stages']) {
    printStages(fullTimeline);
    return;
  }

  const fontSize = args['font-size'] ? Number(args['font-size']) : undefined;
  const previewScale = numArg(args['preview-scale'], 1);
  const maxFpsCapture = numArg(args['max-fps-capture'], DEFAULT_MAX_FPS_CAPTURE);
  const workers = clampInt(args.workers, 1, 16, DEFAULT_WORKERS);

  if (args['stills-json']) {
    if (!args['out-dir']) throw new Error('--out-dir is required with --stills-json');
    const results = await renderStillsBatch({
      castPath: args.cast,
      jsonFile: args['stills-json'],
      outDir: args['out-dir'],
      terminalOnly: boolArg(args['terminal-only'], true),
      chrome: boolArg(args.chrome, true),
      scale: Number(args.scale || 2),
      fontSize,
      previewScale,
    });
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (args.still) {
    if (!args.out) throw new Error('--out is required with --still');
    const result = await renderStill({
      castPath: args.cast,
      out: args.out,
      stillSpec: String(args.still),
      terminalOnly: boolArg(args['terminal-only'], false),
      chrome: boolArg(args.chrome, true),
      scale: Number(args.scale || 2),
      fontSize,
      previewScale,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!args.out) throw new Error('--out is required');
  const result = await renderVideo({
    castPath: args.cast,
    out: args.out,
    limitSeconds: args['limit-seconds'],
    fromMark: args['from-mark'],
    keepFrames: boolArg(args['keep-frames'], false),
    fontSize,
    maxFpsCapture,
    workers,
    previewScale,
  });
  const fps = result.frames / Math.max(result.elapsed, 0.001);
  console.log(JSON.stringify({
    ...result,
    captureFps: fps,
    secondsPerVideoMinute: result.elapsed / Math.max(result.duration / 60, 0.0001),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
