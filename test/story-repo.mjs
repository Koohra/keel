// A real git repository with a story in the implementation phase, driven through the keel-state.mjs CLI.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root } from './helpers.mjs';
import { requirementsDoc, tasksDoc } from './fixtures.mjs';

export function storyRepo({ verification = 'node check.mjs', checks = 'Tests: `node check.mjs`' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'keel-loop-'));
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const sh = (cmd, args) => {
    const r = spawnSync(cmd, args, { cwd: dir, encoding: 'utf8', env });
    if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  const state = (...args) => spawnSync(process.execPath, [join(root, 'scripts', 'keel-state.mjs'), ...args], { cwd: dir, encoding: 'utf8', env });
  const write = (path, text) => {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  const folder = 'keel/features/APP-1-login';
  sh('git', ['init', '-q', '-b', 'feat/APP-1-login']);
  sh('git', ['config', 'user.name', 'Ana']);
  sh('git', ['config', 'user.email', 'ana@example.com']);
  sh('git', ['config', 'core.autocrlf', 'false']);
  write('keel/product.md', `# Produto\n\n## Engineering principles\n1. Nada.\n\n### Checks\n${checks}\n`);
  // check.mjs passes once src/login.js exists.
  write('check.mjs', "import { existsSync } from 'node:fs';\nif (!existsSync('src/login.js')) { console.log('not ok 1 - abre o consentimento'); process.exit(1); }\nconsole.log('ok 1');\n");
  const ok = (r) => assert.equal(r.status, 0, r.stderr);
  ok(state('init', '--key', 'APP-1', '--slug', 'login', '--title', 'Login'));
  ok(state('level', 'standard', '--by', 'Ana'));
  ok(state('advance'));
  ok(state('generated', 'repo-map'));
  ok(state('advance'));
  write(`${folder}/requirements.md`, requirementsDoc());
  ok(state('advance'));
  ok(state('review', 'requirements', '--result', 'ok'));
  ok(state('approve', 'requirements.md', '--by', 'Ana'));
  ok(state('advance'));
  write(`${folder}/tasks.md`, tasksDoc().replaceAll('Verification: `npm test`', `Verification: \`${verification}\``));
  ok(state('approve', 'tasks.md', '--by', 'Ana'));
  ok(state('advance'));
  sh('git', ['add', '-A']);
  sh('git', ['commit', '-q', '-m', 'story at implementation']);
  const read = () => JSON.parse(readFileSync(join(dir, folder, 'state.json'), 'utf8'));
  return { dir, sh, state, write, read, folder, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

