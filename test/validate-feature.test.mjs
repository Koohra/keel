import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, read, listFiles } from './helpers.mjs';
import {
  validateRequirements, validateDesign, validateTasks, checkCoverage, checkStructure, openQuestions, validateFeature,
} from '../scripts/validate-feature.mjs';
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

test('tasks.md: every task has Files, Done when, Depends on and New structure (AC-1.1)', () => {
  const broken = tasksDoc()
    .replace('Files: `src/session.js`\n', '')
    .replace('Done when: aviso aparece\n', '')
    .replace('Depends on: T1\n\n## T3', '\n## T3')
    .replace('New structure: none\nNo test', 'No test')
    .replace('Test first: `login.test.js` — abre o consentimento', 'Test first: `login.test.js`');
  const errors = validateTasks(broken).join('\n');
  assert.match(errors, /T2 has no Files:/);
  assert.match(errors, /T3 has no Done when:/);
  assert.match(errors, /T2 has no Depends on:/);
  assert.match(errors, /T4 has no New structure:/);
  assert.match(errors, /T1: Test first: needs "<test name> — <what it checks>"/);
});

test('tasks.md: T1 is the walking skeleton (AC-2.1)', () => {
  const renamed = tasksDoc().replace('## T1 — Walking skeleton: botão até o consentimento', '## T1 — Validação de e-mail');
  assert.match(validateTasks(renamed).join('\n'), /T1 must be the walking skeleton: "## T1 — Walking skeleton: <minimal end-to-end path>"/);
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
  const missing = tasksDoc().replace('existe\nDepends on: T1', 'existe\nDepends on: T9');
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

test('coverage: a cited AC must exist in requirements.md (AC-3.1)', () => {
  const tasks = tasksDoc().replace('Covers: R1 (AC-1.1)', 'Covers: R1 (AC-1.1, AC-1.9)');
  assert.match(checkCoverage(tasks, requirementsDoc()).join('\n'), /T1 covers AC-1\.9, which does not exist/);
});

test('coverage: without requirements.md each Covers: carries a GIVEN/WHEN/THEN criterion (AC-3.2)', () => {
  const trivial = tasksDoc().replace('Covers: R1 (AC-1.1)', 'Covers: GIVEN deslogado WHEN clica em Google THEN vê o consentimento')
    .replace('Covers: R2 (AC-2.1)', 'Covers: e-mail com espaço');
  const errors = checkCoverage(trivial, null).join('\n');
  assert.doesNotMatch(errors, /T1/);
  assert.match(errors, /T2: without requirements\.md, Covers: needs the criterion as GIVEN \.\.\. WHEN \.\.\. THEN \.\.\./);
});

test('design.md: Trigger of a known kind (AC-4.1)', () => {
  const errors = validateDesign(designDoc().replace('Trigger: new dependency', 'Trigger: porque sim')).join('\n');
  assert.match(errors, /Trigger: must start with one of: trade-off, contract, data\/migration, new dependency, cross-cutting, pattern break, new structure, rung change/);
  assert.deepEqual(validateDesign(designDoc().replace('Trigger: new dependency', 'Trigger: data/migration — muda onde o usuário é salvo')), []);
});

test('design.md: each new structure row has kind, heuristic and simpler alternative, or the section says none (AC-4.2)', () => {
  const table = '| Element | Kind | Rationale | Simpler alternative and why not |\n|---|---|---|---|\n';
  const bad = designDoc().replace('## New structure and rationale\nNenhuma.', `## New structure and rationale\n${table}| UserStore | interface | ficou mais limpo | — |`);
  const errors = validateDesign(bad).join('\n');
  assert.match(errors, /New structure "UserStore": Rationale needs R# or a heuristic \(2nd implementation, external port, published boundary, 3rd occurrence\)/);
  assert.match(errors, /New structure "UserStore": write the simpler alternative and why not/);
  const badKind = bad.replace('| interface | ficou mais limpo | — |', '| coisa | R1 | usar a classe direto: o fake de teste é a 2nd implementation |');
  assert.match(validateDesign(badKind).join('\n'), /New structure "UserStore": Kind must be one of: interface, layer, mapper\/DTO, module, helper, dependency/);
  const good = bad.replace('| ficou mais limpo | — |', '| 2nd implementation: o fake de teste | usar a classe direto: os testes precisam do fake |');
  assert.deepEqual(validateDesign(good), []);
  const emptyTable = designDoc().replace('## New structure and rationale\nNenhuma.', `## New structure and rationale\n${table}`);
  assert.match(validateDesign(emptyTable).join('\n'), /New structure and rationale: fill the table or write "none"/);
});

test('design.md: ADR candidate answers Yes or No with a reason (AC-4.3)', () => {
  const errors = validateDesign(designDoc().replace('No — local to the story.', 'Talvez')).join('\n');
  assert.match(errors, /ADR candidate\?: write "Yes — <reason>" or "No — <reason>"/);
});

test('design.md: Approach cites rules and every cited rule exists (AC-4.4)', () => {
  assert.match(validateDesign(designDoc().replace('Usa o SDK do Google (R1).', 'Usa o SDK do Google.')).join('\n'), /Approach: cite the rules it meets \(R1, R2\)/);
  const errors = validateDesign(designDoc().replace('(R1)', '(R1, R7)'), requirementsDoc()).join('\n');
  assert.match(errors, /design\.md cites R7, which does not exist in requirements\.md/);
});

function designWith(rows) {
  const table = '| Element | Kind | Rationale | Simpler alternative and why not |\n|---|---|---|---|\n';
  return designDoc().replace('## New structure and rationale\nNenhuma.', `## New structure and rationale\n${table}${rows}`);
}

test('structure: each design.md element is declared by a task (AC-5.1)', () => {
  const design = designWith('| `UserStore` | interface | 2nd implementation: fake de teste | classe direta: testes precisam do fake |');
  assert.match(checkStructure(tasksDoc(), design).join('\n'), /UserStore from design\.md is not declared in any task's New structure:/);
  const declared = tasksDoc().replace('Files: `src/login.js`\nNew structure: none', 'Files: `src/login.js`\nNew structure: `UserStore` (interface)');
  assert.deepEqual(checkStructure(declared, design), []);
});

test('structure: a task declares only structure justified in design.md (AC-5.2)', () => {
  const tasks = tasksDoc().replace('Files: `src/session.js`\nNew structure: none', 'Files: `src/session.js`\nNew structure: EmailValidator (helper), `UserStore` (interface)');
  const design = designWith('| UserStore | interface | R1 | classe direta: R1 exige duas fontes |');
  const errors = checkStructure(tasks, design).join('\n');
  assert.match(errors, /T2: New structure "EmailValidator" is not justified in design\.md/);
  assert.doesNotMatch(errors, /UserStore/);
  assert.deepEqual(checkStructure(tasks, null), [], 'without design.md the task only declares');
  assert.match(validateFeature({ 'requirements.md': requirementsDoc(), 'design.md': design, 'tasks.md': tasks })['tasks.md'].join('\n'), /EmailValidator/);
});

test('review fixes: empty values, AC under the rule, plan without T1, DTO kind', () => {
  const design = designWith('| UserStore | interface | R1 | classe direta: R1 exige duas fontes |');
  const declared = (value) => tasksDoc().replace('Files: `src/login.js`\nNew structure: none', 'Files: `src/login.js`\nNew structure: UserStore (interface)')
    .replace('Files: `src/session.js`\nNew structure: none', `Files: \`src/session.js\`\nNew structure: ${value}`);
  for (const empty of ['nenhuma', '—', 'not applicable']) assert.deepEqual(checkStructure(declared(empty), design), [], empty);
  assert.deepEqual(validateDesign(designDoc().replace('## New structure and rationale\nNenhuma.', '## New structure and rationale\nnot applicable')), []);
  const wrongAc = tasksDoc().replace('Covers: R1 (AC-1.1)', 'Covers: R1 (AC-2.1)');
  assert.match(checkCoverage(wrongAc, requirementsDoc()).join('\n'), /T1 covers AC-2\.1 without covering R2/);
  const noT1 = tasksDoc().replace('## T1 — Walking skeleton: botão até o consentimento', '## T5 — Botão');
  assert.match(validateTasks(noT1).join('\n'), /T1 must be the walking skeleton/);
  const dto = designWith('| UserDto | DTO | published boundary: API pública | objeto do domínio: contrato externo diferente |');
  assert.doesNotMatch(validateDesign(dto).join('\n'), /Kind must be/);
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

test('tasks.md: Files: lists paths in backticks, as the task loop and check-feature read them', () => {
  const tasks = tasksDoc().replace('Files: `src/session.js`', 'Files: src/session.js');
  assert.match(validateTasks(tasks).join('\n'), /T2: Files: put each path or glob in backticks/);
  assert.match(read('templates/tasks.md'), /^Files: `<path>`/m);
});
