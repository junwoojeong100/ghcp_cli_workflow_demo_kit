const defaultStages = [
  { id: 1, label: '분석' },
  { id: 2, label: '설계' },
  { id: 3, label: '구현' },
  { id: 4, label: '테스트' },
  { id: 5, label: '리뷰' },
  { id: 6, label: '배포' },
  { id: 7, label: '운영' }
];

const LINE_HEIGHT = 1.12;
const GRID_PAD_X = 4;
const GRID_PAD_Y = 4;

const state = {
  terminal: null,
  unicode: null,
  config: null,
  currentStageId: null,
  currentAgent: '',
  stages: defaultStages,
  caption: '',
  gate: null,
  badgeText: '',
  speed: 1,
  cut: false,
  fitFont: 20,
  metrics: null,
  stillMode: false,
  images: null,
  previewScale: 1,
};

function trackerEl() { return document.getElementById('tracker'); }
function agentChip() { return document.getElementById('agent-chip'); }
function captionEl() { return document.getElementById('caption-text'); }
function captionPanel() { return document.getElementById('caption-panel'); }
function gateOverlay() { return document.getElementById('gate-overlay'); }
function gateTitle() { return document.getElementById('gate-title'); }
function gateText() { return document.getElementById('gate-text'); }
function badgeEl() { return document.getElementById('speed-badge'); }
function cutOverlay() { return document.getElementById('cut-overlay'); }
function terminalHost() { return document.getElementById('xterm-host'); }
function gridFrameEl() { return document.getElementById('grid-frame'); }
function xtermMountEl() { return document.getElementById('xterm-mount'); }
function terminalWindowEl() { return document.getElementById('terminal-window'); }
function terminalHeaderEl() { return document.getElementById('terminal-header'); }
function imagesOverlayEl() { return document.getElementById('images-overlay'); }
function pageRootEl() { return document.getElementById('page-root'); }

function canvasMeasure(fontSize) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px Menlo, "Apple SD Gothic Neo", AppleGothic, monospace`;
  return ctx.measureText('M').width;
}

function disposeTerminal() {
  if (state.terminal) {
    state.terminal.dispose();
    state.terminal = null;
  }
  xtermMountEl().innerHTML = '';
}

async function nextFrame() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function scaleRect(rect) {
  const scale = state.previewScale || 1;
  return {
    left: rect.left * scale,
    top: rect.top * scale,
    right: rect.right * scale,
    bottom: rect.bottom * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

function renderImages() {
  const overlay = imagesOverlayEl();
  const images = state.images;
  if (!images?.items?.length) {
    overlay.innerHTML = '';
    overlay.classList.remove('show');
    return;
  }
  const items = images.items.slice(0, 2);
  const single = items.length === 1;
  overlay.classList.add('show');
  overlay.innerHTML = `
    <div class="images-shell ${single ? 'single' : 'dual'} ${images.fit === 'content' ? 'content-fit' : ''}">
      ${items.map((item, index) => {
        const label = item.label ? `<div class="image-label ${!single && index === 1 ? 'after' : ''}">${escapeHtml(item.label)}</div>` : '';
        const cls = `image-card ${single ? 'single' : 'dual'}`;
        return `
          <div class="${cls}">
            ${label}
            <div class="image-frame"><img src="${encodeURI(item.src)}" alt="${escapeHtml(item.label || `image-${index + 1}`)}" /></div>
          </div>
        `;
      }).join('')}
    </div>`;
}

async function createTerminal(fontSize) {
  disposeTerminal();
  const term = new window.Terminal({
    cols: state.config.cols,
    rows: state.config.rows,
    fontFamily: 'Menlo, "Apple SD Gothic Neo", AppleGothic, monospace',
    fontSize,
    lineHeight: LINE_HEIGHT,
    cursorBlink: false,
    allowTransparency: false,
    scrollback: 0,
    convertEol: false,
    disableStdin: true,
    allowProposedApi: true,
    theme: {
      background: '#0b1117',
      foreground: '#E6EDF3',
      cursor: '#A371F7',
      black: '#0b1117',
      red: '#ff7b72',
      green: '#3fb950',
      yellow: '#d29922',
      blue: '#58a6ff',
      magenta: '#bc8cff',
      cyan: '#39c5cf',
      white: '#c9d1d9',
      brightBlack: '#8b949e',
      brightRed: '#ffa198',
      brightGreen: '#56d364',
      brightYellow: '#e3b341',
      brightBlue: '#79c0ff',
      brightMagenta: '#d2a8ff',
      brightCyan: '#56d4dd',
      brightWhite: '#f0f6fc'
    }
  });
  const unicode = new window.Unicode11Addon.Unicode11Addon();
  term.loadAddon(unicode);
  term.open(xtermMountEl());
  term.unicode.activeVersion = '11';
  await nextFrame();
  const dims = term._core?._renderService?.dimensions?.css;
  const cellW = dims?.cell?.width || canvasMeasure(fontSize);
  const cellH = dims?.cell?.height || fontSize * LINE_HEIGHT;
  const gridW = cellW * state.config.cols;
  const gridH = cellH * state.config.rows;
  xtermMountEl().style.width = `${Math.ceil(gridW)}px`;
  xtermMountEl().style.height = `${Math.ceil(gridH)}px`;
  gridFrameEl().style.width = `${Math.ceil(gridW + GRID_PAD_X * 2)}px`;
  gridFrameEl().style.height = `${Math.ceil(gridH + GRID_PAD_Y * 2)}px`;
  state.metrics = {
    fontSize,
    cellW,
    cellH,
    gridW,
    gridH,
    frameW: gridW + GRID_PAD_X * 2,
    frameH: gridH + GRID_PAD_Y * 2,
    hostW: terminalHost().clientWidth,
    hostH: terminalHost().clientHeight,
    headerH: terminalHeaderEl().getBoundingClientRect().height,
  };
  state.fitFont = fontSize;
  state.terminal = term;
  state.unicode = unicode;
  await nextFrame();
}

async function autoFitTerminal() {
  await document.fonts.ready;
  const availableW = terminalHost().clientWidth;
  const availableH = terminalHost().clientHeight;
  const override = Number(state.config.fontSize || 0);
  if (override > 0) {
    await createTerminal(override);
    if (state.metrics.frameW > availableW + 0.5 || state.metrics.frameH > availableH + 0.5) {
      throw new Error(`font size ${override} does not fit ${state.config.cols}x${state.config.rows}`);
    }
    return;
  }
  let best = 15;
  for (let size = 15; size <= 28; size += 0.25) {
    await createTerminal(Number(size.toFixed(2)));
    const fits = state.metrics.frameW <= availableW + 0.5 && state.metrics.frameH <= availableH + 0.5;
    if (fits) best = Number(size.toFixed(2));
  }
  await createTerminal(best);
}

function renderTracker() {
  const currentOrder = state.stages.findIndex((s) => s.id === state.currentStageId);
  trackerEl().innerHTML = state.stages.map((stage, index) => {
    const done = currentOrder > index;
    const current = stage.id === state.currentStageId;
    const klass = ['pill', done ? 'done' : '', current ? 'current' : ''].filter(Boolean).join(' ');
    const indexText = done ? '✓' : String(index + 1);
    return `<div class="${klass}"><span class="pill-index">${indexText}</span><span>${escapeHtml(stage.label)}</span></div>`;
  }).join('');
  agentChip().textContent = state.currentAgent ? `현재 에이전트 · ${state.currentAgent}` : '현재 에이전트 · 준비 중';
}

function renderBottom() {
  const caption = state.images?.caption ?? state.caption ?? '';
  captionEl().textContent = caption;
  if (state.images?.items?.length) {
    captionPanel().classList.remove('hidden');
    gateOverlay().classList.remove('show');
    gateOverlay().classList.remove('danger');
    gateTitle().textContent = '';
    gateText().textContent = '';
    return;
  }
  if (state.gate) {
    captionPanel().classList.add('hidden');
    gateOverlay().classList.add('show');
    gateOverlay().classList.toggle('danger', state.gate.tone === 'danger');
    gateTitle().textContent = state.gate.tone === 'danger'
      ? (state.gate.label || '')
      : `사람 승인 필요 · ${state.gate.label || ''}`.trim();
    gateText().textContent = state.gate.text || '';
  } else {
    captionPanel().classList.remove('hidden');
    gateOverlay().classList.remove('show');
    gateOverlay().classList.remove('danger');
    gateTitle().textContent = '';
    gateText().textContent = '';
  }
}

function renderBadge() {
  const badge = badgeEl();
  const text = state.badgeText || (state.speed > 1 ? `⏩ ${state.speed}배속` : '');
  badge.textContent = text;
  badge.classList.toggle('show', Boolean(text));
}

function applyOverlay(overlay = {}) {
  if (overlay.stages) state.stages = overlay.stages;
  if (Object.hasOwn(overlay, 'currentStageId')) state.currentStageId = overlay.currentStageId;
  if (Object.hasOwn(overlay, 'currentAgent')) state.currentAgent = overlay.currentAgent || '';
  if (Object.hasOwn(overlay, 'caption')) state.caption = overlay.caption ?? '';
  if (Object.hasOwn(overlay, 'gate')) state.gate = overlay.gate || null;
  if (Object.hasOwn(overlay, 'badgeText')) state.badgeText = overlay.badgeText || '';
  if (Object.hasOwn(overlay, 'speed')) state.speed = overlay.speed || 1;
  if (Object.hasOwn(overlay, 'cut')) state.cut = Boolean(overlay.cut);
  if (Object.hasOwn(overlay, 'images')) state.images = overlay.images || null;
  cutOverlay().classList.toggle('show', state.cut);
  renderTracker();
  renderImages();
  renderBottom();
  renderBadge();
}

function rectJson(node) {
  const r = scaleRect(node.getBoundingClientRect());
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

function setStillMode(enabled, chrome = true) {
  state.stillMode = enabled;
  const host = terminalHost();
  const frameRect = gridFrameEl().getBoundingClientRect();
  const headerH = terminalHeaderEl().getBoundingClientRect().height;
  if (!enabled) {
    terminalWindowEl().style.width = '100%';
    terminalWindowEl().style.height = '100%';
    host.style.justifyContent = 'center';
    return;
  }
  if (chrome) {
    const compactWidth = Math.ceil(Math.max(state.metrics.frameW + 36, 620));
    const compactHeight = Math.ceil(headerH + state.metrics.frameH + 14);
    terminalWindowEl().style.width = `${compactWidth}px`;
    terminalWindowEl().style.height = `${compactHeight}px`;
    host.style.justifyContent = 'center';
  } else {
    terminalWindowEl().style.width = `${Math.ceil(frameRect.width + 24)}px`;
    terminalWindowEl().style.height = `${Math.ceil(frameRect.height + 24)}px`;
    host.style.justifyContent = 'center';
  }
}

function setPreviewScale(scale = 1) {
  state.previewScale = scale > 0 ? scale : 1;
  document.documentElement.style.setProperty('--content-scale', String(state.previewScale));
  document.documentElement.style.setProperty('--frame-width', `${1920 * state.previewScale}px`);
  document.documentElement.style.setProperty('--frame-height', `${1080 * state.previewScale}px`);
  pageRootEl().style.transform = `scale(${state.previewScale})`;
}

window.renderApi = {
  async init(config) {
    state.config = config;
    setPreviewScale(Number(config.previewScale) || 1);
    document.getElementById('term-title').textContent = config.title || 'copilot — shopflow-orders';
    state.stages = config.stages || defaultStages;
    state.currentStageId = config.currentStageId ?? state.stages[0]?.id ?? null;
    state.currentAgent = config.currentAgent || '';
    state.caption = config.caption || '';
    state.gate = config.gate || null;
    state.speed = config.speed || 1;
    state.badgeText = config.badgeText || '';
    state.images = config.images || null;
    terminalWindowEl().style.width = '100%';
    terminalWindowEl().style.height = '100%';
    await autoFitTerminal();
    applyOverlay({});
  },
  async reset() {
    state.terminal?.reset();
    await nextFrame();
  },
  async appendOutput(data) {
    if (!data) return;
    await new Promise((resolve) => state.terminal.write(data, resolve));
    await nextFrame();
  },
  async setOverlay(overlay) {
    applyOverlay(overlay);
    await nextFrame();
  },
  setStillMode(options = {}) {
    setStillMode(true, options.chrome !== false);
    return true;
  },
  clearStillMode() {
    setStillMode(false, true);
    return true;
  },
  getStillRect(options = {}) {
    const chrome = options.chrome !== false;
    if (!chrome) return rectJson(gridFrameEl());
    return rectJson(terminalWindowEl());
  },
  getLayoutMetrics() {
    const panels = ['page-root', 'topbar', 'terminal-window', 'bottom-panel'].map((id) => ({ id, ...rectJson(document.getElementById(id)) }));
    return {
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      panels,
      fontSize: state.fitFont,
      metrics: state.metrics,
      badgeRect: rectJson(badgeEl()),
      gridRect: rectJson(gridFrameEl()),
      previewScale: state.previewScale,
    };
  },
  getDebugState() {
    return { fontSize: state.fitFont, caption: state.caption, speed: state.speed, metrics: state.metrics, images: state.images };
  }
};
