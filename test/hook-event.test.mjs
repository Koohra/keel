import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { read, readJson } from './helpers.mjs';
import { editTargets, patchFiles, projectRoot, shellCommand } from '../scripts/hooks/event.mjs';

const patch = [
  '*** Begin Patch',
  '*** Add File: src/new.js',
  '+export const a = 1;',
  '*** Update File: src/app.js',
  '*** Move to: src/renamed.js',
  '@@',
  '-old',
  '+new',
  '*** Delete File: src/gone.js',
  '*** End Patch',
].join('\n');

test('patchFiles lists every file a Codex patch adds, updates, moves or deletes', () => {
  assert.deepEqual(patchFiles(patch), [
    { path: 'src/new.js', change: 'add' },
    { path: 'src/app.js', change: 'update' },
    { path: 'src/renamed.js', change: 'move' },
    { path: 'src/gone.js', change: 'delete' },
  ]);
  assert.deepEqual(patchFiles(`apply_patch <<'EOF'\r\n*** Begin Patch\r\n*** Update File: a b.js\r\n*** End Patch\r\nEOF`), [{ path: 'a b.js', change: 'update' }]);
  assert.deepEqual(patchFiles('npm test'), []);
});

test('editTargets reads Claude Code file_path, notebook_path and Codex apply_patch, resolved from the cwd', () => {
  const cwd = join(tmpdir(), 'proj', 'pkg');
  assert.deepEqual(editTargets({ tool_name: 'Edit', tool_input: { file_path: join(cwd, 'a.js') }, cwd }), [{ path: join(cwd, 'a.js'), change: 'update' }]);
  assert.deepEqual(editTargets({ tool_name: 'NotebookEdit', tool_input: { notebook_path: 'n.ipynb' }, cwd }), [{ path: join(cwd, 'n.ipynb'), change: 'update' }]);
  assert.deepEqual(editTargets({ tool_name: 'apply_patch', tool_input: { command: patch }, cwd }).map((t) => t.path), [
    join(cwd, 'src/new.js'), join(cwd, 'src/app.js'), join(cwd, 'src/renamed.js'), join(cwd, 'src/gone.js'),
  ]);
  assert.deepEqual(editTargets({ tool_name: 'Bash', tool_input: { command: 'ls' }, cwd }), []);
  assert.equal(shellCommand({ tool_name: 'Bash', tool_input: { command: 'git commit' } }), 'git commit');
  assert.equal(shellCommand({ tool_name: 'apply_patch', tool_input: { command: patch } }), null);
});

test('projectRoot prefers CLAUDE_PROJECT_DIR, then the git root above the cwd, then the cwd', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-root-'));
  try {
    const sub = join(dir, 'packages', 'api');
    mkdirSync(sub, { recursive: true });
    assert.equal(projectRoot({ cwd: sub }, {}), sub, 'without git, the cwd');
    mkdirSync(join(dir, '.git'));
    assert.equal(projectRoot({ cwd: sub }, {}), dir);
    assert.equal(projectRoot({ cwd: sub }, { CLAUDE_PROJECT_DIR: sub }), sub);
    rmSync(join(dir, '.git'), { recursive: true });
    writeFileSync(join(dir, '.git'), 'gitdir: ../elsewhere\n');
    assert.equal(projectRoot({ cwd: sub }, {}), dir, 'a worktree has a .git file');
    assert.equal(projectRoot({}, {}), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hooks.json matchers catch the Codex aliases of apply_patch and the shell (AC-5.1)', () => {
  const { hooks } = readJson('hooks/hooks.json');
  const pre = new RegExp(`^(?:${hooks.PreToolUse[0].matcher})$`);
  const post = new RegExp(`^(?:${hooks.PostToolUse[0].matcher})$`);
  for (const alias of ['Edit', 'Write']) {
    assert.ok(pre.test(alias), `PreToolUse ${alias}`);
    assert.ok(post.test(alias), `PostToolUse ${alias}`);
  }
  assert.ok(pre.test('Bash'));
});

test('README tells the Codex user to trust the hooks in /hooks and what happens without it (AC-6.1)', () => {
  const section = read('README.md').split(/^## /m).find((s) => s.startsWith('Instalar'));
  assert.match(section, /### Hooks no Codex/);
  assert.match(section, /`\/hooks`/);
  assert.match(section, /sem os portões/);
});
