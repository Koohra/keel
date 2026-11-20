#!/usr/bin/env node
// PreToolUse hook: blocks writes to state.json (by edit or terminal) and code edits
// outside the phase that allows them.
// Reads the event from stdin; exits with 2 (block, reason on stderr) or 0 (allow).
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { checkCommand, checkEdit, findActiveStory, isProjectSource, loadWorkflow, reconcile } from '../keel-state.mjs';
import { readDocs } from '../validate-feature.mjs';

const event = JSON.parse(readFileSync(0, 'utf8'));
const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;
if (event.tool_name === 'Bash') {
  const decision = checkCommand(event.tool_input?.command ?? '');
  if (decision.block) console.error(decision.reason);
  process.exit(decision.block ? 2 : 0);
}
const target = event.tool_input?.file_path ?? event.tool_input?.notebook_path;
if (!target) process.exit(0);

const path = relative(root, resolve(root, target));
const workflow = loadWorkflow();
let state = null;
try {
  const active = findActiveStory(root);
  // An expired approval sends the story back to its gate before deciding, even without running next.
  if (active) state = reconcile(active.state, workflow, readDocs(active.folder)).state;
} catch (error) {
  // Without knowing the phase, block only what would depend on it: project code.
  if (checkEdit(path, null, workflow).block || isProjectSource(path)) {
    console.error(error.message);
    process.exit(2);
  }
  process.exit(0);
}
const decision = checkEdit(path, state, workflow);
if (decision.block) {
  console.error(decision.reason);
  process.exit(2);
}
