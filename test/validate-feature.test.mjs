import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, read, listFiles } from './helpers.mjs';
import { validateRequirements, validateDesign, validateTasks, checkCoverage, openQuestions } from '../scripts/validate-feature.mjs';
import { requirementsDoc, tasksDoc, designDoc } from './fixtures.mjs';

const script = join(root, 'scripts', 'validate-feature.mjs');

test('complete requirements.md and tasks.md pass', () => {
  assert.deepEqual(validateRequirements(requirementsDoc()), []);
  assert.deepEqual(validateDesign(designDoc()), []);
  assert.deepEqual(validateTasks(tasksDoc()), []);
  assert.deepEqual(checkCoverage(tasksDoc(), requirementsDoc()), []);
});

test('requirements.md: missing or empty section, EARS, AC and IDs', () => {
  const broken = requirementsDoc()
    .replace('## Out of scope\n- Pagamento.\n', '')
    .replace('## Conflicts found\n- Nenhum.\n', '## Conflicts found\n\n')
    .replace('R2. IF', 'R2. Quando')
    .replace('  - AC-2.1 GIVEN sessão WHEN expira THEN pede login.\n', '')
    .replace('R3. WHILE', 'R1. WHILE')
    .replace('AC-3.1', 'AC-1.1');
  const errors = validateRequirements(broken).join('\n');
  assert.match(errors, /missing section "Out of scope"/);
  assert.match(errors, /section "Conflicts found" is empty/);
  assert.match(errors, /R2 does not follow EARS/);
  assert.match(errors, /R2 has no acceptance criterion/);
  assert.match(errors, /R1 duplicated/);
  assert.match(errors, /AC-1\.1 duplicated/);
});

test('requirements.md: AC outside Given/When/Then or under another rule', () => {
  const broken = requirementsDoc().replace('AC-2.1 GIVEN sessão WHEN expira THEN pede login', 'AC-3.9 sessão expira e pede login');
  const errors = validateRequirements(broken).join('\n');
  assert.match(errors, /AC-3\.9 is not GIVEN\/WHEN\/THEN/);
  assert.match(errors, /AC-3\.9 is under R2/);
});

test('requirements.md: a malformed rule or AC line is reported, not ignored', () => {
  const broken = requirementsDoc()
    .replace('R3. WHILE', 'R3 WHILE')
    .replace('  - AC-1.1 GIVEN', '- AC-1.1 GIVEN');
  const errors = validateRequirements(broken).join('\n');
  assert.match(errors, /malformed line: "R3 WHILE/);
  assert.match(errors, /malformed line: "- AC-1\.1 GIVEN/);
});

test('openQuestions counts open [QUESTION] markers', () => {
  assert.equal(openQuestions(requirementsDoc()), 0);
  assert.equal(openQuestions(requirementsDoc().replace('- Nenhuma pergunta.', '- [QUESTION] a?\n- [QUESTION] b?')), 2);
});

test('tasks.md: Covers, test and command, status', () => {
  const broken = tasksDoc()
    .replace('Covers: R2 (AC-2.1)\n', '')
    .replace('Verification: `npm test`\nDone when: expira', 'Verification: rodar os testes\nDone when: expira')
    .replace('Status: pending\n\n## Implementation', 'Status: almost\n\n## Implementation');
  const errors = validateTasks(broken).join('\n');
  assert.match(errors, /T2 has no Covers:/);
  assert.match(errors, /T2: Verification has no command in backticks/);
  assert.match(errors, /T4: invalid Status "almost"/);
  const noTest = tasksDoc().replace(/Test first: .*\n/, '');
  assert.match(validateTasks(noTest).join('\n'), /T1 has neither Test first: nor No test:/);
});

test('every document has a frozen-after-approval block, opened and closed', () => {
  const open = '<!-- frozen after approval: start -->\n';
  const close = '<!-- frozen after approval: end -->\n';
  assert.match(validateRequirements(requirementsDoc().replace(open, '')).join('\n'), /frozen block/);
  assert.match(validateDesign(designDoc().replace(close, '')).join('\n'), /frozen block/);
  assert.match(validateTasks(tasksDoc().replace(open, '').replace(close, '')).join('\n'), /frozen block/);
});

test('tasks.md: plan inside the block, progress outside', () => {
  const statusInPlan = tasksDoc().replace('Depends on: —\n', 'Depends on: —\nStatus: green\n');
  assert.match(validateTasks(statusInPlan).join('\n'), /T1: Status: belongs in "Progress", outside the frozen block/);
  const taskOutside = tasksDoc().replace('## Progress', '## T5 — Fora do plano\nCovers: R1\nNo test: x\n\n## Progress');
  assert.match(validateTasks(taskOutside).join('\n'), /T5 is outside the frozen block/);
  const noProgress = tasksDoc().replace('### T3\nStatus: pending\n', '');
  assert.match(validateTasks(noProgress).join('\n'), /T3 has no entry in "Progress"/);
});

test('tasks.md: missing dependency and cycle', () => {
  const missing = tasksDoc().replace('configuração\nDepends on: T1', 'configuração\nDepends on: T9');
  assert.match(validateTasks(missing).join('\n'), /T4 depends on T9, which does not exist/);
  const cycle = tasksDoc().replace('Depends on: —', 'Depends on: T2');
  assert.match(validateTasks(cycle).join('\n'), /dependency cycle: T1 → T2 → T1/);
});

test('coverage: rule without a tested task and task with a missing rule', () => {
  const tasks = tasksDoc().replace('Covers: R3', 'Covers: R3, R7');
  const requirements = requirementsDoc().replace('## Explicit obligations', 'R4. THE app SHALL registrar.\n  - AC-4.1 GIVEN a WHEN b THEN c.\n\n## Explicit obligations');
  const errors = checkCoverage(tasks, requirements).join('\n');
  assert.match(errors, /T3 covers R7, which does not exist/);
  assert.match(errors, /R4 has no task with a test/);
  const onlyNoTest = tasksDoc().replace('Covers: R1 (AC-1.1)', 'Covers: R2');
  assert.match(checkCoverage(onlyNoTest, requirementsDoc()).join('\n'), /R1 has no task with a test/);
});

test("Keel's own stories pass the validator", () => {
  const folders = new Set(listFiles().filter((f) => f.startsWith('keel/features/')).map((f) => f.split('/').slice(0, 3).join('/')));
  assert.ok(folders.size > 0);
  for (const folder of folders) {
    const requirements = read(`${folder}/requirements.md`);
    assert.deepEqual(validateRequirements(requirements), [], folder);
    assert.deepEqual(validateTasks(read(`${folder}/tasks.md`)), [], folder);
    assert.deepEqual(checkCoverage(read(`${folder}/tasks.md`), requirements), [], folder);
  }
});

test('CLI exits with 1 and lists errors per file', () => {
  const result = spawnSync(process.execPath, [script, 'keel/features/KEEL-1-base'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const dir = mkdtempSync(join(tmpdir(), 'keel-validate-'));
  try {
    writeFileSync(join(dir, 'requirements.md'), requirementsDoc().replace('## Goal', '## Aim'));
    writeFileSync(join(dir, 'tasks.md'), tasksDoc());
    const invalid = spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /^requirements\.md: missing section "Goal"$/m);
    assert.match(invalid.stdout, /^tasks\.md: ok$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const bad = spawnSync(process.execPath, [script, 'keel/features/does-not-exist'], { cwd: root, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /requirements\.md or tasks\.md/);
});
