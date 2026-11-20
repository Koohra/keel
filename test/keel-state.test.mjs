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
    'design.md': level === 'com-design' ? designDoc() : null,
  };
}

// Leva uma história nova até a fase pedida pelo caminho válido.
function walkTo(target, level = 'padrao', docs = docsFor(level)) {
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
      if (level === 'com-design') state = approve(state, 'design.md', 'Ana', docs, workflow, now);
    },
  };
  while (state.phase !== target) {
    steps[state.phase]?.();
    state = advance(state, workflow, docs, now).state;
  }
  return state;
}

test('história nova começa na triagem e next diz o que falta', () => {
  const state = newState({ ...story, now });
  assert.equal(state.story.folder, 'keel/features/APP-1-login');
  const next = nextStep(state, workflow, docsFor('padrao'));
  assert.equal(next.phase, 'triage');
  assert.equal(next.instructions, 'phases/triage.md');
  assert.deepEqual(next.missing.map((m) => m.criterion), ['approval:level']);
});

test('advance recusa sem mudar o estado quando falta critério', () => {
  const state = newState({ ...story, now });
  const result = advance(state, workflow, docsFor('padrao'), now);
  assert.equal(result.state, undefined);
  assert.deepEqual(result.missing.map((m) => m.criterion), ['approval:level']);
  assert.equal(state.phase, 'triage');
});

test('pergunta aberta impede sair de requirements', () => {
  const docs = docsFor('padrao');
  docs['requirements.md'] = docs['requirements.md'].replace('- Nenhuma pergunta.', '- [PERGUNTA] qual escopo?');
  const state = walkTo('requirements', 'padrao', docs);
  const result = advance(state, workflow, docs, now);
  assert.deepEqual(result.missing.map((m) => m.criterion), ['noOpenQuestions']);
});

test('nível padrão pula design e chega a closing; closing recusa sem verificador', () => {
  const impl = walkTo('implementation');
  assert.equal(impl.steps.requirements.approvedBy, 'Ana');
  assert.equal(impl.steps.requirements.hash, approvalHash(requirementsDoc()));
  assert.equal(impl.steps.design.approved, false);
  const docs = docsFor('padrao');
  assert.deepEqual(advance(impl, workflow, docs, now).missing.map((m) => m.criterion), ['tasks:all-done']);
  docs['tasks.md'] = docs['tasks.md'].replaceAll('Status: pendente', 'Status: feita (abc1234)');
  const closing = advance(impl, workflow, docs, now).state;
  assert.equal(closing.phase, 'closing');
  const refused = advance(closing, workflow, docs, now);
  assert.match(refused.missing[0].reason, /verificador ainda não existe \(parte 6\)/);
});

test('nível com-design passa por design e exige aprovar design.md', () => {
  const docs = docsFor('com-design');
  const state = walkTo('design', 'com-design', docs);
  const inTasks = advance(state, workflow, docs, now).state;
  assert.equal(inTasks.phase, 'tasks');
  const onlyTasks = approve(inTasks, 'tasks.md', 'Ana', docs, workflow, now);
  assert.deepEqual(advance(onlyTasks, workflow, docs, now).missing.map((m) => m.criterion), ['approval:design.md?']);
});

test('nível trivial pula requisitos, confirmação e design; tasks trazem o critério em Cobre:', () => {
  const tasks = tasksDoc().replace('Cobre: R1 (AC-1.1)', 'Cobre: GIVEN deslogado WHEN clica THEN vê o consentimento');
  const docs = { 'requirements.md': null, 'design.md': null, 'tasks.md': tasks };
  const state = walkTo('tasks', 'trivial', docs);
  assert.equal(state.steps.requirements.approved, false);
  const approved = approve(state, 'tasks.md', 'Ana', docs, workflow, now);
  assert.equal(advance(approved, workflow, docs, now).state.phase, 'implementation');
});

test('approve só na fase do portão e com documento válido', () => {
  const docs = docsFor('padrao');
  const inRequirements = walkTo('requirements');
  assert.throws(() => approve(inRequirements, 'requirements.md', 'Ana', docs, workflow, now), /portão de requirements\.md é da fase confirmation/);
  const inConfirmation = walkTo('confirmation');
  const invalid = { ...docs, 'requirements.md': docs['requirements.md'].replace('## Objetivo', '## Meta') };
  assert.throws(() => approve(inConfirmation, 'requirements.md', 'Ana', invalid, workflow, now), /falta a seção "Objetivo"/);
  assert.throws(() => approve(inConfirmation, 'requirements.md', '', docs, workflow, now), /--by/);
});

test('level e generated só na fase certa e com valor conhecido', () => {
  const state = newState({ ...story, now });
  assert.throws(() => setLevel(state, 'grande', 'Ana', now), /trivial, padrao, com-design/);
  assert.throws(() => setLevel(walkTo('reading'), 'trivial', 'Ana', now), /só na fase triage/);
  assert.throws(() => recordGenerated(state, 'repo-map', now), /só na fase reading/);
});

test('aprovação vencida volta a história para a fase do portão', () => {
  const docs = docsFor('padrao');
  const state = walkTo('implementation', 'padrao', docs);
  const changed = { ...docs, 'requirements.md': docs['requirements.md'].replace('mostrar aviso', 'mostrar banner') };
  const { state: back, expired } = reconcile(state, workflow, changed);
  assert.deepEqual(expired, ['requirements.md']);
  assert.equal(back.phase, 'confirmation');
  assert.equal(back.steps.requirements.approved, false);
  assert.equal(back.steps.tasks.approved, true);
  assert.deepEqual(nextStep(state, workflow, changed).expired, ['requirements.md']);
});

test('status, evidência, notas e CRLF não vencem a aprovação', () => {
  const docs = docsFor('padrao');
  const state = walkTo('implementation', 'padrao', docs);
  const progressed = docs['tasks.md']
    .replace('Status: pendente', 'Status: feita (abc1234)')
    .replace('Evidência RED: —', 'Evidência RED: `npm test` falhou')
    .replace('Aprovado por Ana em 2026-11-20', 'Aprovado por Bia em 2026-11-21')
    .replace('- Nenhuma.\n\n## Conv', '- Aprendi algo.\n\n## Conv')
    .replace('|---|---|---|\n', '|---|---|---|\n| R1 | T1 | atendida |\n')
    .replaceAll('\n', '\r\n');
  const { expired } = reconcile(state, workflow, { ...docs, 'tasks.md': progressed });
  assert.deepEqual(expired, []);
  assert.notEqual(approvalHash(docs['tasks.md']), approvalHash(docs['tasks.md'].replace('T2 — Sessão', 'T2 — Logout')));
});

test('todo critério do workflow.json tem verificador ou parte futura declarada', () => {
  const ctx = { state: newState({ ...story, now }), docs: docsFor('padrao') };
  for (const phase of workflow.phases) {
    for (const criterion of phase.exit ?? []) {
      const result = evaluate(criterion, ctx);
      assert.ok(!/critério desconhecido/.test(result.reason ?? ''), `${phase.id}: ${criterion}`);
    }
  }
  assert.match(evaluate('foo:bar', ctx).reason, /critério desconhecido/);
});

test('CLI grava state.json e recusa avançar com código 1', () => {
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
    assert.equal(run('level', 'padrao', '--by', 'Ana').status, 0);
    const moved = run('advance', '--story', 'keel/features/APP-1-login');
    assert.equal(moved.status, 0, moved.stderr);
    assert.equal(JSON.parse(run('next').stdout).phase, 'reading');
    assert.equal(run('frobnicate').status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
