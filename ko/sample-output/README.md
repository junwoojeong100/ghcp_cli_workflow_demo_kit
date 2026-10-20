# sample-output — 녹화 세션의 실제 산출물

영상·PPT 의 수치는 모두 이 폴더의 자료(그리고 녹화본)에서 가져왔습니다. `shopflow-orders` 를 직접 재현하면 같은 종류의 파일이 `docs/cr/`, `approvals/`, `.copilot-audit/` 에 생깁니다.

| 파일 | 내용 |
|---|---|
| `docs-cr-CR-2026-014/01-impact-analysis.md` | 변경 분석가: 영향 분석서 (영향 7개 영역, 데이터 이상, 결정 필요 사항) |
| `docs-cr-CR-2026-014/02-design.md` | 설계자: 설계서 (사람의 결정 3건 반영) → **① 설계 승인** 대상 |
| `docs-cr-CR-2026-014/03-implementation-notes.md` | 개발자: 구현 노트 |
| `docs-cr-CR-2026-014/04-test-report.md` | 테스터: 요구사항-테스트 추적표, 117개 통과 · 커버리지 99% |
| `docs-cr-CR-2026-014/05-review-report.md` | 리뷰어: 치명 0 · 중대 0 · 경미 1 → **② 코드 승인** 요청 |
| `docs-cr-CR-2026-014/06-release-plan.md` | 배포 관리자: 릴리스 계획 · 롤백 방법 · staging/production 검증 → **③ 운영 배포 승인** |
| `docs-cr-CR-2026-014/07-ops-report.md` | 운영 분석가: 운영 로그·DB 읽기 전용 분석, 현업이 결정할 사항 |
| `approvals/CR-2026-014/*.json` | 승인 기록 4건 — design · code · production(사람), staging(시스템). 설계서/코드의 SHA-256 과 묶여 있음 |
| `audit.jsonl` | 모든 도구 호출의 감사 로그 231건 (허용/차단/승인 요청). 로컬 경로는 `<DEMO_KIT>` 로 치환 |
| `full-change.diff` | 기준 상태(데모 저장소 `ko` 브랜치의 `baseline-recorded-ko` 태그) 대비 전체 변경 diff (코드·테스트·문서) |
| `git-log-stat.txt` | 커밋 7개의 요약과 파일별 변경량 |
| `production-app.log` | 시뮬레이션 운영 환경의 접근 로그 (운영 분석가의 분석 대상) |
| `run-metrics.json` | 슬라이드에 쓴 실측 지표 (단계별 소요·AI 사용량, 변경 규모, 테스트, 리뷰, 감사) |

- 이 세션의 사람 개입은 **6번**입니다: 승인 3곳(design · code · production) + 설계 단계의 결정 3건.
  결정 1건(구버전 앱 처리)은 AI 추천과 다른 내용을 직접 입력했습니다 — `02-design.md` 와 `07-ops-report.md` 에서 확인할 수 있습니다.
- 모든 이름·데이터는 가상입니다.
- 이 폴더는 **한국어판**(한국어 녹화본) 산출물입니다. 영어판(기본)의 산출물은 별도의 영어 녹화본에서 만든 것이라 수치가 다르며, 저장소 루트의 [`sample-output/`](../../sample-output/) 에 있습니다.
