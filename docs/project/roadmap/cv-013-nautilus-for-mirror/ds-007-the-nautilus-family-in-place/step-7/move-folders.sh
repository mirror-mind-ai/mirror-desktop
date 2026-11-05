#!/bin/bash
# CV-013.DS-007 step 7: put the Nautilus family in its folders.
#
#   bash /private/tmp/nautilus-folders/move-folders.sh            # dry run: prints, changes nothing
#   bash /private/tmp/nautilus-folders/move-folders.sh --apply    # does it; stops at the first error
#
# Run it in Terminal with Nautilus for Mirror closed. It never deletes anything: the protocol is
# copied, and every folder is moved by rename on the same volume.
set -euo pipefail

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

B=${REHEARSAL_B:-/Users/alissonvale/.mirror-journeys/vida-tecnica/ia-agentica/mirror-mind-ai}
OLD_APP=$B/mirror-desktop
OLD_FRAMEWORK=$B/nautilus
OLD_PROTOCOL=${REHEARSAL_PROTOCOL:-/Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/agentic-protocol}
FAMILY=$B/nautilus
APP=$FAMILY/nautilus-app
FRAMEWORK=$FAMILY/nautilus-framework
PROTOCOL=$FAMILY/nautilus-protocol
MOVING=$B/.nautilus-framework-moving
CLONE=${REHEARSAL_CLONE:-/private/tmp/nautilus-folders/family-clone}
HERE=$(cd "$(dirname "$0")" && pwd)

export MIRROR_HOME=${REHEARSAL_HOME:-/Users/alissonvale/.mirror-minds/alisson-vale}
export MIRROR_USER=alisson-vale
export DB_PATH=$MIRROR_HOME/memory.db
NODE=/usr/local/bin/node

say() { printf '%s\n' "$*"; }
act() { say "  + $*"; [ $APPLY = 1 ] && "$@"; return 0; }
fail() { say "STOP: $*"; exit 1; }

say "== Checks"
if [ -z "${REHEARSAL_B:-}" ] && pgrep -f "Nautilus for Mirror.app/Contents/MacOS" >/dev/null; then
  fail "Nautilus for Mirror is open. Quit it (Cmd-Q) and run again."
fi
case "$PWD/" in "$OLD_APP/"*|"$OLD_FRAMEWORK/"*) fail "run this from another folder, e.g. cd ~";; esac
[ -d "$OLD_APP/.git" ] || fail "$OLD_APP is not the app checkout (already moved?)"
[ -d "$OLD_FRAMEWORK/.git" ] || fail "$OLD_FRAMEWORK is not the framework checkout (already moved?)"
[ -d "$OLD_PROTOCOL/.git" ] || fail "$OLD_PROTOCOL is missing"
[ -e "$MOVING" ] && fail "$MOVING exists from an earlier run; look at it first"
[ -z "$(git -C "$OLD_APP" status --porcelain)" ] || fail "the app checkout has uncommitted changes"
[ "$(git -C "$OLD_FRAMEWORK" status --porcelain)" = "?? nautilus-icon.png" ] \
  || [ -z "$(git -C "$OLD_FRAMEWORK" status --porcelain)" ] || fail "the framework checkout has uncommitted changes"
[ "$(git -C "$OLD_APP" remote get-url origin)" = "https://github.com/mirror-mind-ai/nautilus-app.git" ] || fail "app origin is not nautilus-app"
[ "$(git -C "$OLD_FRAMEWORK" remote get-url origin)" = "https://github.com/mirror-mind-ai/nautilus-framework.git" ] || fail "framework origin is not nautilus-framework"
[ "$(git -C "$OLD_FRAMEWORK" remote get-url origin)" != "https://github.com/mirror-mind-ai/nautilus.git" ] || fail "framework still points at the family"
"$NODE" --version >/dev/null || fail "no node at $NODE"
ICON=0
[ -e "$OLD_FRAMEWORK/nautilus-icon.png" ] && ICON=1
say "  ok: app closed, both checkouts clean, origins renamed"

say "== 1. Fetch the family repository (before touching any folder)"
rm -rf "$CLONE"
git clone -q "${REHEARSAL_FAMILY_URL:-https://github.com/mirror-mind-ai/nautilus.git}" "$CLONE" || fail "could not clone mirror-mind-ai/nautilus"
say "  ok: cloned to $CLONE ($(git -C "$CLONE" log --oneline | wc -l | tr -d ' ') commit)"

say "== 2. Back up the Mirror database"
if [ $APPLY = 1 ]; then mirror backup | tail -1; else say "  + mirror backup"; fi

say "== 3. Folders"
act mv "$OLD_FRAMEWORK" "$MOVING"
act mkdir "$FAMILY"
if [ $ICON = 1 ]; then act mv "$MOVING/nautilus-icon.png" "$FAMILY/nautilus-icon.png"; fi
act mv "$MOVING" "$FRAMEWORK"
act mv "$OLD_APP" "$APP"
act ditto "$OLD_PROTOCOL" "$PROTOCOL"
act rm -f "$PROTOCOL/.DS_Store"

say "== 4. The family folder becomes the family repository's checkout"
act mv "$CLONE/.git" "$FAMILY/.git"
act mv "$CLONE/README.md" "$FAMILY/README.md"
if [ $APPLY = 1 ]; then
  printf '%s\n' "# The three bodies are separate repositories checked out here." \
    "/nautilus-app/" "/nautilus-framework/" "/nautilus-protocol/" ".DS_Store" > "$FAMILY/.gitignore"
  git -C "$FAMILY" add .gitignore
  git -C "$FAMILY" commit -q -m "Ignore the three bodies' checkouts inside the family folder"
  git -C "$FAMILY" status --short
else
  say "  + write $FAMILY/.gitignore (nautilus-app/, nautilus-framework/, nautilus-protocol/) and commit it locally"
fi

say "== 5. .mirror-journey.json of the app and of the framework"
if [ $APPLY = 1 ]; then
  python3 -I "$HERE/journey-markers.py" "$APP/.mirror-journey.json" "$FRAMEWORK/.mirror-journey.json"
else
  say "  + app: name Nautilus App, parent nautilus, journey_home/target -> $APP"
  say "  + framework: journey nautilus-agentic-method, name Nautilus Agentic Framework, parent nautilus, journey_home/target -> $FRAMEWORK"
fi

say "== 6. Mirror: project paths and sync files, through the Core"
if [ $APPLY = 1 ]; then
  "$NODE" "$HERE/project-paths.mjs" "$APP" "$FRAMEWORK" "$PROTOCOL" 2>&1 | grep -v -i "experimental\|trace-warnings"
  mirror tasks sync-config nautilus "$FRAMEWORK/JOURNEY.md"
  mirror tasks sync-config nautilus-agentic-protocol "$PROTOCOL/JOURNEY.md"
else
  say "  + mirror-desktop, mirror-desktop-rescue-journey -> $APP"
  say "  + nautilus-agentic-method -> $FRAMEWORK"
  say "  + nautilus-agentic-protocol -> $PROTOCOL"
  say "  + sync_file: nautilus -> $FRAMEWORK/JOURNEY.md (the same file, moved); protocol -> its copy"
  say "  (nautilus keeps project_path $FAMILY: the same path, now the family folder)"
fi

say "== Done$([ $APPLY = 1 ] || printf ' (dry run: nothing changed)')"
if [ $APPLY = 1 ]; then say "Open Nautilus for Mirror and send a turn in Nautilus App."; fi
exit 0
