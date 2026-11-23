#!/usr/bin/env node
// SessionStart hook: tells the model where the current branch's story stands and which skill
// to use, also after context compaction. Never copies AGENTS.md or CLAUDE.md.
// Never blocks the session: an error becomes one line of context.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findActiveStory, loadWorkflow, nextStep } from '../keel-state.mjs';
import { readDocs } from '../validate-feature.mjs';
import { projectRoot } from './event.mjs';

const MAX_CHARS = 1500;
const PRECEDENCE = 'Precedence: during an active story, the flow order and the gates come from Keel '
  + '(the hooks block what the phase does not allow). Commands, style and conventions come from the project\'s AGENTS.md or CLAUDE.md.';

function sessionContext(root) {
  if (!existsSync(join(root, 'keel'))) return '';
  let active;
  let step;
  try {
    active = findActiveStory(root);
    step = active && nextStep(active.state, loadWorkflow(), readDocs(active.folder));
  } catch (error) {
    return `Keel: could not read the story state (${error.message.split('\n')[0]}).`;
  }
  if (!active) {
    return 'Keel: no active story on this branch. Product and decisions in keel/product.md and keel/adrs/; to start a story, use the keel:story skill.';
  }
  const folder = relative(root, active.folder).split('\\').join('/');
  const missing = step.missing.map((m) => `- ${m.criterion}: ${m.reason}`);
  const lines = [
    `Keel: story ${step.story} in ${folder}, level ${step.level ?? 'not set'}, phase ${step.phase}.`,
    ...(step.expired.length ? [`Expired approval: ${step.expired.join(', ')}.`] : []),
    ...(missing.length ? ['Missing to leave the phase:', ...missing] : []),
    'Next step: use the keel:story skill, which asks keel-state.mjs what to do; do not edit state.json.',
    PRECEDENCE,
  ];
  const text = lines.join('\n');
  return text.length <= MAX_CHARS ? text : `${text.slice(0, MAX_CHARS - 1)}…`;
}

const input = readFileSync(0, 'utf8');
const event = input.trim() ? JSON.parse(input) : {};
const root = projectRoot(event) ?? process.cwd();
const context = sessionContext(root);
if (context) {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } }));
}
