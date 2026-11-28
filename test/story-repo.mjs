// A real git repository with a story in the implementation phase, driven through the keel-state.mjs CLI.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root } from './helpers.mjs';
import { requirementsDoc, tasksDoc } from './fixtures.mjs';

export function storyRepo({ verification = 'node check.mjs', checks = 'Tests: `node check.mjs`', tasks = null, check = null, architecture = null, base = null } = {}) {
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
  write('check.mjs', check ?? "import { existsSync } from 'node:fs';\nif (!existsSync('src/login.js')) { console.log('not ok 1 - login.test.js abre o consentimento'); process.exit(1); }\nconsole.log('ok 1');\n");
  if (architecture) write('keel/architecture.json', JSON.stringify(architecture, null, 2));
  const ok = (r) => assert.equal(r.status, 0, r.stderr);
  ok(state('init', '--key', 'APP-1', '--slug', 'login', '--title', 'Login', ...(base ? ['--base', base] : [])));
  ok(state('level', 'standard', '--by', 'Ana'));
  ok(state('advance'));
  ok(state('generated', 'repo-map'));
  ok(state('advance'));
  write(`${folder}/requirements.md`, requirementsDoc());
  ok(state('advance'));
  ok(state('review', 'requirements', '--result', 'ok'));
  ok(state('approve', 'requirements.md', '--by', 'Ana'));
  ok(state('advance'));
  write(`${folder}/tasks.md`, tasks ?? tasksDoc().replaceAll('Verification: `npm test`', `Verification: \`${verification}\``));
  ok(state('approve', 'tasks.md', '--by', 'Ana'));
  ok(state('advance'));
  sh('git', ['add', '-A']);
  sh('git', ['commit', '-q', '-m', 'story at implementation']);
  const read = () => JSON.parse(readFileSync(join(dir, folder, 'state.json'), 'utf8'));
  return { dir, sh, state, write, read, folder, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}


// Requirements R1 to R3 with one task each, every AC cited, Verification checking its own file.
export function closingTasksDoc() {
  const task = (n, rule, title, file, deps) => `## T${n} — ${n === 1 ? 'Walking skeleton: ' : ''}${title}
Covers: R${rule} (AC-${rule}.1)
Files: \`${file}\`
New structure: none
Test first: \`t${n}.test\` — ${title}
Verification: \`node check.mjs ${file} t${n}.test\`
Done when: ${file} existe
Depends on: ${deps}
`;
  return `# Tasks — APP-1

Requirements: requirements.md · Design: none
Approved by Ana on 2026-11-20

<!-- frozen after approval: start -->
${task(1, 1, 'consentimento', 'src/login.js', '—')}
${task(2, 2, 'sessão expirada', 'src/session.js', 'T1')}
${task(3, 3, 'aviso offline', 'src/offline.js', 'T1')}<!-- frozen after approval: end -->

## Progress
### T1
Status: pending
### T2
Status: pending
### T3
Status: pending

## Implementation notes
- Nenhuma.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
`;
}

const CHECK_FILE = "import { existsSync } from 'node:fs';\nconst [file, name] = process.argv.slice(2);\nif (!existsSync(file)) { console.log(`not ok 1 - ${name}`); process.exit(1); }\nconsole.log(`ok 1 - ${name}`);\n";

// The story through the task loop as the skill drives it, up to the closing phase.
// extra: { T1: 'src/extra.js' } adds a file to that task's commit after the approval (approve commit refuses it).
// beforeTasks(repo) runs after the story reaches implementation and before T1.
export function closingRepo({ architecture = null, extra = {}, base = null, beforeTasks = null, checks = 'Tests: `node -e 0` · Architecture: não se aplica' } = {}) {
  const repo = storyRepo({ tasks: closingTasksDoc(), checks, check: CHECK_FILE, architecture, base });
  beforeTasks?.(repo);
  const ok = (r) => assert.equal(r.status, 0, r.stderr);
  const tasksPath = join(repo.dir, repo.folder, 'tasks.md');
  const setStatus = (id, status) => {
    const text = readFileSync(tasksPath, 'utf8');
    writeFileSync(tasksPath, text.replace(new RegExp(`(### ${id}\\nStatus: )[^\\n]*`), `$1${status}`));
  };
  const finish = (id, file) => {
    ok(repo.state('task', 'start', id));
    ok(repo.state('evidence', 'red'));
    repo.write(file, 'export const done = true;\n');
    ok(repo.state('evidence', 'green'));
    ok(repo.state('checks'));
    ok(repo.state('review', 'task', '--result', 'ok'));
    setStatus(id, 'in review');
    ok(repo.state('approve', 'commit', '--by', 'Ana'));
    if (extra[id]) repo.write(extra[id], 'export const extra = true;\n');
    repo.sh('git', ['add', '-A']);
    repo.sh('git', ['commit', '-q', '-m', `APP-1 ${id}`]);
    setStatus(id, `done (${repo.sh('git', ['rev-parse', '--short', 'HEAD'])})`);
  };
  finish('T1', 'src/login.js');
  finish('T2', 'src/session.js');
  finish('T3', 'src/offline.js');
  ok(repo.state('advance'));
  // Copies the convergence lines the script returned into the tasks.md table.
  const copyConvergence = () => {
    const lines = JSON.parse(repo.state('next').stdout).closing.convergence;
    const text = readFileSync(tasksPath, 'utf8');
    writeFileSync(tasksPath, text.replace(/\| Rule \| Evidence \| Outcome \|\n\|---\|---\|---\|\n/, `${lines.join('\n')}\n`));
  };
  const close = () => {
    copyConvergence();
    ok(repo.state('review', 'story', '--result', 'ok'));
    ok(repo.state('advance'));
  };
  return { ...repo, setStatus, ok, copyConvergence, close };
}
