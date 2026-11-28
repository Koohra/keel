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

test('new dependencies come from requirements.txt, pyproject.toml, go.mod, csproj and pom.xml', () => {
  const metrics = (path, before, after) => taskMetrics({ changes: [{ path, isNew: before == null, added: [], removed: 0 }], taskFiles: [path], manifests: [{ path, before, after }] }).newDependencies;
  assert.deepEqual(metrics('requirements.txt',
    'flask==2.0\n',
    '# web\nflask==2.0\nRequests[socks]>=2.31 ; python_version > "3.8"\n-r dev.txt\n-e .\n--index-url https://x\nnumpy\n'), ['Requests', 'numpy']);
  assert.deepEqual(metrics('pyproject.toml',
    '[project]\ndependencies = ["httpx>=0.27"]\n',
    '[project]\nname = "app"\ndependencies = [\n  "httpx>=0.27",\n  "pydantic[email]~=2.0",\n  "anyio",\n]\n\n[project.optional-dependencies]\ndev = ["pytest"]\n\n[tool.poetry.dependencies]\npython = "^3.11"\nrich = "^13"\n\n[tool.poetry.group.test.dependencies]\nhypothesis = "*"\n'),
  ['pydantic', 'anyio', 'pytest', 'rich', 'hypothesis']);
  assert.deepEqual(metrics('svc/go.mod',
    'module x\n\nrequire github.com/a/b v1.0.0\n',
    'module x\n\nrequire github.com/a/b v1.0.0\n\nrequire (\n\tgithub.com/c/d v1.2.0\n\tgolang.org/x/e v0.1.0 // indirect\n)\n'), ['github.com/c/d', 'golang.org/x/e']);
  assert.deepEqual(metrics('src/App/App.csproj',
    '<Project><ItemGroup><PackageReference Include="Serilog" Version="3" /></ItemGroup></Project>\n',
    '<Project>\n  <ItemGroup>\n    <PackageReference Include="Serilog" Version="3" />\n    <PackageReference Include="Dapper" Version="2" />\n    <ProjectReference Include="..\\Lib\\Lib.csproj" />\n  </ItemGroup>\n</Project>\n'), ['Dapper']);
  assert.deepEqual(metrics('pom.xml',
    null,
    '<project>\n  <groupId>me</groupId>\n  <dependencies>\n    <dependency>\n      <groupId>org.slf4j</groupId>\n      <artifactId>slf4j-api</artifactId>\n    </dependency>\n  </dependencies>\n</project>\n'), ['org.slf4j:slf4j-api']);
  const json = taskMetrics({ changes: [], taskFiles: [], manifest: { before: '{"dependencies":{"a":"1"}}', after: '{"dependencies":{"a":"1","b":"2"}}' } });
  assert.deepEqual(json.newDependencies, ['b'], 'package.json as today');
});
