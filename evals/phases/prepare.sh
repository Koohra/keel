#!/usr/bin/env bash
# Prepares a case workspace: copies fixtures/node-mini, creates the story branch and takes
# state.json to the requested phase using keel-state.mjs itself.
# Usage (from a fixture.sh): "$(dirname "$0")/../prepare.sh" <KEY> <slug> <title> <phase>
set -euo pipefail
key="$1"; slug="$2"; title="$3"; phase="$4"
plugin="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
data="$plugin/evals/phases/data"
state() { node "$plugin/scripts/keel-state.mjs" "$@" > /dev/null; }

cp -R "$plugin/fixtures/node-mini/." .
git init -q -b "feat/$key-$slug"
git config user.name Ana
git config user.email ana@example.com
state init --key "$key" --slug "$slug" --title "$title"
folder="keel/features/$key-$slug"
if [ "$phase" != triage ]; then
  state level standard --by Ana
  state advance
fi
if [ "$phase" = requirements ] || [ "$phase" = confirmation ]; then
  state generated repo-map
  state advance
fi
if [ "$phase" = requirements ]; then
  cp "$data/$key-draft.md" "$folder/requirements.md"
fi
if [ "$phase" = confirmation ]; then
  cp "$data/$key-complete.md" "$folder/requirements.md"
  state advance
fi
git add -A
git commit -q -m "Fixture at phase $phase"
