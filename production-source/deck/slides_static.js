// 정적 슬라이드(데이터와 무관한 소개·설명·마무리) 생성 모듈
const L = require("./lib");
const { C, FONT, MONO, text, card, pill, iconBadge, title, footer, tracker, gateBadge } = L;

async function cover(pptx, n, d = {}) {
  const s = pptx.addSlide();
  s.background = { color: C.INK };
  text(s, "엔터프라이즈 개발·운영 워크플로우 데모", { x: 0.8, y: 1.05, w: 7.4, h: 0.35, fontSize: 15, bold: true, color: C.VIOLET, charSpacing: 1 });
  text(s, "요건에서 배포까지,\nAI는 일하고\n사람은 결정합니다", { x: 0.8, y: 1.6, w: 7.5, h: 3.2, fontSize: 48, bold: true, color: C.WHITE, lineSpacingMultiple: 1.05 });
  text(s, "GitHub Copilot CLI × Custom Agent로 만드는\n빠르고 안전한 개발·운영 워크플로우", { x: 0.8, y: 4.95, w: 7.5, h: 0.9, fontSize: 20, color: "C9D1D9", lineSpacingMultiple: 1.15 });
  text(s, "2026. 10  ·  실제 Copilot CLI 세션을 녹화한 데모", { x: 0.8, y: 6.55, w: 7.5, h: 0.3, fontSize: 15, color: "A8B1BB" });

  // 우측: 터미널 카드 (실제 세션에서 가져온 문구)
  card(pptx, s, 8.55, 1.15, 4.2, 3.75, { fill: C.PANEL, line: C.LINE_D, radius: 0.18 });
  [["FF5F56", 8.8], ["FFBD2E", 9.04], ["27C93F", 9.28]].forEach(([col, x]) => s.addShape(pptx.ShapeType.ellipse, { x, y: 1.37, w: 0.14, h: 0.14, fill: { color: col }, line: { type: "none" } }));
  const lines = (d.lines || []).map((l) => l.map(([t, color, bold]) => ({ text: t, options: Object.assign({ color }, bold ? { bold: true } : {}) })));
  const runs = [];
  lines.forEach((l, i) => { l.forEach((r, j) => runs.push({ text: r.text, options: Object.assign({ fontFace: MONO, fontSize: 13 }, r.options, j === l.length - 1 && i < lines.length - 1 ? { breakLine: true } : {}) })); });
  s.addText(runs, { x: 8.8, y: 1.8, w: 3.9, h: 3.6, margin: 0, valign: "top", paraSpaceAfter: 7 });

  // 파이프라인 점 7개 + 승인 3곳
  const names = L.STEPS; const x0 = 8.6; const step = 0.6;
  names.forEach((nm, i) => {
    const gate = i === 1 || i === 4 || i === 5;
    s.addShape(pptx.ShapeType.ellipse, { x: x0 + i * step, y: 5.62, w: 0.28, h: 0.28, fill: { color: gate ? C.AMBER_F : C.VIOLET }, line: { type: "none" } });
    text(s, nm, { x: x0 + i * step - 0.15, y: 5.98, w: 0.58, h: 0.25, fontSize: 11, color: "B1BAC4", align: "center" });
  });
  text(s, "사람 승인 3곳 ●", { x: 8.6, y: 5.22, w: 3, h: 0.28, fontSize: 13, bold: true, color: C.AMBER_F });
  return s;
}

async function keyMessages(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "오늘의 핵심", "AI는 일하고, 사람은 결정합니다");
  const cards = [
    { w: "빠르게", color: C.PURPLE, tint: C.PURPLE_L, icon: "FaBolt", head: "요건에서 운영 배포까지 한 세션", b: ["분석부터 운영까지 7단계를 역할별 AI 팀원이 이어서 수행", "단계마다 결과 문서가 남음"] },
    { w: "안전하게", color: C.GREEN, tint: C.GREEN_L, icon: "FaShieldHalved", head: "권한은 역할별로, 위험은 시스템이 차단", b: ["쓰기 범위 제한 · 위험 명령 차단", "모든 도구 호출을 감사 로그로 기록"] },
    { w: "사람이 결정", color: C.AMBER, tint: C.AMBER_L, icon: "FaUserCheck", head: "승인 3곳은 반드시 사람이", b: ["설계 · 코드 · 운영 배포 승인", "승인 없이는 다음 단계 진행 불가", "설계 단계의 결정 3건도 사람이"] },
  ];
  for (let i = 0; i < 3; i++) {
    const c = cards[i]; const x = 0.6 + i * 4.1;
    card(pptx, s, x, 1.75, 3.9, 4.05, { shadow: true });
    await iconBadge(pptx, s, c.icon, x + 0.35, 2.05, 0.82, c.color);
    text(s, c.w, { x: x + 1.35, y: 2.12, w: 2.4, h: 0.7, fontSize: 32, bold: true, color: c.color, valign: "middle" });
    text(s, c.head, { x: x + 0.35, y: 3.1, w: 3.3, h: 0.9, fontSize: 21, bold: true });
    s.addText(c.b.map((t, k) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: k < c.b.length - 1 } })),
      { x: x + 0.35, y: 4.05, w: 3.3, h: 1.65, fontFace: FONT, fontSize: 17, color: C.MUTED, margin: 0, valign: "top", paraSpaceAfter: 8 });
  }
  text(s, "순서   ①  GitHub Copilot 한눈에   →   ②  데모: 요건에서 운영까지   →   ③  효과 · 안전 · 도입", { x: 0.6, y: 6.2, w: 12.1, h: 0.4, fontSize: 16, color: C.MUTED, bold: true });
  footer(s, n);
  return s;
}

async function evolution(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 1 · GITHUB COPILOT 한눈에", "코드 도우미에서 개발 팀원으로");
  const steps = [
    { h: 2.35, name: "제안", tag: "Assistive", d: "코드를 쓰는 중에 다음 코드를 제안", icon: "FaWandMagicSparkles" },
    { h: 3.05, name: "대화", tag: "Assistive", d: "코드·저장소에 대해 묻고 답하기", icon: "FaCommentDots" },
    { h: 3.75, name: "에이전트", tag: "Agentic", d: "계획 → 파일 수정 → 명령 실행 → 검증을 스스로 반복", icon: "FaRobot" },
    { h: 4.45, name: "맞춤 · 병렬", tag: "Customizable", d: "우리 규칙을 가진 전문 에이전트, 여러 작업을 동시에", icon: "FaPeopleGroup" },
  ];
  text(s, "사람의 일을 '돕는 도구'에서\n'맡길 수 있는 팀원'으로", { x: 0.6, y: 1.75, w: 6.2, h: 1.3, fontSize: 24, bold: true, color: C.MUTED, lineSpacingMultiple: 1.15 });
  for (let i = 0; i < 4; i++) {
    const st = steps[i]; const x = 0.6 + i * 3.05; const y = 6.05 - st.h; const last = i === 3;
    card(pptx, s, x, y, 2.9, st.h, { fill: last ? C.PURPLE : C.BG, line: last ? C.PURPLE : C.LINE, shadow: last });
    await iconBadge(pptx, s, st.icon, x + 0.28, y + 0.28, 0.7, last ? C.WHITE : C.PURPLE, last ? "#7B3FE4" : "#FFFFFF");
    pill(pptx, s, x + 1.45, y + 0.4, 1.25, 0.34, st.tag, { fill: last ? C.PURPLE_D : C.PURPLE_L, color: last ? C.WHITE : C.PURPLE, size: 11 });
    text(s, st.name, { x: x + 0.28, y: y + 1.12, w: 2.4, h: 0.5, fontSize: 24, bold: true, color: last ? C.WHITE : C.TEXT });
    text(s, st.d, { x: x + 0.28, y: y + 1.68, w: 2.4, h: st.h - 1.8, fontSize: 16, color: last ? "EADCFF" : C.MUTED });
  }
  text(s, "사람은 항상 검토하고 승인합니다 — Copilot은 제안하고 실행하며, 책임은 사람에게 있습니다.", { x: 0.6, y: 6.22, w: 12.1, h: 0.35, fontSize: 16, bold: true, color: C.PURPLE });
  footer(s, n, { source: "출처: GitHub Docs · About GitHub Copilot (Assistive / Agentic / Customizations)" });
  return s;
}

async function features(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 1 · GITHUB COPILOT 한눈에", "핵심 기능 6가지");
  const f = [
    ["FaWandMagicSparkles", "코드 제안", "입력하는 즉시 코드 · 테스트 · 주석을 제안", "IDE"],
    ["FaCommentDots", "대화 (Chat)", "코드 설명, 오류 원인, 대안 비교를 자연어로 질문", "IDE · GitHub.com · Mobile"],
    ["FaRobot", "에이전트", "여러 파일 수정 · 명령 실행 · 결과 검증을 스스로 반복", "IDE · CLI · 앱"],
    ["FaCloud", "클라우드 에이전트", "이슈를 맡기면 클라우드에서 작업하고 PR로 제출", "GitHub.com"],
    ["FaCodePullRequest", "코드 리뷰", "PR을 검토하고 수정안을 제안", "GitHub.com · CLI"],
    ["FaSliders", "맞춤화", "지침 · 커스텀 에이전트 · MCP · 스킬 · Hook으로 우리 방식 반영", "모든 사용 환경(Surface)"],
  ];
  for (let i = 0; i < 6; i++) {
    const x = 0.6 + (i % 3) * 4.1; const y = 1.7 + Math.floor(i / 3) * 2.5; const hot = i === 2 || i === 5;
    card(pptx, s, x, y, 3.9, 2.3, { fill: C.WHITE, line: hot ? C.PURPLE : C.LINE, lineW: hot ? 2 : 1, shadow: true });
    await iconBadge(pptx, s, f[i][0], x + 0.3, y + 0.3, 0.7, hot ? C.PURPLE : C.BLUE);
    text(s, f[i][1], { x: x + 1.2, y: y + 0.3, w: 2.5, h: 0.7, fontSize: 22, bold: true, valign: "middle" });
    text(s, f[i][2], { x: x + 0.3, y: y + 1.15, w: 3.35, h: 0.7, fontSize: 16, color: C.TEXT });
    text(s, f[i][3], { x: x + 0.3, y: y + 1.88, w: 3.35, h: 0.3, fontSize: 12, color: C.FAINT, bold: true });
  }
  text(s, "보라색 테두리 = 오늘 데모에서 직접 사용하는 기능", { x: 0.6, y: 6.68, w: 5.6, h: 0.28, fontSize: 13, color: C.PURPLE, bold: true });
  text(s, "MCP = 외부 도구 연결  ·  스킬 = 작업 매뉴얼  ·  Hook = 자동 검사 규칙", { x: 6.3, y: 6.68, w: 6.43, h: 0.28, fontSize: 12, color: C.MUTED, align: "right" });
  footer(s, n);
  return s;
}

async function surfaces(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 1 · GITHUB COPILOT 한눈에", "일하는 곳 어디서나, 같은 Copilot");
  const f = [
    ["FaLayerGroup", "GitHub Copilot 앱", "에이전트 작업을 병렬로, 여러 저장소와 PR 흐름을 한 화면에"],
    ["FaTerminal", "Copilot CLI", "터미널에서 명령 실행 · 반복 가능한 워크플로우 · 자동화", true],
    ["FaLaptopCode", "IDE", "VS Code · Visual Studio · JetBrains · Eclipse · Xcode에서 제안·채팅·에이전트"],
    ["FaGlobe", "GitHub.com", "이슈·PR에서 질문하고, 작업을 에이전트에 위임"],
    ["FaMobileScreen", "GitHub Mobile", "이동 중에 질문하고 진행 상황 확인"],
    ["FaPlug", "Copilot SDK", "우리 서비스·도구에 Copilot 기능을 내장"],
  ];
  for (let i = 0; i < 6; i++) {
    const x = 0.6 + (i % 3) * 4.1; const y = 1.7 + Math.floor(i / 3) * 2.25; const hot = !!f[i][3];
    card(pptx, s, x, y, 3.9, 2.05, { fill: hot ? C.PURPLE : C.BG, line: hot ? C.PURPLE : C.LINE, shadow: hot });
    await iconBadge(pptx, s, f[i][0], x + 0.3, y + 0.28, 0.62, hot ? C.WHITE : C.BLUE, hot ? "#7B3FE4" : "#FFFFFF");
    text(s, f[i][1], { x: x + 1.1, y: y + 0.28, w: 2.6, h: 0.62, fontSize: 21, bold: true, valign: "middle", color: hot ? C.WHITE : C.TEXT });
    text(s, f[i][2], { x: x + 0.3, y: y + 1.1, w: 3.35, h: 0.85, fontSize: 15, color: hot ? "EADCFF" : C.MUTED });
    if (hot) pill(pptx, s, x + 2.2, y + 1.62, 1.5, 0.3, "오늘의 주인공", { fill: C.AMBER_F, color: C.TEXT, size: 11 });
  }
  card(pptx, s, 0.6, 6.15, 12.1, 0.62, { fill: C.PURPLE_L, line: null });
  text(s, "지침 · 스킬 · MCP · 모델 선택은 여러 Surface(사용 환경)에서 공통으로 적용됩니다 (기능별 지원 범위 상이)", { x: 0.85, y: 6.15, w: 11.6, h: 0.62, fontSize: 14, color: C.PURPLE_D, bold: true, valign: "middle" });
  footer(s, n);
  return s;
}

async function cliIntro(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 1 · GITHUB COPILOT 한눈에", "Copilot CLI: 터미널에서 일하는 AI 에이전트", { size: 30 });
  const rows = [
    ["FaCommentDots", "대화형 · 비대화형", "사람과 대화하며 작업하거나, 자동화 스크립트에서 한 번에 실행"],
    ["FaClipboardCheck", "Plan · Autopilot", "계획을 먼저 승인하고, 필요하면 자율 실행"],
    ["FaUserShield", "권한 승인", "명령·파일·URL 단위로 허용/거부, 위험한 작업은 사람에게 확인"],
    ["FaCubes", "병렬 · 위임", "여러 작업을 동시에 진행하고, 클라우드에 위임할 수도 있음"],
    ["FaMobileScreen", "원격 확인", "웹·모바일에서 진행 중인 세션을 확인하고 응답"],
  ];
  for (let i = 0; i < rows.length; i++) {
    const y = 1.7 + i * 0.97;
    await iconBadge(pptx, s, rows[i][0], 0.6, y, 0.66, C.PURPLE);
    text(s, rows[i][1], { x: 1.5, y: y - 0.02, w: 5.9, h: 0.36, fontSize: 19, bold: true });
    text(s, rows[i][2], { x: 1.5, y: y + 0.36, w: 5.9, h: 0.55, fontSize: 15, color: C.MUTED });
  }
  card(pptx, s, 7.85, 1.7, 4.85, 4.75, { fill: C.INK, line: C.INK, radius: 0.18 });
  text(s, "왜 터미널인가?", { x: 8.2, y: 2.0, w: 4.2, h: 0.5, fontSize: 24, bold: true, color: C.WHITE });
  text(s, "개발과 운영이 만나는 곳", { x: 8.2, y: 2.7, w: 4.2, h: 0.45, fontSize: 20, bold: true, color: C.VIOLET });
  text(s, "Git · 빌드 · 테스트 · 배포 · 클라우드 CLI · 로그가 모두 터미널에 있습니다.", { x: 8.2, y: 3.25, w: 4.2, h: 0.95, fontSize: 16, color: "C9D1D9" });
  text(s, "그래서 요건 → 운영까지의 전체 흐름을 한 세션에서 이어서 수행할 수 있습니다.", { x: 8.2, y: 4.3, w: 4.2, h: 0.95, fontSize: 16, color: "C9D1D9" });
  text(s, "$ copilot --agent change-analyst", { x: 8.2, y: 5.55, w: 4.3, h: 0.35, fontSize: 14, color: C.AMBER_F, fontFace: MONO });
  text(s, "GitHub Copilot 앱도 Copilot CLI 위에서 동작합니다.", { x: 7.85, y: 6.6, w: 4.85, h: 0.3, fontSize: 12, color: C.FAINT });
  footer(s, n);
  return s;
}

async function customAgent(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 · 데모", "Custom Agent: 우리 방식으로 일하는 AI 팀원", { size: 30 });
  card(pptx, s, 0.6, 1.7, 7.5, 5.0, { fill: C.INK, line: C.INK, radius: 0.16 });
  const code = [
    ["---", "8B949E"],
    ["name: change-analyst", "79C0FF"],
    ["description: 변경요청(CR)의 영향도를 분석하는", "79C0FF"],
    ["  읽기 전용 분석가", "79C0FF"],
    ['tools: ["view","grep","bash","create"]', "FFA657"],
    ["hooks:", "D2A8FF"],
    ["  preToolUse:", "D2A8FF"],
    ["    - command: guard.py --role analyst", "D2A8FF"],
    ["---", "8B949E"],
    ["# 역할", "7EE787"],
    ["당신은 ShopFlow 팀의 변경 분석가입니다.", "E6EDF3"],
    ["1. 요청서를 읽고 R1…R4 의도를 재진술", "E6EDF3"],
    ["2. grep 으로 영향 범위를 찾고 근거를 적는다", "E6EDF3"],
    ["3. 결정이 필요한 것은 선택지와 추천안으로", "E6EDF3"],
  ];
  s.addText(code.map(([t, col], i) => ({ text: t, options: { color: col, fontFace: MONO, fontSize: 14, breakLine: i < code.length - 1 } })),
    { x: 0.95, y: 2.0, w: 6.9, h: 4.5, margin: 0, valign: "top", paraSpaceAfter: 5 });
  const marks = [[2.28, "1"], [3.02, "2"], [3.74, "3"], [5.55, "4"]];
  marks.forEach(([y, k]) => {
    s.addShape(pptx.ShapeType.ellipse, { x: 7.62, y, w: 0.34, h: 0.34, fill: { color: C.AMBER_F }, line: { type: "none" } });
    text(s, k, { x: 7.62, y, w: 0.34, h: 0.34, align: "center", valign: "middle", fontSize: 13, bold: true });
  });
  const legend = [["1", "역할", "어떤 일을 맡는 에이전트인지"], ["2", "도구 권한", "쓸 수 있는 도구만 허용 (최소 권한)"], ["3", "권한 강제(Hook)", "도구 호출 직전에 시스템이 검사·차단"], ["4", "작업 지침", "우리 팀의 순서·형식·금지 사항"]];
  legend.forEach(([k, a, b], i) => {
    const y = 1.7 + i * 0.78;
    s.addShape(pptx.ShapeType.ellipse, { x: 8.55, y: y + 0.05, w: 0.4, h: 0.4, fill: { color: C.AMBER_F }, line: { type: "none" } });
    text(s, k, { x: 8.55, y: y + 0.05, w: 0.4, h: 0.4, align: "center", valign: "middle", fontSize: 14, bold: true });
    text(s, a, { x: 9.1, y, w: 3.6, h: 0.32, fontSize: 18, bold: true });
    text(s, b, { x: 9.1, y: y + 0.34, w: 3.6, h: 0.3, fontSize: 14, color: C.MUTED });
  });
  card(pptx, s, 8.55, 4.95, 4.15, 1.75, { fill: C.PURPLE_L, line: null });
  text(s, "한 번 정의하면 팀 전체가 같은 기준으로", { x: 8.8, y: 5.05, w: 3.7, h: 0.55, fontSize: 16, bold: true, color: C.PURPLE_D });
  text(s, "개인  ~/.copilot/agents\n저장소  .github/agents\n조직·기업  .github-private/agents", { x: 8.8, y: 5.65, w: 3.7, h: 0.95, fontSize: 13, color: C.TEXT, fontFace: MONO, lineSpacingMultiple: 1.15 });
  footer(s, n, { source: "출처: GitHub Docs · About custom agents / Custom agents configuration  |  왼쪽 코드는 실제 에이전트 파일(change-analyst.agent.md)을 요약·발췌한 것" });
  return s;
}

async function scenario(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 · 데모", "시나리오: 현업의 변경 요청 한 장");
  card(pptx, s, 0.6, 1.7, 7.4, 4.95, { shadow: true });
  pill(pptx, s, 0.9, 1.95, 1.7, 0.34, "CR-2026-014", { fill: C.PURPLE_L, color: C.PURPLE, mono: true });
  text(s, "VIP 환불 정책 개선 · 고액 환불 통제", { x: 0.9, y: 2.4, w: 6.9, h: 0.5, fontSize: 24, bold: true });
  text(s, "요청: 고객경험(CX)팀 · 희망 적용일 2026-11-02", { x: 0.9, y: 2.95, w: 6.9, h: 0.3, fontSize: 14, color: C.MUTED });
  const reqs = [["R1", "VIP 환불 가능 기간 30일 → 60일 (일반 30일 유지)"], ["R2", "환불 요청 시 '환불 사유'를 필수로"], ["R3", "100만원 초과 환불은 관리자 승인 대기"], ["R4", "고객 화면 · 이메일 · 정책 문서의 문구도 함께 변경"]];
  reqs.forEach(([k, t], i) => {
    const y = 3.5 + i * 0.7;
    pill(pptx, s, 0.9, y + 0.04, 0.6, 0.38, k, { fill: C.PURPLE, color: C.WHITE, size: 13 });
    text(s, t, { x: 1.7, y, w: 6.1, h: 0.5, fontSize: 19, valign: "middle" });
  });
  card(pptx, s, 8.3, 1.7, 4.4, 2.0, { fill: C.AMBER_L, line: null });
  text(s, "현업의 말", { x: 8.55, y: 1.85, w: 3.9, h: 0.3, fontSize: 13, bold: true, color: C.AMBER });
  text(s, "“VIP 고객이 환불 기간이 짧다고 불만이에요. 사유도 남기고, 고액은 승인 절차가 필요합니다. 모바일 앱에 영향이 있으면 미리 알려주세요.”", { x: 8.55, y: 2.2, w: 3.95, h: 1.45, fontSize: 17, color: C.TEXT });
  card(pptx, s, 8.3, 3.9, 4.4, 2.75, { fill: C.BG, line: C.LINE });
  text(s, "데모 환경", { x: 8.55, y: 4.05, w: 3.9, h: 0.3, fontSize: 13, bold: true, color: C.PURPLE });
  s.addText([
    { text: "가상 쇼핑몰 ShopFlow의 주문·환불 서비스 (Python · FastAPI)", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "실제 코드 · 실제 Copilot CLI 세션을 녹화", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "대기 시간만 배속으로 편집", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "사전 검증(staging) · 운영(production) 환경은 로컬에서 시뮬레이션", options: { bullet: { indent: 14 } } },
  ], { x: 8.55, y: 4.4, w: 3.95, h: 2.2, fontFace: FONT, fontSize: 15, color: C.TEXT, margin: 0, valign: "top", paraSpaceAfter: 6 });
  footer(s, n);
  return s;
}

async function workflow(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 · 데모", "요건에서 운영까지: 7단계, 승인은 3곳");
  const steps = [
    ["FaMagnifyingGlass", "분석", "change-analyst", "01"], ["FaPenRuler", "설계", "solution-architect", "02"],
    ["FaCode", "구현", "app-developer", "03"], ["FaVial", "테스트", "qa-engineer", "04"],
    ["FaEye", "리뷰", "code-reviewer", "05"], ["FaRocket", "배포", "release-manager", "06"], ["FaChartLine", "운영", "ops-analyst", "07"],
  ];
  const gaps = [0.15, 0.5, 0.15, 0.15, 0.5, 0.15];
  const cw = 1.5; let x = 0.6; const y = 2.35; const xs = [];
  for (let i = 0; i < 7; i++) {
    xs.push(x);
    card(pptx, s, x, y, cw, 2.45, { fill: C.WHITE, line: C.PURPLE, lineW: 1.5, shadow: true });
    await iconBadge(pptx, s, steps[i][0], x + 0.43, y + 0.25, 0.64, C.PURPLE);
    text(s, steps[i][1], { x, y: y + 1.05, w: cw, h: 0.4, fontSize: 20, bold: true, align: "center" });
    text(s, steps[i][2], { x: x + 0.02, y: y + 1.5, w: cw - 0.04, h: 0.3, fontSize: 10.5, color: C.MUTED, align: "center", fontFace: MONO });
    pill(pptx, s, x + 0.35, y + 1.95, 0.8, 0.3, `산출물 ${steps[i][3]}`, { fill: C.BG, color: C.MUTED, size: 10 });
    if (i < 6) {
      const gx = x + cw; const g = gaps[i];
      s.addShape(pptx.ShapeType.line, { x: gx + 0.03, y: y + 1.22, w: g - 0.06, h: 0, line: { color: C.PURPLE, width: 2, endArrowType: "triangle" } });
      x = gx + g;
    }
  }
  const gateAt = [[xs[1] + cw + 0.25, "① 설계 승인"], [xs[4] + cw + 0.25, "② 코드 승인"]];
  for (const [gx, label] of gateAt) {
    s.addShape(pptx.ShapeType.ellipse, { x: gx - 0.27, y: y - 0.72, w: 0.54, h: 0.54, fill: { color: C.AMBER_F }, line: { type: "none" } });
    s.addImage({ data: await L.icon("FaUserCheck", "#1F2328"), x: gx - 0.14, y: y - 0.59, w: 0.28, h: 0.28 });
    s.addShape(pptx.ShapeType.line, { x: gx, y: y - 0.18, w: 0, h: 1.4, line: { color: C.AMBER_F, width: 2, dashType: "dash" } });
    text(s, label, { x: gx - 1.0, y: y - 1.05, w: 2.0, h: 0.3, fontSize: 14, bold: true, align: "center", color: C.AMBER });
  }
  const px = xs[5] + cw - 0.3;
  s.addShape(pptx.ShapeType.ellipse, { x: px - 0.0, y: y - 0.72, w: 0.54, h: 0.54, fill: { color: C.AMBER_F }, line: { type: "none" } });
  s.addImage({ data: await L.icon("FaUserCheck", "#1F2328"), x: px + 0.13, y: y - 0.59, w: 0.28, h: 0.28 });
  text(s, "③ 운영 배포 승인", { x: px - 1.3, y: y - 1.05, w: 2.6, h: 0.3, fontSize: 14, bold: true, align: "center", color: C.AMBER });
  // 범례
  card(pptx, s, 0.6, 5.3, 12.1, 1.5, { fill: C.BG, line: null });
  s.addShape(pptx.ShapeType.ellipse, { x: 0.9, y: 5.5, w: 0.3, h: 0.3, fill: { color: C.AMBER_F }, line: { type: "none" } });
  text(s, "사람이 승인하는 지점", { x: 1.35, y: 5.45, w: 3.2, h: 0.4, fontSize: 16, bold: true, valign: "middle" });
  s.addShape(pptx.ShapeType.roundRect, { x: 4.6, y: 5.5, w: 0.5, h: 0.3, rectRadius: 0.08, fill: { color: C.PURPLE }, line: { type: "none" } });
  text(s, "AI 에이전트가 수행", { x: 5.25, y: 5.45, w: 3, h: 0.4, fontSize: 16, bold: true, valign: "middle" });
  text(s, "사람의 개입은 총 6번 — 승인 3곳 + 설계 단계의 결정 3건", { x: 0.9, y: 5.95, w: 11.6, h: 0.35, fontSize: 17, bold: true, color: C.PURPLE_D, valign: "middle" });
  text(s, "단계별 결과는 docs/cr/(결과 문서 폴더)에 01~07 번호 문서로 남아, 현업·감사가 그대로 읽을 수 있습니다.", { x: 0.9, y: 6.35, w: 11.6, h: 0.35, fontSize: 15, color: C.MUTED, valign: "middle" });
  footer(s, n);
  return s;
}

async function team(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 · 데모", "AI 팀원 7명: 역할마다 권한이 다릅니다");
  const head = (t) => ({ text: t, options: { bold: true, color: C.WHITE, fill: { color: C.PURPLE }, fontFace: FONT, fontSize: 14, align: "left", valign: "middle" } });
  const cell = (t, o = {}) => ({ text: t, options: Object.assign({ fontFace: FONT, fontSize: 14, color: C.TEXT, valign: "middle", align: "left" }, o) });
  const nameCell = (kr, id, fill) => ({ text: [{ text: kr, options: { bold: true, fontFace: FONT, fontSize: 15, color: C.TEXT } }, { text: "   " + id, options: { fontFace: MONO, fontSize: 11, color: C.MUTED } }], options: { valign: "middle", align: "left", fill: { color: fill } } });
  const data = [
    ["변경 분석가", "change-analyst", "영향 범위·DB 조회·결정 사항 도출", "결과 문서만", "읽기 전용"],
    ["설계자", "solution-architect", "설계서 작성, 결정은 사람에게 질문", "결과 문서만", "설계 승인 요청"],
    ["개발자", "app-developer", "승인된 설계대로 구현·커밋", "앱 · DB · 테스트 · 정책 문서", "설계 승인 전 수정 차단"],
    ["테스터", "qa-engineer", "요구사항별 테스트 작성·실행", "테스트 · 결과 문서", "운영 코드 수정 불가"],
    ["리뷰어", "code-reviewer", "설계·사내 표준·보안 점검", "결과 문서만", "코드 승인 요청"],
    ["배포 관리자", "release-manager", "병합·릴리스 계획·배포", "결과 문서 · 버전 파일", "운영 배포는 승인 팝업"],
    ["운영 분석가", "ops-analyst", "로그·DB 읽기 전용 분석", "결과 문서만", "운영 데이터 수정 불가"],
  ];
  const rows = [[head("AI 팀원"), head("하는 일"), head("쓸 수 있는 곳"), head("특징")]].concat(data.map((r, i) => {
    const fill = i % 2 === 0 ? C.BG : C.WHITE;
    return [nameCell(r[0], r[1], fill), cell(r[2], { fill: { color: fill } }), cell(r[3], { fontSize: 13, color: C.PURPLE_D, bold: true, fill: { color: fill } }), cell(r[4], { color: C.MUTED, fill: { color: fill } })];
  }));
  s.addTable(rows, { x: 0.6, y: 1.7, w: 12.1, colW: [3.5, 3.8, 2.6, 2.2], rowH: 0.57, border: { type: "solid", pt: 0.75, color: C.LINE }, margin: [0.04, 0.12, 0.04, 0.12] });
  text(s, "쓰기 범위는 Hook이 도구 호출 직전에 검사해 강제합니다 (데모에서 직접 검증)", { x: 0.6, y: 6.4, w: 12.1, h: 0.3, fontSize: 14, bold: true, color: C.PURPLE });
  text(s, "결과 문서 = docs/cr 폴더  ·  앱 · DB = 서비스 코드와 DB 변경 스크립트", { x: 0.6, y: 6.72, w: 12.1, h: 0.25, fontSize: 12, color: C.MUTED });
  footer(s, n);
  return s;
}


const fs = require("fs");
const sharp = require("sharp");
const hasFile = (p) => p && fs.existsSync(p);

async function gates(pptx, n, d = {}) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 · 데모", "사람이 승인하는 3곳, 시스템이 강제합니다");
  const g = [
    ["①", "설계 승인", "설계서를 검토하고 승인합니다. 승인 기록은 설계서의 지문(해시)과 묶여, 승인 후 설계서가 바뀌면 자동으로 무효가 됩니다.", "승인 전에는 코드 수정이 차단"],
    ["②", "코드 승인", "리뷰·테스트 결과를 확인하고 승인합니다. 승인한 코드와 지문(해시)이 같은 코드만 배포할 수 있습니다.", "승인 후 코드가 바뀌면 배포 차단"],
    ["③", "운영 배포 승인", "운영 배포 명령이 실행되기 직전에 승인 팝업이 뜹니다. 사람이 Yes를 눌러야만 실행됩니다.", "자동 승인 설정에서도 항상 팝업"],
  ];
  const CW = 5.8;
  for (let i = 0; i < 3; i++) {
    const y = 1.7 + i * 1.5;
    card(pptx, s, 0.6, y, CW, 1.38, { fill: C.AMBER_L, line: null });
    s.addShape(pptx.ShapeType.ellipse, { x: 0.82, y: y + 0.34, w: 0.7, h: 0.7, fill: { color: C.AMBER_F }, line: { type: "none" } });
    text(s, g[i][0], { x: 0.82, y: y + 0.34, w: 0.7, h: 0.7, align: "center", valign: "middle", fontSize: 24, bold: true });
    text(s, g[i][1], { x: 1.75, y: y + 0.12, w: 1.9, h: 0.4, fontSize: 21, bold: true });
    pill(pptx, s, 0.6 + CW - 2.2 - 0.15, y + 0.15, 2.2, 0.32, g[i][3], { fill: C.WHITE, color: C.AMBER, size: 11 });
    text(s, g[i][2], { x: 1.75, y: y + 0.56, w: CW - 1.75 - 0.15, h: 0.78, fontSize: 14, color: C.TEXT });
  }
  // 승인 팝업 캡처: 팝업이 보이는 아래쪽만 잘라 오른쪽 열 폭(6.0in)에 크게 배치
  const dx = 0.6 + CW + 0.3, dw = 12.7 - dx;
  let dh = dw * (700 / 1561);
  if (hasFile(d.dialogImage)) {
    const meta = await sharp(d.dialogImage).metadata();
    const top = Math.round(meta.height * (140 / 840));
    const crop = { left: 0, top, width: meta.width, height: meta.height - top };
    dh = dw * (crop.height / crop.width);
    const buf = await sharp(d.dialogImage).extract(crop).png().toBuffer();
    s.addImage({ data: "image/png;base64," + buf.toString("base64"), x: dx, y: 1.7, w: dw, h: dh, altText: "운영 배포 승인 팝업(Hook permission request) 실제 Copilot CLI 화면" });
    s.addShape(pptx.ShapeType.roundRect, { x: dx, y: 1.7, w: dw, h: dh, rectRadius: 0.06, fill: { type: "none" }, line: { color: C.LINE_D, width: 1.25 } });
  } else {
    L.placeholderBox(pptx, s, dx, 1.7, dw, dh, "실제 승인 팝업 화면 (Hook permission request)");
  }
  text(s, "③ 운영 배포 승인 — 실제 Copilot CLI 화면", { x: dx, y: 1.7 + dh + 0.06, w: dw, h: 0.28, fontSize: 12, color: C.MUTED, align: "center" });
  card(pptx, s, dx, 4.8, dw, 1.28, { fill: C.BG, line: null });
  text(s, "이 팝업에서 사람이 확인하는 것", { x: dx + 0.2, y: 4.9, w: dw - 0.4, h: 0.3, fontSize: 13, bold: true, color: C.MUTED });
  s.addText([
    { text: "무엇을 실행하려는지 (명령)", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "왜 승인이 필요한지 (영향 설명)", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Yes 또는 No 선택", options: { bullet: { indent: 14 } } },
  ], { x: dx + 0.2, y: 5.24, w: dw - 0.4, h: 0.8, fontFace: FONT, fontSize: 14, color: C.TEXT, margin: 0, valign: "top", paraSpaceAfter: 2 });
  card(pptx, s, 0.6, 6.2, 12.1, 0.58, { fill: C.PURPLE_L, line: null });
  text(s, "승인은 '부탁'이 아니라 '구조'입니다 — AI가 승인 없이 진행하려 해도 시스템이 막습니다", { x: 0.85, y: 6.2, w: 11.6, h: 0.58, fontSize: 16, bold: true, color: C.PURPLE_D, valign: "middle" });
  footer(s, n);
  return s;
}

async function safety(pptx, n, d = {}) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 3 · 효과와 안전", "'빠르게'만큼 중요한 '안전하게': 6겹의 통제");
  const f = [
    ["FaUserShield", "역할별 권한", "도구 · 쓰기 경로를 역할마다 제한", d.ev1 || "분석가의 코드 수정 시도 → 차단"],
    ["FaUserCheck", "사람 승인 게이트", "설계 · 코드 · 운영 배포는 사람만", d.ev2 || "승인 팝업 3회 · 승인 기록 보관"],
    ["FaBan", "위험 명령 차단", "코드 외부 반영(git push) · 강제 삭제 · 관리자 권한 명령 등", d.ev3 || "git push 시도 → 차단"],
    ["FaLock", "보호 경로", "에이전트 설정 · 검사 규칙(Hook) · 표준 · 승인 기록은 수정 불가", d.ev4 || "자기 규칙은 AI가 바꿀 수 없음"],
    ["FaFileSignature", "감사 로그", "모든 도구 호출과 차단 · 승인 이력", d.ev5 || "도구 호출 기록"],
    ["FaScaleBalanced", "조직 정책", "관리자가 허용 · 확인 · 금지 규칙을 전사에 적용", "관리자가 전사 강제 (데모 외 기능)"],
  ];
  for (let i = 0; i < 6; i++) {
    const x = 0.6 + (i % 3) * 4.1; const y = 1.7 + Math.floor(i / 3) * 2.4;
    card(pptx, s, x, y, 3.9, 2.25, { fill: C.WHITE, line: C.LINE, shadow: true });
    await iconBadge(pptx, s, f[i][0], x + 0.28, y + 0.25, 0.66, C.GREEN);
    text(s, f[i][1], { x: x + 1.1, y: y + 0.25, w: 2.65, h: 0.66, fontSize: 21, bold: true, valign: "middle" });
    text(s, f[i][2], { x: x + 0.28, y: y + 1.05, w: 3.35, h: 0.62, fontSize: 14, color: C.MUTED });
    card(pptx, s, x + 0.28, y + 1.7, 3.35, 0.4, { fill: i < 5 ? C.GREEN_L : C.BG, line: null, radius: 0.2 });
    text(s, f[i][3], { x: x + 0.28, y: y + 1.7, w: 3.35, h: 0.4, fontSize: 12, bold: true, color: i < 5 ? C.GREEN : C.MUTED, align: "center", valign: "middle" });
  }
  text(s, "초록 = 이번 데모에서 직접 확인한 항목  ·  격리 실행 환경(샌드박스)으로 실행 범위를 더 좁힐 수도 있습니다", { x: 0.6, y: 6.58, w: 12.1, h: 0.28, fontSize: 13, color: C.MUTED });
  footer(s, n);
  return s;
}

async function values(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 3 · 효과와 안전", "현업 · 개발 · 보안 · 운영, 각자에게 달라지는 것");
  const cols = [
    ["FaUsers", "현업", C.BLUE, ["요건이 어떻게 반영되는지 문서로 바로 확인", "영향 · 위험 · 결정 사항을 미리 안내받음", "결과 화면을 직접 보고 확인"]],
    ["FaLaptopCode", "개발", C.PURPLE, ["반복 작업(분석·문서·테스트)은 AI에게", "설계와 판단에 집중", "사내 표준을 에이전트가 매번 준수"]],
    ["FaShieldHalved", "보안 · 감사", C.GREEN, ["역할별 권한과 위험 명령 차단", "도구 호출 · 승인 기록이 모두 남음", "승인한 코드 = 배포된 코드 (변조 방지)"]],
    ["FaServer", "운영", C.AMBER, ["배포 · 롤백 절차의 표준화", "배포 직후 로그 분석을 즉시", "읽기 전용 분석으로 운영 데이터 보호"]],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 3.07;
    card(pptx, s, x, 1.7, 2.9, 4.4, { fill: C.WHITE, line: C.LINE, shadow: true });
    await iconBadge(pptx, s, cols[i][0], x + 0.3, 1.98, 0.78, cols[i][2]);
    text(s, cols[i][1], { x: x + 1.2, y: 1.98, w: 1.65, h: 0.78, fontSize: 22, bold: true, valign: "middle", color: cols[i][2] });
    s.addText(cols[i][3].map((t, k) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: k < 2 } })),
      { x: x + 0.3, y: 3.1, w: 2.4, h: 3.3, fontFace: FONT, fontSize: 18, color: C.TEXT, margin: 0, valign: "top", paraSpaceAfter: 14 });
  }
  card(pptx, s, 0.6, 6.3, 12.1, 0.62, { fill: C.PURPLE_L, line: null });
  text(s, "같은 워크플로우가 현업에는 투명성, 개발에는 집중, 보안에는 통제, 운영에는 표준화를 줍니다", { x: 0.85, y: 6.3, w: 11.6, h: 0.62, fontSize: 16, bold: true, color: C.PURPLE_D, valign: "middle" });
  footer(s, n);
  return s;
}

async function roadmap(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 3 · 효과와 안전", "이렇게 시작하세요: 파일럿 → 표준화 → 확산");
  const ph = [
    ["1", "파일럿", "2~4주", ["한 팀 · 저위험 변경 요청 1~2건", "에이전트 3개(분석 · 개발 · 리뷰)로 시작", "성공 기준(리드타임 · 재작업)을 먼저 정의"], C.PURPLE],
    ["2", "표준화", "4~8주", ["팀 에이전트 · 지침을 저장소에 정리", "자동 검사 규칙(Hook)으로 권한 · 승인 게이트 적용", "조직 정책(승인·차단 규칙) 설정"], C.BLUE],
    ["3", "확산", "분기 단위", ["조직 공용 저장소로 에이전트를 전사 배포", "GitHub 배포 승인·자동화(Environments · Actions)와 연계", "클라우드 에이전트 · 병렬 작업으로 확대"], C.GREEN],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.15;
    card(pptx, s, x, 1.75, 3.8, 3.65, { fill: C.WHITE, line: ph[i][4], lineW: 2, shadow: true });
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.3, y: 2.0, w: 0.7, h: 0.7, fill: { color: ph[i][4] }, line: { type: "none" } });
    text(s, ph[i][0], { x: x + 0.3, y: 2.0, w: 0.7, h: 0.7, align: "center", valign: "middle", fontSize: 26, bold: true, color: C.WHITE });
    text(s, ph[i][1], { x: x + 1.2, y: 1.98, w: 2.4, h: 0.42, fontSize: 24, bold: true });
    text(s, ph[i][2], { x: x + 1.2, y: 2.4, w: 2.4, h: 0.3, fontSize: 14, color: C.MUTED });
    s.addText(ph[i][3].map((t, k) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: k < 2 } })),
      { x: x + 0.3, y: 3.0, w: 3.25, h: 2.3, fontFace: FONT, fontSize: 16, color: C.TEXT, margin: 0, valign: "top", paraSpaceAfter: 9 });
    if (i < 2) s.addShape(pptx.ShapeType.line, { x: x + 3.82, y: 3.55, w: 0.31, h: 0, line: { color: C.FAINT, width: 2.5, endArrowType: "triangle" } });
  }
  card(pptx, s, 0.6, 5.65, 12.1, 1.0, { fill: C.BG, line: null });
  text(s, "측정 지표", { x: 0.85, y: 5.72, w: 2, h: 0.3, fontSize: 13, bold: true, color: C.PURPLE });
  text(s, "요건 → 배포 리드타임   ·   재작업률   ·   결함 누수   ·   승인 대기 시간   ·   AI 크레딧 사용량", { x: 0.85, y: 6.05, w: 11.6, h: 0.45, fontSize: 18, bold: true });
  text(s, "기간은 시작을 위한 제안이며, 조직 규모와 정책에 따라 조정합니다.", { x: 0.6, y: 6.75, w: 8, h: 0.28, fontSize: 12, color: C.MUTED });
  footer(s, n);
  return s;
}

async function closing(pptx, n, d = {}) {
  const s = pptx.addSlide();
  s.background = { color: C.INK };
  text(s, "지금 바로 시작할 수 있습니다", { x: 0.8, y: 0.8, w: 11, h: 0.8, fontSize: 38, bold: true, color: C.WHITE });
  const steps = [
    ["1", "설치", "npm install -g @github/copilot\nbrew install --cask copilot-cli\nwinget install GitHub.Copilot"],
    ["2", "실행", "copilot          # 대화형 시작\n/agent           # 에이전트 선택\ncopilot -p \"...\"  # 한 번에 실행"],
    ["3", "따라 하기", "데모 저장소 shopflow-orders\nREADME의 데모 스크립트로\n오늘 본 흐름을 그대로 재현"],
  ];
  steps.forEach(([k, a, b], i) => {
    const x = 0.8 + i * 4.0;
    card(pptx, s, x, 2.0, 3.8, 2.75, { fill: C.PANEL, line: C.LINE_D, radius: 0.16 });
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.3, y: 2.25, w: 0.55, h: 0.55, fill: { color: C.VIOLET }, line: { type: "none" } });
    text(s, k, { x: x + 0.3, y: 2.25, w: 0.55, h: 0.55, align: "center", valign: "middle", fontSize: 20, bold: true, color: C.INK });
    text(s, a, { x: x + 1.05, y: 2.27, w: 2.6, h: 0.5, fontSize: 22, bold: true, color: C.WHITE, valign: "middle" });
    text(s, b, { x: x + 0.3, y: 3.05, w: 3.35, h: 1.55, fontSize: 12, color: "C9D1D9", fontFace: MONO, lineSpacingMultiple: 1.2 });
  });
  card(pptx, s, 0.8, 5.0, 11.8, 1.15, { fill: C.PURPLE, line: null, radius: 0.16 });
  text(s, "다음 단계 제안", { x: 1.1, y: 5.12, w: 3, h: 0.3, fontSize: 13, bold: true, color: "EADCFF" });
  text(s, "고객 환경의 변경 요청 1건으로 파일럿  →  에이전트 3개 + 승인 게이트 적용  →  결과와 지표 리뷰", { x: 1.1, y: 5.52, w: 11.2, h: 0.5, fontSize: 20, bold: true, color: C.WHITE });
  text(s, "Q & A", { x: 0.8, y: 6.4, w: 3, h: 0.6, fontSize: 30, bold: true, color: C.VIOLET });
  text(s, "문서: docs.github.com/copilot  ·  Copilot CLI: docs.github.com/copilot/concepts/copilot-surfaces/copilot-cli", { x: 3.2, y: 6.55, w: 9.4, h: 0.3, fontSize: 12, color: "8B949E" });
  return s;
}

module.exports = { gates, safety, values, roadmap, closing, cover, keyMessages, evolution, features, surfaces, cliIntro, customAgent, scenario, workflow, team };
