# production-source — 영상·PPT 제작 소스

데모 영상과 PPT를 **어떻게 만들었는지**와 **다시 만드는 방법**입니다. 발표만 하려면 이 폴더는 필요 없습니다.
(`ghcp_cli_workflow_demo_kit` 저장소의 `production-source/` 이며, 시연 대상 앱은 짝 저장소 [`ghcp_cli_workflow_shopflow_orders`](https://github.com/junwoojeong100/ghcp_cli_workflow_shopflow_orders) 입니다.)
이 문서는 **한국어판** 안내입니다. 영어판(기본) 안내는 [`README.md`](README.md) 에 있습니다.

## 언어 선택

모든 도구가 언어를 인식합니다. 환경 변수 `DEMO_LANG=en|ko` (**기본값 `en`**)가 `deck/build.js`, `tools/make_assets.py`, `tools/cards.js`, `tools/ui_shots.js`, `tools/crop_shots.py`, `tools/collect_metrics.py`, `tools/collect_sample_output.py`, `tools/launch_final.sh`, 영상 렌더러(`tools/render`)가 다룰 언어를 정합니다. 단계 스크립트 생성기(`tools/make_steps.py`)만 `--lang en|ko` 옵션을 씁니다.
아래 명령은 **한국어판** 기준이므로 `DEMO_LANG=ko` 가 필요합니다. 셸에서 한 번 `export DEMO_LANG=ko` 해 두거나 명령 앞에 붙이세요. 영어판은 `DEMO_LANG` 를 생략하거나 `en` 으로 두고, 아래 표의 영어판 열을 따르면 됩니다.

| | 영어판 (기본) | 한국어판 |
|---|---|---|
| 녹화본 | `runs/en/final/final.cast`, 안전장치 시연 `runs/en/guard/guard.cast` | `runs/ko/final/final.cast`, 안전장치 시연 `runs/ko/guard2/guard2.cast` |
| 단계 스크립트 | `runs/en/steps_full.json`, `runs/en/steps_guard.json` | `runs/ko/steps_full.json`, `runs/ko/steps_guard2.json` |
| 결과 화면 캡처 | `shots/en/` | `shots/ko/` |
| PPT 소스 | `deck/en/` | `deck/ko/` |
| 생성물 | `video/en/` | `video/ko/` |
| 완성 PPT | `GHCP_CLI_Workflow_Demo_EN.pptx` (저장소 루트) | `ko/GHCP_CLI_Workflow_Demo_KO.pptx` |
| 완성 영상 · 클립 · 스틸 | `video/` (저장소 루트) | `ko/video/` |
| 샘플 산출물 | `sample-output/` | `ko/sample-output/` |
| 데모 저장소 | `main` 브랜치 (기본 clone) | 태그 `baseline-ko` (`git clone -b baseline-ko ...`) |
| diff 기준 태그 | `baseline-recorded` | `baseline-recorded-ko` |
| 글꼴 | Arial / Consolas | Apple SD Gothic Neo / Consolas |

```
production-source/
  tools/          녹화(PTY 레코더) · 영상 렌더러 · 단계 스크립트 생성기 · 에셋·지표·샘플 산출물 생성 스크립트
  runs/<언어>/    녹화본(cast): final/(메인 세션), guard/ 또는 guard2/(안전장치 시연, 한국어판은 guard2) + 단계별 진행 스크립트(steps_*.json)
  shots/<언어>/   결과 화면 before/after 캡처(고객 화면 · 관리자 콘솔)
  deck/           PPT 빌드 소스 (pptxgenjs) — build.js(언어 선택) · lib.js(공통 디자인 컴포넌트)와 언어별 <언어>/ 폴더:
                  build.js, slides_static.js, slides_steps.js, facts.json(문구), metrics.json(실측값), notes.md(발표자 노트)
  video/<언어>/   생성물이 모이는 곳 (git 에는 타이틀·엔딩 카드 PNG 와 .gitkeep 만 있고, 만든 클립·영상은 제외 — 완성본은 저장소 루트의 video/(한국어판은 ko/video/)에 있습니다)
```

> **저장소를 막 clone 했다면**: 완성된 한국어판 슬라이드·영상은 저장소 루트(= `production-source` 의 상위 폴더)의 `ko/GHCP_CLI_Workflow_Demo_KO.pptx` 와 `ko/video/`(전체 영상 · `clips/` · `stills/`)에 이미 들어 있습니다(영어판은 루트의 `GHCP_CLI_Workflow_Demo_EN.pptx` 와 `video/`).
> 덱 빌드(`deck/ko/build.js`)가 `../ko/video/stills/gate-prod-1.png` 를, `make_assets.py slideclips` 가 `../ko/video/clips/` 의 클립을 자동으로 찾으므로 아래 **B** 는 바로 실행할 수 있습니다.
> 녹화본에서 영상을 직접 다시 만들려면 **A** 를 따르세요. 결과는 이 폴더의 `video/<언어>/`(한국어판은 `video/ko/`)에 만들어지며 git 에서는 제외됩니다.

## 준비물

| 항목 | 용도 |
|---|---|
| Python 3.12 + `pexpect`, `pyte`, `pillow` (`tools/requirements.txt`) | 녹화(`record.py`) · 결과 화면 크롭(`crop_shots.py`) |
| Node.js 22 | 영상 렌더러(`tools/render`, xterm.js + playwright-core), `cards.js`, `ui_shots.js`, 덱 빌드 |
| Google Chrome (macOS 기본 경로, 다른 경로는 `CHROME_PATH` — 영상 렌더러에만 적용) | 렌더러 · 카드 · UI 캡처의 헤드리스 브라우저 |
| ffmpeg / ffprobe (Homebrew, `/opt/homebrew/bin`) | 인코딩 · 클립 · 포스터 · 이어 붙이기 (렌더러는 이 경로를 가정하고, `make_assets.py` 는 `PATH` 의 `ffmpeg` 도 씁니다) |
| 이 폴더의 **상위(저장소 루트)에 있는** `shopflow-orders/` = 데모 저장소 clone (한국어판은 태그 `baseline-ko`) | 지표·샘플 산출물 수집 · UI 캡처 · 재녹화(C). 이름·위치가 다르면 `SHOPFLOW_ROOT`. clone 방법은 저장소 루트 `README.ko.md` 참고: `git clone -b baseline-ko https://github.com/junwoojeong100/ghcp_cli_workflow_shopflow_orders.git shopflow-orders` (B 의 덱 빌드만 할 때는 필요 없음) |

```bash
cd production-source
python3 -m venv tools/.venv && tools/.venv/bin/pip install -r tools/requirements.txt
(cd tools/render && npm install)      # 영상 렌더러 의존성(xterm.js · playwright-core) — git 에는 node_modules 가 없습니다
```

## 도구 한눈에 보기

| 도구 | 용도 |
|---|---|
| `tools/prepare_profile.sh`, `tools/launch_final.sh` | 녹화 전용 Copilot 프로필 준비, 데모 저장소 초기화 후 녹화 (C) |
| `tools/record.py` | PTY 드라이버: Copilot CLI 를 띄워 단계 스크립트를 재생하고 cast · `.marks.json` · `.snapshots/` 를 만듭니다 |
| `tools/make_steps.py` | 단계 스크립트 생성기: `--lang`(`en` 또는 `ko`), `--kind`(`full` 또는 `guard`), `--out FILE`, 선택 옵션 `--from-stage` `--to-stage` `--speed` |
| `tools/ui_shots.js`, `tools/crop_shots.py` | 결과 화면 before/after 캡처(고객 화면 · 관리자 콘솔)와 거기서 만드는 크롭 이미지 |
| `tools/render/` | cast 를 단계 트래커 · 캡션 · 배너가 있는 1080p 영상으로 렌더(xterm.js + 헤드리스 Chrome + ffmpeg) |
| `tools/make_assets.py` | `render`, `clips`, `stills`, `guard`, `concat`, `slideclips` (A · B) |
| `tools/cards.js` | 타이틀 · 엔딩 카드 |
| `tools/collect_metrics.py` | 녹화본과 데모 저장소에서 실측 수치 수집 → `deck/<언어>/metrics.json` |
| `tools/collect_sample_output.py` | 세션의 실제 산출물을 `sample-output/`(한국어판은 `ko/sample-output/`)에 복사 |
| `tools/screen_at.py` | 디버깅용: cast 의 특정 시각 터미널 화면 출력 (`python screen_at.py <cast> <초> [cols rows]`) |

## A. 녹화본으로 영상 다시 만들기 (Copilot 불필요)

캡션·속도·배너를 바꾸고 싶을 때 쓰는 경로입니다. 녹화본(`runs/ko/final/final.cast`)은 터미널 출력과 마커(단계·캡션·배속·배너)를 `m` 이벤트로 담고 있어,
렌더러가 이를 1080p 영상으로 다시 그립니다. 바꾸려면 cast 의 마커 줄을 고친 뒤 다시 렌더하세요.

```bash
export DEMO_LANG=ko                # 한국어판 (기본값은 en)
cd tools
python3 make_assets.py render      # 메인 영상(약 8분) 렌더 + 단계별 클립·포스터 (약 4~5분 소요)
python3 make_assets.py stills      # 승인 팝업 등 주요 장면 PNG
python3 make_assets.py guard       # 안전장치 시연 영상(guard.mp4)과 슬라이드용 포스터
node cards.js ../video/ko ../deck/ko/metrics.json   # 타이틀·엔딩 카드 (PNG 는 git 에 있으므로 수치가 바뀔 때만 다시 실행)
python3 make_assets.py concat      # 타이틀 + 메인 + 안전장치 + 엔딩 → video/ko/GHCP_CLI_Workflow_Demo_KO.mp4 (챕터 포함)
python3 make_assets.py slideclips  # 슬라이드용 클립·포스터 (아래 B 참고) — 위 단계 없이 ../ko/video/clips/ 의 클립만 있어도 동작
```

영어판은 `DEMO_LANG` 를 `en` 으로 두고(또는 생략하고) 같은 순서로 실행하면 `video/en/GHCP_CLI_Workflow_Demo_EN.mp4` 가 만들어집니다(`cards.js` 인자는 `../video/en ../deck/en/metrics.json`).

- 마커는 `runs/ko/steps_full.json` 의 `mark` 항목(`caption`, `speed`, `gate`, `images` 등)에서 정해지며, 녹화기가 cast 에 기록합니다. 생성기(`production-source/` 에서 실행): `python3 tools/make_steps.py --lang ko --kind full --out runs/ko/steps_full.json` (옵션 `--from-stage` `--to-stage` `--speed`). 안전장치 시연은 `--kind guard --out runs/ko/steps_guard2.json`. 언어별 문구(프롬프트·캡션·배너)는 `make_steps.py` 위쪽의 `PACKS` 표에 있습니다.
- **게시는 수동입니다.** 만든 파일은 `video/ko/`(git 제외)에 남습니다. 게시하려면 전체 영상을 `ko/video/` 로, 클립을 `ko/video/clips/` 에 게시 이름(`clip-stage1.mp4`~`clip-stage7.mp4` → `01_분석.mp4`, `02_설계.mp4`, `03_구현.mp4`, `04_테스트.mp4`, `05_리뷰.mp4`, `06_배포.mp4`, `07_운영.mp4`, `guard.mp4` → `08_안전장치_시연.mp4`)으로, `stills/` 를 `ko/video/stills/` 로 복사하세요. 영어판은 `video/`, `video/clips/`(`01_analysis.mp4` … `08_guardrail_demo.mp4`), `video/stills/` 입니다.
- 영상 끝의 before/after 화면은 `tools/make_assets.py` 의 `build_cast_with_images()` 가 `shots/ko/crop-*.png` 로 덧붙입니다(`shots/ko/after-customer.png` 가 있을 때만. 중간 파일 `runs/ko/final/final_with_images.cast` 는 git 에서 제외). 캡처는 아래 C 를 참고하세요.
- Copilot CLI 가 대화 영역 **오른쪽 끝 열**에 그리는 스크롤바(`┃`)는 영상에서 흰 세로줄로 보여 부자연스러워, 렌더러(`tools/render/page.js` 의 `hideScrollbarColumn`)가 그 열의 `┃` 만 배경색으로 가립니다. 승인 팝업 같은 박스 테두리(`│` `─` `╮` `╯`)와 왼쪽 열의 `┃` 는 그대로입니다. 끄려면 `appendOutput()` 안의 `hideScrollbarColumn()` 호출을 지우세요.

## B. PPT 다시 만들기

```bash
cd deck
npm install                                                          # pptxgenjs, react-icons, sharp 등 (처음 한 번)
DEMO_LANG=ko node build.js ../../ko/GHCP_CLI_Workflow_Demo_KO.pptx   # 한국어판 → ko/
node build.js ../../GHCP_CLI_Workflow_Demo_EN.pptx                   # 영어판(기본) → 저장소 루트
NO_VIDEO=1 DEMO_LANG=ko node build.js ../out.pptx                    # 영상 없이 빠르게 확인
```

출력 경로를 생략하면 `deck/<언어>/deck.pptx` 로 만들어집니다(git 제외). `video/<언어>/slide-stageN.mp4` · `slide-poster-stageN.png` · `slide-guard.mp4` 가 있으면 영상을 삽입하고, 없으면 정지 이미지/자리표시를 씁니다.

- 문구는 `deck/ko/facts.json`, 실측 수치는 `deck/ko/metrics.json` (`tools/collect_metrics.py` 가 녹화 결과에서 생성), 디자인·컴포넌트는 공통 `deck/lib.js`, 정적 슬라이드는 `deck/ko/slides_static.js`.
- **발표자 노트(구어체 스크립트)는 `deck/ko/notes.md`** 입니다. `## 슬라이드번호` 아래의 글이 그 슬라이드의 노트가 되어 빌드할 때 PPT에 들어갑니다(빈 줄 = 문단 나눔, `▶ 영상 재생 (약 N초)` = 영상을 틀 타이밍, `※` = 낭독하지 않는 출처 줄). 모든 슬라이드에 노트가 있어야 빌드됩니다. 노트 안의 수치는 `facts.json` · `metrics.json` 과 같아야 합니다.
- 슬라이드의 영상은 **슬라이드용 클립**입니다: 전체 화면 클립(1920×1080)에서 상단 헤더(제목·단계 트래커)와 바깥 여백을 잘라 낸 1880×968 영상으로, 같은 슬라이드 폭에서 터미널 글자가 더 크게 보입니다. 빌드 전에 `production-source/` 에서 `DEMO_LANG=ko python3 tools/make_assets.py slideclips` 로 `video/ko/slide-stage1~7.mp4`, `slide-guard.mp4` 와 포스터(`slide-poster-*.png`)를 만드세요(약 3분). 원본은 `video/ko/clip-stageN.mp4`(A 단계의 `render`로 생성) 또는 키트의 `ko/video/clips/` 입니다. `--src` · `--out` 으로 폴더를 바꿀 수 있고, 자르는 영역은 `make_assets.py` 의 `SLIDE_CROP` 입니다.
- 단계 슬라이드(12~18) 배치는 `deck/ko/slides_steps.js`, 안전장치 시연(20)·결과 화면(19)·효과(21)는 `deck/ko/build.js`, 승인 3곳(11)은 `deck/ko/slides_static.js` 에 있습니다. 영상 폭은 `slides_steps.js` 의 `VW` 입니다(영상 비율 `ASPECT` 는 슬라이드용 클립 1880×968 기준).
- 글꼴은 `Apple SD Gothic Neo`(본문) / `Consolas`(코드)입니다. 영어판은 `Arial`(본문) / `Consolas`(코드)입니다.
- `deck/sheet.py` 는 렌더한 슬라이드 이미지(`<접두어>-*.jpg`)를 한 장의 콘택트 시트로 묶는 점검용 도구입니다(Pillow 필요).

## C. 처음부터 다시 녹화하기 (Copilot 구독 필요)

먼저 데모 저장소를 `shopflow-orders` 로 clone 하고(저장소 루트 `README.ko.md` 참고) 그 저장소 README 의 "1. 준비물"대로 설정하세요(지표 수집이 `shopflow-orders/.venv` 로 테스트를 실행합니다). 한국어판은 한국어 변형판 태그를 씁니다(브랜치가 아니라 태그): `git clone -b baseline-ko https://github.com/junwoojeong100/ghcp_cli_workflow_shopflow_orders.git shopflow-orders` (영어판은 기본 `main` 브랜치).

```bash
cd production-source
tools/prepare_profile.sh                       # 녹화 전용 프로필 준비 (배너·팁 끔, 데모 폴더는 미리 신뢰 등록). 개인 Copilot 설정과 분리됨
# 안내대로 한 번 로그인(/login)합니다. 이미 로그인된 계정을 쓰려면 다음처럼 실행하세요:
#   DEMO_COPILOT_LOGIN=<github-login> tools/prepare_profile.sh
DEMO_LANG=ko FORCE=1 tools/launch_final.sh     # 저장소 초기화 → 자동 진행 녹화 (runs/ko/final/final.cast 생성, 약 40분, AI 크레딧 사용)
DEMO_LANG=ko python3 tools/collect_metrics.py  # 실측 지표 → deck/ko/metrics.json
DEMO_LANG=ko python3 tools/collect_sample_output.py   # 실제 산출물 → ko/sample-output/ (기존 내용을 덮어쓰려면 --force)
```

- 녹화기(`tools/record.py`)는 PTY 로 Copilot CLI 를 띄우고, 사람 대신 입력·승인 키를 보내는 **드라이버**입니다. 진행 순서는 `runs/ko/steps_full.json`.
- 이미 녹화본이 있으면 덮어쓰지 않습니다(`FORCE=1` 필요, 또는 `tools/launch_final.sh rerun` 처럼 다른 이름 사용. 다만 에셋·지표 스크립트는 `runs/<언어>/final/final.cast` 를 읽습니다). 녹화기 로그는 `runs/<언어>/<이름>.rec.log` 에 남습니다. 다른 녹화나 `copilot --no-auto-update` 프로세스가 실행 중이면 시작하지 않습니다.
- 선택 환경 변수: `SHOPFLOW_ROOT`(데모 저장소 위치), `COPILOT_BIN`(`copilot` 실행 파일 경로), `DEMO_COPILOT_HOME`(녹화 프로필 위치), `BASELINE_REF`(두 수집 스크립트가 diff 기준으로 쓰는 git ref, 기본 `baseline-recorded-ko`. 영어판은 `baseline-recorded`).
- 승인 기록에 들어가는 승인자 이름은 `launch_final.sh` 가 `DEMO_APPROVER` 로 넘깁니다: 한국어판은 `홍길동 책임(운영 담당)`, 영어판은 `Gildong Hong (Ops Lead)`.
- **주의**: 녹화는 `shopflow-orders` 를 `demo_reset.sh` 로 초기화합니다(커밋하지 않은 변경, 추적되지 않는 파일과 무시된 파일(`.venv` 제외), `feature/*` 브랜치, `v*` 태그를 삭제합니다. 이전 실행의 `docs/cr/` · `approvals/` · `.copilot-audit/` 파일도 지워지고, 로컬 `main` 은 태그 `baseline-ko`(한국어판, 그 태그에서 clone) 또는 `baseline`(영어판)으로 다시 만들어집니다). `collect_metrics.py` 와 `collect_sample_output.py` 는 녹화 직후, 다음 초기화 전에 실행하세요. 화면 문구가 Copilot CLI 버전에 따라 달라질 수 있어, 버전이 바뀌면 `record.py` 의 대기 조건(`busy` 정규식 · 핸들러 패턴)을 조정해야 할 수 있습니다.
- **안전장치 시연**: `DEMO_LANG=ko FORCE=1 tools/launch_final.sh guard2 steps_guard2.json` 이 `runs/ko/guard2/guard2.cast` 에 녹화합니다(영어판은 `DEMO_LANG=en FORCE=1 tools/launch_final.sh guard steps_guard.json` → `runs/en/guard/guard.cast`). 단계 스크립트 파일 이름에 `guard` 가 들어 있으면 런처가 초기화 후 시연 준비를 직접 합니다: 규칙을 모르는 시연용 에이전트(`shopflow-orders/docs/demo/quick-fixer.agent.md.example` → `.github/agents/quick-fixer.agent.md`)를 설치하고, Copilot CLI 를 `--no-custom-instructions` 로, `git push` 용 CLI 거부 규칙 **없이** 실행해 세 요청을 막는 것이 오직 Hook 이 되게 합니다. 단계 스크립트 자체는 `/agent quick-fixer` 선택과 위험한 요청 3건 입력만 합니다. 초기화가 데모 저장소의 메인 녹화 파일을 지우므로 메인 녹화와 `collect_*` 이후에 실행하세요.
- `collect_sample_output.py` 는 `deck/<언어>/metrics.json` 을 `run-metrics.json` 으로 복사하므로 `collect_metrics.py` 뒤에 실행하세요. 로컬 경로는 치환하고(키트 폴더는 `<DEMO_KIT>`, 그 밖의 홈 폴더는 `<HOME>`) 이미 있는 `sample-output/README.md` 는 그대로 둡니다.
- **결과 화면 before/after 캡처**(고객 화면 · 관리자 콘솔)는 포트 8100(운영)의 데모 앱에서 `production-source` 기준으로 만듭니다:

  ```bash
  DEMO_LANG=ko node tools/ui_shots.js http://127.0.0.1:8100 shots/ko/before          # 기준 v1.0.0 가 떠 있을 때, 예: scripts/demo_reset.sh 직후
  DEMO_LANG=ko node tools/ui_shots.js http://127.0.0.1:8100 shots/ko/after --after   # 녹화 마지막에 운영에 v1.1.0 이 배포된 뒤
  DEMO_LANG=ko tools/.venv/bin/python tools/crop_shots.py                            # crop-*.png · deck-*-customer.png (비교만 하려면 --check)
  ```

  `--after` 는 주문 1002 에 환불을 한 건 접수해 관리자 콘솔에 '승인 대기' 항목이 보이게 합니다. 캡처는 1280×800 뷰포트를 2배 배율로 찍고, `crop_shots.py` 가 영상 끝과 결과 슬라이드(19)에 쓰는 고정 크롭을 만듭니다.
- 이 폴더에는 로그인 정보가 없습니다. 프로필은 `DEMO_COPILOT_HOME`(기본 `production-source/copilot-home`, git 제외)에 만들어지며 로그인 상태와 세션 기록이 쌓이므로 절대 커밋하지 마세요. 환경 변수 `COPILOT_HOME` 은 건드리지 않습니다.
