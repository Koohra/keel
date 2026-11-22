import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from './helpers.mjs';
import { designDoc, requirementsDoc, tasksDoc } from './fixtures.mjs';
import { newState, nextStep, advance, approve, setLevel, recordReview, recordGenerated } from '../scripts/keel-state.mjs';
import { storyRepo } from './story-repo.mjs';
import {
  startTask, evidenceCommand, recordEvidence, taskMissing, checkCommands, recordChecks,
  recordTaskReview, approveCommit, isGitCommit, checkGitCommit, checkStop, taskView, reviewChecklists,
} from '../scripts/task-loop.mjs';

const workflow = readJson('workflow/workflow.json');
const taskExit = workflow.phases.find((p) => p.id === 'implementation').taskExit;
const now = '2026-11-20T12:00:00Z';
const docs = { 'requirements.md': requirementsDoc(), 'tasks.md': tasksDoc(), 'design.md': null };
const tasks = docs['tasks.md'];
const git = { isCommit: () => true };

// Story in implementation along the valid path.
function implementationState() {
  let state = setLevel(newState({ key: 'APP-1', slug: 'login', title: 'Login', branch: 'feat/APP-1-login', now }), 'standard', 'Ana', now);
  state = advance(state, workflow, docs, now).state;
  state = advance(recordGenerated(state, 'repo-map', now), workflow, docs, now).state;
  state = advance(state, workflow, docs, now).state;
  state = recordReview(state, 'requirements', 'ok', now);
  state = advance(approve(state, 'requirements.md', 'Ana', docs, workflow, now), workflow, docs, now).state;
  return advance(approve(state, 'tasks.md', 'Ana', docs, workflow, now), workflow, docs, now).state;
}

const red = { command: 'npm test', exitCode: 1, output: 'not ok 1 - abre o consentimento\n  at login.test.js:3\n  expected true' };
const green = { command: 'npm test', exitCode: 0, output: 'ok 1 - abre o consentimento' };

test('walking skeleton: task start, RED with a failing exit, GREEN with 0 and next shows the task (AC-2.1, AC-6.1)', () => {
  let state = startTask(implementationState(), 'T1', tasks, git, now);
  assert.equal(state.steps.implementation.currentTask, 'T1');
  assert.equal(evidenceCommand(state, 'red', tasks), 'npm test');
  state = recordEvidence(state, 'red', red, tasks, now);
  assert.deepEqual(state.steps.implementation.red, { ...red, at: now });
  assert.deepEqual(taskMissing(state, tasks, 'tree', taskExit).map((m) => m.criterion),
    ['evidence:green', 'checks:passed', 'review:task', 'approval:commit']);
  const next = nextStep(state, workflow, docs, { tasks, fingerprint: 'tree' });
  assert.equal(next.task.id, 'T1');
  assert.deepEqual(next.task.missing.map((m) => m.criterion), ['evidence:green', 'checks:passed', 'review:task', 'approval:commit']);
  state = recordEvidence(state, 'green', green, tasks, now);
  assert.equal(state.steps.implementation.green.exitCode, 0);
  assert.equal(taskMissing(state, tasks, 'tree', taskExit)[0].criterion, 'checks:passed');
});

test('next outside implementation has no task; in implementation without an open task it points to the next one', () => {
  const state = implementationState();
  assert.equal(nextStep(state, workflow, docs, { tasks, fingerprint: 'tree' }).task, null);
  assert.deepEqual(nextStep(state, workflow, docs, { tasks, fingerprint: 'tree' }).nextTask, 'T1');
  assert.equal(nextStep({ ...state, phase: 'tasks' }, workflow, docs).task, undefined);
});

test('CLI: task start, evidence red and green run the Verification command and record it', () => {
  const repo = storyRepo();
  try {
    assert.equal(repo.state('task', 'start', 'T1').status, 0);
    const r = repo.state('evidence', 'red');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(repo.read().steps.implementation.red.exitCode, 1);
    assert.match(repo.read().steps.implementation.red.output, /not ok 1/);
    repo.write('src/login.js', 'export const login = 1;\n');
    assert.equal(repo.state('evidence', 'green').status, 0);
    assert.equal(repo.read().steps.implementation.green.exitCode, 0);
    const next = JSON.parse(repo.state('next').stdout);
    assert.equal(next.task.id, 'T1');
    assert.equal(next.task.missing[0].criterion, 'checks:passed');
  } finally {
    repo.cleanup();
  }
});

const inReview = () => withStatus(tasks, 'T1', 'in review');
const withStatus = (text, id, status) => text.replace(new RegExp(`(### ${id}\\nStatus: )[^\\n]+`), `$1${status}`);

test('task start: dependencies done, one open task at a time, closed only by a real commit (AC-1.1, AC-1.2, AC-1.3)', () => {
  const state = implementationState();
  assert.throws(() => startTask(state, 'T2', tasks, git, now), /T2 depends on T1, which is not done/);
  assert.throws(() => startTask(state, 'T9', tasks, git, now), /T9 does not exist/);
  const open = startTask(state, 'T1', tasks, git, now);
  assert.throws(() => startTask(open, 'T2', tasks, git, now), /T1 is open/);
  const done = withStatus(tasks, 'T1', 'done (abc1234)');
  const committed = { ...open, steps: { ...open.steps, implementation: { ...open.steps.implementation, commit: { task: 'T1' } } } };
  assert.throws(() => startTask(committed, 'T2', done, { isCommit: () => false }, now), /abc1234 is not a commit/);
  const second = startTask(committed, 'T2', done, { isCommit: (hash) => hash === 'abc1234' }, now);
  assert.equal(second.steps.implementation.currentTask, 'T2');
  assert.equal(second.steps.implementation.red, null);
  assert.throws(() => startTask(state, 'T1', done, git, now), /T1 is already done/);
  assert.throws(() => startTask({ ...state, phase: 'tasks' }, 'T1', tasks, git, now), /only in phase implementation/);
});

test('RED must fail for the right reason and GREEN needs RED and exit 0; No test tasks have no RED (AC-2.2, AC-2.3, AC-2.4)', () => {
  const open = startTask(implementationState(), 'T1', tasks, git, now);
  assert.throws(() => recordEvidence(open, 'red', green, tasks, now), /must fail before the code: npm test exited with 0/);
  for (const output of ['Error [ERR_MODULE_NOT_FOUND]: Cannot find module', "SyntaxError: The requested module './login.js' does not provide an export named 'login'"]) {
    assert.throws(() => recordEvidence(open, 'red', { ...red, output }, tasks, now), /failed for the wrong reason/);
  }
  assert.throws(() => evidenceCommand(open, 'green', tasks), /T1 has no RED evidence yet: run evidence red first/);
  const withRed = recordEvidence(open, 'red', red, tasks, now);
  assert.throws(() => recordEvidence(withRed, 'green', red, tasks, now), /GREEN needs exit 0: npm test exited with 1/);
  assert.throws(() => evidenceCommand(implementationState(), 'red', tasks), /no open task: run task start/);
  const done = withStatus(withStatus(withStatus(tasks, 'T1', 'done (abc1234)'), 'T2', 'done (abc1235)'), 'T3', 'done (abc1236)');
  const noTest = startTask(implementationState(), 'T4', done, git, now);
  assert.throws(() => evidenceCommand(noTest, 'red', done), /T4 has No test: it has no RED; its evidence is the project checks \(run checks\)/);
  assert.deepEqual(taskMissing(noTest, done, 'tree', taskExit).map((m) => m.criterion), ['checks:passed', 'review:task', 'approval:commit']);
});

const product = (checks) => `# Produto\n\n## Engineering principles\n1. Nada.\n\n### Checks\n${checks}\n\n## Outra\nTests: \`ignored\`\n`;

test('checks: each command of "Checks" in product.md, all must exit 0 and the code must not change after (AC-3.1, AC-3.2, AC-3.3)', () => {
  const commands = checkCommands(product('Architecture: `node arch.mjs` · Lint/complexity: não se aplica ainda · Tests: `npm test`'));
  assert.deepEqual(commands, [{ name: 'Architecture', command: 'node arch.mjs' }, { name: 'Tests', command: 'npm test' }]);
  assert.throws(() => checkCommands(product('Tests: não se aplica')), /no command in backticks under "### Checks" of keel\/product.md/);
  assert.throws(() => checkCommands('# Produto\n'), /no command in backticks under "### Checks"/);
  let state = recordEvidence(startTask(implementationState(), 'T1', tasks, git, now), 'red', red, tasks, now);
  state = recordEvidence(state, 'green', green, tasks, now);
  const failing = recordChecks(state, [{ ...green, name: 'Architecture', command: 'node arch.mjs' }, { name: 'Tests', command: 'npm test', exitCode: 1, output: 'not ok 2' }], 'tree-1', now);
  assert.equal(failing.steps.implementation.checks.passed, false);
  assert.equal(failing.steps.implementation.checks.results.length, 2);
  assert.match(taskMissing(failing, tasks, 'tree-1', taskExit)[0].reason, /Tests \(npm test\) exited with 1/);
  const passing = recordChecks(state, [{ ...green, name: 'Tests' }], 'tree-1', now);
  assert.equal(taskMissing(passing, tasks, 'tree-1', taskExit)[0].criterion, 'review:task');
  assert.match(taskMissing(passing, tasks, 'tree-2', taskExit)[0].reason, /code changed after the checks: run checks again/);
});

test('CLI: checks records each command and exits 1 when one fails; an edit afterwards makes them stale', () => {
  const repo = storyRepo({ checks: 'Architecture: `node -e "process.exit(0)"` · Tests: `node check.mjs`' });
  try {
    repo.state('task', 'start', 'T1');
    repo.state('evidence', 'red');
    const failed = repo.state('checks');
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /Tests \(node check.mjs\) exited with 1/);
    assert.deepEqual(repo.read().steps.implementation.checks.results.map((r) => r.exitCode), [0, 1]);
    repo.write('src/login.js', 'export const login = 1;\n');
    assert.equal(repo.state('checks').status, 0);
    assert.equal(JSON.parse(repo.state('next').stdout).task.missing.some((m) => m.criterion === 'checks:passed'), false);
    repo.write('src/login.js', 'export const login = 2;\n');
    const stale = JSON.parse(repo.state('next').stdout).task.missing.find((m) => m.criterion === 'checks:passed');
    assert.match(stale.reason, /code changed after the checks/);
    repo.write('keel/features/APP-1-login/tasks.md', readFileSync(join(repo.dir, repo.folder, 'tasks.md'), 'utf8').replace('Status: pending', 'Status: red'));
    repo.write('src/login.js', 'export const login = 1;\n');
    assert.equal(JSON.parse(repo.state('next').stdout).task.missing.some((m) => m.criterion === 'checks:passed'), false, 'Progress in the story folder does not count');
  } finally {
    repo.cleanup();
  }
});

function readyForCommit() {
  let state = recordEvidence(startTask(implementationState(), 'T1', tasks, git, now), 'red', red, tasks, now);
  state = recordEvidence(state, 'green', green, tasks, now);
  return recordChecks(state, [{ ...green, name: 'Tests' }], 'tree', now);
}

test('review task records the isolated review; approve commit needs RED, GREEN, checks and review (AC-4.1, AC-5.1)', () => {
  const state = readyForCommit();
  assert.throws(() => approveCommit(state, 'Ana', withStatus(tasks, 'T1', 'green'), 'tree', taskExit, now), /cannot approve the commit of T1: review:task/);
  assert.throws(() => recordTaskReview(state, 'maybe', now), /invalid result "maybe"/);
  const reviewed = recordTaskReview(state, 'findings', now);
  assert.deepEqual(reviewed.steps.implementation.review, { task: 'T1', result: 'findings', at: now });
  assert.deepEqual(taskMissing(reviewed, tasks, 'tree', taskExit).map((m) => m.criterion), ['approval:commit']);
  assert.throws(() => approveCommit(reviewed, '', inReview(), 'tree', taskExit, now), /--by <dev>/);
  assert.throws(() => approveCommit(reviewed, 'Ana', inReview(), 'other', taskExit, now), /code changed after the checks/);
  const answered = inReview().replace('Review: —', 'Review: findings (isolated reviewer); nome do teste corrigido');
  const approved = approveCommit(reviewed, 'Ana', answered, 'tree', taskExit, now);
  assert.deepEqual(approved.steps.implementation.commit, { task: 'T1', approvedBy: 'Ana', at: now, fingerprint: 'tree' });
  assert.deepEqual(taskMissing(approved, tasks, 'tree', taskExit), []);
  assert.match(taskMissing(approved, tasks, 'later', taskExit).at(-1).reason, /code changed after the dev approved the commit/);
});

test('git commit in implementation only with the commit approved for the same code (AC-5.2, AC-5.3, AC-5.4)', () => {
  for (const command of ['git commit -m "T1"', 'git add -A && git commit -m x', 'git -c user.name=Ana commit -am x', 'cd app; git commit --amend']) {
    assert.equal(isGitCommit(command), true, command);
  }
  for (const command of ['git log --grep commit', 'git status', 'npm test', 'git diff HEAD -- src/commit.js']) assert.equal(isGitCommit(command), false, command);
  const reviewed = recordTaskReview(readyForCommit(), 'ok', now);
  assert.match(checkGitCommit(reviewed, tasks, 'tree').reason, /the dev has not approved the commit of T1/);
  const approved = approveCommit(reviewed, 'Ana', inReview(), 'tree', taskExit, now);
  assert.deepEqual(checkGitCommit(approved, tasks, 'tree'), { block: false });
  assert.match(checkGitCommit(approved, tasks, 'changed').reason, /code changed after the dev approved the commit/);
  assert.match(checkGitCommit(implementationState(), tasks, 'tree').reason, /no open task/);
  assert.deepEqual(checkGitCommit({ ...implementationState(), phase: 'closing' }, tasks, 'tree'), { block: false });
});

test('review fixes: wrong-reason RED on long output, plain done, old hash, git commit forms, RED resets GREEN, all Checks commands', async (t) => {
  const open = startTask(implementationState(), 'T1', tasks, git, now);
  const long = `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/x/src/users.js'\n${'  at line\n'.repeat(40)}not ok 1`;
  assert.throws(() => recordEvidence(open, 'red', { ...red, output: long }, tasks, now), /wrong reason/);
  const recorded = recordEvidence(open, 'red', { ...red, output: `not ok 1 - login.test.js\n${'x\n'.repeat(40)}SyntaxError thrown as expected? no: assertion` }, tasks, now);
  assert.ok(recorded.steps.implementation.red.output.split('\n').length <= 20, 'stored output is the tail');
  assert.doesNotThrow(() => recordEvidence(open, 'red', { ...red, output: 'not ok 1 - login.test.js\nAssertionError: expected SyntaxError from JSON.parse' }, tasks, now));

  const plainDone = withStatus(tasks, 'T1', 'done');
  assert.equal(checkStop(open, plainDone, 'tree').action, 'block', 'plain done does not close the open task');
  assert.throws(() => startTask(implementationState(), 'T2', plainDone, git, now), /T2 depends on T1, which is not done/);
  assert.throws(() => startTask(open, 'T2', withStatus(tasks, 'T1', 'done (abc1234)'), git, now), /T1 has no approved commit/);

  for (const command of ['(git commit -m x)', 'GIT_AUTHOR_NAME=a git commit -m x', 'command git commit', '/usr/bin/git commit', 'bash -c "git commit -m x"',
    'echo $(git commit -m x)', 'git --git-dir .git commit', 'git merge feat', 'git cherry-pick abc', 'git.exe commit -m x']) {
    assert.equal(isGitCommit(command), true, command);
  }

  const withGreen = recordEvidence(recordEvidence(open, 'red', red, tasks, now), 'green', green, tasks, now);
  assert.equal(recordEvidence(withGreen, 'red', red, tasks, now).steps.implementation.green, null);

  assert.deepEqual(checkCommands(product('Tests: `npm test` e `npm run e2e` · Lint: não se aplica')).map((c) => c.command), ['npm test', 'npm run e2e']);

  let ready = recordChecks(recordEvidence(withGreen, 'green', green, tasks, now), [{ ...green, name: 'Tests' }], 'tree', now);
  ready = approveCommit(recordTaskReview(ready, 'ok', now), 'Ana', inReview(), 'tree', taskExit, now);
  assert.equal(checkStop(ready, tasks, 'after-commit').action, 'allow', 'after the approved commit the Stop does not rerun checks');
});

test('CLI: a real node --test run that fails on a missing module is refused as RED', () => {
  const repo = storyRepo({ verification: 'node --test login.test.mjs' });
  try {
    repo.write('login.test.mjs', "import { test } from 'node:test';\nimport { login } from './src/login.js';\ntest('login', () => { if (!login) throw new Error('no'); });\n");
    repo.state('task', 'start', 'T1');
    const refused = repo.state('evidence', 'red');
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /wrong reason/);
    assert.equal(repo.read().steps.implementation.red, null);
  } finally {
    repo.cleanup();
  }
});

test('RED must show the test of Test first: failing by name (AC-2.5)', () => {
  const open = startTask(implementationState(), 'T1', tasks, git, now);
  assert.throws(() => recordEvidence(open, 'red', { ...red, output: 'not ok 1 - outro teste\n  expected true' }, tasks, now),
    /the output does not show the test "login.test.js" failing/);
  assert.equal(recordEvidence(open, 'red', red, tasks, now).steps.implementation.red.exitCode, 1);
});

test('Progress mirrors the script: ready lines in the output and approve commit refuses a Status that does not match (AC-12.1, AC-12.2)', () => {
  let state = recordEvidence(startTask(implementationState(), 'T1', tasks, git, now), 'red', red, tasks, now);
  const view = taskView(state, tasks, 'tree', taskExit);
  assert.deepEqual(view.task.progress.slice(0, 2), ['Status: red', 'RED evidence: `npm test` exited with 1 at 2026-11-20T12:00:00Z']);
  state = recordEvidence(state, 'green', green, tasks, now);
  state = recordTaskReview(recordChecks(state, [{ ...green, name: 'Tests' }], 'tree', now), 'findings', now);
  assert.deepEqual(taskView(state, tasks, 'tree', taskExit).task.progress, [
    'Status: in review',
    'RED evidence: `npm test` exited with 1 at 2026-11-20T12:00:00Z',
    'GREEN evidence: `npm test` exited with 0 at 2026-11-20T12:00:00Z',
    'Checks: Tests `npm test` exited with 0',
    'Review: findings (isolated reviewer)',
  ]);
  assert.throws(() => approveCommit(state, 'Ana', withStatus(tasks, 'T1', 'green'), 'tree', taskExit, now),
    /Status: green in the Progress of T1 does not match the state \(in review\)/);
  const answered = withStatus(tasks, 'T1', 'in review').replace('Review: —', 'Review: findings (isolated reviewer); corrigido');
  assert.equal(approveCommit(state, 'Ana', answered, 'tree', taskExit, now).steps.implementation.commit.task, 'T1');
  const onlyRed = recordEvidence(startTask(implementationState(), 'T1', tasks, git, now), 'red', red, tasks, now);
  assert.throws(() => approveCommit(onlyRed, 'Ana', withStatus(tasks, 'T1', 'green'), 'tree', taskExit, now), /does not match the state \(red\)/);
});

test('regression task: RED only with the delivered code sabotaged, GREEN only after undoing it', () => {
  const regression = tasks.replace('Files: `src/session.js`', 'Files: `test/session.test.js`\nRegression: delivered by T1')
    .replace('### T1\nStatus: pending', '### T1\nStatus: done (abc1234)');
  let state = startTask(implementationState(), 'T2', regression, git, now);
  const failing = { command: 'npm test', exitCode: 1, output: 'not ok 1 - session.test.js pede login' };
  assert.throws(() => recordEvidence(state, 'red', failing, regression, now, ['test/session.test.js']), /sabotage the code delivered by T1/);
  state = recordEvidence(state, 'red', failing, regression, now, ['test/session.test.js', 'src/login.js']);
  assert.deepEqual(state.steps.implementation.red.sabotage, ['src/login.js']);
  const passing = { command: 'npm test', exitCode: 0, output: 'ok 1 - session.test.js pede login' };
  assert.throws(() => recordEvidence(state, 'green', passing, regression, now, ['test/session.test.js', 'src/login.js']), /undo the sabotage .*src\/login\.js/);
  state = recordEvidence(state, 'green', passing, regression, now, ['test/session.test.js']);
  assert.equal(state.steps.implementation.green.exitCode, 0);
});

test('failed attempts: a failing GREEN is recorded and next points to debugging', () => {
  const repo = storyRepo();
  try {
    repo.state('task', 'start', 'T1');
    assert.equal(repo.state('evidence', 'red').status, 0);
    const failed = repo.state('evidence', 'green');
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /GREEN needs exit 0/);
    const attempt = repo.read().steps.implementation.failedAttempts;
    assert.equal(attempt.count, 1);
    assert.equal(attempt.last.kind, 'green');
    assert.equal(attempt.last.exitCode, 1);
    assert.match(attempt.last.output, /not ok 1/);
    assert.deepEqual(JSON.parse(repo.state('next').stdout).task.debugging, { attempts: 1, max: 3, instructions: 'phases/debugging.md' });
    repo.write('src/login.js', 'export const login = 1;\n');
    assert.equal(repo.state('evidence', 'green').status, 0);
    assert.equal(JSON.parse(repo.state('next').stdout).task.debugging, undefined);
  } finally {
    repo.cleanup();
  }
});

test('failed attempts: the third failure refuses GREEN and checks until block', () => {
  const repo = storyRepo();
  try {
    repo.state('task', 'start', 'T1');
    repo.state('evidence', 'red');
    assert.equal(repo.state('evidence', 'green').status, 1);
    assert.equal(repo.state('checks').status, 1);
    assert.equal(repo.state('evidence', 'green').status, 1);
    assert.equal(repo.read().steps.implementation.failedAttempts.count, 3);
    for (const command of [['evidence', 'green'], ['checks']]) {
      const refused = repo.state(...command);
      assert.equal(refused.status, 1);
      assert.match(refused.stderr, /T1 has 3 failed attempts.*block --reason/s);
      assert.doesNotMatch(refused.stderr, /exited with/, `${command.join(' ')} must not run the command`);
    }
    assert.equal(repo.read().steps.implementation.failedAttempts.count, 3);
    assert.match(checkStop(repo.read(), readFileSync(join(repo.dir, repo.folder, 'tasks.md'), 'utf8'), 'tree').reason, /3 failed attempts.*block --reason/);
    assert.equal(repo.state('block', '--reason', 'login.js não existe; o teste pede o módulo').status, 0);
    assert.equal(repo.read().steps.implementation.failedAttempts, null);
    assert.match(repo.state('evidence', 'green').stderr, /GREEN needs exit 0/);
  } finally {
    repo.cleanup();
  }
});

test('review findings: approve commit needs what was done with them', () => {
  const withReview = (line) => inReview().replace('Review: —', `Review: ${line}`);
  const findings = recordTaskReview(readyForCommit(), 'findings', now);
  assert.throws(() => approveCommit(findings, 'Ana', withReview('findings (isolated reviewer)'), 'tree', taskExit, now),
    /T1: the review had findings.*Review:/s);
  assert.throws(() => approveCommit(findings, 'Ana', inReview(), 'tree', taskExit, now), /the review had findings/);
  const approved = approveCommit(findings, 'Ana', withReview('findings (isolated reviewer); R1 removido, R2 mantido — ADR-002'), 'tree', taskExit, now);
  assert.equal(approved.steps.implementation.commit.approvedBy, 'Ana');
  const ok = recordTaskReview(readyForCommit(), 'ok', now);
  assert.equal(approveCommit(ok, 'Ana', inReview(), 'tree', taskExit, now).steps.implementation.commit.task, 'T1');
});

test('checklists: next lists the reviewer checklists the design asks for', () => {
  const design = (trigger, concerns) => designDoc().replace('Trigger: new dependency', `Trigger: ${trigger}`)
    .replace('Security: token on the server.', concerns);
  assert.deepEqual(reviewChecklists(design('contract — a API muda o formato', 'Security: token no header · Privacy: not applicable')),
    ['checklists/contract.md', 'checklists/security.md']);
  assert.deepEqual(reviewChecklists(design('data/migration — coluna nova', 'Security: not applicable')), ['checklists/data.md']);
  assert.deepEqual(reviewChecklists(design('trade-off — cache', 'Security: não se aplica\nMigration/rollback: script de volta da coluna')), ['checklists/data.md']);
  assert.deepEqual(reviewChecklists(design('trade-off — cache', 'Security: <or "not applicable"> · Privacy: · Migration/rollback: Not applicable.')), []);
  assert.deepEqual(reviewChecklists(null), []);
  const state = startTask(implementationState(), 'T1', tasks, git, now);
  const withDesign = { ...docs, 'design.md': design('contract — a API muda', 'Security: token no header') };
  assert.deepEqual(taskView(state, tasks, 'tree', taskExit, withDesign['design.md']).task.checklists, ['checklists/contract.md', 'checklists/security.md']);
  assert.deepEqual(taskView(state, tasks, 'tree', taskExit, null).task.checklists, []);
});
