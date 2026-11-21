// Rules of the task loop in the implementation phase: open a task, record RED and GREEN,
// and say what is missing from the phase's taskExit. Pure functions over state.json and
// tasks.md; running commands, git and disk stay in keel-state.mjs, the only writer of state.json.
import { globToRegExp } from './arch-check.mjs';
import { parseTasks } from './validate-feature.mjs';

const TASK_RECORDS = { red: null, green: null, checks: null, review: null, commit: null };

// state.json written before part 5 has only currentTask and blocked.
function implementation(state) {
  return { currentTask: null, blocked: null, ...TASK_RECORDS, ...state.steps.implementation };
}

function withImplementation(state, changes, now) {
  return { ...state, steps: { ...state.steps, implementation: { ...implementation(state), ...changes } }, updatedAt: now };
}

function findTask(tasksText, id) {
  const task = parseTasks(tasksText ?? '').find((t) => t.id === id);
  if (!task) throw new Error(`${id} does not exist in tasks.md`);
  return task;
}

function requireImplementation(state, action) {
  if (state.phase !== 'implementation') throw new Error(`${action} only in phase implementation; the story is in ${state.phase}`);
}

function openTask(state, tasksText, action) {
  requireImplementation(state, action);
  const id = implementation(state).currentTask;
  if (!id) throw new Error(`no open task: run task start <T#> before ${action}`);
  return findTask(tasksText, id);
}

const doneHash = (task) => task?.progress?.Status?.match(/^done \(([0-9a-f]{7,40})\)$/)?.[1] ?? null;
// A task counts as done only with the hash of its commit; plain "done" is not enough.
const isDone = (task) => doneHash(task) !== null;

// git: { isCommit(hash) } from the edge. The open task closes only with "Status: done (<hash>)" of a real commit.
export function startTask(state, id, tasksText, git, now) {
  requireImplementation(state, 'task start');
  const task = findTask(tasksText, id);
  const current = implementation(state).currentTask;
  if (current && current !== id) {
    const hash = doneHash(findTask(tasksText, current));
    if (!hash) throw new Error(`${current} is open: commit it and mark "Status: done (<commit hash>)" in Progress before task start ${id}`);
    if (implementation(state).commit?.task !== current) throw new Error(`${current} has no approved commit: finish it (evidence, checks, review, approve commit) before task start ${id}`);
    if (!git.isCommit(hash)) throw new Error(`${current}: ${hash} is not a commit in this repository; use the hash of the task's commit`);
  }
  if (isDone(task)) throw new Error(`${id} is already done`);
  const byId = new Map(parseTasks(tasksText).map((t) => [t.id, t]));
  for (const dep of task.deps) if (!isDone(byId.get(dep))) throw new Error(`${id} depends on ${dep}, which is not done`);
  return withImplementation(state, { currentTask: id, blocked: null, ...TASK_RECORDS }, now);
}

const WRONG_REASON = /ERR_MODULE_NOT_FOUND|Cannot find module|^SyntaxError: |^\s*SyntaxError \[|SyntaxError: (The requested module|Unexpected|Invalid or unexpected|Cannot use import)/m;
const OUTPUT_LINES = 20;
const tail = (run) => ({ ...run, output: run.output.split('\n').slice(-OUTPUT_LINES).join('\n') });
const noTest = (task) => 'No test' in task.fields;

// Command in backticks of the task's Verification:, the one approved with the plan.
export function evidenceCommand(state, kind, tasksText) {
  if (!['red', 'green'].includes(kind)) throw new Error(`unknown evidence "${kind}"; use red or green`);
  const task = openTask(state, tasksText, `evidence ${kind}`);
  if (noTest(task)) throw new Error(`${task.id} has No test: it has no RED; its evidence is the project checks (run checks)`);
  if (kind === 'green' && !implementation(state).red) throw new Error(`${task.id} has no RED evidence yet: run evidence red first`);
  const command = task.fields.Verification?.match(/`([^`]+)`/)?.[1];
  if (!command) throw new Error(`${task.id} has no command in Verification:`);
  return command;
}

// run: { command, exitCode, output } of the Verification command, run by the edge.
export function recordEvidence(state, kind, run, tasksText, now) {
  const { id } = openTask(state, tasksText, `evidence ${kind}`);
  evidenceCommand(state, kind, tasksText);
  if (kind === 'red' && run.exitCode === 0) {
    throw new Error(`${id}: the test must fail before the code: ${run.command} exited with 0. Write a test that fails for the missing behavior`);
  }
  if (kind === 'red' && WRONG_REASON.test(run.output)) {
    throw new Error(`${id}: the test failed for the wrong reason (import or syntax error, not an assertion):\n${tail(run).output}\nCreate the module or export the test needs, empty, so the test fails on an assertion`);
  }
  if (kind === 'green' && run.exitCode !== 0) throw new Error(`${id}: GREEN needs exit 0: ${run.command} exited with ${run.exitCode}\n${tail(run).output}`);
  // A new RED makes the previous GREEN stale.
  const reset = kind === 'red' ? { green: null } : {};
  return withImplementation(state, { ...reset, [kind]: { ...tail(run), at: now }, blocked: null }, now);
}

// "### Checks" of keel/product.md: "Architecture: `<cmd>` · Lint/complexity: não se aplica · Tests: `<cmd>`".
// An item without a command in backticks does not apply and is not run.
export function checkCommands(productText) {
  const body = productText.replace(/\r\n/g, '\n').match(/^### Checks\n([\s\S]*?)(?=^#{1,6} |(?![\s\S]))/m)?.[1] ?? '';
  const commands = body.split(/\s·\s|\n/).flatMap((item) => {
    const name = item.match(/^\s*([^:`]+?)\s*:/)?.[1];
    return name ? [...item.matchAll(/`([^`]+)`/g)].map(([, command]) => ({ name, command })) : [];
  });
  if (!commands.length) throw new Error('no command in backticks under "### Checks" of keel/product.md: declare the project checks there (for example Tests: `npm test`)');
  return commands;
}

// runs: [{ name, command, exitCode, output }]; fingerprint: of the code when they ran (see codeFingerprint).
export function recordChecks(state, runs, fingerprint, now) {
  requireImplementation(state, 'checks');
  const passed = runs.every((r) => r.exitCode === 0);
  return withImplementation(state, { checks: { passed, fingerprint, at: now, results: runs.map(tail) }, blocked: null }, now);
}

export function failedChecks(checks) {
  return checks.results.filter((r) => r.exitCode !== 0).map((r) => `${r.name} (${r.command}) exited with ${r.exitCode}`);
}

function checksReason(impl, fingerprint) {
  if (!impl.checks) return 'project checks have not run: run checks';
  if (!impl.checks.passed) return `project checks failed: ${failedChecks(impl.checks).join('; ')}`;
  return impl.checks.fingerprint === fingerprint ? null : 'code changed after the checks: run checks again';
}

function commitReason(impl, fingerprint) {
  if (!impl.commit) return `the dev has not approved the commit of ${impl.currentTask}: show the diff, evidence and review, and run approve commit --by <dev> only with the dev's word`;
  return impl.commit.fingerprint === fingerprint ? null : 'code changed after the dev approved the commit: show the new diff and ask the dev again';
}

const has = (met, reason) => (met ? null : reason);

const TASK_CRITERIA = {
  'evidence:red': (impl, task) => noTest(task) || has(impl.red, `${impl.currentTask} has no RED evidence: write the test and run evidence red`),
  'evidence:green': (impl, task) => noTest(task) || has(impl.green, `${impl.currentTask} has no GREEN evidence: make the test pass and run evidence green`),
  'checks:passed': (impl, task, fingerprint) => checksReason(impl, fingerprint),
  'review:task': (impl) => has(impl.review, `${impl.currentTask} has no isolated review: run review task --result <ok|findings|unavailable>`),
  'approval:commit': (impl, task, fingerprint) => commitReason(impl, fingerprint),
};

// What the open task still lacks from the phase's taskExit, in order.
export function taskMissing(state, tasksText, fingerprint, taskExit) {
  const impl = implementation(state);
  const task = findTask(tasksText, impl.currentTask);
  return taskExit.map((criterion) => {
    const check = TASK_CRITERIA[criterion];
    const reason = check ? check(impl, task, fingerprint) : `unknown criterion: ${criterion}`;
    return typeof reason === 'string' && { criterion, reason };
  }).filter(Boolean);
}

// First task not done whose dependencies are done.
export function nextTask(tasksText) {
  const tasks = parseTasks(tasksText ?? '');
  const ids = new Set(tasks.filter(isDone).map((t) => t.id));
  return tasks.find((t) => !isDone(t) && t.deps.every((d) => ids.has(d)))?.id ?? null;
}

// Task view of next: the open task and what it lacks, or the task to open.
export function taskView(state, tasksText, fingerprint, taskExit) {
  const id = implementation(state).currentTask;
  if (!id || isDone(findTask(tasksText, id))) return { task: null, nextTask: nextTask(tasksText) };
  return { task: { id, missing: taskMissing(state, tasksText, fingerprint, taskExit) }, nextTask: null };
}

const REVIEW_RESULTS = ['ok', 'findings', 'unavailable'];

export function recordTaskReview(state, result, now) {
  if (!REVIEW_RESULTS.includes(result)) throw new Error(`invalid result "${result}"; use ${REVIEW_RESULTS.join(', ')}`);
  requireImplementation(state, 'review task');
  const { currentTask } = implementation(state);
  if (!currentTask) throw new Error('no open task: run task start <T#> before review task');
  return withImplementation(state, { review: { task: currentTask, result, at: now }, blocked: null }, now);
}

// The dev's approval of the commit, tied to the code it saw (fingerprint).
export function approveCommit(state, by, tasksText, fingerprint, taskExit, now) {
  if (!by) throw new Error('say who approved with --by <dev>');
  const { id } = openTask(state, tasksText, 'approve commit');
  const missing = taskMissing(state, tasksText, fingerprint, taskExit).filter((m) => m.criterion !== 'approval:commit');
  if (missing.length) throw new Error(`cannot approve the commit of ${id}: ${missing.map((m) => `${m.criterion} (${m.reason})`).join('; ')}`);
  return withImplementation(state, { commit: { task: id, approvedBy: by, at: now, fingerprint } }, now);
}

const COMMITTING = new Set(['commit', 'merge', 'cherry-pick', 'revert', 'am']);
const OPTION_WITH_VALUE = new Set(['-c', '-C', '--git-dir', '--work-tree', '--namespace', '--exec-path']);

// Does the command line create a commit? Looks at every "git" word (also inside bash -c "...",
// $(...), subshells, after VAR=value or command/env), skips git's own options and checks the
// subcommand. Erring towards "yes" only costs a hook message in the implementation phase.
export function isGitCommit(command) {
  const words = command.split(/[\s;&|()`"'{}$<>]+/).filter(Boolean);
  return words.some((word, index) => {
    if (!/^git(\.exe)?$/i.test(word.split(/[\\/]/).pop())) return false;
    let i = index + 1;
    while (words[i]?.startsWith('-')) i += OPTION_WITH_VALUE.has(words[i]) ? 2 : 1;
    return COMMITTING.has(words[i]);
  });
}

// PreToolUse decision on git commit: in implementation, only the approved commit of the open task.
export function checkGitCommit(state, tasksText, fingerprint) {
  if (state.phase !== 'implementation') return { block: false };
  const impl = implementation(state);
  const reason = impl.currentTask
    ? commitReason(impl, fingerprint)
    : 'no open task in the implementation; commits here are task commits approved by the dev (task start, then approve commit)';
  return reason ? { block: true, reason: `Keel: ${reason}` } : { block: false };
}

// A stop the dev must hear about (question, out-of-scope failure, pending decision) lets the turn end.
export function blockTask(state, reason, now) {
  if (!reason?.trim()) throw new Error('say why with --reason "<reason>"');
  requireImplementation(state, 'block');
  return withImplementation(state, { blocked: reason.trim() }, now);
}

const STOP_ORDER = ['evidence:red', 'evidence:green', 'checks:passed', 'review:task'];

// Stop hook decision: an open, unblocked task ends the turn only with RED, GREEN, passing checks
// and review, that is, ready for the dev to approve the commit. Stale checks are run by the hook.
export function checkStop(state, tasksText, fingerprint) {
  const impl = implementation(state);
  if (state.phase !== 'implementation' || !impl.currentTask || impl.blocked) return { action: 'allow' };
  // Approved commit: waiting for the commit itself or for Status: done (<hash>); the checks already passed.
  if (impl.commit?.task === impl.currentTask || isDone(findTask(tasksText, impl.currentTask))) return { action: 'allow' };
  const missing = taskMissing(state, tasksText, fingerprint, STOP_ORDER)[0];
  if (!missing) return { action: 'allow' };
  if (missing.criterion === 'checks:passed' && impl.checks?.fingerprint !== fingerprint) return { action: 'run-checks' };
  return {
    action: 'block',
    reason: `Keel: ${missing.reason}. If you must stop for the dev (question, failure outside the task, decision), record it with keel-state.mjs block --reason "<reason>".`,
  };
}

// Paths or globs in backticks of the task's Files:.
export function taskFiles(tasksText, id) {
  return [...(findTask(tasksText, id).fields.Files ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

export function isOutsideTask(path, patterns) {
  return !patterns.some((pattern) => globToRegExp(pattern).test(path));
}
