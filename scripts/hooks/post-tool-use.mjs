#!/usr/bin/env node
// PostToolUse hook: after an edit, returns to the model the new architecture violation of
// the edited file (decision: block) and, if the file is AGENTS.md or CLAUDE.md, the drift of
// the Keel block (context only, without blocking). The edit already happened; the hook undoes nothing.
// An invalid keel/architecture.json becomes a warning to the model, never an error that stops the session.
import { readFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { CONFIG_PATH, runCheck } from '../arch-check.mjs';
import { check } from '../keel-context.mjs';

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

const input = readFileSync(0, 'utf8');
const event = input.trim() ? JSON.parse(input) : {};
const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;
const target = event.tool_input?.file_path;
if (!root || !target) process.exit(0);
const path = relative(root, resolve(root, target)).split('\\').join('/');
if (path.startsWith('../')) process.exit(0);

const feedback = INSTRUCTION_FILES.has(basename(path)) ? instructionFeedback(root) : architectureFeedback(root, path);
if (feedback) console.log(JSON.stringify(feedback));
