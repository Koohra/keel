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

test('stages 5 and 6 have cases: design, plan without approval and approval of design and tasks', () => {
  const tagged = (tag) => cases.filter((c) => existsSync(join(root, c, 'case.yaml')) && read(`${c}/case.yaml`).includes(`tags: [${tag}]`));
  assert.ok(tagged('phase-5').length >= 1, 'phase-5');
  assert.ok(tagged('phase-6').length >= 2, 'phase-6');
});

test('stages 7 to 9 have cases: TDD without commit, commit approved by the dev and denied command (no Bash)', () => {
  const tagged = (tag) => cases.filter((c) => existsSync(join(root, c, 'case.yaml')) && read(`${c}/case.yaml`).includes(`tags: [${tag}]`));
  assert.ok(tagged('phase-7').length >= 2, 'phase-7');
  assert.ok(tagged('phase-9').length >= 1, 'phase-9');
  const noBash = tagged('phase-7').find((c) => !/allowed_tools: \[[^\]]*\bBash\b/.test(read(`${c}/case.yaml`)));
  assert.ok(noBash, 'a phase-7 case without Bash');
});

test('denied command has its own case: only git allowed in Bash, run with --allow-tools "Bash(git *)"', () => {
  const denied = cases.find((c) => c.endsWith('/implementation-denied'));
  assert.ok(denied, 'implementation-denied');
  assert.match(read(`${denied}/case.yaml`), /--allow-tools "Bash\(git \*\)"/);
});
