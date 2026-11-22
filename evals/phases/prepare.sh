#!/usr/bin/env bash
# Prepares a case workspace: copies fixtures/node-mini, creates the story branch and takes
# state.json to the requested phase using keel-state.mjs itself.
# Usage (from a fixture.sh): "$(dirname "$0")/../prepare.sh" <KEY> <slug> <title> <phase> [level]
# Phases: triage, reading, requirements, confirmation, design, tasks, implementation and commit-ready
# (T1 open with RED, GREEN, checks and review recorded, waiting for the commit approval).
# Level: standard (default) or with-design.
# Documents come from data/: <KEY>-draft.md, <KEY>-complete.md and, when present, <KEY>-design.md
# and <KEY>-tasks.md (copied as drafts in the tasks phase, approved from implementation on).
# commit-ready also uses <KEY>-T1-test.mjs (appended to test/users.test.mjs) and <KEY>-T1-users.js.
# stuck: T1 open with RED recorded from <KEY>-T1-stuck-test.mjs, a test that asks for a valid e-mail to be
# refused, against the test that already exists: GREEN cannot pass without changing a test.
# closing: every task done in its own commit, with <KEY>-closing-tasks.md as the plan and the code of
# <KEY>-T1/T2 (users.js and tests) and <KEY>-T3-server.test.mjs; the story waits in the closing phase.
set -euo pipefail
key="$1"; slug="$2"; title="$3"; phase="$4"; level="${5:-standard}"
plugin="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
data="$plugin/evals/phases/data"
state() { node "$plugin/scripts/keel-state.mjs" "$@" > /dev/null; }
implementing() { [ "$phase" = implementation ] || [ "$phase" = commit-ready ] || [ "$phase" = stuck ] || [ "$phase" = closing ]; }
past_confirmation() { [ "$phase" = design ] || [ "$phase" = tasks ] || implementing; }

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
if implementing; then
  if [ "$phase" = closing ]; then cp "$data/$key-closing-tasks.md" "$folder/tasks.md"; else cp "$data/$key-tasks.md" "$folder/tasks.md"; fi
  state approve tasks.md --by Ana
  state advance
fi
git add -A
git commit -q -m "Fixture at phase $phase"
if [ "$phase" = commit-ready ]; then
  state task start T1
  cat "$data/$key-T1-test.mjs" >> test/users.test.mjs
  state evidence red
  cp "$data/$key-T1-users.js" src/users.js
  state evidence green
  state checks
  state review task --result ok
  node -e "const fs = require('fs'); const f = process.argv[1]; fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('Status: pending', 'Status: in review'))" "$folder/tasks.md"
fi
if [ "$phase" = stuck ]; then
  state task start T1
  cat "$data/$key-T1-stuck-test.mjs" >> test/users.test.mjs
  state evidence red
  node -e "const fs = require('fs'); const f = process.argv[1]; fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('Status: pending', 'Status: red'))" "$folder/tasks.md"
fi
if [ "$phase" = closing ]; then
  done_task() {
    git add -A
    git commit -q -m "$key $1"
    node -e "const fs = require('fs'); const [f, id, hash] = process.argv.slice(1); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(new RegExp('(### ' + id + '\\nStatus: )pending'), '\$1done (' + hash + ')'))" "$folder/tasks.md" "$1" "$(git rev-parse --short HEAD)"
  }
  cat "$data/$key-T1-test.mjs" >> test/users.test.mjs
  cp "$data/$key-T1-users.js" src/users.js
  done_task T1
  cat "$data/$key-T2-test.mjs" >> test/users.test.mjs
  cp "$data/$key-T2-users.js" src/users.js
  done_task T2
  cp "$data/$key-T3-server.test.mjs" test/server.test.mjs
  done_task T3
  state advance
fi
