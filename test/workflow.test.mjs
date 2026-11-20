import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './helpers.mjs';

const workflow = readJson('workflow/workflow.json');
const byId = Object.fromEntries(workflow.phases.map((phase) => [phase.id, phase]));

test('workflow.json lista as fases na ordem da especificação', () => {
  assert.equal(workflow.schema, 1);
  assert.deepEqual(workflow.phases.map((phase) => phase.id), [
    'triage', 'reading', 'requirements', 'confirmation', 'design',
    'tasks', 'implementation', 'closing', 'done',
  ]);
});

test('toda fase antes de done tem instruções e critério de saída', () => {
  for (const phase of workflow.phases.filter((p) => p.id !== 'done')) {
    assert.equal(phase.instructions, `phases/${phase.id}.md`, phase.id);
    const exit = phase.exit ?? phase.taskExit;
    assert.ok(Array.isArray(exit) && exit.length > 0, `${phase.id} sem critério de saída`);
  }
});

test('só design é condicional e só implementation libera edição de código', () => {
  const conditional = workflow.phases.filter((p) => 'skipUnless' in p).map((p) => p.id);
  assert.deepEqual(conditional, ['design']);
  assert.equal(byId.design.skipUnless, 'level=com-design');
  const editable = workflow.phases.filter((p) => p.allowSourceEdits === true).map((p) => p.id);
  assert.deepEqual(editable, ['implementation']);
});

test('implementation repete por task e exige evidência, review e aprovação do commit', () => {
  assert.equal(byId.implementation.loop, 'tasks');
  for (const criterion of ['evidence:red', 'evidence:green', 'checks:passed', 'review:task', 'approval:commit']) {
    assert.ok(byId.implementation.taskExit.includes(criterion), criterion);
  }
});

test('portões do dev ficam nas fases certas', () => {
  assert.ok(byId.triage.exit.includes('approval:level'));
  assert.ok(byId.confirmation.exit.includes('approval:requirements.md'));
  assert.ok(byId.tasks.exit.includes('approval:tasks.md'));
});
