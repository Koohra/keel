#!/usr/bin/env node
// Metrics of the open task, for REFACTOR and the isolated review: lines, new files, files outside
// the task's Files:, new abstract types, new dependencies in package.json and an approximate
// complexity (decision points in added lines). Reads the uncommitted code against HEAD.
// Other manifests (requirements.txt, pyproject.toml, go.mod, *.csproj, pom.xml) count when the task changed them.
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

// Python requirement "name[extra]>=1 ; marker" -> name.
const pythonName = (spec) => spec.trim().match(/^[A-Za-z0-9][A-Za-z0-9._-]*/)?.[0];
const quoted = (text) => [...text.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]);

function requirementsTxt(text) {
  return text.split('\n').map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line && !line.startsWith('-')).map(pythonName);
}

// "dependencies = [" in [project], or any "<group> = [" in [project.optional-dependencies].
const opensDependencyArray = (section, line) => (section === 'project' && /^dependencies\s*=\s*\[/.test(line))
  || (section === 'project.optional-dependencies' && /^[\w-]+\s*=\s*\[/.test(line));
const closesArray = (text) => text.replace(/"[^"]*"|'[^']*'/g, '').includes(']');

// [project] dependencies, [project.optional-dependencies] and the Poetry dependency tables (without python).
function pyprojectToml(text) {
  const names = [];
  let section = '';
  let inArray = false;
  for (const line of text.split('\n').map((l) => l.replace(/#.*$/, '').trim())) {
    if (!inArray && /^\[.+\]$/.test(line)) { section = line.slice(1, -1).trim(); continue; }
    if (inArray || opensDependencyArray(section, line)) {
      const items = inArray ? line : line.slice(line.indexOf('[') + 1);
      names.push(...quoted(items).map(pythonName));
      inArray = !closesArray(items);
    } else if (/^tool\.poetry\.(dependencies|dev-dependencies|group\.[^.]+\.dependencies)$/.test(section)) {
      const key = line.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)\s*=/)?.[1];
      if (key && key !== 'python') names.push(key);
    }
  }
  return names;
}

function goMod(text) {
  const names = [];
  let block = false;
  for (const line of text.split('\n').map((l) => l.replace(/\/\/.*$/, '').trim())) {
    if (line === 'require (') { block = true; continue; }
    if (block && line === ')') { block = false; continue; }
    const spec = block ? line : line.match(/^require\s+(.+)$/)?.[1];
    if (spec) names.push(spec.split(/\s+/)[0]);
  }
  return names;
}

const csproj = (text) => [...text.matchAll(/<PackageReference\b[^>]*\bInclude="([^"]+)"/g)].map((m) => m[1]);

function pomXml(text) {
  return [...text.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)].map(([, body]) => {
    const tag = (name) => body.match(new RegExp(`<${name}>\\s*([^<]+?)\\s*</${name}>`))?.[1];
    return `${tag('groupId')}:${tag('artifactId')}`;
  });
}

const MANIFEST_READERS = [
  [/(^|\/)requirements\.txt$/, requirementsTxt],
  [/(^|\/)pyproject\.toml$/, pyprojectToml],
  [/(^|\/)go\.mod$/, goMod],
  [/\.csproj$/, csproj],
  [/(^|\/)pom\.xml$/, pomXml],
];

const manifestReader = (path) => MANIFEST_READERS.find(([pattern]) => pattern.test(path))?.[1] ?? null;

function newNames(read, before, after) {
  const known = new Set(before == null ? [] : read(before.replace(/\r\n?/g, '\n')));
  return after == null ? [] : read(after.replace(/\r\n?/g, '\n')).filter((name) => name && !known.has(name));
}

// changes: parseDiff output plus new untracked files; taskFiles: paths or globs of the task's Files:.
// manifests: [{ path, before, after }] of the other manifests the task changed (null when absent).
export function taskMetrics({ changes, taskFiles: patterns, manifest = {}, manifests = [] }) {
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
    newDependencies: [...new Set([
      ...dependencyNames(manifest.after).filter((name) => !before.has(name)),
      ...manifests.flatMap(({ path, before: old, after }) => newNames(manifestReader(path), old, after)),
    ])],
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

function readManifests(root, changes) {
  return changes.filter(({ path }) => manifestReader(path)).map(({ path }) => {
    const head = spawnSync('git', ['show', `HEAD:${path}`], { cwd: root, encoding: 'utf8' });
    let after = null;
    try {
      after = readFileSync(join(root, path), 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error; // deleted by the task
    }
    return { path, before: head.status === 0 ? head.stdout : null, after };
  });
}

function main() {
  const root = process.cwd();
  const active = findActiveStory(root);
  const id = active?.state.steps.implementation?.currentTask;
  if (!id) throw new Error('no open task: run keel-state.mjs task start <T#> first');
  const tasks = readDocs(active.folder)['tasks.md'];
  const changes = readChanges(root);
  const metrics = taskMetrics({ changes, taskFiles: taskFiles(tasks, id), manifest: readManifest(root), manifests: readManifests(root, changes) });
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
