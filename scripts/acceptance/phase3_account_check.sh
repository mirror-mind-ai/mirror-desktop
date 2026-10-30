#!/bin/bash
# CV-010.DS-005 phase 3 acceptance: what Mirror Desktop TS wrote in a macOS account.
#
#   phase3_account_check.sh start    before opening the app for the first time
#   phase3_account_check.sh report   after the first answered turn
#
# Run in the account under test, from Terminal. It needs nothing installed: bash, find and the
# system's sqlite3. It reads the account's own files only, never a credential's value, and writes
# only its start marker, in /Users/Shared/mirror-acceptance/<user>/.
#
# `report` sorts every file written since `start` under $HOME:
#   expected   the new home (~/Mirror Homes), the app's data folder, Pi's ~/.pi/agent;
#   app chrome macOS's own files for this app (caches, WebKit, preferences, window state) and the
#              login Keychain, where the OpenRouter key is kept;
#   FORBIDDEN  ~/.config/mirror, ~/.mirror-minds, ~/mirror or ~/Mirror (macOS folds case);
#   other      everything else, listed for a person to read: macOS writes its own files too.
# It then reads the new home's database (read-only): the session in Mirror Mode, the doorman's
# provider calls, the messages. It exits 1 if anything FORBIDDEN was written.

set -u
APP_ID="${MIRROR_ACCEPTANCE_APP_ID:-ai.mirrormind.desktop.ts.dev}"
STATE_ROOT="${MIRROR_ACCEPTANCE_STATE:-/Users/Shared/mirror-acceptance}"
STATE="$STATE_ROOT/$(id -un)"
MARKER="$STATE/started"

classify() {
  local path="$1" rel="${1#"$HOME"/}"
  case "$rel" in
    .config/mirror|.config/mirror/*|.mirror-minds|.mirror-minds/*) echo FORBIDDEN; return ;;
  esac
  # ~/mirror and ~/Mirror are one folder on a case-folding disk; "Mirror Homes" is the app's.
  local top="${rel%%/*}"
  if [ "$(printf '%s' "$top" | tr '[:upper:]' '[:lower:]')" = "mirror" ]; then echo FORBIDDEN; return; fi
  case "$rel" in
    "Mirror Homes"/*|"Library/Application Support/$APP_ID"/*|.pi/agent/*) echo expected; return ;;
    Library/Keychains/*|Library/*"$APP_ID"*) echo "app chrome"; return ;;
  esac
  echo other
}

start() {
  mkdir -p "$STATE" && chmod 700 "$STATE" || exit 2
  touch "$MARKER"
  echo "Started for $(id -un) at $(date -u +%Y-%m-%dT%H:%M:%SZ)."
  for path in "$HOME/.config/mirror" "$HOME/.mirror-minds" "$HOME/mirror" "$HOME/.pi" "$HOME/Mirror Homes" "$HOME/Library/Application Support/$APP_ID"; do
    if [ -e "$path" ]; then echo "  already present: $path"; else echo "  absent: $path"; fi
  done
}

report() {
  [ -f "$MARKER" ] || { echo "No start marker; run: $0 start" >&2; exit 2; }
  local forbidden=0 path kind
  local -a expected=() chrome=() other=()
  while IFS= read -r -d '' path; do
    kind="$(classify "$path")"
    case "$kind" in
      expected) expected+=("$path") ;;
      "app chrome") chrome+=("$path") ;;
      FORBIDDEN) echo "FORBIDDEN  $path"; forbidden=$((forbidden + 1)) ;;
      *) other+=("$path") ;;
    esac
  done < <(find "$HOME" -newer "$MARKER" \( -type f -o -type l \) -print0 2>/dev/null)
  echo "expected: ${#expected[@]} files; app chrome: ${#chrome[@]}; other: ${#other[@]}; FORBIDDEN: $forbidden"
  echo "--- expected, by folder ---"
  if [ ${#expected[@]} -gt 0 ]; then
    printf '%s\n' "${expected[@]}" | sed -E "s#^$HOME/##; s#^(Mirror Homes/[^/]+|Library/Application Support/$APP_ID/[^/]+|\.pi/agent/[^/]+).*#\1#" | sort | uniq -c
  fi
  echo "--- other (read them) ---"
  if [ ${#other[@]} -gt 0 ]; then printf '%s\n' "${other[@]#"$HOME"/}" | sort | head -80; fi

  local db
  for db in "$HOME/Mirror Homes"/*/memory.db; do
    [ -f "$db" ] || continue
    echo "--- $db ---"
    /usr/bin/sqlite3 -readonly "$db" \
      "SELECT 'sessions in Mirror Mode: ' || count(*) FROM runtime_sessions WHERE mirror_active = 1 AND session_id NOT LIKE '\_\_%' ESCAPE '\';" \
      "SELECT 'provider calls: ' || ifnull(group_concat(role || ' ' || n, ', '), 'none') FROM (SELECT role, count(*) n FROM llm_calls GROUP BY role);" \
      "SELECT 'messages: ' || count(*) || ', last ' || ifnull(max(created_at), '-') FROM messages;" 2>&1
  done
  [ "$forbidden" -eq 0 ] || exit 1
}

case "${1:-}" in
  start) start ;;
  report) report ;;
  *) echo "usage: $0 start|report" >&2; exit 2 ;;
esac
