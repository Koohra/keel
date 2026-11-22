#!/usr/bin/env node
// Sole writer of keel/features/<story>/state.json. Tells the current phase and what is missing
// (next), changes phase only when the exit criteria in workflow.json pass (advance)
// and ties each approval to the hash of the approved document (approve).
//
// Exit criterion: "<kind>[:<target>][?]". A trailing "?" makes the criterion apply only when the
// document is required by the level (design.md only in with-design). Kinds in CRITERIA below.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  checkCoverage, frozenBlock, openQuestions, pendingAssumptions, readDocs, tasksDone, validateDoc,
} from './validate-feature.mjs';
import {
  approveCommit, blockTask, checkCommands, evidenceCommand, failedChecks, recordChecks, recordEvidence, recordFailure, recordTaskReview, requireAttempts,
  startTask, taskView,
} from './task-loop.mjs';
import { commitInHistory, gitOutput, gitPaths } from './git.mjs';
import {
  approveDeltas, archResult, closingView, convergenceResult, deltasResult, gatherClosing, recordClosing,
} from './closing.mjs';

export const LEVELS = ['trivial', 'standard', 'with-design'];
const DOC_STEPS = { 'requirements.md': 'requirements', 'design.md': 'design', 'tasks.md': 'tasks' };
const REVIEW_RESULTS = ['ok', 'findings', 'unavailable'];

// Only the frozen block goes into the hash: progress, notes and header change without expiring the approval.
export function approvalHash(text) {
  const content = frozenBlock(text).content ?? text.replace(/\r\n/g, '\n');
  return createHash('sha256').update(content).digest('hex');
}

const approvalStep = () => ({ approved: false, approvedBy: null, approvedAt: null, hash: null });

export function newState({ key, slug, title, source = null, branch, base = null, now }) {
  return {
    schema: 1,
    story: { key, title, source, folder: `keel/features/${key}-${slug}`, branch, base },
    level: null,
    phase: 'triage',
    steps: {
      triage: { done: false, confirmedBy: null, at: null },
      reading: { repoMap: false },
      requirements: { review: null, ...approvalStep() },
      design: approvalStep(),
      tasks: approvalStep(),
      implementation: { currentTask: null, blocked: null, red: null, green: null, checks: null, review: null, commit: null },
      closing: { convergence: null, arch: null, deltas: null, deltasApproved: null, pullRequest: null },
    },
    updatedAt: now,
  };
}

function docRequired(doc, state) {
  if (doc === 'design.md') return state.level === 'with-design';
  if (doc === 'requirements.md') return state.level !== 'trivial';
  return true;
}

function result(met, reason) {
  return met ? { met: true } : { met: false, reason };
}

// The document on its own and against the others (rules, ACs, structure): see validateDoc.
function docErrors(doc, docs) {
  if (docs[doc] == null) return [`${doc} does not exist`];
  return validateDoc(doc, docs);
}

const CRITERIA = {
  approval: (target, { state, docs }) => {
    if (target === 'level') return result(state.steps.triage.done, 'level not confirmed: run level <level> --by <dev>');
    if (target === 'deltas') return deltasResult(state);
    const step = state.steps[DOC_STEPS[target]];
    if (!step) return null;
    if (!step.approved) return result(false, `${target} not approved by the dev`);
    if (docs[target] == null) return result(false, `${target} does not exist`);
    return result(step.hash === approvalHash(docs[target]), `${target} changed after approval`);
  },
  valid: (target, { docs }) => {
    if (!DOC_STEPS[target]) return null;
    const errors = docErrors(target, docs);
    return result(errors.length === 0, errors.join('; '));
  },
  noOpenQuestions: (_, { docs }) => {
    const text = docs['requirements.md'] ?? '';
    const count = openQuestions(text);
    const assumptions = pendingAssumptions(text);
    const apart = assumptions ? `; ${assumptions} [ASSUMPTION](s) awaiting the dev's acceptance are counted apart and do not block` : '';
    return result(count === 0, `${count} open [QUESTION](s) in requirements.md${apart}`);
  },
  review: (target, { state }) => {
    if (target !== 'requirements') return null;
    return result(state.steps.requirements.review !== null, 'isolated reviewer not recorded: run review requirements --result <ok|findings|unavailable>');
  },
  generated: (target, { state }) => {
    if (target !== 'repo-map') return null;
    return result(state.steps.reading.repoMap, 'repo map not generated: run generated repo-map');
  },
  coverage: (target, { docs }) => {
    if (target !== 'rules->tasks->tests') return null;
    if (docs['tasks.md'] == null) return result(false, 'tasks.md does not exist');
    const errors = checkCoverage(docs['tasks.md'], docs['requirements.md']);
    return result(errors.length === 0, errors.join('; '));
  },
  convergence: (target, { state, docs }) => (target === 'all-rules' ? convergenceResult(state, docs) : null),
  arch: (target, { state }) => (target === 'baseline-not-grown' ? archResult(state) : null),
  tasks: (target, { docs }) => {
    if (target !== 'all-done') return null;
    return result(docs['tasks.md'] != null && tasksDone(docs['tasks.md']), 'tasks.md has a task without Status: done');
  },
};

export function evaluate(criterion, ctx) {
  const optional = criterion.endsWith('?');
  const [kind, target] = criterion.replace(/\?$/, '').split(':');
  if (optional && DOC_STEPS[target] && !docRequired(target, ctx.state)) return { criterion, met: true };
  const outcome = CRITERIA[kind]?.(target, ctx);
  return { criterion, ...(outcome ?? { met: false, reason: `unknown criterion: ${criterion}` }) };
}

export function taskExitOf(workflow) {
  return workflow.phases.find((p) => p.loop === 'tasks')?.taskExit ?? [];
}

function phaseIndex(workflow, id) {
  return workflow.phases.findIndex((p) => p.id === id);
}

function applies(phase, state) {
  if (!phase.skipUnless) return true;
  const [key, values] = phase.skipUnless.split('=');
  return values.split(',').includes(String(state[key]));
}

function missingFor(phase, state, docs) {
  return (phase.exit ?? []).map((c) => evaluate(c, { state, docs })).filter((r) => !r.met)
    .map(({ criterion, reason }) => ({ criterion, reason }));
}

// Phase whose exit criterion approves the document: the story goes back to it.
function gatePhase(workflow, doc) {
  return workflow.phases.find((p) => (p.exit ?? []).some((c) => c.replace(/\?$/, '') === `approval:${doc}`));
}

export function reconcile(state, workflow, docs) {
  const expired = [];
  let next = state;
  for (const [doc, stepName] of Object.entries(DOC_STEPS)) {
    const step = next.steps[stepName];
    if (!step.approved || (docs[doc] != null && step.hash === approvalHash(docs[doc]))) continue;
    expired.push(doc);
    next = { ...next, steps: { ...next.steps, [stepName]: { ...step, ...approvalStep() } } };
  }
  // The current phase holds only if every earlier applicable phase meets its exit criteria.
  // This covers expired approvals and state.json changed outside the script.
  const current = phaseIndex(workflow, next.phase);
  const failing = workflow.phases.slice(0, current)
    .find((phase) => applies(phase, next) && missingFor(phase, next, docs).length > 0);
  if (failing) next = { ...next, phase: failing.id };
  return { state: next, expired };
}

// tree: { fingerprint } of the code (see codeFingerprint), needed only in the task loop.
export function nextStep(state, workflow, docs, tree = {}) {
  const { state: current, expired } = reconcile(state, workflow, docs);
  const phase = workflow.phases[phaseIndex(workflow, current.phase)];
  const loop = phase.loop === 'tasks' ? taskView(current, docs['tasks.md'], tree.fingerprint, phase.taskExit, docs['design.md']) : {};
  const closing = current.phase === 'closing' ? { closing: closingView(current) } : {};
  return {
    story: current.story.key,
    phase: current.phase,
    level: current.level,
    instructions: phase.instructions ?? null,
    missing: missingFor(phase, current, docs),
    ...loop,
    ...closing,
    expired,
  };
}

export function advance(state, workflow, docs, now) {
  const index = phaseIndex(workflow, state.phase);
  const missing = missingFor(workflow.phases[index], state, docs);
  if (missing.length) return { missing };
  const target = workflow.phases.slice(index + 1).find((p) => applies(p, state));
  if (!target) return { missing: [{ criterion: 'done', reason: 'the story is already done' }] };
  return { state: { ...state, phase: target.id, updatedAt: now }, missing: [] };
}

function requirePhase(state, phase, action) {
  if (state.phase !== phase) throw new Error(`${action} only in phase ${phase}; the story is in ${state.phase}`);
}

function requireBy(by) {
  if (!by) throw new Error('say who approved with --by <dev>');
}

export function setLevel(state, level, by, now) {
  if (!LEVELS.includes(level)) throw new Error(`invalid level "${level}"; use ${LEVELS.join(', ')}`);
  requireBy(by);
  requirePhase(state, 'triage', 'level');
  return { ...state, level, steps: { ...state.steps, triage: { done: true, confirmedBy: by, at: now } }, updatedAt: now };
}

export function recordGenerated(state, artifact, now) {
  if (artifact !== 'repo-map') throw new Error(`unknown artifact "${artifact}"; use repo-map`);
  requirePhase(state, 'reading', 'generated repo-map');
  return { ...state, steps: { ...state.steps, reading: { repoMap: true } }, updatedAt: now };
}

export function recordReview(state, doc, outcome, now) {
  if (doc !== 'requirements') throw new Error(`unknown review of "${doc}"; use requirements or task`);
  if (!REVIEW_RESULTS.includes(outcome)) throw new Error(`invalid result "${outcome}"; use ${REVIEW_RESULTS.join(', ')}`);
  requirePhase(state, 'confirmation', 'review requirements');
  const requirements = { ...state.steps.requirements, review: { result: outcome, at: now } };
  return { ...state, steps: { ...state.steps, requirements }, updatedAt: now };
}

const APPROVAL_CHECKS = {
  'requirements.md': ['valid:requirements.md', 'noOpenQuestions'],
  'design.md': ['valid:design.md'],
  'tasks.md': ['valid:tasks.md', 'coverage:rules->tasks->tests'],
};

export function approve(state, doc, by, docs, workflow, now) {
  if (!DOC_STEPS[doc]) throw new Error(`unknown document "${doc}"; use ${Object.keys(DOC_STEPS).join(', ')}, commit or deltas`);
  requireBy(by);
  const gate = gatePhase(workflow, doc).id;
  if (state.phase !== gate) throw new Error(`the gate of ${doc} belongs to phase ${gate}; the story is in ${state.phase}`);
  const failing = APPROVAL_CHECKS[doc].map((c) => evaluate(c, { state, docs })).filter((r) => !r.met);
  if (failing.length) throw new Error(`${doc} cannot be approved: ${failing.map((f) => f.reason).join('; ')}`);
  const step = { ...state.steps[DOC_STEPS[doc]], approved: true, approvedBy: by, approvedAt: now, hash: approvalHash(docs[doc]) };
  return { ...state, steps: { ...state.steps, [DOC_STEPS[doc]]: step }, updatedAt: now };
}

const STATE_FILE = /^keel\/features\/[^/]+\/state\.json$/i;
const SHELL_WRITE = /(>>?\s*["']?[^\s|;&]*state\.json|\b(tee|cp|mv|rm|dd|sed\s+-i|writeFile\w*|Set-Content|Out-File|Add-Content)\b[^|;&]*state\.json)/i;

// Decides whether the PreToolUse hook lets the AI run a terminal command: blocks what writes
// state.json, except keel-state.mjs itself and git (restoring the file).
export function checkCommand(command) {
  if (/^\s*git\s/.test(command) || command.includes('keel-state.mjs') || !SHELL_WRITE.test(command)) return { block: false };
  return { block: true, reason: 'state.json is written only by scripts/keel-state.mjs; use node scripts/keel-state.mjs <command>.' };
}

// Project file the phase controls: inside the root and outside keel/.
export function isProjectSource(relPath) {
  const path = relPath.split(sep).join('/');
  return !(path.startsWith('../') || isAbsolute(relPath) || path.startsWith('keel/'));
}

// Decides whether the PreToolUse hook lets the AI edit the file (path relative to the project root).
export function checkEdit(relPath, state, workflow) {
  if (STATE_FILE.test(relPath.split(sep).join('/'))) {
    return { block: true, reason: 'state.json is written only by scripts/keel-state.mjs; use node scripts/keel-state.mjs <command>.' };
  }
  if (!state || !isProjectSource(relPath)) return { block: false };
  const phase = workflow.phases[phaseIndex(workflow, state.phase)];
  if (phase?.allowSourceEdits) return { block: false };
  return {
    block: true,
    reason: `Story ${state.story.key} is in phase ${state.phase}; code edits only in phase implementation. Run node scripts/keel-state.mjs next to see what is missing.`,
  };
}

// --- Edge: disk, git and command line ---

const pluginRoot = fileURLToPath(new URL('..', import.meta.url));

export function loadWorkflow() {
  return JSON.parse(readFileSync(join(pluginRoot, 'workflow', 'workflow.json'), 'utf8'));
}

export function currentBranch(root) {
  let gitDir = join(root, '.git');
  if (!existsSync(gitDir)) return null;
  if (statSync(gitDir).isFile()) gitDir = resolve(root, readFileSync(gitDir, 'utf8').replace(/^gitdir:\s*/, '').trim());
  const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
  return head.startsWith('ref: refs/heads/') ? head.slice('ref: refs/heads/'.length) : null;
}

function readState(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`unreadable state.json at ${path}: ${error.message}. Restore it with git checkout -- ${path}`);
  }
}

// Story whose state.json points to the current branch, or null. An unreadable state.json of
// another story does not get in the way; it becomes an error only when no story matches the branch.
export function findActiveStory(root) {
  const branch = currentBranch(root);
  const features = join(root, 'keel', 'features');
  if (!branch || !existsSync(features)) return null;
  const unreadable = [];
  for (const name of readdirSync(features)) {
    const path = join(features, name, 'state.json');
    if (!existsSync(path)) continue;
    try {
      const state = readState(path);
      if (state.story?.branch === branch) return { folder: join(features, name), state };
    } catch (error) {
      unreadable.push(error.message);
    }
  }
  if (unreadable.length) throw new Error(unreadable.join('\n'));
  return null;
}

// Story files (documents, state.json) stay out: updating Progress does not make checks or approval stale.
const OUTSIDE_STORY = ':(exclude)keel/features';

function git(root, args) {
  const run = spawnSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });
  if (run.status !== 0) {
    throw new Error(`git ${args[0]} failed: ${String(run.stderr || run.error?.message).trim()}. The task loop needs a git repository with at least one commit`);
  }
  return run.stdout;
}

// Hash of the uncommitted code: diff against HEAD plus new files, outside the story folder.
export function codeFingerprint(root) {
  const hash = createHash('sha256').update(git(root, ['diff', 'HEAD', '--binary', '--', '.', OUTSIDE_STORY]));
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', '.', OUTSIDE_STORY])
    .toString('utf8').split('\0').filter(Boolean).sort();
  // Only regular files: a sandbox masks dotfiles with /dev/null inside it and not outside, where hooks run.
  for (const file of untracked.filter((name) => lstatSync(join(root, name)).isFile())) {
    hash.update(`\0${file}\0`).update(readFileSync(join(root, file)));
  }
  return hash.digest('hex');
}

// Branch the pull request goes to: --base, or the remote's default branch (origin/HEAD), or null.
function defaultBase(root) {
  return gitOutput(root, ['symbolic-ref', '-q', '--short', 'refs/remotes/origin/HEAD'])?.trim() || null;
}

// Code files that differ from HEAD or are new, outside the story folder.
export function changedFiles(root) {
  const changed = gitPaths(root, ['diff', 'HEAD', '--name-only', '-z', '--', '.', OUTSIDE_STORY]);
  const added = gitPaths(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', '.', OUTSIDE_STORY]);
  return [...new Set([...changed, ...added])].sort();
}

// Runs a project command (Verification:, Checks) as the dev would; task-loop.mjs keeps the end of the output.
export function runCommand(root, command) {
  const run = spawnSync(command, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}${run.error ? run.error.message : ''}`.replace(/\r\n/g, '\n').trimEnd();
  return { command, exitCode: run.status ?? 1, output };
}

function writeState(folder, state) {
  writeFileSync(join(folder, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
}

function loadStory(root, story) {
  if (story) {
    const folder = resolve(root, story);
    const path = join(folder, 'state.json');
    if (!existsSync(path)) throw new Error(`${story} has no state.json; create it with init`);
    return { folder, state: readState(path) };
  }
  const active = findActiveStory(root);
  if (!active) throw new Error('no story with state.json for the current branch; use --story <folder>');
  return active;
}

// CLI commands; the skill uses only these (checked in test/story-skill.test.mjs).
export const COMMANDS = ['init', 'next', 'advance', 'level', 'generated', 'review', 'approve', 'hash', 'task', 'evidence', 'checks', 'block'];

const USAGE = `usage: node scripts/keel-state.mjs <command> [--story <folder>]
  init --key <KEY> --slug <slug> --title <title> [--source <link>] [--branch <branch>] [--base <branch the PR goes to>]
  next | advance
  level <${LEVELS.join('|')}> --by <dev>
  generated repo-map
  review <requirements|task> --result <${REVIEW_RESULTS.join('|')}>
  approve <${[...Object.keys(DOC_STEPS), 'commit', 'deltas'].join('|')}> --by <dev>
  task start <T#>
  evidence <red|green>
  checks
  block --reason <reason>
  hash <file>`;

function run(argv, root, now) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: Object.fromEntries(['story', 'key', 'slug', 'title', 'source', 'branch', 'base', 'by', 'result', 'reason']
      .map((name) => [name, { type: 'string' }])),
  });
  const [command, arg, third] = positionals;
  if (command === 'hash') {
    if (!arg) throw new Error('give the file: hash <file>');
    return { output: { file: arg, hash: approvalHash(readFileSync(resolve(root, arg), 'utf8')) } };
  }
  const workflow = loadWorkflow();
  if (command === 'init') {
    for (const name of ['key', 'slug', 'title']) if (!values[name]) throw new Error(`init requires --${name}`);
    const branch = values.branch ?? currentBranch(root);
    if (!branch) throw new Error('could not find the current branch; pass --branch');
    const state = newState({ ...values, branch, base: values.base ?? defaultBase(root), now });
    const folder = join(root, state.story.folder);
    if (existsSync(join(folder, 'state.json'))) throw new Error(`${state.story.folder} already has state.json`);
    mkdirSync(folder, { recursive: true });
    writeState(folder, state);
    return { output: nextStep(state, workflow, readDocs(folder)) };
  }
  const { folder, state: stored } = loadStory(root, values.story);
  const docs = readDocs(folder);
  const { state, expired } = reconcile(stored, workflow, docs);
  let updated = expired.length ? { ...state, updatedAt: now } : state;
  // In the closing phase every command sees fresh facts: convergence, architecture and deltas.
  if (updated.phase === 'closing') updated = recordClosing(updated, gatherClosing(root, docs, updated), now);
  switch (command) {
    case 'next':
      break;
    case 'advance': {
      const moved = advance(updated, workflow, docs, now);
      if (!moved.state) {
        if (updated !== stored) writeState(folder, updated);
        const lines = moved.missing.map((m) => `- ${m.criterion}: ${m.reason}`).join('\n');
        throw new Error(`phase ${updated.phase} cannot end yet:\n${lines}`);
      }
      updated = moved.state;
      break;
    }
    case 'level': updated = setLevel(updated, arg, values.by, now); break;
    case 'generated': updated = recordGenerated(updated, arg, now); break;
    case 'review':
      updated = arg === 'task' ? recordTaskReview(updated, values.result, now) : recordReview(updated, arg, values.result, now);
      break;
    case 'approve':
      if (arg === 'commit') updated = approveCommit(updated, values.by, docs['tasks.md'], codeFingerprint(root), taskExitOf(workflow), now, changedFiles(root));
      else if (arg === 'deltas') updated = approveDeltas(updated, values.by, now);
      else updated = approve(updated, arg, values.by, docs, workflow, now);
      break;
    case 'task':
      if (arg !== 'start') throw new Error('use task start <T#>');
      updated = startTask(updated, third, docs['tasks.md'], { isCommit: (hash) => commitInHistory(root, hash) !== null }, now);
      break;
    case 'evidence': {
      const verification = evidenceCommand(updated, arg, docs['tasks.md']);
      const run = runCommand(root, verification);
      if (arg === 'green' && run.exitCode !== 0) writeState(folder, recordFailure(updated, 'green', run, now));
      updated = recordEvidence(updated, arg, run, docs['tasks.md'], now, changedFiles(root));
      break;
    }
    case 'block': updated = blockTask(updated, values.reason, now); break;
    case 'checks': {
      requireAttempts(updated, 'checks');
      const commands = checkCommands(readFileSync(join(root, 'keel', 'product.md'), 'utf8'));
      const runs = commands.map(({ name, command }) => ({ name, ...runCommand(root, command) }));
      updated = recordChecks(updated, runs, codeFingerprint(root), now);
      if (!updated.steps.implementation.checks.passed) {
        writeState(folder, updated);
        const failed = updated.steps.implementation.checks.results.filter((r) => r.exitCode !== 0).map((r) => `${r.name}: ${r.command}\n${r.output}`);
        throw new Error(`checks failed: ${failedChecks(updated.steps.implementation.checks).join('; ')}\n${failed.join('\n')}`);
      }
      break;
    }
    default: throw new Error(command ? `unknown command "${command}"\n${USAGE}` : USAGE);
  }
  if (updated !== stored) writeState(folder, updated);
  const open = updated.phase === 'implementation' && updated.steps.implementation?.currentTask;
  const tree = open ? { fingerprint: codeFingerprint(root) } : {};
  return { output: nextStep(updated, workflow, docs, tree) };
}

function main() {
  try {
    const { output } = run(process.argv.slice(2), process.cwd(), new Date().toISOString());
    console.log(JSON.stringify(output, null, 2));
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
