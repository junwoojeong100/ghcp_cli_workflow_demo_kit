# production-source — video and PPT production source

How the demo videos and the PPT were made, and how to rebuild them. If you only want to present, you do not need this folder.
(This is `production-source/` of the `ghcp_cli_workflow_demo_kit` repository. The demo app is the companion repository [`ghcp_cli_workflow_shopflow_orders`](https://github.com/junwoojeong100/ghcp_cli_workflow_shopflow_orders).)
A Korean version of this guide is in [`README.ko.md`](README.ko.md).

## Languages

Everything here is language-aware. The environment variable `DEMO_LANG=en|ko` (**default: `en`**) selects the edition for `deck/build.js`, `tools/make_assets.py`, `tools/cards.js`, `tools/ui_shots.js`, `tools/crop_shots.py`, `tools/collect_metrics.py`, `tools/collect_sample_output.py`, `tools/launch_final.sh` and the video renderer (`tools/render`).
The step-script generator takes `--lang en|ko` instead. The commands in this guide are for the English edition. For Korean, put `DEMO_LANG=ko` in front of the command (for example `DEMO_LANG=ko python3 make_assets.py render`) and use the Korean column below.

| | English (default) | Korean |
|---|---|---|
| Recordings | `runs/en/final/final.cast`; guardrail demo `runs/en/guard/guard.cast` | `runs/ko/final/final.cast`; guardrail demo `runs/ko/guard2/guard2.cast` |
| Step scripts | `runs/en/steps_full.json`, `runs/en/steps_guard.json` | `runs/ko/steps_full.json`, `runs/ko/steps_guard2.json` |
| Result screenshots | `shots/en/` | `shots/ko/` |
| PPT sources | `deck/en/` | `deck/ko/` |
| Generated assets | `video/en/` | `video/ko/` |
| Published PPT | `GHCP_CLI_Workflow_Demo_EN.pptx` (repository root) | `ko/GHCP_CLI_Workflow_Demo_KO.pptx` |
| Published video, clips, stills | `video/` (repository root) | `ko/video/` |
| Sample output | `sample-output/` | `ko/sample-output/` |
| Demo repository | `main` branch (the default clone) | `ko` branch (`git clone -b ko ...`) |
| Diff base tag | `baseline-recorded` | `baseline-recorded-ko` |
| Fonts | Arial / Consolas | Apple SD Gothic Neo / Consolas |

```
production-source/
  tools/          recorder (PTY), video renderer, step-script generator, asset / metrics / sample-output scripts
  runs/<lang>/    recordings (cast) of the main session (final/) and the guardrail demo (guard/, or guard2/ for Korean), plus the step scripts (steps_*.json)
  shots/<lang>/   before/after screenshots of the result screens (customer view, admin console)
  deck/           PPT sources (pptxgenjs): build.js (picks the language), lib.js (shared design components) and, per language, <lang>/ with
                  build.js, slides_static.js, slides_steps.js, facts.json (wording), metrics.json (measured values), notes.md (speaker notes)
  video/<lang>/   where generated assets go (git keeps only the title/ending card PNGs and .gitkeep; the finished files are in video/ at the repository root, and in ko/video/ for Korean)
```

> **Just cloned the repository?** The finished slides and videos are already at the repository root (the parent folder of `production-source`): `GHCP_CLI_Workflow_Demo_EN.pptx` and `video/` (full video, `clips/`, `stills/`). The Korean edition is in `ko/`.
> The deck build finds the approval-pop-up still (`video/stills/gate-prod-1.png`) there, and `make_assets.py slideclips` finds the clips in `video/clips/` (for Korean: `ko/video/stills/` and `ko/video/clips/`), so you can run **B** below right away.
> To re-create the videos from the recording, follow **A**. The results are written to `video/<lang>/` in this folder, which git ignores.

## Prerequisites

| Item | Used for |
|---|---|
| Python 3.12 + `pexpect`, `pyte`, `pillow` (`tools/requirements.txt`) | Recording (`record.py`), screenshot crops (`crop_shots.py`) |
| Node.js 22 | Video renderer (`tools/render`, xterm.js + playwright-core), `cards.js`, `ui_shots.js`, deck build |
| Google Chrome (macOS default path; `CHROME_PATH` for another path, honored by the video renderer only) | Headless browser for the renderer, the cards and the UI screenshots |
| ffmpeg / ffprobe from Homebrew (`/opt/homebrew/bin`) | Encoding, clips, posters, concatenation (the renderer expects this path; `make_assets.py` also accepts `ffmpeg` on your `PATH`) |
| `shopflow-orders/` in the parent folder of `production-source` (the repository root) = a clone of the demo repository | Metrics and sample-output collection, UI screenshots, re-recording (C). Set `SHOPFLOW_ROOT` if the name or location differs. See the root `README.md` for how to clone it (not needed for the deck build, B) |

```bash
cd production-source
python3 -m venv tools/.venv && tools/.venv/bin/pip install -r tools/requirements.txt
(cd tools/render && npm install)      # renderer dependencies (xterm.js, playwright-core); node_modules is not in git
```

## Tools at a glance

| Tool | Purpose |
|---|---|
| `tools/prepare_profile.sh`, `tools/launch_final.sh` | Prepare the dedicated Copilot profile; reset the demo repository and record (C) |
| `tools/record.py` | PTY driver: runs Copilot CLI, plays a step script, writes the cast plus `.marks.json` and `.snapshots/` |
| `tools/make_steps.py` | Generates the step scripts: `--lang` (`en` or `ko`), `--kind` (`full` or `guard`), `--out FILE`; optional `--from-stage`, `--to-stage`, `--speed` |
| `tools/ui_shots.js`, `tools/crop_shots.py` | Before/after UI screenshots (customer view, admin console) and the crops derived from them |
| `tools/render/` | Renders a cast to a 1080p video with stage tracker, captions and banners (xterm.js + headless Chrome + ffmpeg) |
| `tools/make_assets.py` | `render`, `clips`, `stills`, `guard`, `concat`, `slideclips` (A and B) |
| `tools/cards.js` | Title and ending cards |
| `tools/collect_metrics.py` | Measured numbers from the recording and the demo repository → `deck/<lang>/metrics.json` |
| `tools/collect_sample_output.py` | Copies the session's real outputs into `sample-output/` (`ko/sample-output/` for Korean) |
| `tools/screen_at.py` | Debug helper: prints the terminal screen of a cast at a given time (`python screen_at.py <cast> <seconds> [cols rows]`) |

## A. Rebuild the videos from the recording (no Copilot needed)

Use this when you want to change captions, speed or banners without recording again. The recording (`runs/en/final/final.cast`) holds the terminal output plus markers (step, caption, speed, banner) as `m` events, and the renderer redraws it as 1080p video: edit the marker lines in the cast, then re-render.

```bash
cd tools
python3 make_assets.py render       # main video (about 9 minutes) + per-step clips and posters (takes about 4–5 minutes)
python3 make_assets.py stills       # key frames such as the approval pop-ups
python3 make_assets.py guard        # guardrail-demo video (guard.mp4) and its poster for the slides
node cards.js ../video/en ../deck/en/metrics.json   # title and ending cards (the PNGs are tracked in git; re-run only when the numbers change)
python3 make_assets.py concat       # title + main + guardrail demo + ending → video/en/GHCP_CLI_Workflow_Demo_EN.mp4 (with chapters)
python3 make_assets.py slideclips   # slide clips and posters (see B); works without the steps above if the published clips exist in video/clips/
```

For Korean, prefix each command with `DEMO_LANG=ko` and use `../video/ko ../deck/ko/metrics.json` for `cards.js`; the result is `video/ko/GHCP_CLI_Workflow_Demo_KO.mp4`.

- **Publishing is manual.** The generated files stay in `video/<lang>/` (git-ignored). To publish a build, copy the full video to `video/`, the clips to `video/clips/` under the published names (`clip-stage1.mp4` to `clip-stage7.mp4` become `01_analysis.mp4`, `02_design.mp4`, `03_implementation.mp4`, `04_testing.mp4`, `05_review.mp4`, `06_deployment.mp4`, `07_operations.mp4`; `guard.mp4` becomes `08_guardrail_demo.mp4`) and `stills/` to `video/stills/`. For Korean the target is `ko/video/`, with the Korean clip names listed in `ko/video/clips/`.
- `python3 make_assets.py clips` re-cuts only the step clips and posters from an existing `main.mp4`.
- The markers originate from the `mark` items of the step script `runs/en/steps_full.json` (`caption`, `speed`, `gate`, `stage` and others); the recorder writes them into the cast. Generator, run from `production-source/`: `python3 tools/make_steps.py --lang en --kind full --out runs/en/steps_full.json` (options `--from-stage`, `--to-stage`, `--speed`). The guardrail demo uses `--kind guard --out runs/en/steps_guard.json`. All language-specific text (prompts, captions, banners) is in the `PACKS` table at the top of `make_steps.py`; the flow itself is the same for both languages.
- The before/after screens at the end of the video are appended by `build_cast_with_images()` in `tools/make_assets.py` from `shots/en/crop-*.png`. This happens only if `shots/en/after-customer.png` exists (see C for how the screenshots are made); the intermediate cast `runs/en/final/final_with_images.cast` is git-ignored.
- Copilot CLI draws a scrollbar (`┃`) in the **right-most column** of the conversation area. It shows up as a white vertical line in the video, so the renderer (`hideScrollbarColumn` in `tools/render/page.js`) paints only the `┃` of that column with the background color. Box borders such as the approval pop-ups (`│` `─` `╮` `╯`) and `┃` in the left column are left as they are. To turn this off, delete the `hideScrollbarColumn()` call in `appendOutput()`.
- The overlay texts are localized as well: the renderer takes its UI strings from `DEMO_LANG`, and the stage names and captions come from the step script (for English: Analyze / Design / Build / Test / Review / Deploy / Operate, and Edit code before approval / Edit a standards document / Run a dangerous command in the guardrail demo).

## B. Rebuild the PPT

```bash
cd deck
npm install                                                 # pptxgenjs, jszip, react-icons, sharp, ... (first time only)
node build.js ../../GHCP_CLI_Workflow_Demo_EN.pptx          # English (default) → repository root
DEMO_LANG=ko node build.js ../../ko/GHCP_CLI_Workflow_Demo_KO.pptx   # Korean → ko/
NO_VIDEO=1 node build.js ../out.pptx                        # quick check without the videos
```

If you omit the output path, the deck is written to `deck/<lang>/deck.pptx` (git-ignored). The build embeds `video/<lang>/slide-stageN.mp4`, `slide-poster-stageN.png` and `slide-guard.mp4` when they exist; otherwise it falls back to a still image or a placeholder.

- Wording is in `deck/en/facts.json`, measured numbers in `deck/en/metrics.json` (generated by `tools/collect_metrics.py` from the recording), design and components in the shared `deck/lib.js`, and the static slides in `deck/en/slides_static.js`.
- **The speaker notes (a spoken-English script) are in `deck/en/notes.md`.** The text under `## <slide number>` becomes that slide's note when the deck is built. A blank line is a paragraph break, a line starting with `▶` (`▶ Play video (about N s)`) is the cue for when to start the video, and a line starting with `※` is a source that is not read aloud. Every slide needs a note or the build fails. Numbers in the notes must match `facts.json` and `metrics.json`.
- The videos on the slides are **slide clips**: 1880×968 videos cut from the full-screen clips (1920×1080) with the top header (title, step tracker) and the outer margin removed, so the terminal text looks larger at the same slide width. Before building, run `python3 tools/make_assets.py slideclips` from `production-source/` to create `video/en/slide-stage1.mp4` to `slide-stage7.mp4`, `slide-guard.mp4` and the posters (`slide-poster-*.png`); this takes about 3 minutes. The sources are `video/en/clip-stageN.mp4` and `guard.mp4` (created by `render` and `guard` in A) or the published clips in `video/clips/` (`ko/video/clips/` for Korean). `--src` and `--out` change the folders, and the crop area is `SLIDE_CROP` in `make_assets.py`.
- The step slides (12–18) are laid out in `deck/en/slides_steps.js`; the result screens (19), the guardrail demo (20) and the effects (21) are in `deck/en/build.js`; the three approvals (11) are in `deck/en/slides_static.js`. The video width is `VW` in `slides_steps.js` (the aspect ratio `ASPECT` assumes the 1880×968 slide clips).
- Fonts: the English deck uses `Arial` (body) and `Consolas` (code); the Korean deck uses `Apple SD Gothic Neo` and `Consolas`.
- `deck/sheet.py` is a small QA helper that tiles rendered slide images (`<prefix>-*.jpg`) into a contact sheet (needs Pillow).

## C. Re-record from scratch (requires a Copilot subscription)

First clone the demo repository as `shopflow-orders` (see the root `README.md`) and set it up as described in its README ("Prerequisites"): the metrics script runs its tests with `shopflow-orders/.venv`. English uses the default `main` branch; for Korean clone the `ko` branch: `git clone -b ko https://github.com/junwoojeong100/ghcp_cli_workflow_shopflow_orders.git shopflow-orders`.

```bash
cd production-source
tools/prepare_profile.sh                       # dedicated recording profile (banner and tips off, demo folder pre-trusted), separate from your personal Copilot settings
# Log in once in that profile: run the command the script prints and type /login. To reuse an already logged-in account instead:
#   DEMO_COPILOT_LOGIN=<github-login> tools/prepare_profile.sh
DEMO_LANG=en FORCE=1 tools/launch_final.sh     # reset the demo repository → auto-driven recording (creates runs/en/final/final.cast; about 40 minutes; uses AI credits, about 340 for the full run in our English recording)
DEMO_LANG=en python3 tools/collect_metrics.py  # measured numbers → deck/en/metrics.json
DEMO_LANG=en python3 tools/collect_sample_output.py   # real outputs → sample-output/ (add --force to overwrite existing content)
```

- The recorder (`tools/record.py`) starts Copilot CLI in a PTY and is a **driver** that sends the keystrokes and approvals a person would. The sequence is the step script `runs/en/steps_full.json`.
- An existing recording is not overwritten (this needs `FORCE=1`). Use another run name, such as `tools/launch_final.sh rerun`, to keep it; the asset and metrics scripts read `runs/<lang>/final/final.cast`. The recorder log goes to `runs/<lang>/<run>.rec.log`. The launcher refuses to start while another recording or a `copilot --no-auto-update` process is running.
- Optional environment variables: `SHOPFLOW_ROOT` (location of the demo repository), `COPILOT_BIN` (path of the `copilot` binary), `DEMO_COPILOT_HOME` (location of the recording profile), `BASELINE_REF` (git ref used as the diff base by the two collect scripts; default `baseline-recorded`, or `baseline-recorded-ko` for Korean).
- The approver name written into the approval records is set by `launch_final.sh` through `DEMO_APPROVER`: `Gildong Hong (Ops Lead)` for English (the Korean edition uses a Korean name).
- **Caution:** every recording resets `shopflow-orders` with `scripts/demo_reset.sh`. Uncommitted changes, untracked and ignored files (except `.venv`), `feature/*` branches and `v*` tags are deleted, including the `docs/cr/`, `approvals/` and `.copilot-audit/` files of an earlier run, and the local `main` is recreated from the tag `baseline` (English) or `baseline-ko` (Korean, on the `ko` branch). Run `collect_metrics.py` and `collect_sample_output.py` right after a recording, before the next reset. The screen text can change with the Copilot CLI version, so after a version change you may need to adjust the wait conditions in `record.py` (the `busy` regular expression and the handler patterns).
- **Guardrail demo.** `DEMO_LANG=en FORCE=1 tools/launch_final.sh guard steps_guard.json` records it to `runs/en/guard/guard.cast` (Korean: `DEMO_LANG=ko FORCE=1 tools/launch_final.sh guard2 steps_guard2.json` → `runs/ko/guard2/guard2.cast`). Because the steps file name contains `guard`, the launcher sets up the demo after the reset: it installs the rule-unaware demo agent (`shopflow-orders/docs/demo/quick-fixer.agent.md.example` → `.github/agents/quick-fixer.agent.md`) and starts Copilot CLI with `--no-custom-instructions` and **without** the CLI deny rule for `git push`, so that it really does not know the rules and it is the hook that blocks all three requests. The step script itself only selects `/agent quick-fixer` and types the three risky requests. Run it after the main recording and after `collect_*`, because the reset deletes the main run's files from the demo repository.
- `collect_sample_output.py` copies `deck/<lang>/metrics.json` as `run-metrics.json`, so run it after `collect_metrics.py`. It replaces local paths (the kit folder with `<DEMO_KIT>`, other home folders with `<HOME>`) and keeps an existing `sample-output/README.md`.
- **Before/after screenshots** of the result screens (customer view and admin console) are made against the demo app on port 8100 (production), from `production-source`:

  ```bash
  DEMO_LANG=en node tools/ui_shots.js http://127.0.0.1:8100 shots/en/before           # baseline v1.0.0 running, for example right after scripts/demo_reset.sh
  DEMO_LANG=en node tools/ui_shots.js http://127.0.0.1:8100 shots/en/after --after    # after v1.1.0 is deployed to production at the end of the recording
  DEMO_LANG=en tools/.venv/bin/python tools/crop_shots.py                             # crop-*.png and deck-*-customer.png (add --check to compare only)
  ```

  `--after` also submits a refund on order 1002 so that the admin console shows a "pending approval" item. The screenshots use a 1280×800 viewport at 2x scale, and `crop_shots.py` derives the fixed crops used at the end of the video and on the result slide (19).
- The recording profile is created in `DEMO_COPILOT_HOME` (default `production-source/copilot-home`, git-ignored). It accumulates login state and session history, so never commit it. Your own `COPILOT_HOME` setting is not used.
