#!/usr/bin/env node
// PreToolUse hook: blocks writes to state.json (by edit or terminal), code edits outside the
// phase that allows them and, in the implementation, git commit without the dev's approval.
// Works with Claude Code (Write, Edit, Bash...) and Codex (apply_patch, Bash); see event.mjs.
// Reads the event from stdin; exits with 2 (block, reason on stderr) or 0 (allow).
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import {
  changedFiles, checkCommand, checkEdit, codeFingerprint, findActiveStory, isProjectSource, loadWorkflow, reconcile,
} from '../keel-state.mjs';
import { AGENT_NAME, isReadOnlyCommand } from '../codex-reviewer.mjs';
import { checkGitCommit, isGitCommit } from '../task-loop.mjs';
import { readDocs } from '../validate-feature.mjs';
import { editTargets, projectRoot, shellCommand } from './event.mjs';

function block(reason) {
  console.error(reason);
  process.exit(2);
}

// Without an active story git commit is not the Keel's business; an unreadable state.json blocks it.
function gitCommitDecision(root) {
  const active = findActiveStory(root);
  if (!active) return { block: false };
  const docs = readDocs(active.folder);
  const state = reconcile(active.state, loadWorkflow(), docs).state;
  if (state.phase !== 'implementation') return { block: false };
  return checkGitCommit(state, docs['tasks.md'], codeFingerprint(root), changedFiles(root));
}

const event = JSON.parse(readFileSync(0, 'utf8'));
const root = projectRoot(event);
const command = shellCommand(event);
// The Keel reviewer as a Codex subagent has no tools list: the hook keeps it read-only, in any phase.
if (event.agent_type === AGENT_NAME) {
  if (command === null) block(`${AGENT_NAME} is read-only: it cannot edit files`);
  if (!isReadOnlyCommand(command)) block(`${AGENT_NAME} is read-only: only reading commands (cat, rg, grep, sed -n, ls, find, head, tail, wc, git diff/log/show/status) without redirection`);
}
if (command !== null) {
  const decision = checkCommand(command);
  if (decision.block) block(decision.reason);
  if (isGitCommit(command)) {
    let commit;
    try {
      commit = gitCommitDecision(root);
    } catch (error) {
      block(error.message);
    }
    if (commit.block) block(commit.reason);
  }
}
// A shell command can carry a Codex patch (apply_patch <<'EOF'); its files go through the edit rule.
if (!root) process.exit(0);
const paths = editTargets(event).map((target) => relative(root, target.path));
if (!paths.length) process.exit(0);

const workflow = loadWorkflow();
let state = null;
try {
  const active = findActiveStory(root);
  // An expired approval sends the story back to its gate before deciding, even without running next.
  if (active) state = reconcile(active.state, workflow, readDocs(active.folder)).state;
} catch (error) {
  // Without knowing the phase, block only what would depend on it: project code.
  if (paths.some((path) => checkEdit(path, null, workflow).block || isProjectSource(path))) block(error.message);
  process.exit(0);
}
for (const path of paths) {
  const decision = checkEdit(path, state, workflow);
  if (decision.block) block(decision.reason);
}
