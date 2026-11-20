import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './helpers.mjs';

const workflow = readJson('workflow/workflow.json');
const byId = Object.fromEntries(workflow.phases.map((phase) => [phase.id, phase]));

test('workflow.json lists the phases in the order of the specification', () => {
  assert.equal(workflow.schema, 1);
  assert.deepEqual(workflow.phases.map((phase) => phase.id), [
    'triage', 'reading', 'requirements', 'confirmation', 'design',
    'tasks', 'implementation', 'closing', 'done',
  ]);
});

test('every phase before done has instructions and an exit criterion', () => {
  for (const phase of workflow.phases.filter((p) => p.id !== 'done')) {
    assert.equal(phase.instructions, `phases/${phase.id}.md`, phase.id);
    const exit = phase.exit ?? phase.taskExit;
    assert.ok(Array.isArray(exit) && exit.length > 0, `${phase.id} has no exit criterion`);
  }
});

test('trivial skips requirements and confirmation, design only in with-design, only implementation edits code', () => {
  const conditional = workflow.phases.filter((p) => 'skipUnless' in p).map((p) => p.id);
  assert.deepEqual(conditional, ['requirements', 'confirmation', 'design']);
  assert.equal(byId.requirements.skipUnless, 'level=standard,with-design');
  assert.equal(byId.confirmation.skipUnless, 'level=standard,with-design');
  assert.equal(byId.design.skipUnless, 'level=with-design');
  const editable = workflow.phases.filter((p) => p.allowSourceEdits === true).map((p) => p.id);
  assert.deepEqual(editable, ['implementation']);
});

test('implementation loops per task and requires evidence, review and commit approval', () => {
  assert.equal(byId.implementation.loop, 'tasks');
  for (const criterion of ['evidence:red', 'evidence:green', 'checks:passed', 'review:task', 'approval:commit']) {
    assert.ok(byId.implementation.taskExit.includes(criterion), criterion);
  }
});

test('dev gates sit in the right phases', () => {
  assert.ok(byId.triage.exit.includes('approval:level'));
  assert.ok(byId.confirmation.exit.includes('approval:requirements.md'));
  assert.ok(byId.tasks.exit.includes('approval:tasks.md'));
});
