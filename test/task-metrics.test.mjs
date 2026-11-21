import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { root } from './helpers.mjs';
import { storyRepo } from './story-repo.mjs';
import { parseDiff, taskMetrics } from '../scripts/task-metrics.mjs';

test('metrics: lines, new files, files outside the task, abstract types, new dependencies and approximate complexity (AC-8.1)', () => {
  const metrics = taskMetrics({
    changes: [
      { path: 'src/users.js', isNew: false, added: ['if (!email) throw new Error("x");', 'return a && b;'], removed: 1 },
      { path: 'src/store.ts', isNew: true, added: ['export interface Store {', '  save(user: User): void;', '}', 'export abstract class Base {}'], removed: 0 },
      { path: 'package.json', isNew: false, added: ['"left-pad": "1.0.0"'], removed: 0 },
    ],
    taskFiles: ['src/users.js', 'test/**'],
    manifest: { before: '{"dependencies":{"a":"1"}}', after: '{"dependencies":{"a":"1","left-pad":"1.0.0"},"devDependencies":{"b":"2"}}' },
  });
  assert.equal(metrics.linesAdded, 7);
  assert.equal(metrics.linesRemoved, 1);
  assert.deepEqual(metrics.newFiles, ['src/store.ts']);
  assert.deepEqual(metrics.outsideTask, ['src/store.ts', 'package.json']);
  assert.deepEqual(metrics.newAbstractTypes, [{ file: 'src/store.ts', name: 'Store' }, { file: 'src/store.ts', name: 'Base' }]);
  assert.deepEqual(metrics.newDependencies, ['left-pad', 'b']);
  assert.equal(metrics.complexity.approximate, true);
  assert.deepEqual(metrics.complexity.decisionPoints, { 'src/users.js': 2 });
});

test('parseDiff reads added and removed lines per file from git diff -U0', () => {
  const diff = 'diff --git a/src/a.js b/src/a.js\nindex 1..2 100644\n--- a/src/a.js\n+++ b/src/a.js\n@@ -1 +1,2 @@\n-old\n+new\n+more\ndiff --git a/src/b.py b/src/b.py\nnew file mode 100644\n--- /dev/null\n+++ b/src/b.py\n@@ -0,0 +1 @@\n+class Port(Protocol):\n';
  assert.deepEqual(parseDiff(diff), [
    { path: 'src/a.js', isNew: false, added: ['new', 'more'], removed: 1 },
    { path: 'src/b.py', isNew: true, added: ['class Port(Protocol):'], removed: 0 },
  ]);
});

test('CLI: metrics of the uncommitted code against the open task', () => {
  const repo = storyRepo();
  try {
    repo.write('package.json', '{ "name": "x" }\n');
    repo.sh('git', ['add', '-A']);
    repo.sh('git', ['commit', '-q', '-m', 'package']);
    repo.state('task', 'start', 'T1');
    repo.write('src/login.js', 'export function login(user) {\n  if (!user) return null;\n  return user;\n}\n');
    repo.write('src/port.ts', 'export interface Port {}\n');
    repo.write('package.json', '{ "name": "x", "dependencies": { "left-pad": "1.0.0" } }\n');
    const run = spawnSync(process.execPath, [join(root, 'scripts', 'task-metrics.mjs')], { cwd: repo.dir, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const metrics = JSON.parse(run.stdout);
    assert.equal(metrics.task, 'T1');
    assert.deepEqual(metrics.newFiles, ['src/login.js', 'src/port.ts']);
    assert.deepEqual(metrics.outsideTask, ['package.json', 'src/port.ts']);
    assert.deepEqual(metrics.newDependencies, ['left-pad']);
    assert.deepEqual(metrics.newAbstractTypes, [{ file: 'src/port.ts', name: 'Port' }]);
  } finally {
    repo.cleanup();
  }
});
