// Task commit: the diff the dev approves and the commit of the done mark (KEEL-38).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './helpers.mjs';
import { storyRepo } from './story-repo.mjs';

const hook = join(root, 'scripts', 'hooks', 'pre-tool-use.mjs');

test('done mark: hook allows a story-only commit after the task commit', () => {
  const repo = storyRepo();
  try {
    const commit = () => spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git add -A && git commit -m "APP-1 T1: done"' }, cwd: repo.dir }),
      encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: repo.dir },
    });
    const ok = (r) => assert.equal(r.status, 0, r.stderr);
    const tasksFile = join(repo.dir, repo.folder, 'tasks.md');
    const setStatus = (status) => writeFileSync(tasksFile, readFileSync(tasksFile, 'utf8').replace(/(### T1\nStatus: )[^\n]*/, `$1${status}`));
    ok(repo.state('task', 'start', 'T1'));
    ok(repo.state('evidence', 'red'));
    repo.write('src/login.js', 'export const login = 1;\n');
    ok(repo.state('evidence', 'green'));
    ok(repo.state('checks'));
    ok(repo.state('review', 'task', '--result', 'ok'));
    setStatus('in review');
    ok(repo.state('approve', 'commit', '--by', 'Ana'));
    repo.sh('git', ['add', '-A']);
    repo.sh('git', ['commit', '-q', '-m', 'APP-1 T1: login']);
    setStatus(`done (${repo.sh('git', ['rev-parse', '--short', 'HEAD'])})`);

    const mark = commit();
    assert.equal(mark.status, 0, mark.stderr);
    repo.write('src/login.js', 'export const login = 2;\n');
    const code = commit();
    assert.equal(code.status, 2);
    assert.match(code.stderr, /code changed after the dev approved the commit/);
  } finally {
    repo.cleanup();
  }
});

test('proposal: the diff goes in the reply text and the done mark gets its own commit', () => {
  const phase = readFileSync(join(root, 'skills/story/phases/implementation.md'), 'utf8');
  const proposal = phase.match(/## 6\. [^\n]*\n([\s\S]*?)\n## 7\./)[1];
  assert.match(proposal, /`git diff --stat`/);
  assert.match(proposal, /no próprio texto da resposta/);
  assert.match(proposal, /"acima"/);
  assert.match(proposal, /saída de ferramenta/);
  const approved = phase.match(/## 7\. [^\n]*\n([\s\S]*?)\n## Nunca/)[1];
  assert.match(approved, /<KEY> T<n>: done \(<hash>\)/);
  assert.match(approved, /só a pasta da história/);
});
