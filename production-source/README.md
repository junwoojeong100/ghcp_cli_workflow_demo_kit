# production-source — 영상·PPT 제작 소스

데모 영상과 PPT를 **어떻게 만들었는지**와 **다시 만드는 방법**입니다. 발표만 하려면 이 폴더는 필요 없습니다.
(`ghcp_cli_workflow_demo_kit` 저장소의 `production-source/` 이며, 시연 대상 앱은 짝 저장소 [`ghcp_cli_workflow_shopflow_orders`](https://github.com/junwoojeong100/ghcp_cli_workflow_shopflow_orders) 입니다.)

```
production-source/
  tools/          녹화(PTY 레코더) · 영상 렌더러 · 에셋 생성 스크립트
  runs/           녹화본(cast): final(메인 세션), guard2(안전장치 시연) + 단계별 진행 스크립트(steps_*.json)
  shots/          결과 화면 before/after 캡처(고객 화면 · 관리자 콘솔)
  deck/           PPT 빌드 소스 (pptxgenjs) — build.js, 슬라이드 모듈, facts.json(문구), metrics.json(실측값)
  video/          생성물이 모이는 곳 (git 에는 타이틀·엔딩 카드 PNG 와 .gitkeep 만 있고, 클립·영상은 만들어지거나 Releases 로 받습니다)
```

> **저장소를 막 clone 했다면**: 슬라이드·영상 파일(MP4·PNG 스틸·PPTX)은 용량 때문에 git 이력에 없습니다.
> [Releases](https://github.com/junwoojeong100/ghcp_cli_workflow_demo_kit/releases) 의 `ghcp_cli_workflow_video_assets.zip` 을 **저장소 루트(= `production-source` 의 상위 폴더)** 에 풀면 `video/clips/`, `video/stills/` 가 생기고,
> 덱 빌드(`deck/build.js`)가 `video/stills/gate-prod-1.png` 를, `make_assets.py slideclips` 가 `video/clips/` 의 클립을 자동으로 찾습니다.
> 아니면 아래 **A** 로 녹화본에서 직접 만들 수 있습니다.

## 준비물

| 항목 | 용도 |
|---|---|
| Python 3.12 + `pexpect`, `pyte` (`tools/requirements.txt`) | 녹화(`record.py`) |
| Node.js 22 | 영상 렌더러(`tools/render`, xterm.js + playwright-core), 덱 빌드 |
| Google Chrome (macOS 기본 경로, 다른 경로는 `CHROME_PATH`) | 렌더러의 헤드리스 브라우저 |
| ffmpeg / ffprobe | 인코딩 · 클립 · 포스터 · 이어 붙이기 |
| 이 폴더의 **상위(저장소 루트)에 있는** `shopflow-orders/` = 데모 저장소 clone | 지표 수집(`collect_metrics.py`) · 재녹화(C). 이름·위치가 다르면 `SHOPFLOW_ROOT`. clone 방법은 저장소 루트 `README.md` 참고 (B 의 덱 빌드만 할 때는 필요 없음) |

```bash
cd production-source
python3 -m venv tools/.venv && tools/.venv/bin/pip install -r tools/requirements.txt
(cd tools/render && npm install)      # 영상 렌더러 의존성(xterm.js · playwright-core) — git 에는 node_modules 가 없습니다
```

## A. 녹화본으로 영상 다시 만들기 (Copilot 불필요)

캡션·속도·배너를 바꾸고 싶을 때 쓰는 경로입니다. 녹화본(`runs/final/final.cast`)은 터미널 출력과 마커(단계·캡션·배속·배너)를 담고 있어,
렌더러가 이를 1080p 영상으로 다시 그립니다.

```bash
cd tools
python3 make_assets.py render    # 메인 영상(약 8분) 렌더 + 단계별 클립·포스터 (약 4~5분 소요)
python3 make_assets.py stills    # 승인 팝업 등 주요 장면 PNG
python3 make_assets.py guard     # 안전장치 시연 영상(guard.mp4)과 슬라이드용 포스터
python3 make_assets.py concat    # 타이틀 + 메인 + 안전장치 + 엔딩 → video/GHCP_CLI_Workflow_Demo_KO.mp4
python3 make_assets.py slideclips # 슬라이드용 클립·포스터 (아래 B 참고) — 위 단계 없이 ../video/clips/ 의 클립만 있어도 동작
node cards.js ../video ../deck/metrics.json                                                       # 타이틀·엔딩 카드
```

- 캡션·배속·배너는 `runs/steps_full.json` 의 `mark` 항목(`caption`, `speed`, `gate`, `images` 등)에서 정해집니다. 생성기: `python3 tools/make_steps.py --out runs/steps_full.json` (옵션 `--from-stage` `--to-stage` `--speed`).
- 영상 끝의 before/after 화면은 `tools/make_assets.py` 의 `build_cast_with_images()` 가 `shots/crop-*.png` 로 덧붙입니다.

## B. PPT 다시 만들기

```bash
cd deck
npm install                       # pptxgenjs, react-icons, sharp 등 (처음 한 번)
node build.js ../out.pptx         # ../video/slide-stageN.mp4 · slide-poster-stageN.png · slide-guard.mp4 가 있으면 영상 삽입, 없으면 정지 이미지/자리표시
NO_VIDEO=1 node build.js ../out.pptx   # 영상 없이 빠르게 확인
```

- 문구는 `deck/facts.json`, 실측 수치는 `deck/metrics.json` (`tools/collect_metrics.py` 가 녹화 결과에서 생성), 디자인·컴포넌트는 `deck/lib.js`, 정적 슬라이드는 `deck/slides_static.js`.
- **발표자 노트(구어체 스크립트)는 `deck/notes.md`** 입니다. `## 슬라이드번호` 아래의 글이 그 슬라이드의 노트가 되어 빌드할 때 PPT에 들어갑니다(빈 줄 = 문단 나눔, `▶ 영상 재생 (약 N초)` = 영상을 틀 타이밍, `※` = 낭독하지 않는 출처 줄). 모든 슬라이드에 노트가 있어야 빌드됩니다. 노트 안의 수치는 `facts.json` · `metrics.json` 과 같아야 합니다.
- 슬라이드의 영상은 **슬라이드용 클립**입니다: 전체 화면 클립(1920×1080)에서 상단 헤더(제목·단계 트래커)와 바깥 여백을 잘라 낸 1880×968 영상으로, 같은 슬라이드 폭에서 터미널 글자가 더 크게 보입니다. 빌드 전에 `python3 tools/make_assets.py slideclips` 로 `video/slide-stage1~7.mp4`, `slide-guard.mp4` 와 포스터(`slide-poster-*.png`)를 만드세요(약 3분). 원본은 `video/clip-stageN.mp4`(A 단계의 `render`로 생성) 또는 키트의 `../video/clips/` 입니다. `--src` · `--out` 으로 폴더를 바꿀 수 있고, 자르는 영역은 `make_assets.py` 의 `SLIDE_CROP` 입니다.
- 단계 슬라이드(12~18) 배치는 `deck/slides_steps.js`, 안전장치 시연(20)·결과 화면(19)·효과(21)는 `deck/build.js`, 승인 3곳(11)은 `deck/slides_static.js` 에 있습니다. 영상 폭은 `slides_steps.js` 의 `VW` 입니다(영상 비율 `ASPECT` 는 슬라이드용 클립 1880×968 기준).
- 글꼴은 `Apple SD Gothic Neo`(본문) / `Consolas`(코드)입니다.

## C. 처음부터 다시 녹화하기 (Copilot 구독 필요)

```bash
tools/prepare_profile.sh                     # 녹화 전용 프로필 준비 (배너·팁 끔). 개인 Copilot 설정과 분리됨
# 안내대로 한 번 로그인(/login)하고 ../shopflow-orders 폴더를 신뢰(trust)
FORCE=1 tools/launch_final.sh                # 저장소 초기화 → 자동 진행 녹화 (runs/final/final.cast 생성, 약 40분, AI 크레딧 사용)
python3 tools/collect_metrics.py             # 실측 지표 → deck/metrics.json
```

- 녹화기(`tools/record.py`)는 PTY 로 Copilot CLI 를 띄우고, 사람 대신 입력·승인 키를 보내는 **드라이버**입니다. 진행 순서는 `runs/steps_full.json`.
- 이미 녹화본이 있으면 덮어쓰지 않습니다(`FORCE=1` 필요, 또는 `tools/launch_final.sh rerun` 처럼 다른 이름 사용).
- **주의**: 녹화는 `shopflow-orders` 를 `demo_reset.sh` 로 초기화합니다(커밋하지 않은 변경 삭제). 화면 문구가 Copilot CLI 버전에 따라 달라질 수 있어, 버전이 바뀌면 `record.py` 의 대기 조건(`busy` 정규식 · 핸들러 패턴)을 조정해야 할 수 있습니다.
- 안전장치 시연 녹화는 `runs/steps_guard2.json` 으로 같은 방식으로 진행했습니다. 시연용 에이전트는 `shopflow-orders/docs/demo/quick-fixer.agent.md.example` 입니다.
- 이 폴더에는 로그인 정보가 없습니다. 프로필은 `DEMO_COPILOT_HOME`(기본 `production-source/copilot-home`)에 만들어지며, 환경 변수 `COPILOT_HOME` 은 건드리지 않습니다.
