import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, read, listFiles } from './helpers.mjs';

const files = listFiles().filter((f) => f.startsWith('evals/') && !f.startsWith('evals/results/'));
const cases = [...new Set(files.filter((f) => /\/(prompt\.md|case\.yaml)$/.test(f)).map((f) => f.replace(/\/[^/]+$/, '')))];

test('acionamento: 8 casos que chamam a skill story e 6 que não chamam', () => {
  const trigger = cases.filter((c) => c.startsWith('evals/acionamento/'));
  const max = (c) => read(`${c}/graders/skill.md`).match(/^max: (\d+)$/m)?.[1];
  assert.equal(trigger.filter((c) => max(c) !== '0').length, 8);
  assert.equal(trigger.filter((c) => max(c) === '0').length, 6);
  for (const c of trigger) assert.match(read(`${c}/graders/skill.md`), /^tool: Skill$/m, c);
});

test('todo caso tem grader e todo scaffold citado existe', () => {
  assert.ok(cases.length >= 18, `${cases.length} casos`);
  for (const c of cases) {
    assert.ok(files.some((f) => f.startsWith(`${c}/graders/`) && f.endsWith('.md')), `${c} sem grader`);
    const scaffold = existsSync(join(root, c, 'case.yaml')) && read(`${c}/case.yaml`).match(/scaffold_script: (\S+)/)?.[1];
    if (scaffold) assert.ok(existsSync(join(root, c, scaffold)), `${c}: falta ${scaffold}`);
  }
});
