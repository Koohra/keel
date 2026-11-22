import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { root, readJson } from './helpers.mjs';
import { storyRepo } from './story-repo.mjs';

const hook = join(root, 'scripts', 'hooks', 'stop.mjs');

function stop(repo, event = {}) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: repo.dir };
  delete env.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: false, cwd: repo.dir, ...event }), encoding: 'utf8', env,
  });
}

test('Stop blocks an open task without RED and lets a blocked task or a second stop through (AC-7.1, AC-7.2, AC-7.4)', () => {
  const repo = storyRepo();
  try {
    assert.equal(stop(repo).status, 0, 'no open task');
    repo.state('task', 'start', 'T1');
    const noRed = stop(repo);
    assert.equal(noRed.status, 2);
    assert.match(noRed.stderr, /T1 has no RED evidence/);
    assert.match(noRed.stderr, /block --reason/);
    assert.equal(stop(repo, { stop_hook_active: true }).status, 0);
    const blocked = repo.state('block', '--reason', 'pergunta ao dev sobre o teste');
    assert.equal(blocked.status, 0, blocked.stderr);
    assert.equal(repo.read().steps.implementation.blocked, 'pergunta ao dev sobre o teste');
    assert.equal(stop(repo).status, 0);
  } finally {
    repo.cleanup();
  }
});

test('Stop runs stale checks, blocks when they fail and asks for the review when they pass (AC-7.3)', () => {
  const repo = storyRepo({ checks: 'Lint: `node -e "process.exit(3)"` · Tests: `node check.mjs`' });
  try {
    repo.state('task', 'start', 'T1');
    repo.state('evidence', 'red');
    repo.write('src/login.js', 'export const login = 1;\n');
    repo.state('evidence', 'green');
    const failing = stop(repo);
    assert.equal(failing.status, 2);
    assert.match(failing.stderr, /Lint \(node -e "process.exit\(3\)"\) exited with 3/);
    assert.equal(repo.read().steps.implementation.checks.passed, false);
    repo.write('keel/product.md', '# Produto\n\n### Checks\nTests: `node check.mjs`\n');
    // The dev's fix is committed apart (outside T1's Files:); the task's code changes, so the checks are stale.
    repo.sh('git', ['commit', '-q', '-m', 'the dev fixes the checks', '--', 'keel/product.md']);
    repo.write('src/login.js', 'export const login = 2;\n');
    const review = stop(repo);
    assert.equal(review.status, 2);
    assert.match(review.stderr, /T1 has no isolated review/);
    assert.equal(repo.read().steps.implementation.checks.passed, true);
    repo.state('review', 'task', '--result', 'ok');
    assert.equal(stop(repo).status, 0, 'waiting for the commit approval is a valid stop');
  } finally {
    repo.cleanup();
  }
});

test('hooks.json registers the Stop hook', () => {
  const entry = readJson('hooks/hooks.json').hooks.Stop[0];
  assert.match(entry.hooks[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hooks\/stop\.mjs/);
});
