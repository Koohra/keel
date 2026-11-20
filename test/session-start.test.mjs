import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, readJson } from './helpers.mjs';
import { newState } from '../scripts/keel-state.mjs';
import { requirementsDoc } from './fixtures.mjs';

const hook = join(root, 'scripts', 'hooks', 'session-start.mjs');

function project(setup) {
  const dir = mkdtempSync(join(tmpdir(), 'keel-session-'));
  mkdirSync(join(dir, '.git'));
  writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/feat/x\n');
  writeFileSync(join(dir, 'AGENTS.md'), '# App\nRegra-unica-do-agents-md: commite direto na main.\n');
  setup(dir);
  return dir;
}

function run(dir) {
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', cwd: dir }),
    encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });
  const context = result.stdout ? JSON.parse(result.stdout).hookSpecificOutput.additionalContext : '';
  return { status: result.status, context };
}

test('SessionStart injeta história, fase, o que falta, skill e precedência, sem o AGENTS.md', () => {
  const dir = project((d) => {
    const folder = join(d, 'keel', 'features', 'APP-1-login');
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'requirements.md'), requirementsDoc());
    const state = newState({ key: 'APP-1', slug: 'login', title: 'Login', branch: 'feat/x', now: 'x' });
    writeFileSync(join(folder, 'state.json'), JSON.stringify(state));
  });
  try {
    const { status, context } = run(dir);
    assert.equal(status, 0);
    assert.match(context, /APP-1/);
    assert.match(context, /keel\/features\/APP-1-login/);
    assert.match(context, /fase triage/);
    assert.match(context, /approval:level/);
    assert.match(context, /keel:story/);
    assert.match(context, /Comandos, estilo e convenções vêm do AGENTS\.md ou CLAUDE\.md/);
    assert.ok(context.length <= 1500, `${context.length} caracteres`);
    assert.ok(!context.includes('Regra-unica-do-agents-md'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('SessionStart sem história ativa dá uma linha; sem keel/ fica calado; erro não bloqueia', () => {
  const idle = project((d) => mkdirSync(join(d, 'keel')));
  const none = project(() => {});
  const broken = project((d) => {
    mkdirSync(join(d, 'keel', 'features', 'APP-1-login'), { recursive: true });
    writeFileSync(join(d, 'keel', 'features', 'APP-1-login', 'state.json'), '{ quebrado');
  });
  try {
    const quiet = run(idle);
    assert.equal(quiet.status, 0);
    assert.equal(quiet.context.split('\n').length, 1);
    assert.match(quiet.context, /keel:story/);
    assert.deepEqual(run(none), { status: 0, context: '' });
    const failed = run(broken);
    assert.equal(failed.status, 0);
    assert.match(failed.context, /ilegível/);
  } finally {
    for (const dir of [idle, none, broken]) rmSync(dir, { recursive: true, force: true });
  }
});

test('hooks.json registra o SessionStart em início, retomada, clear e compactação', () => {
  const entry = readJson('hooks/hooks.json').hooks.SessionStart[0];
  assert.equal(entry.matcher, 'startup|resume|clear|compact');
  assert.match(entry.hooks[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hooks\/session-start\.mjs/);
});
