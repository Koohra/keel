#!/usr/bin/env node
// End-to-end check of a story, item by item: documents, state.json closed with valid approvals,
// one real commit per task, each task commit inside its Files:, project checks, convergence,
// architecture and deltas. With --pr, prints the pull request description with that evidence.
// Usage: node scripts/check-feature.mjs <story-folder> [--pr]
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRules, parseTasks, readDocs, sections, validateFeature } from './validate-feature.mjs';
import { checkCommands, doneHash, isOutsideTask, taskFiles } from './task-loop.mjs';
import { loadWorkflow, reconcile, runCommand } from './keel-state.mjs';
import { commitInHistory, gitOutput, gitPaths } from './git.mjs';
import { archResult, convergenceLines, convergenceResult, deltasResult, gatherClosing, recordClosing } from './closing.mjs';

const item = (name, problems, note = 'ok') => ({ name, ok: problems.length === 0, details: problems.length ? problems : [note] });

function documentsItem(docs) {
  return item('documents', Object.entries(validateFeature(docs)).flatMap(([file, errors]) => errors.map((e) => `${file}: ${e}`)));
}

function stateItem(state, docs) {
  if (!state) return item('state', ['no state.json in the story folder']);
  const { state: current, expired } = reconcile(state, loadWorkflow(), docs);
  return item('state', [
    ...(current.phase === 'done' ? [] : [`the story is in phase ${current.phase}, not done`]),
    ...expired.map((doc) => `${doc} changed after its approval`),
  ], 'done, approvals valid');
}

// commitsOf: { T1: { hash, full, merge, files } | null } read from git by the edge.
function commitsItem(tasks, commitsOf) {
  const problems = tasks.filter((t) => !commitsOf[t.id]).map((t) => `${t.id} has no Status: done (<hash>) of a commit in this branch's history`);
  problems.push(...tasks.filter((t) => commitsOf[t.id]?.merge).map((t) => `${t.id} (${commitsOf[t.id].hash}) is a merge commit: point to the task's own commit`));
  const hashes = tasks.map((t) => commitsOf[t.id]?.full).filter(Boolean);
  if (new Set(hashes).size !== hashes.length) problems.push('two tasks point to the same commit: one commit per task');
  return item('commits', problems, `${hashes.length} task commit(s)`);
}

function scopeItem(tasks, commitsOf, tasksText, folder) {
  const problems = [];
  for (const task of tasks.filter((t) => commitsOf[t.id])) {
    const { hash, files } = commitsOf[task.id];
    const patterns = taskFiles(tasksText, task.id);
    for (const file of files.filter((f) => !f.startsWith(`${folder}/`) && isOutsideTask(f, patterns))) {
      problems.push(`${task.id} (${hash}) changed ${file}, outside its Files:`);
    }
  }
  return item('scope', problems);
}

function checksItem(runs) {
  const problems = runs.filter((r) => r.exitCode !== 0).map((r) => `${r.name} \`${r.command}\` exited with ${r.exitCode}\n${r.output.split('\n').slice(-10).join('\n')}`);
  return item('checks', problems, runs.map((r) => `${r.name} \`${r.command}\` exited with 0`).join('; '));
}

// Fresh closing facts evaluated with the same criteria as the closing phase.
function closingItems(state, docs, facts) {
  const closed = recordClosing(state, facts, null);
  const problems = ({ met, reason }) => (met ? [] : [reason]);
  const arch = facts.arch.status === 'skipped' && facts.arch.waived
    ? { ...item('architecture', [], 'no keel/architecture.json; waived in product.md (Architecture: não se aplica)'), skipped: true }
    : item('architecture', problems(archResult(closed)), 'no new violation, baseline did not grow');
  return [
    item('convergence', problems(convergenceResult(closed, docs)), `${facts.convergence.length} rule(s) met`),
    arch,
    item('deltas', problems(deltasResult(closed)), facts.deltas.files.length ? `approved: ${facts.deltas.files.join(', ')}` : 'none'),
  ];
}

export function formatReport(items) {
  return items.map((i) => `${(i.skipped ? 'skipped' : i.ok ? 'ok' : 'FAIL').padEnd(8)}${i.name}: ${i.details.join('\n        ')}`).join('\n');
}

function deltaLines(deltas) {
  if (!deltas.files.length) return ['none'];
  return Object.entries(deltas.sections ?? {}).filter(([, items]) => items.length)
    .map(([kind, items]) => `- ${kind[0].toUpperCase()}${kind.slice(1)}: ${items.map((i) => `\`${i}\``).join(', ')}`);
}

// Pull request description: the mechanical part comes from the story; the model fills the last two sections.
export function pullRequestBody({ state, docs, items, facts }) {
  const { key, title, source, folder } = state.story;
  const goal = sections(docs['requirements.md'] ?? '').find((s) => s.title === 'Goal')?.body.trim();
  const rules = docs['requirements.md'] == null
    ? parseTasks(docs['tasks.md'] ?? '').map((t) => `- ${t.id}. ${t.fields.Covers}`)
    : parseRules(docs['requirements.md']).map((r) => `- ${r.id}. ${r.text}`);
  return [
    `# ${key} — ${title}`,
    '',
    `Story: ${source ?? 'no link'} · Folder: \`${folder}/\` · Level: ${state.level}`,
    '',
    '## Requirements',
    ...(goal ? [goal, ''] : []),
    ...rules,
    '',
    '## Evidence per rule',
    ...convergenceLines(facts.convergence),
    '',
    '## Check',
    'Output of `node scripts/check-feature.mjs` (Keel):',
    '```text',
    formatReport(items),
    '```',
    '',
    '## Product and ADR deltas',
    ...deltaLines(facts.deltas),
    '',
    '## Deviations from the spec',
    '<!-- Keel: implementation choices that departed from requirements.md or design.md, each with the reason; "none" if there are none. -->',
    '',
    '## Scope against the original story',
    '<!-- Keel: what was delivered compared with "Original story" in requirements.md: anything left out or added beyond it. -->',
    '',
  ].join('\n');
}

// --- Edge: disk, git and command line ---

function readCommits(root, tasks) {
  const commits = {};
  for (const task of tasks) {
    const hash = doneHash(task);
    const full = hash && commitInHistory(root, hash);
    if (!full) {
      commits[task.id] = null;
      continue;
    }
    const merge = gitOutput(root, ['rev-list', '--parents', '-n', '1', full]).trim().split(' ').length > 2;
    const files = gitPaths(root, ['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', '--root', full]);
    commits[task.id] = { hash, full, merge, files };
  }
  return commits;
}

// The project root is the git repository of the story folder, wherever the script runs from.
export function checkFeature(cwd, folderArg) {
  const path = resolve(cwd, folderArg);
  const root = existsSync(path) && gitOutput(path, ['rev-parse', '--show-toplevel'])?.trim();
  if (!root) throw new Error(`${folderArg} is not a folder inside a git repository`);
  // git gives the folder relative to the root: path.relative breaks on Windows short names (RUNNER~1).
  const folder = gitOutput(path, ['rev-parse', '--show-prefix']).trim().replace(/\/$/, '');
  const docs = readDocs(join(root, folder));
  const statePath = join(root, folder, 'state.json');
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : null;
  const tasks = parseTasks(docs['tasks.md'] ?? '');
  const commitsOf = readCommits(root, tasks);
  const runs = checkCommands(readFileSync(join(root, 'keel', 'product.md'), 'utf8')).map(({ name, command }) => ({ name, ...runCommand(root, command) }));
  const items = [documentsItem(docs), stateItem(state, docs), commitsItem(tasks, commitsOf), scopeItem(tasks, commitsOf, docs['tasks.md'] ?? '', folder), checksItem(runs)];
  const facts = state ? gatherClosing(root, docs, state) : null;
  if (state) items.push(...closingItems(state, docs, facts));
  return { items, state, docs, facts, ok: items.every((i) => i.ok) };
}

function main(argv) {
  const folder = argv.find((a) => !a.startsWith('--'));
  if (!folder) {
    console.error('usage: node scripts/check-feature.mjs <story-folder> [--pr]');
    return 1;
  }
  try {
    const report = checkFeature(process.cwd(), folder);
    if (argv.includes('--pr')) {
      if (!report.state) throw new Error(`${folder} has no state.json`);
      console.log(pullRequestBody(report));
    } else console.log(formatReport(report.items));
    return report.ok ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
