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
  writeFileSync(join(dir, 'AGENTS.md'), '# App\nUnique-agents-md-rule: commit straight to main.\n');
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

test('SessionStart injects story, phase, what is missing, skill and precedence, without AGENTS.md', () => {
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
    assert.match(context, /phase triage/);
    assert.match(context, /approval:level/);
    assert.match(context, /keel:story/);
    assert.match(context, /Commands, style and conventions come from the project's AGENTS\.md or CLAUDE\.md/);
    assert.ok(context.length <= 1500, `${context.length} characters`);
    assert.ok(!context.includes('Unique-agents-md-rule'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('SessionStart with no active story gives one line; without keel/ it stays quiet; an error does not block', () => {
  const idle = project((d) => mkdirSync(join(d, 'keel')));
  const none = project(() => {});
  const broken = project((d) => {
    mkdirSync(join(d, 'keel', 'features', 'APP-1-login'), { recursive: true });
    writeFileSync(join(d, 'keel', 'features', 'APP-1-login', 'state.json'), '{ broken');
  });
  try {
    const quiet = run(idle);
    assert.equal(quiet.status, 0);
    assert.equal(quiet.context.split('\n').length, 1);
    assert.match(quiet.context, /keel:story/);
    assert.deepEqual(run(none), { status: 0, context: '' });
    const failed = run(broken);
    assert.equal(failed.status, 0);
    assert.match(failed.context, /unreadable/);
  } finally {
    for (const dir of [idle, none, broken]) rmSync(dir, { recursive: true, force: true });
  }
});

test('hooks.json registers SessionStart on startup, resume, clear and compact', () => {
  const entry = readJson('hooks/hooks.json').hooks.SessionStart[0];
  assert.equal(entry.matcher, 'startup|resume|clear|compact');
  assert.match(entry.hooks[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hooks\/session-start\.mjs/);
});

test('SessionStart in Codex, opened in a subfolder without CLAUDE_PROJECT_DIR, finds the story (AC-2.2)', () => {
  const dir = project((d) => {
    const folder = join(d, 'keel', 'features', 'APP-1-login');
    mkdirSync(folder, { recursive: true });
    mkdirSync(join(d, 'src'));
    writeFileSync(join(folder, 'state.json'), JSON.stringify(newState({ key: 'APP-1', slug: 'login', title: 'Login', branch: 'feat/x', now: 'x' })));
  });
  try {
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const result = spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', model: 'gpt', cwd: join(dir, 'src') }), encoding: 'utf8', env,
    });
    assert.equal(result.status, 0);
    assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /story APP-1 in keel\/features\/APP-1-login/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
