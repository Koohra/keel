// Rules of the closing phase: convergence per rule, architecture against the story's base and
// product.md/ADR deltas. Pure functions over state.json and the documents; gatherClosing at the
// end reads git and disk for keel-state.mjs, the only writer of state.json.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isSourcePath, parseBaseline, runCheck } from './arch-check.mjs';
import { parseRules, parseTasks, sections, tableRows } from './validate-feature.mjs';
import { doneHash, testName } from './task-loop.mjs';
import { commitInHistory, gitOutput, gitPaths } from './git.mjs';

const CONVERGENCE = 'Convergence (filled at the end, checked by script)';
const HEADER = ['| Rule | Evidence | Outcome |', '|---|---|---|'];

const evidenceOf = (task) => `${task.id} ${task.tested ? `\`${testName(task)}\`` : 'no test'} (${doneHash(task) ?? 'not done'})`;

function commitProblem(task, isCommit) {
  const hash = doneHash(task);
  if (!hash) return `${task.id} is not done with a commit`;
  return isCommit(hash) ? null : `${task.id}: ${hash} is not a commit in this branch's history`;
}

function row(id, covering, problems) {
  const outcome = problems.length ? `missing — ${problems.join('; ')}` : 'met';
  return { rule: id, evidence: covering.map(evidenceOf).join('; '), outcome };
}

// One row per R# (per task in the trivial level, whose criterion lives in Covers:) with the tasks
// that cover it. Met only when every covering task has a real commit and every AC is cited by a task.
// isCommit(hash) comes from the edge.
export function convergenceRows(docs, isCommit) {
  const tasks = parseTasks(docs['tasks.md'] ?? '');
  if (docs['requirements.md'] == null) return tasks.map((t) => row(t.id, [t], [commitProblem(t, isCommit)].filter(Boolean)));
  return parseRules(docs['requirements.md']).map((rule) => {
    const covering = tasks.filter((t) => t.covers.includes(rule.id));
    const cited = new Set(covering.flatMap((t) => t.fields.Covers.match(/\bAC-\d+\.\d+\b/g) ?? []));
    const problems = [
      ...covering.map((t) => commitProblem(t, isCommit)).filter(Boolean),
      ...rule.acs.filter((ac) => !cited.has(ac.id)).map((ac) => `${ac.id} is not covered by any task`),
    ];
    if (!covering.some((t) => t.tested)) problems.push('no task with a test');
    return row(rule.id, covering, problems);
  });
}

export function convergenceLines(rows) {
  return [...HEADER, ...rows.map((r) => `| ${r.rule} | ${r.evidence} | ${r.outcome} |`)];
}

// Rows of the Convergence table in tasks.md, as the model copied them.
function tableInTasks(tasksText) {
  const body = sections(tasksText ?? '').find((s) => s.title === CONVERGENCE)?.body ?? '';
  return tableRows(body).map(([rule = '', evidence = '', outcome = '']) => ({ rule, evidence, outcome }));
}

const closingOf = (state) => ({ convergence: null, arch: null, deltas: null, deltasApproved: null, ...state.steps.closing });

// Facts gathered at the edge go into state.json; the same object comes back when nothing changed.
export function recordClosing(state, facts, now) {
  const closing = closingOf(state);
  const next = { ...closing, convergence: facts.convergence, arch: facts.arch, deltas: facts.deltas };
  if (JSON.stringify(next) === JSON.stringify(closing)) return state;
  return { ...state, steps: { ...state.steps, closing: next }, updatedAt: now };
}

const result = (reason) => (reason ? { met: false, reason } : { met: true });

export function convergenceResult(state, docs) {
  const rows = closingOf(state).convergence;
  if (!Array.isArray(rows)) return result('convergence not computed: run next in the closing phase');
  const missing = rows.filter((r) => r.outcome !== 'met');
  if (missing.length) return result(`${missing.map((r) => `${r.rule} ${r.outcome}`).join('; ')}: add a task for each missing rule to tasks.md`);
  const table = JSON.stringify(tableInTasks(docs['tasks.md']));
  return result(table === JSON.stringify(rows) ? null : 'the Convergence table in tasks.md differs from the script: copy closing.convergence from next');
}

// Source files the story created: added lines of git diff --name-status -M (a rename is not new;
// a copy is) plus untracked paths, outside keel/.
export function createdSources(nameStatus, untracked = []) {
  const added = nameStatus.map((line) => line.split('\t')).filter(([status]) => /^[AC]/.test(status)).map((parts) => parts.at(-1));
  return [...new Set([...added, ...untracked])].filter((path) => !path.startsWith('keel/') && isSourcePath(path)).sort();
}

// Keys in the baseline now that were not there at the story base.
export function baselineGrowth(before, after) {
  return [...after].filter((key) => !before.has(key)).sort();
}

export function archResult(state) {
  const arch = closingOf(state).arch;
  if (!arch) return result('architecture not checked: run next in the closing phase');
  const created = arch.created ?? [];
  if (created.length && (arch.status === 'skipped' || arch.noActive)) {
    return result(`the story created source code (${created.join(', ')}) and keel/architecture.json has no active component: declare the components in keel/architecture.json and their rungs in "Rungs per module" of keel/product.md, and show the delta to the dev; "Architecture: não se aplica" does not cover new code`);
  }
  if (arch.status === 'skipped' && !arch.waived) {
    return result('keel/architecture.json does not exist and the "### Checks" of keel/product.md does not say "Architecture: não se aplica": run the setup skill to declare the rules, or ask the dev to declare the waiver');
  }
  const grown = arch.grown.length ? [`the baseline grew since the story base: ${arch.grown.join(', ')}; fix the violation instead of adding it to the baseline`] : [];
  const orphans = (arch.orphans ?? []).length
    ? [`orphan file(s) outside every component: ${arch.orphans.map((o) => o.split(' is covered by ')[0]).join(', ')}; propose to the dev the delta of keel/architecture.json (the component) and of "Rungs per module" in keel/product.md (its rung), or a task to move the file`]
    : [];
  return result([...arch.violations, ...grown, ...orphans].join('; '));
}

// The dev's approval of the product.md/ADR/architecture.json delta, tied to the content it saw.
export function approveDeltas(state, by, now) {
  if (!by) throw new Error('say who approved with --by <dev>');
  if (state.phase !== 'closing') throw new Error(`approve deltas only in phase closing; the story is in ${state.phase}`);
  const { deltas } = closingOf(state);
  if (!deltas?.files.length) throw new Error('no product.md, ADR or architecture.json delta to approve: keel/product.md, keel/adrs/ and keel/architecture.json did not change since the story base');
  const closing = { ...closingOf(state), deltasApproved: { by, at: now, hash: deltas.hash } };
  return { ...state, steps: { ...state.steps, closing }, updatedAt: now };
}

// Applies only when keel/product.md, keel/adrs/ or keel/architecture.json changed since the story base.
export function deltasResult(state) {
  const { deltas, deltasApproved } = closingOf(state);
  if (!deltas) return result('deltas not computed: run next in the closing phase');
  if (deltas.error) return result(deltas.error);
  if (!deltas.files.length) return result(null);
  if (!deltasApproved) return result(`${deltas.files.join(', ')} changed: show the delta (added, modified, removed) to the dev and run approve deltas --by <dev> only with the dev's word`);
  return result(deltasApproved.hash === deltas.hash ? null : `${deltas.files.join(', ')} changed after the approval: show the delta again and ask the dev`);
}

// "Architecture: não se aplica" (or "not applicable") in the "### Checks" of product.md: the dev's waiver.
export function architectureWaived(productText) {
  const checks = (productText ?? '').replace(/\r\n/g, '\n').match(/^### Checks\n([\s\S]*?)(?=^#{1,6} |(?![\s\S]))/m)?.[1] ?? '';
  return /(^|·)\s*Architecture:\s*(não se aplica|not applicable)\b/im.test(checks);
}

function headingSections(text) {
  const result = new Map();
  let current = null;
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const heading = line.match(/^#{2,3} (.+)$/)?.[1].trim();
    if (heading) result.set((current = heading), []);
    else if (current) result.get(current).push(line);
  }
  return new Map([...result].map(([k, v]) => [k, v.join('\n').trim()]));
}

// Delta of one file against the story base, as OpenSpec's ADDED/MODIFIED/REMOVED: an ADR or
// keel/architecture.json as a whole file, product.md by "##"/"###" section. before/after are null when the file does not exist.
export function sectionDelta(file, before, after) {
  const delta = { added: [], modified: [], removed: [] };
  if (file !== 'keel/product.md' || before == null || after == null) {
    const kind = before == null ? 'added' : after == null ? 'removed' : before === after ? null : 'modified';
    if (kind) delta[kind].push(file);
    return delta;
  }
  const old = headingSections(before);
  const now = headingSections(after);
  for (const [title, body] of now) {
    if (!old.has(title)) delta.added.push(`${file}#${title}`);
    else if (old.get(title) !== body) delta.modified.push(`${file}#${title}`);
  }
  for (const title of old.keys()) if (!now.has(title)) delta.removed.push(`${file}#${title}`);
  return delta;
}

// What next shows in the closing phase.
export function closingView(state) {
  const closing = closingOf(state);
  return { convergence: convergenceLines(closing.convergence ?? []), arch: closing.arch, deltas: closing.deltas };
}

// --- Edge: git ---

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

const git = gitOutput;
const NO_BASE = 'story base not found: no task commit of the Progress is in this branch\'s history (rewritten or squashed?); fix the Status: done (<hash>) lines';

// Commit before the story's code: the merge-base with the base branch given at init, as a pull
// request diff (three-dot); without it, the parent of the oldest task commit reachable from HEAD;
// HEAD while no task is done; null when tasks are done but none of their commits is in the history.
export function storyBase(root, docs, inHistory, baseBranch = null) {
  const mergeBase = baseBranch && git(root, ['merge-base', baseBranch, 'HEAD'])?.trim();
  if (mergeBase) return mergeBase;
  const done = parseTasks(docs['tasks.md'] ?? '').map(doneHash).filter(Boolean);
  const commits = new Set(done.map(inHistory).filter(Boolean));
  const history = (git(root, ['rev-list', '--reverse', 'HEAD']) ?? '').split('\n').filter(Boolean);
  if (!history.length) return EMPTY_TREE;
  if (!done.length) return history.at(-1);
  const first = history.find((full) => commits.has(full));
  if (!first) return null;
  return git(root, ['rev-parse', '--verify', '-q', `${first}^`])?.trim() || EMPTY_TREE;
}

function createdSince(root, base) {
  const tokens = gitPaths(root, ['diff', '--name-status', '-M', '-z', base]);
  const nameStatus = [];
  for (let i = 0; i < tokens.length;) {
    const size = /^[RC]/.test(tokens[i]) ? 3 : 2; // a rename or copy carries the old and the new path
    nameStatus.push(tokens.slice(i, i + size).join('\t'));
    i += size;
  }
  return createdSources(nameStatus, gitPaths(root, ['ls-files', '--others', '--exclude-standard', '-z']));
}

function checkArch(root, base) {
  if (base == null) return { status: 'fail', violations: [NO_BASE], grown: [] };
  const created = createdSince(root, base);
  let check;
  try {
    check = runCheck(root);
  } catch (error) {
    return { status: 'fail', violations: [`arch-check could not run: ${error.message}`], grown: [] };
  }
  if (check.status === 'skipped') {
    const product = join(root, 'keel', 'product.md');
    const waived = architectureWaived(existsSync(product) ? readFileSync(product, 'utf8') : '');
    return { status: 'skipped', waived, violations: [], grown: [], created };
  }
  const file = join(root, ...check.baselinePath.split('/'));
  const now = existsSync(file) ? parseBaseline(readFileSync(file, 'utf8')) : new Set();
  const before = parseBaseline(git(root, ['show', `${base}:${check.baselinePath}`]) ?? '');
  const violations = check.violations.map((v) => v.message);
  const orphans = check.orphans.map((o) => o.message);
  const grown = baselineGrowth(before, now);
  const failed = violations.length || grown.length || orphans.length;
  return { status: failed ? 'fail' : 'ok', violations, grown, orphans, created, noActive: !check.active.length };
}

const PROJECT_DOCS = ['keel/product.md', 'keel/adrs', 'keel/architecture.json'];

// Files of keel/product.md, keel/adrs/ and keel/architecture.json that differ from the base, and the hash of their content.
function projectDeltas(root, base) {
  if (base == null) return { files: [], sections: null, hash: null, error: NO_BASE };
  const changed = gitPaths(root, ['diff', '--name-only', '-z', base, '--', ...PROJECT_DOCS]);
  const added = gitPaths(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...PROJECT_DOCS]);
  const files = [...new Set([...changed, ...added])].sort();
  const hash = createHash('sha256');
  const sections = { added: [], modified: [], removed: [] };
  for (const file of files) {
    const path = join(root, ...file.split('/'));
    const after = existsSync(path) ? readFileSync(path, 'utf8') : null;
    hash.update(`\0${file}\0`).update(after ?? '<deleted>');
    const delta = sectionDelta(file, git(root, ['show', `${base}:${file}`]), after);
    for (const kind of Object.keys(sections)) sections[kind].push(...delta[kind]);
  }
  return { files, sections, hash: hash.digest('hex') };
}

export function gatherClosing(root, docs, state) {
  const inHistory = (hash) => commitInHistory(root, hash);
  const base = storyBase(root, docs, inHistory, state?.story?.base);
  return { convergence: convergenceRows(docs, inHistory), arch: checkArch(root, base), deltas: projectDeltas(root, base) };
}
