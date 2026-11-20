import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, read, listFiles } from './helpers.mjs';

const files = listFiles().filter((f) => f.startsWith('evals/') && !f.startsWith('evals/results/'));
const cases = [...new Set(files.filter((f) => /\/(prompt\.md|case\.yaml)$/.test(f)).map((f) => f.replace(/\/[^/]+$/, '')))];

test('triggering: 8 cases call the story skill and 6 do not', () => {
  const trigger = cases.filter((c) => c.startsWith('evals/triggering/'));
  const max = (c) => read(`${c}/graders/skill.md`).match(/^max: (\d+)$/m)?.[1];
  assert.equal(trigger.filter((c) => max(c) !== '0').length, 8);
  assert.equal(trigger.filter((c) => max(c) === '0').length, 6);
  for (const c of trigger) assert.match(read(`${c}/graders/skill.md`), /^tool: Skill$/m, c);
});

test('every case has a grader and every cited scaffold exists', () => {
  assert.ok(cases.length >= 18, `${cases.length} cases`);
  for (const c of cases) {
    assert.ok(files.some((f) => f.startsWith(`${c}/graders/`) && f.endsWith('.md')), `${c} has no grader`);
    const scaffold = existsSync(join(root, c, 'case.yaml')) && read(`${c}/case.yaml`).match(/scaffold_script: (\S+)/)?.[1];
    if (scaffold) assert.ok(existsSync(join(root, c, scaffold)), `${c}: missing ${scaffold}`);
  }
});
