#!/usr/bin/env bash
# 녹화용 Copilot 프로필을 준비한다: 배너·팁을 끄고, 개인 Copilot 설정과 분리된 깨끗한 화면으로 녹화하기 위함.
# 로그인 정보는 포함하지 않으므로 처음 한 번 직접 로그인하고 데모 폴더를 신뢰(trust)해야 한다.
# 주의: 환경 변수 COPILOT_HOME 은 사용하지 않는다(개인 설정 보호). 다른 위치를 쓰려면 DEMO_COPILOT_HOME 을 지정한다.
set -euo pipefail
SESS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_COPILOT_HOME="${DEMO_COPILOT_HOME:-$SESS/copilot-home}"
mkdir -p "$DEMO_COPILOT_HOME"
cat > "$DEMO_COPILOT_HOME/settings.json" <<'JSON'
{
  "banner": "never",
  "memory": false,
  "logLevel": "info",
  "showTipsOnStartup": false
}
JSON
echo "프로필 준비 완료: $DEMO_COPILOT_HOME"
echo "다음을 한 번 실행해 로그인(/login)하고 데모 폴더를 신뢰(trust)하세요:"
echo "  cd \"$SESS/../shopflow-orders\" && COPILOT_HOME=\"$DEMO_COPILOT_HOME\" copilot"
