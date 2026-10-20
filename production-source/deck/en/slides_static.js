// Static slides (introduction, explanation, closing) that do not depend on measured data
// ASCII-only source: non-ASCII symbols are written as \uXXXX escapes (keeps byte-wise greps for Hangul clean).
const L = require("../lib");
const { C, FONT, MONO, text, card, pill, iconBadge, title, footer, tracker, gateBadge } = L;

async function cover(pptx, n, d = {}) {
  const s = pptx.addSlide();
  s.background = { color: C.INK };
  text(s, "Enterprise development & operations workflow demo", { x: 0.8, y: 1.05, w: 7.4, h: 0.35, fontSize: 15, bold: true, color: C.VIOLET, charSpacing: 1 });
  text(s, "From request to release,\nAI works.\nPeople decide.", { x: 0.8, y: 1.6, w: 7.5, h: 3.2, fontSize: 44, bold: true, color: C.WHITE, lineSpacingMultiple: 1.05 });
  text(s, "Fast, safe development and operations workflows\nbuilt with GitHub Copilot CLI \u00d7 Custom Agent", { x: 0.8, y: 4.95, w: 7.5, h: 0.9, fontSize: 20, color: "C9D1D9", lineSpacingMultiple: 1.15 });
  text(s, "Oct 2026  \u00b7  Demo recorded from a real Copilot CLI session", { x: 0.8, y: 6.55, w: 7.5, h: 0.3, fontSize: 15, color: "A8B1BB" });

  // Right: terminal card (wording taken from the real session)
  card(pptx, s, 8.55, 1.15, 4.2, 3.75, { fill: C.PANEL, line: C.LINE_D, radius: 0.18 });
  [["FF5F56", 8.8], ["FFBD2E", 9.04], ["27C93F", 9.28]].forEach(([col, x]) => s.addShape(pptx.ShapeType.ellipse, { x, y: 1.37, w: 0.14, h: 0.14, fill: { color: col }, line: { type: "none" } }));
  const lines = (d.lines || []).map((l) => l.map(([t, color, bold]) => ({ text: t, options: Object.assign({ color }, bold ? { bold: true } : {}) })));
  const runs = [];
  lines.forEach((l, i) => { l.forEach((r, j) => runs.push({ text: r.text, options: Object.assign({ fontFace: MONO, fontSize: 13 }, r.options, j === l.length - 1 && i < lines.length - 1 ? { breakLine: true } : {}) })); });
  s.addText(runs, { x: 8.8, y: 1.8, w: 3.9, h: 3.6, margin: 0, valign: "top", paraSpaceAfter: 7 });

  // 7 pipeline dots + 3 human approvals
  const names = L.STEPS; const x0 = 8.6; const step = 0.6;
  names.forEach((nm, i) => {
    const gate = i === 1 || i === 4 || i === 5;
    s.addShape(pptx.ShapeType.ellipse, { x: x0 + i * step, y: 5.62, w: 0.28, h: 0.28, fill: { color: gate ? C.AMBER_F : C.VIOLET }, line: { type: "none" } });
    text(s, nm, { x: x0 + i * step - 0.15, y: 5.98, w: 0.58, h: 0.25, fontSize: 11, color: "B1BAC4", align: "center" });
  });
  text(s, "3 human approvals \u25cf", { x: 8.6, y: 5.22, w: 3, h: 0.28, fontSize: 13, bold: true, color: C.AMBER_F });
  return s;
}

async function keyMessages(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "KEY TAKEAWAYS", "AI works, people decide");
  const cards = [
    { w: "Fast", color: C.PURPLE, tint: C.PURPLE_L, icon: "FaBolt", head: "Request to production in one session", b: ["7 stages from analysis to operations, each run by its own AI teammate", "Every stage leaves a result document"] },
    { w: "Safe", color: C.GREEN, tint: C.GREEN_L, icon: "FaShieldHalved", head: "Permissions by role; the system blocks risks", b: ["Limited write scope; risky commands are blocked", "Every tool call is recorded in an audit log"] },
    { w: "Human-led", color: C.AMBER, tint: C.AMBER_L, icon: "FaUserCheck", head: "Three approvals are always human", b: ["Design \u00b7 code \u00b7 deploy approvals", "No approval, no next stage", "People make the 3 design decisions"] },
  ];
  for (let i = 0; i < 3; i++) {
    const c = cards[i]; const x = 0.6 + i * 4.1;
    card(pptx, s, x, 1.75, 3.9, 4.2, { shadow: true });
    await iconBadge(pptx, s, c.icon, x + 0.35, 2.05, 0.82, c.color);
    text(s, c.w, { x: x + 1.35, y: 2.12, w: 2.5, h: 0.7, fontSize: 32, bold: true, color: c.color, valign: "middle" });
    text(s, c.head, { x: x + 0.35, y: 3.1, w: 3.3, h: 0.9, fontSize: 21, bold: true });
    s.addText(c.b.map((t, k) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: k < c.b.length - 1 } })),
      { x: x + 0.35, y: 4.05, w: 3.3, h: 1.8, fontFace: FONT, fontSize: 17, color: C.MUTED, margin: 0, valign: "top", paraSpaceAfter: 8 });
  }
  text(s, "Agenda   \u2460  Copilot at a glance   \u2192   \u2461  Demo: request to operations   \u2192   \u2462  Impact \u00b7 safety \u00b7 adoption", { x: 0.6, y: 6.2, w: 12.1, h: 0.4, fontSize: 16, color: C.MUTED, bold: true });
  footer(s, n);
  return s;
}

async function evolution(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 1 \u00b7 GITHUB COPILOT AT A GLANCE", "From code assistant to development teammate");
  const steps = [
    { h: 2.35, name: "Suggest", tag: "Assistive", d: "Suggests the next code as you type", icon: "FaWandMagicSparkles" },
    { h: 3.05, name: "Chat", tag: "Assistive", d: "Ask and answer questions about code and repositories", icon: "FaCommentDots" },
    { h: 3.75, name: "Agent", tag: "Agentic", d: "Repeats plan \u2192 edit files \u2192 run commands \u2192 verify on its own", icon: "FaRobot" },
    { h: 4.45, name: "Customize", tag: "Customizable", d: "Specialist agents with your rules, running many tasks in parallel", icon: "FaPeopleGroup" },
  ];
  text(s, "From a tool that helps\nto a teammate you can hand work to", { x: 0.6, y: 1.75, w: 6.2, h: 1.3, fontSize: 24, bold: true, color: C.MUTED, lineSpacingMultiple: 1.15 });
  for (let i = 0; i < 4; i++) {
    const st = steps[i]; const x = 0.6 + i * 3.05; const y = 6.05 - st.h; const last = i === 3;
    card(pptx, s, x, y, 2.9, st.h, { fill: last ? C.PURPLE : C.BG, line: last ? C.PURPLE : C.LINE, shadow: last });
    await iconBadge(pptx, s, st.icon, x + 0.28, y + 0.28, 0.7, last ? C.WHITE : C.PURPLE, last ? "#7B3FE4" : "#FFFFFF");
    pill(pptx, s, x + 1.45, y + 0.4, 1.25, 0.34, st.tag, { fill: last ? C.PURPLE_D : C.PURPLE_L, color: last ? C.WHITE : C.PURPLE, size: 11 });
    text(s, st.name, { x: x + 0.28, y: y + 1.12, w: 2.4, h: 0.5, fontSize: 24, bold: true, color: last ? C.WHITE : C.TEXT });
    text(s, st.d, { x: x + 0.28, y: y + 1.68, w: 2.4, h: st.h - 1.8, fontSize: 16, color: last ? "EADCFF" : C.MUTED });
  }
  text(s, "People always review and approve \u2014 Copilot suggests and acts, but people stay accountable.", { x: 0.6, y: 6.22, w: 12.1, h: 0.35, fontSize: 16, bold: true, color: C.PURPLE });
  footer(s, n, { source: "Source: GitHub Docs \u00b7 About GitHub Copilot (Assistive / Agentic / Customizations)" });
  return s;
}

async function features(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 1 \u00b7 GITHUB COPILOT AT A GLANCE", "Six core capabilities");
  const f = [
    ["FaWandMagicSparkles", "Suggestions", "Suggests code, tests and comments as you type", "IDE"],
    ["FaCommentDots", "Chat", "Ask about code, errors and options in plain language", "IDE \u00b7 GitHub.com \u00b7 Mobile"],
    ["FaRobot", "Agent", "Edits many files, runs commands and verifies results on its own", "IDE \u00b7 CLI \u00b7 App"],
    ["FaCloud", "Cloud agent", "Assign an issue; it works in the cloud and opens a PR", "GitHub.com"],
    ["FaCodePullRequest", "Code review", "Reviews pull requests and proposes fixes", "GitHub.com \u00b7 CLI"],
    ["FaSliders", "Customization", "Tailor it with instructions, custom agents, MCP, skills and hooks", "All surfaces"],
  ];
  for (let i = 0; i < 6; i++) {
    const x = 0.6 + (i % 3) * 4.1; const y = 1.7 + Math.floor(i / 3) * 2.5; const hot = i === 2 || i === 5;
    card(pptx, s, x, y, 3.9, 2.3, { fill: C.WHITE, line: hot ? C.PURPLE : C.LINE, lineW: hot ? 2 : 1, shadow: true });
    await iconBadge(pptx, s, f[i][0], x + 0.3, y + 0.3, 0.7, hot ? C.PURPLE : C.BLUE);
    text(s, f[i][1], { x: x + 1.2, y: y + 0.3, w: 2.5, h: 0.7, fontSize: 22, bold: true, valign: "middle" });
    text(s, f[i][2], { x: x + 0.3, y: y + 1.15, w: 3.35, h: 0.7, fontSize: 16, color: C.TEXT });
    text(s, f[i][3], { x: x + 0.3, y: y + 1.88, w: 3.35, h: 0.3, fontSize: 12, color: C.FAINT, bold: true });
  }
  text(s, "Purple border = used directly in today's demo", { x: 0.6, y: 6.68, w: 5.0, h: 0.28, fontSize: 13, color: C.PURPLE, bold: true });
  text(s, "MCP = external tool connections  \u00b7  Skills = task playbooks  \u00b7  Hooks = automatic check rules", { x: 5.6, y: 6.68, w: 7.13, h: 0.28, fontSize: 12, color: C.MUTED, align: "right" });
  footer(s, n);
  return s;
}

async function surfaces(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 1 \u00b7 GITHUB COPILOT AT A GLANCE", "The same Copilot, wherever you work");
  const f = [
    ["FaLayerGroup", "Copilot app", "Run agent tasks in parallel; see repositories and PR flow in one view"],
    ["FaTerminal", "Copilot CLI", "Run commands in the terminal \u00b7 repeatable workflows \u00b7 automation", true],
    ["FaLaptopCode", "IDE", "Suggestions, chat and agents in VS Code, Visual Studio, JetBrains, Eclipse and Xcode"],
    ["FaGlobe", "GitHub.com", "Ask questions in issues and PRs, and delegate work to agents"],
    ["FaMobileScreen", "GitHub Mobile", "Ask questions and check progress on the go"],
    ["FaPlug", "Copilot SDK", "Build Copilot capabilities into your own services and tools"],
  ];
  for (let i = 0; i < 6; i++) {
    const x = 0.6 + (i % 3) * 4.1; const y = 1.7 + Math.floor(i / 3) * 2.25; const hot = !!f[i][3];
    card(pptx, s, x, y, 3.9, 2.05, { fill: hot ? C.PURPLE : C.BG, line: hot ? C.PURPLE : C.LINE, shadow: hot });
    await iconBadge(pptx, s, f[i][0], x + 0.3, y + 0.28, 0.62, hot ? C.WHITE : C.BLUE, hot ? "#7B3FE4" : "#FFFFFF");
    text(s, f[i][1], { x: x + 1.1, y: y + 0.28, w: 2.6, h: 0.62, fontSize: 21, bold: true, valign: "middle", color: hot ? C.WHITE : C.TEXT });
    text(s, f[i][2], { x: x + 0.3, y: y + 1.05, w: 3.35, h: 0.85, fontSize: 15, color: hot ? "EADCFF" : C.MUTED });
    if (hot) pill(pptx, s, x + 2.2, y + 1.67, 1.5, 0.28, "Today's focus", { fill: C.AMBER_F, color: C.TEXT, size: 11 });
  }
  card(pptx, s, 0.6, 6.15, 12.1, 0.62, { fill: C.PURPLE_L, line: null });
  text(s, "Instructions, skills, MCP and model choice are shared across surfaces (support varies by feature)", { x: 0.85, y: 6.15, w: 11.6, h: 0.62, fontSize: 14, color: C.PURPLE_D, bold: true, valign: "middle" });
  footer(s, n);
  return s;
}

async function cliIntro(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 1 \u00b7 GITHUB COPILOT AT A GLANCE", "Copilot CLI: the AI agent in your terminal", { size: 30 });
  const rows = [
    ["FaCommentDots", "Interactive \u00b7 Non-interactive", "Work in conversation with a person, or run once from a script"],
    ["FaClipboardCheck", "Plan \u00b7 Autopilot", "Approve the plan first; run autonomously when needed"],
    ["FaUserShield", "Permission prompts", "Allow or deny per command, file or URL; risky actions ask first"],
    ["FaCubes", "Parallel \u00b7 Delegation", "Run several tasks at once, or delegate them to the cloud"],
    ["FaMobileScreen", "Remote access", "Check running sessions from the web or mobile, and respond"],
  ];
  for (let i = 0; i < rows.length; i++) {
    const y = 1.7 + i * 0.97;
    await iconBadge(pptx, s, rows[i][0], 0.6, y, 0.66, C.PURPLE);
    text(s, rows[i][1], { x: 1.5, y: y - 0.02, w: 5.9, h: 0.36, fontSize: 19, bold: true });
    text(s, rows[i][2], { x: 1.5, y: y + 0.36, w: 5.9, h: 0.55, fontSize: 15, color: C.MUTED });
  }
  card(pptx, s, 7.85, 1.7, 4.85, 4.75, { fill: C.INK, line: C.INK, radius: 0.18 });
  text(s, "Why the terminal?", { x: 8.2, y: 2.0, w: 4.2, h: 0.5, fontSize: 24, bold: true, color: C.WHITE });
  text(s, "Where dev and ops meet", { x: 8.2, y: 2.7, w: 4.2, h: 0.45, fontSize: 20, bold: true, color: C.VIOLET });
  text(s, "Git, builds, tests, deployments, cloud CLIs and logs all live in the terminal.", { x: 8.2, y: 3.25, w: 4.2, h: 0.95, fontSize: 16, color: "C9D1D9" });
  text(s, "So the whole flow from request to operations can run in a single session.", { x: 8.2, y: 4.3, w: 4.2, h: 0.95, fontSize: 16, color: "C9D1D9" });
  text(s, "$ copilot --agent change-analyst", { x: 8.2, y: 5.55, w: 4.3, h: 0.35, fontSize: 14, color: C.AMBER_F, fontFace: MONO });
  text(s, "The GitHub Copilot app also runs on top of Copilot CLI.", { x: 7.85, y: 6.6, w: 4.85, h: 0.3, fontSize: 12, color: C.FAINT });
  footer(s, n);
  return s;
}

async function customAgent(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 \u00b7 DEMO", "Custom agent: an AI teammate that works your way", { size: 30 });
  card(pptx, s, 0.6, 1.7, 7.5, 5.0, { fill: C.INK, line: C.INK, radius: 0.16 });
  const code = [
    ["---", "8B949E"],
    ["name: change-analyst", "79C0FF"],
    ["description: Read-only analyst that assesses the", "79C0FF"],
    ["  impact of a change request (CR)", "79C0FF"],
    ['tools: ["view","grep","bash","create"]', "FFA657"],
    ["hooks:", "D2A8FF"],
    ["  preToolUse:", "D2A8FF"],
    ["    - command: guard.py --role analyst", "D2A8FF"],
    ["---", "8B949E"],
    ["# Role", "7EE787"],
    ["You are the Change Analyst on the ShopFlow team.", "E6EDF3"],
    ["1. Read the request and restate intents R1\u2026R4", "E6EDF3"],
    ["2. Use grep to find the impact and cite evidence", "E6EDF3"],
    ["3. Give options and a recommendation for decisions", "E6EDF3"],
  ];
  s.addText(code.map(([t, col], i) => ({ text: t, options: { color: col, fontFace: MONO, fontSize: 14, breakLine: i < code.length - 1 } })),
    { x: 0.95, y: 2.0, w: 6.9, h: 4.5, margin: 0, valign: "top", lineSpacing: 18, paraSpaceAfter: 5 });
  // Fixed 23pt line pitch (18pt line + 5pt gap): each number mark is centered on the middle line of its block
  const marks = [[2, "1"], [4, "2"], [6, "3"], [11, "4"]];
  marks.forEach(([ln, k]) => {
    const y = 2.0 + (9 + 23 * ln) / 72 - 0.17;
    s.addShape(pptx.ShapeType.ellipse, { x: 7.62, y, w: 0.34, h: 0.34, fill: { color: C.AMBER_F }, line: { type: "none" } });
    text(s, k, { x: 7.62, y, w: 0.34, h: 0.34, align: "center", valign: "middle", fontSize: 13, bold: true });
  });
  const legend = [["1", "Role", "What job this agent takes on"], ["2", "Tool permissions", "Only the tools it needs (least privilege)"], ["3", "Enforcement (hook)", "The system checks every tool call first"], ["4", "Work instructions", "Our team's steps, formats and don'ts"]];
  legend.forEach(([k, a, b], i) => {
    const y = 1.7 + i * 0.78;
    s.addShape(pptx.ShapeType.ellipse, { x: 8.55, y: y + 0.05, w: 0.4, h: 0.4, fill: { color: C.AMBER_F }, line: { type: "none" } });
    text(s, k, { x: 8.55, y: y + 0.05, w: 0.4, h: 0.4, align: "center", valign: "middle", fontSize: 14, bold: true });
    text(s, a, { x: 9.1, y, w: 3.6, h: 0.32, fontSize: 18, bold: true });
    text(s, b, { x: 9.1, y: y + 0.34, w: 3.6, h: 0.3, fontSize: 14, color: C.MUTED });
  });
  card(pptx, s, 8.55, 4.95, 4.15, 1.75, { fill: C.PURPLE_L, line: null });
  text(s, "Define it once; the whole team works to the same standard", { x: 8.8, y: 5.05, w: 3.7, h: 0.55, fontSize: 16, bold: true, color: C.PURPLE_D });
  text(s, "Personal  ~/.copilot/agents\nRepo      .github/agents\nOrg       .github-private/agents", { x: 8.8, y: 5.65, w: 3.7, h: 0.95, fontSize: 13, color: C.TEXT, fontFace: MONO, lineSpacingMultiple: 1.15 });
  footer(s, n, { source: "Source: GitHub Docs \u00b7 About custom agents / Custom agents configuration  |  The code on the left is an abridged excerpt of the real agent file (change-analyst.agent.md)" });
  return s;
}

async function scenario(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 \u00b7 DEMO", "Scenario: a change request from the business");
  card(pptx, s, 0.6, 1.7, 7.4, 4.95, { shadow: true });
  pill(pptx, s, 0.9, 1.95, 1.7, 0.34, "CR-2026-014", { fill: C.PURPLE_L, color: C.PURPLE, mono: true });
  text(s, "VIP refund policy \u00b7 High-value refund control", { x: 0.9, y: 2.4, w: 6.9, h: 0.5, fontSize: 22, bold: true });
  text(s, "Requested by the Customer Experience (CX) team \u00b7 Target date 2026-11-02", { x: 0.9, y: 2.95, w: 6.9, h: 0.3, fontSize: 14, color: C.MUTED });
  const reqs = [["R1", "VIP refund window 30 \u2192 60 days (standard stays 30)"], ["R2", "Require a refund reason on every refund request"], ["R3", "Refunds over \u20a91,000,000 wait for admin approval"], ["R4", "Update customer screens, e-mails and policy docs too"]];
  reqs.forEach(([k, t], i) => {
    const y = 3.5 + i * 0.7;
    pill(pptx, s, 0.9, y + 0.04, 0.6, 0.38, k, { fill: C.PURPLE, color: C.WHITE, size: 13 });
    text(s, t, { x: 1.7, y, w: 6.1, h: 0.5, fontSize: 17, valign: "middle" });
  });
  card(pptx, s, 8.3, 1.7, 4.4, 2.0, { fill: C.AMBER_L, line: null });
  text(s, "In the business team's words", { x: 8.55, y: 1.85, w: 3.9, h: 0.3, fontSize: 13, bold: true, color: C.AMBER });
  text(s, "\u201cVIP customers say the refund window is too short. We need a reason on record and approval for high-value refunds. Tell us in advance if the mobile app is affected.\u201d", { x: 8.55, y: 2.2, w: 3.95, h: 1.45, fontSize: 16, color: C.TEXT });
  card(pptx, s, 8.3, 3.9, 4.4, 2.75, { fill: C.BG, line: C.LINE });
  text(s, "Demo environment", { x: 8.55, y: 4.05, w: 3.9, h: 0.3, fontSize: 13, bold: true, color: C.PURPLE });
  s.addText([
    { text: "Order and refund service of the fictional shop ShopFlow (Python \u00b7 FastAPI)", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Real code, recorded from a real Copilot CLI session", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Only the waiting time is sped up in editing", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Staging and production are simulated locally", options: { bullet: { indent: 14 } } },
  ], { x: 8.55, y: 4.4, w: 3.95, h: 2.2, fontFace: FONT, fontSize: 14, color: C.TEXT, margin: 0, valign: "top", paraSpaceAfter: 6 });
  footer(s, n);
  return s;
}

async function workflow(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 \u00b7 DEMO", "Request to operations: 7 stages, 3 approvals");
  const steps = [
    ["FaMagnifyingGlass", "Analyze", "change-analyst", "01"], ["FaPenRuler", "Design", "solution-architect", "02"],
    ["FaCode", "Build", "app-developer", "03"], ["FaVial", "Test", "qa-engineer", "04"],
    ["FaEye", "Review", "code-reviewer", "05"], ["FaRocket", "Deploy", "release-manager", "06"], ["FaChartLine", "Operate", "ops-analyst", "07"],
  ];
  const gaps = [0.15, 0.5, 0.15, 0.15, 0.5, 0.15];
  const cw = 1.5; let x = 0.6; const y = 2.35; const xs = [];
  for (let i = 0; i < 7; i++) {
    xs.push(x);
    card(pptx, s, x, y, cw, 2.45, { fill: C.WHITE, line: C.PURPLE, lineW: 1.5, shadow: true });
    await iconBadge(pptx, s, steps[i][0], x + 0.43, y + 0.25, 0.64, C.PURPLE);
    text(s, steps[i][1], { x, y: y + 1.05, w: cw, h: 0.4, fontSize: 20, bold: true, align: "center" });
    text(s, steps[i][2], { x: x + 0.02, y: y + 1.5, w: cw - 0.04, h: 0.3, fontSize: 10.5, color: C.MUTED, align: "center", fontFace: MONO });
    pill(pptx, s, x + 0.35, y + 1.95, 0.8, 0.3, `Doc ${steps[i][3]}`, { fill: C.BG, color: C.MUTED, size: 10 });
    if (i < 6) {
      const gx = x + cw; const g = gaps[i];
      s.addShape(pptx.ShapeType.line, { x: gx + 0.03, y: y + 1.22, w: g - 0.06, h: 0, line: { color: C.PURPLE, width: 2, endArrowType: "triangle" } });
      x = gx + g;
    }
  }
  const gateAt = [[xs[1] + cw + 0.25, "\u2460 Design approval"], [xs[4] + cw + 0.25, "\u2461 Code approval"]];
  for (const [gx, label] of gateAt) {
    s.addShape(pptx.ShapeType.ellipse, { x: gx - 0.27, y: y - 0.72, w: 0.54, h: 0.54, fill: { color: C.AMBER_F }, line: { type: "none" } });
    s.addImage({ data: await L.icon("FaUserCheck", "#1F2328"), x: gx - 0.14, y: y - 0.59, w: 0.28, h: 0.28 });
    s.addShape(pptx.ShapeType.line, { x: gx, y: y - 0.18, w: 0, h: 1.4, line: { color: C.AMBER_F, width: 2, dashType: "dash" } });
    text(s, label, { x: gx - 1.2, y: y - 1.05, w: 2.4, h: 0.3, fontSize: 14, bold: true, align: "center", color: C.AMBER });
  }
  const px = xs[5] + cw - 0.3;
  s.addShape(pptx.ShapeType.ellipse, { x: px - 0.0, y: y - 0.72, w: 0.54, h: 0.54, fill: { color: C.AMBER_F }, line: { type: "none" } });
  s.addImage({ data: await L.icon("FaUserCheck", "#1F2328"), x: px + 0.13, y: y - 0.59, w: 0.28, h: 0.28 });
  text(s, "\u2462 Production approval", { x: px - 0.45, y: y - 1.05, w: 2.3, h: 0.3, fontSize: 14, bold: true, align: "center", color: C.AMBER });
  // Legend
  card(pptx, s, 0.6, 5.3, 12.1, 1.5, { fill: C.BG, line: null });
  s.addShape(pptx.ShapeType.ellipse, { x: 0.9, y: 5.5, w: 0.3, h: 0.3, fill: { color: C.AMBER_F }, line: { type: "none" } });
  text(s, "Human approval points", { x: 1.35, y: 5.45, w: 3.2, h: 0.4, fontSize: 16, bold: true, valign: "middle" });
  s.addShape(pptx.ShapeType.roundRect, { x: 4.6, y: 5.5, w: 0.5, h: 0.3, rectRadius: 0.08, fill: { color: C.PURPLE }, line: { type: "none" } });
  text(s, "Done by AI agents", { x: 5.25, y: 5.45, w: 3, h: 0.4, fontSize: 16, bold: true, valign: "middle" });
  text(s, "Six human interventions in total \u2014 3 approvals + 3 decisions in the design stage", { x: 0.9, y: 5.95, w: 11.6, h: 0.35, fontSize: 17, bold: true, color: C.PURPLE_D, valign: "middle" });
  text(s, "Each stage leaves a numbered document (01\u201307) in docs/cr/ that business and audit teams can read as is.", { x: 0.9, y: 6.35, w: 11.6, h: 0.35, fontSize: 15, color: C.MUTED, valign: "middle" });
  footer(s, n);
  return s;
}

async function team(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 \u00b7 DEMO", "7 AI teammates with role-specific permissions");
  const head = (t) => ({ text: t, options: { bold: true, color: C.WHITE, fill: { color: C.PURPLE }, fontFace: FONT, fontSize: 14, align: "left", valign: "middle" } });
  const cell = (t, o = {}) => ({ text: t, options: Object.assign({ fontFace: FONT, fontSize: 14, color: C.TEXT, valign: "middle", align: "left" }, o) });
  const nameCell = (role, id, fill) => ({ text: [{ text: role, options: { bold: true, fontFace: FONT, fontSize: 15, color: C.TEXT, breakLine: true } }, { text: id, options: { fontFace: MONO, fontSize: 11, color: C.MUTED } }], options: { valign: "middle", align: "left", fill: { color: fill } } });
  const data = [
    ["Change Analyst", "change-analyst", "Finds impact scope and DB issues, surfaces decisions", "Result documents only", "Read-only"],
    ["Solution Architect", "solution-architect", "Writes the design document; asks people to decide", "Result documents only", "Requests design approval"],
    ["Developer", "app-developer", "Implements and commits the approved design", "App \u00b7 DB \u00b7 tests \u00b7 policy docs", "Edits blocked before design approval"],
    ["Tester", "qa-engineer", "Writes and runs tests for each requirement", "Tests \u00b7 result documents", "Cannot change production code"],
    ["Reviewer", "code-reviewer", "Checks design, company standards and security", "Result documents only", "Requests code approval"],
    ["Release Manager", "release-manager", "Merges, plans the release and deploys", "Result documents \u00b7 version file", "Production deploy needs an approval pop-up"],
    ["Ops Analyst", "ops-analyst", "Read-only analysis of logs and DB", "Result documents only", "Cannot change production data"],
  ];
  const rows = [[head("AI teammate"), head("What it does"), head("Where it can write"), head("Key trait")]].concat(data.map((r, i) => {
    const fill = i % 2 === 0 ? C.BG : C.WHITE;
    return [nameCell(r[0], r[1], fill), cell(r[2], { fill: { color: fill } }), cell(r[3], { fontSize: 13, color: C.PURPLE_D, bold: true, fill: { color: fill } }), cell(r[4], { color: C.MUTED, fill: { color: fill } })];
  }));
  s.addTable(rows, { x: 0.6, y: 1.7, w: 12.1, colW: [2.6, 3.7, 3.0, 2.8], rowH: 0.57, border: { type: "solid", pt: 0.75, color: C.LINE }, margin: [0.04, 0.12, 0.04, 0.12] });
  text(s, "Write scope is enforced by a hook that checks each tool call right before it runs (verified live in the demo)", { x: 0.6, y: 6.4, w: 12.1, h: 0.3, fontSize: 14, bold: true, color: C.PURPLE });
  text(s, "Result documents = docs/cr folder  \u00b7  App \u00b7 DB = service code and DB change scripts", { x: 0.6, y: 6.72, w: 12.1, h: 0.25, fontSize: 12, color: C.MUTED });
  footer(s, n);
  return s;
}


const fs = require("fs");
const sharp = require("sharp");
const hasFile = (p) => p && fs.existsSync(p);

async function gates(pptx, n, d = {}) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 2 \u00b7 DEMO", "Three human approvals, enforced by the system");
  const g = [
    ["\u2460", "Design approval", "Approve the design document. The approval is tied to its fingerprint (hash); any later change voids it.", "Code edits blocked until approved"],
    ["\u2461", "Code approval", "Approve after checking the review and test results. Only code with the same fingerprint (hash) can deploy.", "Deploy blocked if code changes later"],
    ["\u2462", "Production deploy approval", "An approval pop-up appears just before the production deploy command. It runs only if a person clicks Yes.", "Always prompts, even in auto-approve"],
  ];
  const CW = 5.8;
  for (let i = 0; i < 3; i++) {
    const y = 1.7 + i * 1.5;
    card(pptx, s, 0.6, y, CW, 1.38, { fill: C.AMBER_L, line: null });
    s.addShape(pptx.ShapeType.ellipse, { x: 0.82, y: y + 0.34, w: 0.7, h: 0.7, fill: { color: C.AMBER_F }, line: { type: "none" } });
    text(s, g[i][0], { x: 0.82, y: y + 0.34, w: 0.7, h: 0.7, align: "center", valign: "middle", fontSize: 24, bold: true });
    text(s, g[i][1], { x: 1.75, y: y + 0.1, w: 4.5, h: 0.38, fontSize: 20, bold: true });
    text(s, g[i][2], { x: 1.75, y: y + 0.5, w: 4.5, h: 0.5, fontSize: 13, color: C.TEXT });
    pill(pptx, s, 1.75, y + 1.04, 3.3, 0.26, g[i][3], { fill: C.WHITE, color: C.AMBER, size: 11 });
  }
  // Approval pop-up capture: crop to the lower part where the pop-up is visible and place it large in the right column (6.0 in wide)
  const dx = 0.6 + CW + 0.3, dw = 12.7 - dx;
  let dh = dw * (700 / 1561);
  if (hasFile(d.dialogImage)) {
    const meta = await sharp(d.dialogImage).metadata();
    const top = Math.round(meta.height * (140 / 840));
    const crop = { left: 0, top, width: meta.width, height: meta.height - top };
    dh = dw * (crop.height / crop.width);
    const buf = await sharp(d.dialogImage).extract(crop).png().toBuffer();
    s.addImage({ data: "image/png;base64," + buf.toString("base64"), x: dx, y: 1.7, w: dw, h: dh, altText: "Production deploy approval pop-up (hook permission request) in the real Copilot CLI" });
    s.addShape(pptx.ShapeType.roundRect, { x: dx, y: 1.7, w: dw, h: dh, rectRadius: 0.06, fill: { type: "none" }, line: { color: C.LINE_D, width: 1.25 } });
  } else {
    L.placeholderBox(pptx, s, dx, 1.7, dw, dh, "Real approval pop-up screen (hook permission request)");
  }
  text(s, "\u2462 Production deploy approval \u2014 real Copilot CLI screen", { x: dx, y: 1.7 + dh + 0.06, w: dw, h: 0.28, fontSize: 12, color: C.MUTED, align: "center" });
  card(pptx, s, dx, 4.8, dw, 1.28, { fill: C.BG, line: null });
  text(s, "What the human checks in this pop-up", { x: dx + 0.2, y: 4.9, w: dw - 0.4, h: 0.3, fontSize: 13, bold: true, color: C.MUTED });
  s.addText([
    { text: "What is about to run (the command)", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Why approval is needed (impact)", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Choose Yes or No", options: { bullet: { indent: 14 } } },
  ], { x: dx + 0.2, y: 5.24, w: dw - 0.4, h: 0.8, fontFace: FONT, fontSize: 14, color: C.TEXT, margin: 0, valign: "top", paraSpaceAfter: 2 });
  card(pptx, s, 0.6, 6.2, 12.1, 0.58, { fill: C.PURPLE_L, line: null });
  text(s, "Approval is structure, not a request \u2014 the system blocks any AI that tries to skip it", { x: 0.85, y: 6.2, w: 11.6, h: 0.58, fontSize: 16, bold: true, color: C.PURPLE_D, valign: "middle" });
  footer(s, n);
  return s;
}

async function safety(pptx, n, d = {}) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 3 \u00b7 IMPACT & SAFETY", "Safe matters as much as fast: six layers of control");
  const f = [
    ["FaUserShield", "Role permissions", "Tools and write paths limited per role", d.ev1 || "Analyst's code-edit attempt \u2192 blocked"],
    ["FaUserCheck", "Approval gates", "Only people approve design, code and production deploys", d.ev2 || "3 approval pop-ups \u00b7 records kept"],
    ["FaBan", "Command blocking", "Blocks git push, force deletes, privileged commands and more", d.ev3 || "git push attempt \u2192 blocked"],
    ["FaLock", "Protected paths", "Agent settings, hooks, standards and approval records cannot be edited", d.ev4 || "The AI cannot change its own rules"],
    ["FaFileSignature", "Audit log", "Every tool call, block and approval is recorded", d.ev5 || "Tool-call log"],
    ["FaScaleBalanced", "Org policy", "Admins apply allow, confirm and deny rules company-wide", "Admin-enforced (not in this demo)"],
  ];
  for (let i = 0; i < 6; i++) {
    const x = 0.6 + (i % 3) * 4.1; const y = 1.7 + Math.floor(i / 3) * 2.4;
    card(pptx, s, x, y, 3.9, 2.25, { fill: C.WHITE, line: C.LINE, shadow: true });
    await iconBadge(pptx, s, f[i][0], x + 0.28, y + 0.25, 0.66, C.GREEN);
    text(s, f[i][1], { x: x + 1.1, y: y + 0.25, w: 2.75, h: 0.66, fontSize: 20, bold: true, valign: "middle" });
    text(s, f[i][2], { x: x + 0.28, y: y + 1.05, w: 3.35, h: 0.62, fontSize: 14, color: C.MUTED });
    card(pptx, s, x + 0.28, y + 1.7, 3.35, 0.4, { fill: i < 5 ? C.GREEN_L : C.BG, line: null, radius: 0.2 });
    text(s, f[i][3], { x: x + 0.28, y: y + 1.7, w: 3.35, h: 0.4, fontSize: 12, bold: true, color: i < 5 ? C.GREEN : C.MUTED, align: "center", valign: "middle" });
  }
  text(s, "Green = verified directly in this demo  \u00b7  A sandbox (isolated runtime) can narrow the execution scope even further", { x: 0.6, y: 6.58, w: 12.1, h: 0.28, fontSize: 13, color: C.MUTED });
  footer(s, n);
  return s;
}

async function values(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 3 \u00b7 IMPACT & SAFETY", "What changes for business, dev, security and ops");
  const cols = [
    ["FaUsers", "Business", C.BLUE, ["See how requirements are reflected, right in the documents", "Get impact, risks and decisions explained up front", "See the result screens yourself"]],
    ["FaLaptopCode", "Developers", C.PURPLE, ["Hand repetitive work (analysis, documents, tests) to the AI", "Focus on design and judgment", "Agents follow company standards every time"]],
    ["FaShieldHalved", "Security & audit", C.GREEN, ["Role-based permissions and risky-command blocking", "Every tool call and approval is on record", "Approved code = deployed code (tamper-proof)"]],
    ["FaServer", "Operations", C.AMBER, ["Standardized deployment and rollback procedures", "Log analysis right after deployment", "Read-only analysis protects production data"]],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 3.07;
    card(pptx, s, x, 1.7, 2.9, 4.4, { fill: C.WHITE, line: C.LINE, shadow: true });
    await iconBadge(pptx, s, cols[i][0], x + 0.3, 1.98, 0.78, cols[i][2]);
    text(s, cols[i][1], { x: x + 1.2, y: 1.98, w: 1.65, h: 0.78, fontSize: 20, bold: true, valign: "middle", color: cols[i][2] });
    s.addText(cols[i][3].map((t, k) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: k < 2 } })),
      { x: x + 0.3, y: 3.1, w: 2.4, h: 3.3, fontFace: FONT, fontSize: 16, color: C.TEXT, margin: 0, valign: "top", paraSpaceAfter: 14 });
  }
  card(pptx, s, 0.6, 6.3, 12.1, 0.62, { fill: C.PURPLE_L, line: null });
  text(s, "Same workflow: transparency for business, focus for developers, control for security, standards for ops", { x: 0.85, y: 6.3, w: 11.6, h: 0.62, fontSize: 16, bold: true, color: C.PURPLE_D, valign: "middle" });
  footer(s, n);
  return s;
}

async function roadmap(pptx, n) {
  const s = pptx.addSlide();
  s.background = { color: C.WHITE };
  title(s, "PART 3 \u00b7 IMPACT & SAFETY", "How to start: pilot \u2192 standardize \u2192 scale");
  const ph = [
    ["1", "Pilot", "2\u20134 weeks", ["One team, 1\u20132 low-risk change requests", "Start with 3 agents: analysis, development, review", "Set success criteria first (lead time, rework)"], C.PURPLE],
    ["2", "Standardize", "4\u20138 weeks", ["Keep team agents and instructions in the repository", "Enforce permissions and approval gates with hooks", "Set organization policies (approve and block rules)"], C.BLUE],
    ["3", "Scale", "Per quarter", ["Roll out agents org-wide from a shared repository", "Tie in GitHub Environments and Actions approvals", "Extend to cloud agents and parallel work"], C.GREEN],
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
  text(s, "Metrics to track", { x: 0.85, y: 5.72, w: 2, h: 0.3, fontSize: 13, bold: true, color: C.PURPLE });
  text(s, "Request-to-deploy lead time   \u00b7   Rework rate   \u00b7   Defect leakage   \u00b7   Approval wait time   \u00b7   AI credit usage", { x: 0.85, y: 6.05, w: 11.6, h: 0.45, fontSize: 16, bold: true });
  text(s, "Timeframes are suggestions for getting started; adjust them to your organization's size and policies.", { x: 0.6, y: 6.75, w: 12.1, h: 0.28, fontSize: 12, color: C.MUTED });
  footer(s, n);
  return s;
}

async function closing(pptx, n, d = {}) {
  const s = pptx.addSlide();
  s.background = { color: C.INK };
  text(s, "You can start right now", { x: 0.8, y: 0.8, w: 11, h: 0.8, fontSize: 38, bold: true, color: C.WHITE });
  const steps = [
    ["1", "Install", "npm install -g @github/copilot\nbrew install --cask copilot-cli\nwinget install GitHub.Copilot"],
    ["2", "Run", "copilot          # interactive\n/agent           # pick an agent\ncopilot -p \"...\" # run once"],
    ["3", "Follow along", "Demo repo: shopflow-orders\nUse the demo script in its README\nto replay today's flow as is"],
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
  text(s, "Suggested next step", { x: 1.1, y: 5.12, w: 3, h: 0.3, fontSize: 13, bold: true, color: "EADCFF" });
  text(s, "Pilot one real change request  \u2192  3 agents + approval gates  \u2192  review results and metrics", { x: 1.1, y: 5.52, w: 11.2, h: 0.5, fontSize: 18, bold: true, color: C.WHITE });
  text(s, "Q & A", { x: 0.8, y: 6.4, w: 3, h: 0.6, fontSize: 30, bold: true, color: C.VIOLET });
  text(s, "Docs: docs.github.com/copilot  \u00b7  Copilot CLI: docs.github.com/copilot/concepts/copilot-surfaces/copilot-cli", { x: 3.2, y: 6.55, w: 9.4, h: 0.3, fontSize: 12, color: "8B949E" });
  return s;
}

module.exports = { gates, safety, values, roadmap, closing, cover, keyMessages, evolution, features, surfaces, cliIntro, customAgent, scenario, workflow, team };
