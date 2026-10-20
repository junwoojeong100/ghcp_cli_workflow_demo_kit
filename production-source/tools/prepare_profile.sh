#!/usr/bin/env bash
# Prepares a dedicated Copilot profile for recording: banner and tips off, separate from your personal Copilot settings,
# and the demo folder pre-trusted so no trust prompt appears while recording.
# The profile holds no credentials. Either log in once yourself (/login), or reuse a credential that is already stored
# for the same GitHub account (macOS Keychain): set DEMO_COPILOT_LOGIN=<github-login> and this script lists that
# account in the profile (only the account name is written, never a token).
# Note: the COPILOT_HOME environment variable is not used (to protect your personal settings). Use DEMO_COPILOT_HOME for another location.
set -euo pipefail
SESS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_COPILOT_HOME="${DEMO_COPILOT_HOME:-$SESS/copilot-home}"
ROOT="$(cd "${SHOPFLOW_ROOT:-$SESS/../shopflow-orders}" && pwd)"
mkdir -p "$DEMO_COPILOT_HOME"
cat > "$DEMO_COPILOT_HOME/settings.json" <<'JSON'
{
  "banner": "never",
  "memory": false,
  "logLevel": "info",
  "showTipsOnStartup": false
}
JSON
ROOT="$ROOT" LOGIN="${DEMO_COPILOT_LOGIN:-}" HOME_DIR="$DEMO_COPILOT_HOME" python3 - <<'PY'
import json, os
cfg = {"trustedFolders": [os.environ["ROOT"]]}
login = os.environ.get("LOGIN")
if login:
    user = {"host": "https://github.com", "login": login}
    cfg["loggedInUsers"] = [user]
    cfg["lastLoggedInUser"] = user
path = os.path.join(os.environ["HOME_DIR"], "config.json")
with open(path, "w", encoding="utf-8") as fh:
    json.dump(cfg, fh, indent=2)
PY
echo "Profile ready: $DEMO_COPILOT_HOME"
if [[ -n "${DEMO_COPILOT_LOGIN:-}" ]]; then
  echo "Reusing the stored credential of GitHub user '$DEMO_COPILOT_LOGIN' (no login needed)."
else
  echo "Log in once (/login) in this profile:"
  echo "  cd \"$ROOT\" && COPILOT_HOME=\"$DEMO_COPILOT_HOME\" copilot"
fi
