#!/usr/bin/env bash
# Prepares a case workspace: copies fixtures/node-mini, creates the story branch and takes
# state.json to the requested phase using keel-state.mjs itself.
# Usage (from a fixture.sh): "$(dirname "$0")/../prepare.sh" <KEY> <slug> <title> <phase> [level]
# Phases: triage, reading, requirements, confirmation, design, tasks. Level: standard (default) or with-design.
# Documents come from data/: <KEY>-draft.md, <KEY>-complete.md and, when present, <KEY>-design.md
# and <KEY>-tasks.md (copied as drafts in the tasks phase).
set -euo pipefail
key="$1"; slug="$2"; title="$3"; phase="$4"; level="${5:-standard}"
plugin="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
data="$plugin/evals/phases/data"
state() { node "$plugin/scripts/keel-state.mjs" "$@" > /dev/null; }
past_confirmation() { [ "$phase" = design ] || [ "$phase" = tasks ]; }

cp -R "$plugin/fixtures/node-mini/." .
git init -q -b "feat/$key-$slug"
git config user.name Ana
git config user.email ana@example.com
state init --key "$key" --slug "$slug" --title "$title"
folder="keel/features/$key-$slug"
if [ "$phase" != triage ]; then
  state level "$level" --by Ana
  state advance
fi
if [ "$phase" != triage ] && [ "$phase" != reading ]; then
  state generated repo-map
  state advance
fi
if [ "$phase" = requirements ]; then
  cp "$data/$key-draft.md" "$folder/requirements.md"
fi
if [ "$phase" = confirmation ] || past_confirmation; then
  cp "$data/$key-complete.md" "$folder/requirements.md"
  state advance
fi
if past_confirmation; then
  state review requirements --result ok
  state approve requirements.md --by Ana
  state advance
fi
if [ "$phase" = tasks ] && [ "$level" = with-design ]; then
  cp "$data/$key-design.md" "$folder/design.md"
  state advance
fi
if [ "$phase" = tasks ] && [ -f "$data/$key-tasks.md" ]; then
  cp "$data/$key-tasks.md" "$folder/tasks.md"
fi
git add -A
git commit -q -m "Fixture at phase $phase"
