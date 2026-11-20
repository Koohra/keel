import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, readJson } from './helpers.mjs';
import { checkEdit, newState } from '../scripts/keel-state.mjs';

const workflow = readJson('workflow/workflow.json');
const hook = join(root, 'scripts', 'hooks', 'pre-tool-use.mjs');

function storyIn(phase) {
  return { ...newState({ key: 'APP-1', slug: 'login', title: 'Login', branch: 'feat/x', now: 'x' }), phase };
}

test('checkEdit bloqueia state.json em qualquer fase', () => {
  for (const state of [null, storyIn('implementation')]) {
    const result = checkEdit('keel/features/APP-1-login/state.json', state, workflow);
    assert.equal(result.block, true);
    assert.match(result.reason, /keel-state\.mjs/);
  }
  assert.equal(checkEdit('keel/features/APP-1-login/State.JSON', null, workflow).block, true);
});

test('checkEdit libera código só na fase que permite', () => {
  assert.match(checkEdit('src/app.js', storyIn('tasks'), workflow).reason, /fase tasks/);
  assert.equal(checkEdit('src/app.js', storyIn('implementation'), workflow).block, false);
  assert.equal(checkEdit('keel/features/APP-1-login/tasks.md', storyIn('tasks'), workflow).block, false);
  assert.equal(checkEdit('../fora/notas.md', storyIn('tasks'), workflow).block, false);
  assert.equal(checkEdit('src/app.js', null, workflow).block, false);
});

test('hook lê o evento, acha a história da branch e sai com 2 ao bloquear', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-hook-'));
  try {
    mkdirSync(join(dir, '.git'));
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/feat/x\n');
    mkdirSync(join(dir, 'keel', 'features', 'APP-1-login'), { recursive: true });
    writeFileSync(join(dir, 'keel', 'features', 'APP-1-login', 'state.json'), JSON.stringify(storyIn('tasks')));
    const run = (file) => spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: join(dir, file) }, cwd: dir }),
      encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    });
    const blocked = run('src/app.js');
    assert.equal(blocked.status, 2);
    assert.match(blocked.stderr, /APP-1 está na fase tasks/);
    assert.equal(run('keel/features/APP-1-login/requirements.md').status, 0);
    const stale = storyIn('implementation');
    stale.steps.requirements = { ...stale.steps.requirements, approved: true, approvedBy: 'Ana', hash: 'antigo' };
    writeFileSync(join(dir, 'keel', 'features', 'APP-1-login', 'state.json'), JSON.stringify(stale));
    writeFileSync(join(dir, 'keel', 'features', 'APP-1-login', 'requirements.md'), 'mudou depois da aprovação\n');
    assert.match(run('src/app.js').stderr, /fase confirmation/);
    mkdirSync(join(dir, 'keel', 'features', 'OLD-1-x'));
    writeFileSync(join(dir, 'keel', 'features', 'OLD-1-x', 'state.json'), '{ conflito');
    assert.match(run('src/app.js').stderr, /fase confirmation/);
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    assert.equal(run('keel/features/APP-1-login/tasks.md').status, 0);
    const unreadable = run('src/app.js');
    assert.equal(unreadable.status, 2);
    assert.match(unreadable.stderr, /ilegível.*OLD-1-x/s);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hooks.json registra o PreToolUse nas ferramentas de edição', () => {
  const entry = readJson('hooks/hooks.json').hooks.PreToolUse[0];
  assert.equal(entry.matcher, 'Write|Edit|MultiEdit|NotebookEdit');
  assert.match(entry.hooks[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hooks\/pre-tool-use\.mjs/);
});
