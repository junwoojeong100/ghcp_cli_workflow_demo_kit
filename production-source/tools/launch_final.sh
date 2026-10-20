#!/usr/bin/env bash
# Starts the final recording: reset -> record. All recorder output goes to runs/<lang>/<run>.rec.log
# Usage: DEMO_LANG=en|ko [FORCE=1] [SHOPFLOW_ROOT=...] [COPILOT_BIN=...] tools/launch_final.sh [run-name] [steps-file]
#   run-name   default: final         (cast: runs/<lang>/<run>/<run>.cast)
#   steps-file default: steps_full.json (in runs/<lang>/)   e.g. steps_guard.json for the guardrail demo
#   A steps file whose name contains "guard" starts the guardrail demo setup: the rule-unaware demo agent quick-fixer
#   (docs/demo/quick-fixer.agent.md.example) is installed after the reset, repo custom instructions are disabled
#   (--no-custom-instructions) and there is no CLI deny rule, so the hook in .github/hooks is what blocks the requests.
set -u
SESS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # production-source/
LANG_CODE="${DEMO_LANG:-en}"
ROOT="$(cd "${SHOPFLOW_ROOT:-$SESS/../shopflow-orders}" && pwd)"
# Dedicated recording profile (separate from your personal Copilot settings). Run tools/prepare_profile.sh first.
DEMO_COPILOT_HOME="${DEMO_COPILOT_HOME:-$SESS/copilot-home}"
COPILOT_BIN="${COPILOT_BIN:-copilot}"
RUN="${1:-final}"; STEPS="${2:-steps_full.json}"
case "$LANG_CODE" in
  ko) APPROVER="홍길동 책임(운영 담당)" ;;
  *)  APPROVER="Gildong Hong (Ops Lead)" ;;
esac
CAST_DIR="$SESS/runs/$LANG_CODE/$RUN"
if [[ -e "$CAST_DIR/$RUN.cast" && "${FORCE:-0}" != "1" ]]; then echo "[launch] ABORT: $CAST_DIR/$RUN.cast already exists. Re-run with FORCE=1 to overwrite (or use another name: ./launch_final.sh rerun)"; exit 1; fi
if ps -eo command | grep -E "record.py --out|copilot --no-auto-update" | grep -v grep >/dev/null; then echo "[launch] ABORT: a recording/copilot process is already running"; exit 1; fi
echo "[launch] reset $(date +%T)"
"$ROOT/scripts/demo_reset.sh" || { echo "[launch] RESET FAILED"; exit 1; }
rm -rf "$CAST_DIR"; mkdir -p "$CAST_DIR"
if [[ "$STEPS" == *guard* ]]; then
  cp "$ROOT/docs/demo/quick-fixer.agent.md.example" "$ROOT/.github/agents/quick-fixer.agent.md" || { echo "[launch] cannot install quick-fixer"; exit 1; }
  COPILOT_ARGS=(--no-auto-update --no-custom-instructions --allow-tool=write --allow-tool=shell)
else
  COPILOT_ARGS=(--no-auto-update --allow-tool=write --allow-tool=shell "--deny-tool=shell(git push)")
fi
COPILOT_ARGS+=(--allow-url=http://127.0.0.1:8100 --allow-url=http://127.0.0.1:8101)
# Never leak the outer Copilot session identity into the recorded CLI (matters when this is started from another Copilot session)
unset COPILOT_AGENT_SESSION_ID COPILOT_CLI COPILOT_CLI_BINARY_VERSION COPILOT_CACHE_HOME
export COPILOT_HOME="$DEMO_COPILOT_HOME"
cd "$SESS/tools"
echo "[launch] start recorder $(date +%T)"
exec ./.venv/bin/python record.py --out "$CAST_DIR/$RUN.cast" --steps "$SESS/runs/$LANG_CODE/$STEPS" --cwd "$ROOT" --cols 120 --rows 30 \
  --env COPILOT_HOME="$DEMO_COPILOT_HOME" --env "DEMO_APPROVER=$APPROVER" -- \
  "$COPILOT_BIN" "${COPILOT_ARGS[@]}" > "$SESS/runs/$LANG_CODE/$RUN.rec.log" 2>&1
