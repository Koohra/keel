import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, readJson } from './helpers.mjs';
import {
  checkEdit, checkCommand, newState, setLevel, recordGenerated, recordReview, approve, advance,
} from '../scripts/keel-state.mjs';
import { requirementsDoc, tasksDoc } from './fixtures.mjs';
import { storyRepo } from './story-repo.mjs';

const workflow = readJson('workflow/workflow.json');
const hook = join(root, 'scripts', 'hooks', 'pre-tool-use.mjs');

function storyIn(phase) {
  return { ...newState({ key: 'APP-1', slug: 'login', title: 'Login', branch: 'feat/x', now: 'x' }), phase };
}

// Real story in implementation: gates met along the valid path.
function implementationState(docs) {
  const now = 'x';
  let state = setLevel(storyIn('triage'), 'standard', 'Ana', now);
  state = advance(state, workflow, docs, now).state;
  state = advance(recordGenerated(state, 'repo-map', now), workflow, docs, now).state;
  state = advance(state, workflow, docs, now).state;
  state = recordReview(state, 'requirements', 'ok', now);
  state = advance(approve(state, 'requirements.md', 'Ana', docs, workflow, now), workflow, docs, now).state;
  return advance(approve(state, 'tasks.md', 'Ana', docs, workflow, now), workflow, docs, now).state;
}

test('checkEdit blocks state.json in any phase', () => {
  for (const state of [null, storyIn('implementation')]) {
    const result = checkEdit('keel/features/APP-1-login/state.json', state, workflow);
    assert.equal(result.block, true);
    assert.match(result.reason, /keel-state\.mjs/);
  }
  assert.equal(checkEdit('keel/features/APP-1-login/State.JSON', null, workflow).block, true);
});

test('checkEdit allows code only in the phase that permits it', () => {
  assert.match(checkEdit('src/app.js', storyIn('tasks'), workflow).reason, /phase tasks/);
  assert.equal(checkEdit('src/app.js', storyIn('implementation'), workflow).block, false);
  assert.equal(checkEdit('keel/features/APP-1-login/tasks.md', storyIn('tasks'), workflow).block, false);
  assert.equal(checkEdit('../outside/notes.md', storyIn('tasks'), workflow).block, false);
  assert.equal(checkEdit('src/app.js', null, workflow).block, false);
});

test('checkCommand blocks a terminal command that writes state.json', () => {
  for (const command of [
    'echo \'{"phase":"implementation"}\' > keel/features/X/state.json',
    'cat a >> keel/features/X/State.json',
    'cp /tmp/s.json keel/features/X/state.json',
    "sed -i 's/tasks/implementation/' keel/features/X/state.json",
    'node -e "fs.writeFileSync(\'keel/features/X/state.json\', x)"',
    'Set-Content keel\\features\\X\\state.json $x',
  ]) assert.equal(checkCommand(command).block, true, command);
  for (const command of [
    'cat keel/features/X/state.json',
    'node scripts/keel-state.mjs next 2>&1',
    'git checkout -- keel/features/X/state.json',
    'npm test > out.txt',
  ]) assert.equal(checkCommand(command).block, false, command);
});

test('hook reads the event, finds the branch story and exits with 2 when blocking', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-hook-'));
  try {
    mkdirSync(join(dir, '.git'));
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/feat/x\n');
    mkdirSync(join(dir, 'keel', 'features', 'APP-1-login'), { recursive: true });
    const folder = join(dir, 'keel', 'features', 'APP-1-login');
    const docs = { 'requirements.md': requirementsDoc(), 'tasks.md': tasksDoc(), 'design.md': null };
    writeFileSync(join(folder, 'requirements.md'), docs['requirements.md']);
    writeFileSync(join(folder, 'tasks.md'), docs['tasks.md']);
    writeFileSync(join(folder, 'state.json'), JSON.stringify(storyIn('implementation')));
    const run = (file) => spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: join(dir, file) }, cwd: dir }),
      encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    });
    // state.json with phase "implementation" written by hand, without gates: the hook uses the real phase.
    const forged = run('src/app.js');
    assert.equal(forged.status, 2);
    assert.match(forged.stderr, /APP-1 is in phase triage/);
    assert.equal(run('keel/features/APP-1-login/requirements.md').status, 0);
    writeFileSync(join(folder, 'state.json'), JSON.stringify(implementationState(docs)));
    assert.equal(run('src/app.js').status, 0);
    writeFileSync(join(folder, 'requirements.md'), docs['requirements.md'].replace('mostrar aviso', 'mostrar banner'));
    assert.match(run('src/app.js').stderr, /APP-1 is in phase confirmation/);
    mkdirSync(join(dir, 'keel', 'features', 'OLD-1-x'));
    writeFileSync(join(dir, 'keel', 'features', 'OLD-1-x', 'state.json'), '{ broken');
    assert.match(run('src/app.js').stderr, /phase confirmation/);
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    assert.equal(run('keel/features/APP-1-login/tasks.md').status, 0);
    const bash = spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'echo {} > keel/features/APP-1-login/state.json' }, cwd: dir }),
      encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    });
    assert.equal(bash.status, 2);
    assert.match(bash.stderr, /keel-state\.mjs/);
    const unreadable = run('src/app.js');
    assert.equal(unreadable.status, 2);
    assert.match(unreadable.stderr, /unreadable.*OLD-1-x/s);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hooks.json registers PreToolUse on the edit tools and on Bash', () => {
  const entry = readJson('hooks/hooks.json').hooks.PreToolUse[0];
  assert.equal(entry.matcher, 'Write|Edit|MultiEdit|NotebookEdit|Bash');
  assert.match(entry.hooks[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hooks\/pre-tool-use\.mjs/);
});

test('hook blocks git commit in implementation until the dev approves the commit of the same code (AC-5.2, AC-5.3, AC-5.4)', () => {
  const repo = storyRepo();
  try {
    const commit = () => spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git add -A && git commit -m "APP-1 T1"' }, cwd: repo.dir }),
      encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: repo.dir },
    });
    repo.state('task', 'start', 'T1');
    repo.state('evidence', 'red');
    repo.write('src/login.js', 'export const login = 1;\n');
    repo.state('evidence', 'green');
    repo.state('checks');
    repo.state('review', 'task', '--result', 'ok');
    const blocked = commit();
    assert.equal(blocked.status, 2);
    assert.match(blocked.stderr, /the dev has not approved the commit of T1/);
    const tasksFile = join(repo.dir, repo.folder, 'tasks.md');
    writeFileSync(tasksFile, readFileSync(tasksFile, 'utf8').replace('Status: pending', 'Status: in review'));
    const approved = repo.state('approve', 'commit', '--by', 'Ana');
    assert.equal(approved.status, 0, approved.stderr);
    assert.equal(commit().status, 0);
    repo.write('src/login.js', 'export const login = 2;\n');
    assert.match(commit().stderr, /code changed after the dev approved the commit/);
  } finally {
    repo.cleanup();
  }
});

// Codex: edits arrive as apply_patch with the paths inside the patch, and there is no CLAUDE_PROJECT_DIR.
function codexHook(event) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  return spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', turn_id: 't1', tool_use_id: 'u1', ...event }), encoding: 'utf8', env,
  });
}

function applyPatch(cwd, ...lines) {
  return codexHook({ tool_name: 'apply_patch', tool_input: { command: ['*** Begin Patch', ...lines, '*** End Patch'].join('\n') }, cwd });
}

test('Codex apply_patch touching code outside the implementation is blocked like an Edit (AC-1.1, AC-1.2, AC-1.3, AC-2.1)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-codex-'));
  try {
    mkdirSync(join(dir, '.git'));
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/feat/x\n');
    const folder = join(dir, 'keel', 'features', 'APP-1-login');
    mkdirSync(folder, { recursive: true });
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(folder, 'requirements.md'), requirementsDoc());
    writeFileSync(join(folder, 'state.json'), JSON.stringify(storyIn('tasks')));
    const update = applyPatch(dir, '*** Update File: src/app.js', '@@', '-a', '+b');
    assert.equal(update.status, 2);
    assert.match(update.stderr, /APP-1 is in phase triage; code edits only in phase implementation/);
    const story = '*** Add File: keel/features/APP-1-login/tasks.md';
    assert.equal(applyPatch(dir, story, '+# Tasks').status, 0, update.stderr);
    for (const code of [['*** Add File: src/new.js', '+x'], ['*** Delete File: src/old.js'], ['*** Update File: keel/notes.md', '*** Move to: src/notes.js']]) {
      const mixed = applyPatch(dir, story, '+# Tasks', ...code);
      assert.equal(mixed.status, 2, code.join(' '));
      assert.match(mixed.stderr, /phase triage/);
    }
    // Session opened in a subfolder: relative paths come from the cwd, the story from the git root.
    const sub = applyPatch(join(dir, 'src'), '*** Update File: app.js', '@@', '-a', '+b');
    assert.equal(sub.status, 2);
    assert.match(sub.stderr, /phase triage/);
    const state = applyPatch(dir, '*** Update File: keel/features/APP-1-login/state.json', '@@', '-a', '+b');
    assert.equal(state.status, 2);
    assert.match(state.stderr, /keel-state\.mjs/);
    const shell = codexHook({ tool_name: 'Bash', tool_input: { command: 'echo {} > keel/features/APP-1-login/state.json' }, cwd: dir });
    assert.equal(shell.status, 2);
    assert.match(shell.stderr, /keel-state\.mjs/);
    const inline = codexHook({ tool_name: 'Bash', tool_input: { command: "apply_patch <<'EOF'\n*** Begin Patch\n*** Add File: src/x.js\n+x\n*** End Patch\nEOF" }, cwd: dir });
    assert.equal(inline.status, 2, 'a patch sent through the shell is read the same way');
    writeFileSync(join(folder, 'state.json'), JSON.stringify(storyIn('tasks')).replace('"feat/x"', '"feat/other"'));
    assert.equal(applyPatch(dir, '*** Update File: src/app.js', '@@', '-a', '+b').status, 0, 'no story on the branch');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Codex git commit without the recorded approval is blocked (AC-3.1)', () => {
  const repo = storyRepo();
  try {
    repo.state('task', 'start', 'T1');
    repo.state('evidence', 'red');
    repo.write('src/login.js', 'export const login = 1;\n');
    const commit = codexHook({ tool_name: 'Bash', tool_input: { command: 'git commit -am "APP-1 T1"' }, cwd: join(repo.dir, 'src') });
    assert.equal(commit.status, 2);
    assert.match(commit.stderr, /T1/);
  } finally {
    repo.cleanup();
  }
});
