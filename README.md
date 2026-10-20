# ghcp_cli_workflow_demo_kit — GitHub Copilot CLI × Custom Agent Demo Kit

> **Languages:** English is the default edition (this file and the English deliverables at the repository root). The complete Korean edition (PPTX, video, sample output) lives in [`ko/`](ko/) and is described in [`README.ko.md`](README.ko.md).

> **AI works, and people decide.**
> A single change request from the business goes through analysis → design → implementation → testing → review → deployment → operations analysis, handled by role-specific AI teammates (7 custom agents).
> People approve in only 3 places (design, code, production deploy). We **recorded this workflow in a real Copilot CLI session**.

## The ghcp_cli_workflow series — two repositories used together

This demo is split into **two repositories whose names start with `ghcp_cli_workflow`**. You need both to present and to run the demo yourself.

| Repository | Role |
|---|---|
| [`ghcp_cli_workflow_demo_kit`](https://github.com/junwoojeong100/ghcp_cli_workflow_demo_kit) (**this repository**) | Presentation kit: slides (PPTX), videos, the real outputs (`sample-output/`) and the production source (`production-source/`) |
| [`ghcp_cli_workflow_shopflow_orders`](https://github.com/junwoojeong100/ghcp_cli_workflow_shopflow_orders) | **Demo repository**: the app the demo runs against (ShopFlow), with the 7 custom agents, hooks, approval gates and CI/CD. Use it to replay the same flow with Copilot CLI yourself. Its `main` branch is the English edition; the Korean edition is the `ko` branch |

```bash
# Clone both repositories into one folder. The kit tools look for the demo repository as 'shopflow-orders' inside the kit folder, so give the clone that name.
git clone https://github.com/junwoojeong100/ghcp_cli_workflow_demo_kit.git
cd ghcp_cli_workflow_demo_kit
git clone https://github.com/junwoojeong100/ghcp_cli_workflow_shopflow_orders.git shopflow-orders
```

- This repository's `.gitignore` excludes `shopflow-orders/`, so cloning inside it does not mix the two histories. To keep the demo repository somewhere else, set the environment variable `SHOPFLOW_ROOT`.
- **Korean edition:** clone the `ko` branch of the demo repository instead: `git clone -b ko https://github.com/junwoojeong100/ghcp_cli_workflow_shopflow_orders.git shopflow-orders`. The Korean slides, videos and sample output are in [`ko/`](ko/).
- **Just presenting?** You do not need the demo repository. All you need is `GHCP_CLI_Workflow_Demo_EN.pptx` and `video/GHCP_CLI_Workflow_Demo_EN.mp4` from this repository, or the same files from [Releases](https://github.com/junwoojeong100/ghcp_cli_workflow_demo_kit/releases).
  Cloning the whole repository is about 200 MB because it carries both editions. Use `git clone --depth 1` or the Release files to download less.
- **Releases:** v1.1.0 is the English edition (`GHCP_CLI_Workflow_Demo_EN.pptx`, `GHCP_CLI_Workflow_Demo_EN.mp4`, and `ghcp_cli_workflow_video_assets_en.zip` = `video/clips` + `video/stills`).
  v1.0.0 is the Korean edition (`GHCP_CLI_Workflow_Demo_KO.pptx`, `GHCP_CLI_Workflow_Demo_KO.mp4`, `ghcp_cli_workflow_video_assets.zip`).

| Measured results (one session) | |
|---|---|
| Requirement → operations analysis | About **38 minutes** in real time (the video is **9 minutes** because only the waiting time is sped up) |
| Human involvement | **6 interventions** = 3 approvals + 3 decisions during the design stage |
| Tests | 26 → **100**, all passing, 99% coverage (the Tester adds 74; the Developer adds none) |
| AI usage | About **340 AI Credits ≈ $3.40** (1 credit = $0.01) |

## 1. Contents

| Path | Description |
|---|---|
| `GHCP_CLI_Workflow_Demo_EN.pptx` | The presentation: **25 slides** with the step video clips embedded. The speaker notes hold a **spoken-English script**, when to start each video, and the sources |
| `video/GHCP_CLI_Workflow_Demo_EN.mp4` | Full video, 10 min 17 s, 1080p, with chapters (title → 7 steps → result screens → guardrail demo → wrap-up) |
| `video/clips/` | Per-step source clips `01_analysis` to `07_operations` and `08_guardrail_demo` (1920×1080, full screen). The PPT embeds slide clips made from these by cropping off the top header so the text is larger |
| `video/stills/` | Key frames such as the approval pop-ups and decision scenes (PNG), reusable in other materials |
| `sample-output/` | The session's **real outputs**: stage documents 01–07, approval records, the audit log (171 entries), the change diff and the measured metrics |
| `production-source/` | **Production source** for the videos and the PPT: rebuild the video from the recording (cast) and the deck build scripts (see `production-source/README.md`). The speaker-notes source is `production-source/deck/en/notes.md` |
| `ko/` | The complete **Korean edition**: PPTX, video and sample output from a separate Korean recording (see [`README.ko.md`](README.ko.md)) |
| `shopflow-orders/` | (Not in this repository) the place to clone the demo repository under this name, as described in the series section above |

The PPTX, videos and clips are large (about 100 MB per edition), so a full clone is heavy. **To get only the files**, download the PPTX and MP4 separately from [Releases](https://github.com/junwoojeong100/ghcp_cli_workflow_demo_kit/releases) (they are the same files as in the repository).

## 2. Slide structure (25 slides)

| Part | Slides | Content |
|---|---|---|
| Intro | 1–2 | Cover, key takeaways (fast, safe, people decide) |
| PART 1 · Copilot at a glance | 3–6 | Evolution (suggest → chat → agent → customize), six core capabilities, where you work (surfaces), Copilot CLI |
| PART 2 · Demo setup | 7–11 | What a custom agent is, the scenario (CR-2026-014), the overall flow, the 7 AI teammates and their permissions, the 3 human approvals |
| PART 2 · Demo | 12–18 | STEP 1–7 (Analyze, Design, Build, Test, Review, Deploy, Operate) — a video clip and measured numbers on every slide |
| PART 2 · Results | 19–20 | Before/after screens, the guardrail demo (a hook blocks even an AI that does not know the rules) |
| PART 3 · Impact and safety | 21–25 | Measured results, six layers of control, value by role, the adoption roadmap (pilot → standardize → scale), getting started and Q&A |

## 3. Presentation guide

**30 minutes (recommended)**

| Time | What | Slides |
|---|---|---|
| 0–3 min | Opening, key takeaways | 1–2 |
| 3–8 min | Copilot at a glance (capabilities, surfaces, CLI) | 3–6 |
| 8–13 min | Custom agents, scenario, flow, team, the three approvals | 7–11 |
| 13–24 min | **Video demo** — step slide (30 s) → play the clip (its length is in the `▶` line of the notes) → commentary (30 s) | 12–18 |
| 24–27 min | Result screens, guardrail demo | 19–20 |
| 27–30 min | Effects, controls, value, roadmap, Q&A | 21–25 |

**15-minute short version:** slides 1, 2, 9 and 11 (4 min) → the full video from `0:04` to the start of the "Guardrail demo" chapter (about 9 min: chapters 1–7 plus the result screens) → slides 21 and 25 (3 min).

**If you want to include a live demo:** the full flow takes about 38 minutes in real time, so we recommend running only **Step 1 (Analyze, a few minutes)** or the **approval pop-up scene** live.
Show the rest by video. If a question comes up, you can run that step from the script in the README of the [demo repository](https://github.com/junwoojeong100/ghcp_cli_workflow_shopflow_orders).

**Tips**
- **The speaker notes are a spoken-English script you can read as written.** Each slide's notes pick up from the previous scene so the talk flows from slide to slide. On the video slides (12–18 and 20), read them as "before the video → play → after the video", using the `▶ Play video (about N s)` line as the cue. Lines that start with `※` are sources and are not read aloud. Reading the notes as written takes about 27 minutes of speaking; adding the video (about 9 minutes) pushes the total past the 30-minute plan. To fit it, cut the longer explanatory slides, such as 6, 22 and 24, down to one or two sentences each. The notes source is `production-source/deck/en/notes.md`; after editing it, rebuild the deck to update the PPT.
- The **amber banner** at the bottom of the video marks the moments when a person steps in (the red banner in the guardrail demo marks the moments when the system blocks an action). Point out "this is where the AI stops and asks a person."
- The step slides share one layout: left = a large video clip (8.9 in wide) with "what happened" below it; right = the agent, key numbers, elapsed time and AI usage, and the human's role.
- For a non-technical audience, highlighting slides 12, 13, 19, 20 and 21 is enough to carry the story. For a technical audience, spend more time on slides 7, 10, 11 and 22.

## 4. Playback and compatibility notes

- **The videos embedded in the PPT play in slideshow mode** (MP4/H.264). If playback does not work, open the matching full-screen clip from `video/clips/` directly.
- In a large room, or when the back rows need to read the terminal text, select the video and turn on **Playback → Play Full Screen**. The video then fills the whole screen while it plays.
- You can jump between the video chapters from the chapter list in QuickTime Player, VLC and similar players.
- The deck uses **Arial** (body) and **Consolas** (code). If a font is missing on the presenting PC, a substitute is shown and line breaks can change, so **open the deck once on the presenting PC beforehand**.
- The numbers on the slides come from the measured values of the recorded session (`production-source/deck/en/metrics.json` and `facts.json`; the originals are in `sample-output/`).

## 5. Good to know

- The video is a **recording of a real Copilot CLI session**. Only the waiting time while the agents work is sped up (up to 8x); scenes where a person decides or approves play at 1x. Only the scrollbar mark that is always visible at the right edge of the screen was hidden for appearance; the rest of the terminal content is exactly as recorded.
- Elapsed times and AI usage come from **a single recording** (Copilot CLI 1.0.98, default model GPT-6.1 Sol). They vary with the model, plan and environment, and whether credits are included in your plan depends on your contract.
- `staging` and `production` are **simulated with local ports**, and the approval records (`gate.py`) and the hook (`guard.py`) are demo implementations.
  In a real organization they can map to GitHub pull request approvals, branch protection, Environments (required reviewers) and managed settings (see chapter 6 of the demo repository README).
- The **guardrail demo** deliberately uses an agent that does not know the rules (`quick-fixer`) and turns off the repository instructions (`--no-custom-instructions`).
  A normal agent refuses such requests on its own; the setup is there to show that safety does not rest on the AI's judgment alone.
- We did **not include comparison numbers** such as "N times faster than before." The baseline (your existing lead time) differs by organization, so we recommend measuring the same metrics in your own pilot.
- All data, people and companies are fictional (including the approver "Gildong Hong (Ops Lead)"). Local paths in `sample-output/audit.jsonl` were replaced with `<DEMO_KIT>`.

## 6. FAQ

- **What if the AI breaks a rule?** → A hook checks each tool call right before it runs and blocks the ones that break a rule (the slide 20 video: editing code before approval, editing a standards document and `git push` are all blocked).
- **Can anything reach production without approval?** → A production deploy command always raises an approval pop-up, and the deploy script re-checks the code approval record (fingerprint match) and the staging verification record.
- **What does it cost?** → This session used about 340 credits (≈ $3.40). Per-step usage is on slides 12–18 and the total is on slide 21.
- **Can we trust the AI's results?** → The implementation, test and review agents are separate (and have different permissions), and 100 tests plus three human approvals are the safety net. The premise that people review and approve stays the same.

## 7. Things to try next

1. Take the demo repository into your own GitHub organization (fork or template) and reproduce the same three approvals as in a real environment with **PR approvals and Environments approvals** (see chapter 6 of the demo repository README).
2. Roll out deny/ask/allow rules, sandboxing and an MCP allowlist organization-wide with **managed settings**.
3. Turn sessions, tool calls and usage into metrics with Copilot **OpenTelemetry** monitoring (slide 24, "Metrics to track").
