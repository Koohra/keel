import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, read, readJson } from './helpers.mjs';
import { storyRepo } from './story-repo.mjs';

const hook = join(root, 'scripts', 'hooks', 'post-tool-use.mjs');

const architecture = {
  components: { domain: ['src/domain/**'], infra: ['src/infra/**'] },
  rules: [{ name: 'domain-isolated', from: 'domain', forbid: ['infra'], fix: 'Use a port in the domain.' }],
  noCycles: [],
  baseline: 'keel/arch-baseline.txt',
};

function write(dir, path, text) {
  mkdirSync(join(dir, path, '..'), { recursive: true });
  writeFileSync(join(dir, path), text);
}

function run(dir, file) {
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: join(dir, file) }, cwd: dir }),
    encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });
  return { status: result.status, output: result.stdout ? JSON.parse(result.stdout) : null };
}

test('PostToolUse returns the new violation of the edited file and stays quiet otherwise', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-post-'));
  try {
    write(dir, 'src/infra/repo.js', 'export const repo = {};\n');
    write(dir, 'src/domain/invoice.js', "import { repo } from '../infra/repo.js';\n");
    write(dir, 'src/domain/clean.js', 'export const x = 1;\n');
    assert.deepEqual(run(dir, 'src/domain/invoice.js'), { status: 0, output: null }, 'without architecture.json it does not check');
    write(dir, 'keel/architecture.json', JSON.stringify(architecture));
    const planted = run(dir, 'src/domain/invoice.js');
    assert.equal(planted.status, 0);
    assert.equal(planted.output.decision, 'block');
    assert.match(planted.output.reason, /src\/domain\/invoice\.js:1.*Fix: Use a port in the domain\./s);
    assert.deepEqual(run(dir, 'src/domain/clean.js'), { status: 0, output: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PostToolUse warns about an invalid architecture.json without breaking the session', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-post-'));
  try {
    write(dir, 'src/domain/a.js', 'export const a = 1;\n');
    write(dir, 'keel/architecture.json', '{ broken');
    const edit = run(dir, 'src/domain/a.js');
    assert.equal(edit.status, 0);
    assert.match(edit.output.hookSpecificOutput.additionalContext, /architecture\.json/);
    const config = run(dir, 'keel/architecture.json');
    assert.equal(config.output.decision, 'block');
    const empty = spawnSync(process.execPath, [hook], { input: '', encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
    assert.equal(empty.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PostToolUse warns about Keel block drift when editing AGENTS.md, without blocking', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-post-'));
  try {
    const block = read('templates/keel-block.pt-BR.md').replace('à mão', 'como quiser');
    write(dir, 'AGENTS.md', `# App\n\n${block}`);
    const drift = run(dir, 'AGENTS.md');
    assert.equal(drift.status, 0);
    assert.equal(drift.output.decision, undefined);
    assert.match(drift.output.hookSpecificOutput.additionalContext, /keel-context\.mjs check/);
    write(dir, 'AGENTS.md', `# App\n\n${read('templates/keel-block.pt-BR.md')}`);
    assert.deepEqual(run(dir, 'AGENTS.md'), { status: 0, output: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hooks.json registers PostToolUse on the edit tools', () => {
  const entry = readJson('hooks/hooks.json').hooks.PostToolUse[0];
  assert.equal(entry.matcher, 'Write|Edit|MultiEdit');
  assert.match(entry.hooks[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hooks\/post-tool-use\.mjs/);
});

test('PostToolUse warns without blocking when the edit is outside the Files: of the open task (AC-9.1)', () => {
  const repo = storyRepo();
  try {
    repo.state('task', 'start', 'T1');
    repo.write('src/server.js', 'export const server = 1;\n');
    const outside = run(repo.dir, 'src/server.js');
    assert.equal(outside.status, 0);
    assert.equal(outside.output.decision, undefined);
    assert.match(outside.output.hookSpecificOutput.additionalContext, /src\/server\.js is outside the Files: of T1/);
    repo.write('src/login.js', 'export const login = 1;\n');
    assert.deepEqual(run(repo.dir, 'src/login.js'), { status: 0, output: null });
    assert.deepEqual(run(repo.dir, 'keel/features/APP-1-login/tasks.md'), { status: 0, output: null }, 'story documents are not task code');
  } finally {
    repo.cleanup();
  }
});
