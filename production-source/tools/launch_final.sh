#!/usr/bin/env bash
# 최종 녹화 시작: 초기화 → 녹화 (모든 출력은 launch.log 로)
set -u
SESS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # production-source/
ROOT="$(cd "${SHOPFLOW_ROOT:-$SESS/../shopflow-orders}" && pwd)"
# 녹화 전용 프로필(개인 Copilot 설정과 분리). 먼저 tools/prepare_profile.sh 를 실행하세요.
DEMO_COPILOT_HOME="${DEMO_COPILOT_HOME:-$SESS/copilot-home}"
RUN="${1:-final}"; STEPS="${2:-steps_full.json}"
if [[ -e "$SESS/runs/$RUN/$RUN.cast" && "${FORCE:-0}" != "1" ]]; then echo "[launch] ABORT: runs/$RUN/$RUN.cast 가 이미 있습니다. 덮어쓰려면 FORCE=1 로 실행하세요 (다른 이름: ./launch_final.sh rerun)"; exit 1; fi
if ps -eo command | grep -E "record.py --out|copilot --no-auto-update" | grep -v grep >/dev/null; then echo "[launch] ABORT: 이미 실행 중인 녹화/copilot 프로세스가 있습니다"; exit 1; fi
echo "[launch] reset $(date +%T)"
"$ROOT/scripts/demo_reset.sh" || { echo "[launch] RESET FAILED"; exit 1; }
rm -rf "$SESS/runs/$RUN"; mkdir -p "$SESS/runs/$RUN"
export COPILOT_HOME="$DEMO_COPILOT_HOME"
cd "$SESS/tools"
echo "[launch] start recorder $(date +%T)"
exec ./.venv/bin/python record.py --out "../runs/$RUN/$RUN.cast" --steps "../runs/$STEPS" --cwd "$ROOT" --cols 120 --rows 30 \
  --env COPILOT_HOME="$DEMO_COPILOT_HOME" --env "DEMO_APPROVER=홍길동 책임(운영 담당)" -- \
  copilot --no-auto-update --allow-tool=write --allow-tool=shell --deny-tool='shell(git push)' \
  --allow-url=http://127.0.0.1:8100 --allow-url=http://127.0.0.1:8101 > "$SESS/runs/$RUN.rec.log" 2>&1
