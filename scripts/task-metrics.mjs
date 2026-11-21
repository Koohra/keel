#!/usr/bin/env node
// Metrics of the open task, for REFACTOR and the isolated review: lines, new files, files outside
// the task's Files:, new abstract types, new dependencies in package.json and an approximate
// complexity (decision points in added lines). Reads the uncommitted code against HEAD.
// Usage (from the project root): node scripts/task-metrics.mjs
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findActiveStory } from './keel-state.mjs';
import { isOutsideTask, taskFiles } from './task-loop.mjs';
import { readDocs } from './validate-feature.mjs';

const ABSTRACT = [
  /\b(?:interface|protocol|trait)\s+([A-Z]\w*)/,
  /\babstract\s+class\s+(\w+)/,
  /^\s*class\s+(\w+)\([^)]*\b(?:ABC|Protocol)\b/,
];
const DECISION = /\b(?:if|for|while|case|catch)\b|&&|\|\||\?\?|\s\?\s/g;
const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

// git diff -U0 → [{ path, isNew, added: [lines], removed }].
export function parseDiff(diff) {
  const changes = [];
  let current = null;
  for (const line of diff.replace(/\r\n/g, '\n').split('\n')) {
    const header = line.match(/^diff --git a\/.+ b\/(.+)$/);
    if (header) {
      current = { path: header[1], isNew: false, added: [], removed: 0 };
      changes.push(current);
    } else if (!current) continue;
    else if (line.startsWith('new file mode')) current.isNew = true;
    else if (line.startsWith('+') && !line.startsWith('+++')) current.added.push(line.slice(1));
    else if (line.startsWith('-') && !line.startsWith('---')) current.removed += 1;
  }
  return changes;
}

function dependencyNames(manifest) {
  if (!manifest) return [];
  const parsed = JSON.parse(manifest);
  return DEPENDENCY_SECTIONS.flatMap((section) => Object.keys(parsed[section] ?? {}));
}

// changes: parseDiff output plus new untracked files; taskFiles: paths or globs of the task's Files:.
export function taskMetrics({ changes, taskFiles: patterns, manifest = {} }) {
  const before = new Set(dependencyNames(manifest.before));
  const decisionPoints = {};
  for (const { path, added } of changes) {
    const count = added.reduce((sum, line) => sum + (line.match(DECISION)?.length ?? 0), 0);
    if (count) decisionPoints[path] = count;
  }
  return {
    linesAdded: changes.reduce((sum, c) => sum + c.added.length, 0),
    linesRemoved: changes.reduce((sum, c) => sum + c.removed, 0),
    files: changes.map((c) => c.path),
    newFiles: changes.filter((c) => c.isNew).map((c) => c.path),
    outsideTask: changes.map((c) => c.path).filter((path) => isOutsideTask(path, patterns)),
    newAbstractTypes: changes.flatMap(({ path, added }) => added.flatMap((line) => ABSTRACT
      .map((regex) => line.match(regex)?.[1]).filter(Boolean).map((name) => ({ file: path, name })))),
    newDependencies: dependencyNames(manifest.after).filter((name) => !before.has(name)),
    complexity: { approximate: true, decisionPoints },
  };
}

// --- Edge: git and disk ---

const OUTSIDE_STORY = ':(exclude)keel/features';

function git(root, args) {
  const run = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`git ${args[0]} failed: ${(run.stderr || run.error?.message || '').trim()}`);
  return run.stdout;
}

function readChanges(root) {
  const changes = parseDiff(git(root, ['diff', 'HEAD', '-U0', '--no-color', '--no-ext-diff', '--', '.', OUTSIDE_STORY]));
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', '.', OUTSIDE_STORY]).split('\0').filter(Boolean);
  for (const path of untracked.filter((file) => lstatSync(join(root, file)).isFile())) {
    const text = readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
    changes.push({ path, isNew: true, added: text ? text.split('\n') : [], removed: 0 });
  }
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

function readManifest(root) {
  const headVersion = spawnSync('git', ['show', 'HEAD:package.json'], { cwd: root, encoding: 'utf8' });
  let after = null;
  try { after = readFileSync(join(root, 'package.json'), 'utf8'); } catch { /* no package.json in the project */ }
  return { before: headVersion.status === 0 ? headVersion.stdout : null, after };
}

function main() {
  const root = process.cwd();
  const active = findActiveStory(root);
  const id = active?.state.steps.implementation?.currentTask;
  if (!id) throw new Error('no open task: run keel-state.mjs task start <T#> first');
  const tasks = readDocs(active.folder)['tasks.md'];
  const metrics = taskMetrics({ changes: readChanges(root), taskFiles: taskFiles(tasks, id), manifest: readManifest(root) });
  console.log(JSON.stringify({ task: id, ...metrics }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
