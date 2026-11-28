import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, readJson } from './helpers.mjs';
import { requirementsDoc, tasksDoc, designDoc } from './fixtures.mjs';
import {
  newState, nextStep, advance, approve, setLevel, recordReview, recordGenerated,
  approvalHash, reconcile, evaluate,
} from '../scripts/keel-state.mjs';

const workflow = readJson('workflow/workflow.json');
const now = '2026-11-20T12:00:00Z';
const story = { key: 'APP-1', slug: 'login', title: 'Login', branch: 'feat/APP-1-login' };

function docsFor(level) {
  return {
    'requirements.md': requirementsDoc(),
    'tasks.md': tasksDoc(),
    'design.md': level === 'with-design' ? designDoc() : null,
  };
}

// Takes a new story to the requested phase along the valid path.
function walkTo(target, level = 'standard', docs = docsFor(level)) {
  let state = setLevel(newState({ ...story, now }), level, 'Ana', now);
  const steps = {
    triage: () => {},
    reading: () => { state = recordGenerated(state, 'repo-map', now); },
    confirmation: () => {
      state = recordReview(state, 'requirements', 'ok', now);
      state = approve(state, 'requirements.md', 'Ana', docs, workflow, now);
    },
    tasks: () => {
      state = approve(state, 'tasks.md', 'Ana', docs, workflow, now);
      if (level === 'with-design') state = approve(state, 'design.md', 'Ana', docs, workflow, now);
    },
  };
  while (state.phase !== target) {
    steps[state.phase]?.();
    state = advance(state, workflow, docs, now).state;
  }
  return state;
}

test('a new story starts in triage and next says what is missing', () => {
  const state = newState({ ...story, now });
  assert.equal(state.story.folder, 'keel/features/APP-1-login');
  const next = nextStep(state, workflow, docsFor('standard'));
  assert.equal(next.phase, 'triage');
  assert.equal(next.instructions, 'phases/triage.md');
  assert.deepEqual(next.missing.map((m) => m.criterion), ['approval:level']);
});

test('advance refuses without changing state when a criterion is missing', () => {
  const state = newState({ ...story, now });
  const result = advance(state, workflow, docsFor('standard'), now);
  assert.equal(result.state, undefined);
  assert.deepEqual(result.missing.map((m) => m.criterion), ['approval:level']);
  assert.equal(state.phase, 'triage');
});

test('an open question blocks leaving requirements', () => {
  const docs = docsFor('standard');
  docs['requirements.md'] = docs['requirements.md'].replace('- Nenhuma pergunta.', [
    '- [QUESTION] qual escopo?', '- [QUESTION] qual porta?', '- [QUESTION] qual pasta?',
    '- [ASSUMPTION] a pasta é criada', '- [ASSUMPTION] o caminho é relativo',
    '- [ASSUMPTION] UTF-8 — accepted by Ana on 2026-11-22.',
  ].join('\n'));
  const state = walkTo('requirements', 'standard', docs);
  const result = advance(state, workflow, docs, now);
  assert.deepEqual(result.missing.map((m) => m.criterion), ['noOpenQuestions']);
  const { reason } = result.missing[0];
  assert.match(reason, /^3 open \[QUESTION\]\(s\) in requirements\.md/);
  assert.match(reason, /2 \[ASSUMPTION\]\(s\) awaiting the dev's acceptance.*do not block/);
});

test('standard level skips design and reaches closing; closing refuses until the closing facts are recorded', () => {
  const impl = walkTo('implementation');
  assert.equal(impl.steps.requirements.approvedBy, 'Ana');
  assert.equal(impl.steps.requirements.hash, approvalHash(requirementsDoc()));
  assert.equal(impl.steps.design.approved, false);
  const docs = docsFor('standard');
  assert.deepEqual(advance(impl, workflow, docs, now).missing.map((m) => m.criterion), ['tasks:all-done']);
  docs['tasks.md'] = docs['tasks.md'].replaceAll('Status: pending', 'Status: done (abc1234)');
  const closing = advance(impl, workflow, docs, now).state;
  assert.equal(closing.phase, 'closing');
  const refused = advance(closing, workflow, docs, now);
  assert.equal(refused.missing[0].criterion, 'convergence:all-rules');
  assert.match(refused.missing[0].reason, /convergence not computed: run next/);
});

test('with-design level goes through design and requires approving design.md', () => {
  const docs = docsFor('with-design');
  const state = walkTo('design', 'with-design', docs);
  const inTasks = advance(state, workflow, docs, now).state;
  assert.equal(inTasks.phase, 'tasks');
  const onlyTasks = approve(inTasks, 'tasks.md', 'Ana', docs, workflow, now);
  assert.deepEqual(advance(onlyTasks, workflow, docs, now).missing.map((m) => m.criterion), ['approval:design.md?']);
});

test('trivial level skips requirements, confirmation and design; tasks carry the criterion in Covers:', () => {
  const tasks = tasksDoc().replace(/^Covers: .*$/gm, 'Covers: GIVEN deslogado WHEN clica THEN vê o consentimento');
  const docs = { 'requirements.md': null, 'design.md': null, 'tasks.md': tasks };
  const state = walkTo('tasks', 'trivial', docs);
  assert.equal(state.steps.requirements.approved, false);
  const approved = approve(state, 'tasks.md', 'Ana', docs, workflow, now);
  assert.equal(advance(approved, workflow, docs, now).state.phase, 'implementation');
});

test('approve uses the cross-checks: design citing a missing rule or task structure outside the design (AC-6.1)', () => {
  const docs = docsFor('with-design');
  const state = walkTo('tasks', 'with-design', docs);
  const badDesign = { ...docs, 'design.md': docs['design.md'].replace('(R1)', '(R1, R9)') };
  assert.throws(() => approve(state, 'design.md', 'Ana', badDesign, workflow, now), /R9, which does not exist/);
  const badTasks = { ...docs, 'tasks.md': docs['tasks.md'].replace('Files: `src/login.js`\nNew structure: none', 'Files: `src/login.js`\nNew structure: Cache (module)') };
  assert.throws(() => approve(state, 'tasks.md', 'Ana', badTasks, workflow, now), /Cache" is not justified in design\.md/);
  assert.match(evaluate('valid:design.md', { state, docs: badDesign }).reason, /R9/);
});

test('approve only in the gate phase and with a valid document', () => {
  const docs = docsFor('standard');
  const inRequirements = walkTo('requirements');
  assert.throws(() => approve(inRequirements, 'requirements.md', 'Ana', docs, workflow, now), /gate of requirements\.md belongs to phase confirmation/);
  const inConfirmation = walkTo('confirmation');
  const invalid = { ...docs, 'requirements.md': docs['requirements.md'].replace('## Goal', '## Aim') };
  assert.throws(() => approve(inConfirmation, 'requirements.md', 'Ana', invalid, workflow, now), /missing section "Goal"/);
  assert.throws(() => approve(inConfirmation, 'requirements.md', '', docs, workflow, now), /--by/);
});

test('level and generated only in the right phase and with a known value', () => {
  const state = newState({ ...story, now });
  assert.throws(() => setLevel(state, 'large', 'Ana', now), /trivial, standard, with-design/);
  assert.throws(() => setLevel(walkTo('reading'), 'trivial', 'Ana', now), /only in phase triage/);
  assert.throws(() => recordGenerated(state, 'repo-map', now), /only in phase reading/);
});

test('an expired approval sends the story back to the gate phase', () => {
  const docs = docsFor('standard');
  const state = walkTo('implementation', 'standard', docs);
  const changed = { ...docs, 'requirements.md': docs['requirements.md'].replace('mostrar aviso', 'mostrar banner') };
  const { state: back, expired } = reconcile(state, workflow, changed);
  assert.deepEqual(expired, ['requirements.md']);
  assert.equal(back.phase, 'confirmation');
  assert.equal(back.steps.requirements.approved, false);
  assert.equal(back.steps.tasks.approved, true);
  assert.deepEqual(nextStep(state, workflow, changed).expired, ['requirements.md']);
});

test('only the frozen block counts for the hash: progress, notes and CRLF do not expire the approval', () => {
  const docs = docsFor('standard');
  const state = walkTo('implementation', 'standard', docs);
  const progressed = docs['tasks.md']
    .replace('Status: pending', 'Status: done (abc1234)')
    .replace('RED evidence: —', 'RED evidence: `npm test` falhou')
    .replace('Approved by Ana on 2026-11-20', 'Approved by Bia on 2026-11-21')
    .replace('- Nenhuma.\n\n## Conv', '- Aprendi algo.\n\n## Conv')
    .replace('|---|---|---|\n', '|---|---|---|\n| R1 | T1 | met |\n')
    .replaceAll('\n', '\r\n');
  const { expired } = reconcile(state, workflow, { ...docs, 'tasks.md': progressed });
  assert.deepEqual(expired, []);
  assert.notEqual(approvalHash(docs['tasks.md']), approvalHash(docs['tasks.md'].replace('T2 — Sessão', 'T2 — Logout')));
  const confirmed = docs['requirements.md'].replace('Status: draft', 'Status: confirmed by Ana on 2026-11-20');
  assert.equal(approvalHash(confirmed), approvalHash(docs['requirements.md']));
});

test('a phase written by hand without the gates goes back to the first missing gate', () => {
  const docs = docsFor('standard');
  const forged = { ...newState({ ...story, now }), phase: 'implementation' };
  assert.equal(reconcile(forged, workflow, docs).state.phase, 'triage');
  const leveled = { ...setLevel(newState({ ...story, now }), 'standard', 'Ana', now), phase: 'implementation' };
  const { state } = reconcile({ ...leveled, steps: { ...leveled.steps, reading: { repoMap: true } } }, workflow, docs);
  assert.equal(state.phase, 'confirmation');
  assert.equal(reconcile(walkTo('implementation', 'standard', docs), workflow, docs).state.phase, 'implementation');
});

test('every workflow.json criterion has a checker or a declared future part', () => {
  const ctx = { state: newState({ ...story, now }), docs: docsFor('standard') };
  for (const phase of workflow.phases) {
    for (const criterion of phase.exit ?? []) {
      const result = evaluate(criterion, ctx);
      assert.ok(!/unknown criterion/.test(result.reason ?? ''), `${phase.id}: ${criterion}`);
    }
  }
  assert.match(evaluate('foo:bar', ctx).reason, /unknown criterion/);
});

test('CLI writes state.json and refuses to advance with code 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-state-'));
  try {
    const run = (...args) => spawnSync(process.execPath, [join(root, 'scripts', 'keel-state.mjs'), ...args], { cwd: dir, encoding: 'utf8' });
    mkdirSync(join(dir, '.git'));
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/feat/APP-1-login\n');
    assert.equal(run('init', '--key', 'APP-1', '--slug', 'login', '--title', 'Login').status, 0);
    const file = join(dir, 'keel', 'features', 'APP-1-login', 'state.json');
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).story.branch, 'feat/APP-1-login');
    const refused = run('advance');
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /approval:level/);
    assert.equal(run('level', 'standard', '--by', 'Ana').status, 0);
    const moved = run('advance', '--story', 'keel/features/APP-1-login');
    assert.equal(moved.status, 0, moved.stderr);
    assert.equal(JSON.parse(run('next').stdout).phase, 'reading');
    assert.equal(run('frobnicate').status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A story in triage in a temporary folder with a fake .git, driven through the CLI.
function triageRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), 'keel-triage-'));
  const write = (path, text) => {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  write('.git/HEAD', 'ref: refs/heads/feat/APP-1-login\n');
  for (const [path, text] of Object.entries(files)) write(path, text);
  const run = (...args) => spawnSync(process.execPath, [join(root, 'scripts', 'keel-state.mjs'), ...args], { cwd: dir, encoding: 'utf8' });
  assert.equal(run('init', '--key', 'APP-1', '--slug', 'login', '--title', 'Login').status, 0);
  const next = () => JSON.parse(run('next').stdout);
  const stored = () => JSON.parse(readFileSync(join(dir, 'keel/features/APP-1-login/state.json'), 'utf8'));
  return { dir, run, next, stored, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const planned = JSON.stringify({ components: { app: ['src/app/**'], api: { globs: ['src/api/**'], planned: true } } });

test('triage: a planned component without files makes the level with-design', () => {
  const repo = triageRepo({ 'src/app/main.js': 'export const a = 1;\n', 'keel/architecture.json': planned });
  try {
    const triggers = repo.next().triage.designTriggers;
    assert.equal(triggers.length, 1);
    assert.match(triggers[0], /planned component without files: api/);
    const refused = repo.run('level', 'standard', '--by', 'Ana');
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /planned component without files: api/);
    assert.match(refused.stderr, /with-design/);
    assert.match(repo.run('level', 'trivial', '--by', 'Ana').stderr, /with-design/);
    assert.match(repo.run('level', 'foo', '--by', 'Ana').stderr, /invalid level "foo"/);
    assert.match(repo.run('level', 'standard').stderr, /--by/);
    const accepted = repo.run('level', 'with-design', '--by', 'Ana');
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.deepEqual(repo.stored().steps.triage.designTriggers, triggers);
    assert.equal(repo.run('advance').status, 0);
    assert.equal(repo.next().triage, undefined);
    assert.match(repo.run('level', 'standard', '--by', 'Ana').stderr, /only in phase triage/);
  } finally {
    repo.cleanup();
  }
});

test('triage: without automatic triggers every level is accepted as before', () => {
  for (const extra of [{}, { 'keel/architecture.json': '{ not json' }]) {
    const repo = triageRepo({ 'src/app/main.js': 'export const a = 1;\n', ...extra });
    try {
      assert.deepEqual(repo.next().triage.designTriggers, []);
      const accepted = repo.run('level', 'standard', '--by', 'Ana');
      assert.equal(accepted.status, 0, accepted.stderr);
      assert.deepEqual(repo.stored().steps.triage.designTriggers, []);
    } finally {
      repo.cleanup();
    }
  }
});
