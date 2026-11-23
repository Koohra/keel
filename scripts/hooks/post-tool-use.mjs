#!/usr/bin/env node
// PostToolUse hook: after an edit, returns to the model the new architecture violation of
// the edited file (decision: block), the drift of the Keel block if the file is AGENTS.md or
// CLAUDE.md, and a warning when the file is outside the Files: of the open task (context only). The edit already happened; the hook undoes nothing.
// An invalid keel/architecture.json becomes a warning to the model, never an error that stops the session.
// A Codex apply_patch is checked file by file (deleted files skipped) and the feedback joined; see event.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { basename, relative } from 'node:path';
import { CONFIG_PATH, runCheck } from '../arch-check.mjs';
import { check } from '../keel-context.mjs';
import { findActiveStory, isProjectSource } from '../keel-state.mjs';
import { isOutsideTask, taskFiles } from '../task-loop.mjs';
import { readDocs } from '../validate-feature.mjs';
import { editTargets, projectRoot } from './event.mjs';

const INSTRUCTION_FILES = new Set(['AGENTS.md', 'CLAUDE.md']);

function context(text) {
  return { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text } };
}

function instructionFeedback(root) {
  const drift = check(root);
  if (drift.ok) return null;
  return context(`Keel: drift in the Keel block (${drift.errors.join('; ')}). Run keel-context.mjs check and, if the dev approves, block apply to redo the block.`);
}

function architectureFeedback(root, path) {
  let result;
  try {
    result = runCheck(root, { files: [path] });
  } catch (error) {
    const message = `${CONFIG_PATH} invalid, architecture check turned off: ${error.message}`;
    return path === CONFIG_PATH ? { decision: 'block', reason: message } : context(`Keel: ${message}`);
  }
  if (result.status !== 'fail') return null;
  const reason = ['Architecture violation (keel/architecture.json, approximate scanner):',
    ...result.violations.map((v) => `- ${v.message}`)].join('\n');
  return { decision: 'block', reason };
}

// Warning only: files outside the task (a new dependency in the manifest included) go to the review.
function scopeWarning(root, path) {
  if (!isProjectSource(path)) return null;
  let active;
  try {
    active = findActiveStory(root);
  } catch {
    return null;
  }
  const id = active?.state.phase === 'implementation' ? active.state.steps.implementation?.currentTask : null;
  if (!id) return null;
  const patterns = taskFiles(readDocs(active.folder)['tasks.md'], id);
  if (!isOutsideTask(path, patterns)) return null;
  return `Keel: ${path} is outside the Files: of ${id} (${patterns.join(', ')}). If the task needs it, say so in the commit proposal; if it is other work, undo it and report it as a block.`;
}

function merge(feedback, warning) {
  if (!warning) return feedback;
  if (!feedback) return context(warning);
  if (feedback.decision === 'block') return { ...feedback, reason: `${feedback.reason}\n${warning}` };
  return context(`${feedback.hookSpecificOutput.additionalContext}\n${warning}`);
}

// One answer for several files: any block blocks, with every message; distinct texts only.
function combine(feedbacks) {
  const unique = [...new Set(feedbacks.map((f) => (f.decision === 'block' ? f.reason : f.hookSpecificOutput.additionalContext)))];
  if (!unique.length) return null;
  if (feedbacks.some((f) => f.decision === 'block')) return { decision: 'block', reason: unique.join('\n') };
  return context(unique.join('\n'));
}

const input = readFileSync(0, 'utf8');
const event = input.trim() ? JSON.parse(input) : {};
const root = projectRoot(event);
if (!root) process.exit(0);
const paths = editTargets(event)
  .filter((target) => target.change !== 'delete' && (event.tool_name !== 'apply_patch' || existsSync(target.path)))
  .map((target) => relative(root, target.path).split('\\').join('/'))
  .filter((path) => !path.startsWith('../'));

const feedback = combine(paths.map((path) => merge(
  INSTRUCTION_FILES.has(basename(path)) ? instructionFeedback(root) : architectureFeedback(root, path),
  scopeWarning(root, path),
)).filter(Boolean));
if (feedback) console.log(JSON.stringify(feedback));
