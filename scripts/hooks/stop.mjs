#!/usr/bin/env node
// Stop hook: in the implementation, the turn does not end with an open task that lacks RED, GREEN,
// passing checks or review, unless the story is blocked. Stale checks are run here through
// keel-state.mjs checks (the only writer of state.json). A second stop in a row is let through.
// Reads the event from stdin; exits with 2 (keep working, reason on stderr) or 0 (allow).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { codeFingerprint, findActiveStory, loadWorkflow, reconcile } from '../keel-state.mjs';
import { checkStop } from '../task-loop.mjs';
import { readDocs } from '../validate-feature.mjs';

const input = readFileSync(0, 'utf8');
const event = input.trim() ? JSON.parse(input) : {};
const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;
if (!root || event.stop_hook_active) process.exit(0);

function decide() {
  const active = findActiveStory(root);
  if (!active) return { action: 'allow' };
  const docs = readDocs(active.folder);
  const state = reconcile(active.state, loadWorkflow(), docs).state;
  const decision = checkStop(state, docs['tasks.md'], state.phase === 'implementation' ? codeFingerprint(root) : null);
  return { ...decision, folder: active.folder };
}

let decision;
try {
  decision = decide();
} catch (error) {
  // A broken state.json or repository is for the dev to see, not a reason to trap the session.
  process.exit(0);
}
if (decision.action === 'run-checks') {
  const script = fileURLToPath(new URL('../keel-state.mjs', import.meta.url));
  const checks = spawnSync(process.execPath, [script, 'checks', '--story', decision.folder], { cwd: root, encoding: 'utf8' });
  if (checks.status !== 0) {
    console.error(`Keel: the project checks failed; fix them in the task, or record a failure outside the task with keel-state.mjs block --reason "<reason>".\n${checks.stderr}`);
    process.exit(2);
  }
  decision = decide();
}
if (decision.action === 'block') {
  console.error(decision.reason);
  process.exit(2);
}
