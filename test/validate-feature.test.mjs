import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, read, listFiles } from './helpers.mjs';
import { validateRequirements, validateTasks, checkCoverage, openQuestions } from '../scripts/validate-feature.mjs';
import { requirementsDoc, tasksDoc } from './fixtures.mjs';

const script = join(root, 'scripts', 'validate-feature.mjs');

test('requirements.md e tasks.md completos passam', () => {
  assert.deepEqual(validateRequirements(requirementsDoc()), []);
  assert.deepEqual(validateTasks(tasksDoc()), []);
  assert.deepEqual(checkCoverage(tasksDoc(), requirementsDoc()), []);
});

test('requirements.md: seção ausente ou vazia, EARS, AC e IDs', () => {
  const broken = requirementsDoc()
    .replace('## Fora de escopo\n- Pagamento.\n', '')
    .replace('## Conflitos encontrados\n- Nenhum.\n', '## Conflitos encontrados\n\n')
    .replace('R2. IF', 'R2. Quando')
    .replace('  - AC-2.1 GIVEN sessão WHEN expira THEN pede login.\n', '')
    .replace('R3. WHILE', 'R1. WHILE')
    .replace('AC-3.1', 'AC-1.1');
  const errors = validateRequirements(broken).join('\n');
  assert.match(errors, /falta a seção "Fora de escopo"/);
  assert.match(errors, /seção "Conflitos encontrados" vazia/);
  assert.match(errors, /R2 não segue EARS/);
  assert.match(errors, /R2 sem critério de aceite/);
  assert.match(errors, /R1 repetida/);
  assert.match(errors, /AC-1\.1 repetido/);
});

test('requirements.md: AC fora de Given/When/Then ou de outra regra', () => {
  const broken = requirementsDoc().replace('AC-2.1 GIVEN sessão WHEN expira THEN pede login', 'AC-3.9 sessão expira e pede login');
  const errors = validateRequirements(broken).join('\n');
  assert.match(errors, /AC-3\.9 fora de GIVEN\/WHEN\/THEN/);
  assert.match(errors, /AC-3\.9 está sob R2/);
});

test('requirements.md: linha de regra ou AC malformada é apontada, não ignorada', () => {
  const broken = requirementsDoc()
    .replace('R3. WHILE', 'R3 WHILE')
    .replace('  - AC-1.1 GIVEN', '- AC-1.1 GIVEN');
  const errors = validateRequirements(broken).join('\n');
  assert.match(errors, /linha malformada: "R3 WHILE/);
  assert.match(errors, /linha malformada: "- AC-1\.1 GIVEN/);
});

test('openQuestions conta [PERGUNTA] abertas', () => {
  assert.equal(openQuestions(requirementsDoc()), 0);
  assert.equal(openQuestions(requirementsDoc().replace('- Nenhuma pergunta.', '- [PERGUNTA] a?\n- [PERGUNTA] b?')), 2);
});

test('tasks.md: Cobre, teste e comando, status', () => {
  const broken = tasksDoc()
    .replace('Cobre: R2 (AC-2.1)\n', '')
    .replace('Verificação: `npm test`\nPronto quando: expira', 'Verificação: rodar os testes\nPronto quando: expira')
    .replace('Status: pendente\n\n## Notas', 'Status: quase\n\n## Notas');
  const errors = validateTasks(broken).join('\n');
  assert.match(errors, /T2 sem Cobre:/);
  assert.match(errors, /T2: Verificação sem comando entre crases/);
  assert.match(errors, /T4: Status "quase" inválido/);
  const noTest = tasksDoc().replace(/Teste primeiro: .*\n/, '');
  assert.match(validateTasks(noTest).join('\n'), /T1 sem Teste primeiro: nem Sem teste:/);
});

test('tasks.md: dependência inexistente e ciclo', () => {
  const missing = tasksDoc().replace('configuração\nDepende de: T1', 'configuração\nDepende de: T9');
  assert.match(validateTasks(missing).join('\n'), /T4 depende de T9, que não existe/);
  const cycle = tasksDoc().replace('Depende de: —', 'Depende de: T2');
  assert.match(validateTasks(cycle).join('\n'), /ciclo de dependências: T1 → T2 → T1/);
});

test('cobertura: regra sem task com teste e task com regra inexistente', () => {
  const tasks = tasksDoc().replace('Cobre: R3', 'Cobre: R3, R7');
  const requirements = requirementsDoc().replace('## Obrigações', 'R4. THE app SHALL registrar.\n  - AC-4.1 GIVEN a WHEN b THEN c.\n\n## Obrigações');
  const errors = checkCoverage(tasks, requirements).join('\n');
  assert.match(errors, /T3 cobre R7, que não existe/);
  assert.match(errors, /R4 sem task com teste/);
  const onlyNoTest = tasksDoc().replace('Cobre: R1 (AC-1.1)', 'Cobre: R2');
  assert.match(checkCoverage(onlyNoTest, requirementsDoc()).join('\n'), /R1 sem task com teste/);
});

test('as histórias do próprio Keel passam no validador', () => {
  const folders = new Set(listFiles().filter((f) => f.startsWith('keel/features/')).map((f) => f.split('/').slice(0, 3).join('/')));
  assert.ok(folders.size > 0);
  for (const folder of folders) {
    const requirements = read(`${folder}/requirements.md`);
    assert.deepEqual(validateRequirements(requirements), [], folder);
    assert.deepEqual(validateTasks(read(`${folder}/tasks.md`)), [], folder);
    assert.deepEqual(checkCoverage(read(`${folder}/tasks.md`), requirements), [], folder);
  }
});

test('CLI sai com 1 e lista os erros por arquivo', () => {
  const result = spawnSync(process.execPath, [script, 'keel/features/KEEL-1-base'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const dir = mkdtempSync(join(tmpdir(), 'keel-validate-'));
  try {
    writeFileSync(join(dir, 'requirements.md'), requirementsDoc().replace('## Objetivo', '## Meta'));
    writeFileSync(join(dir, 'tasks.md'), tasksDoc());
    const invalid = spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /^requirements\.md: falta a seção "Objetivo"$/m);
    assert.match(invalid.stdout, /^tasks\.md: ok$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const bad = spawnSync(process.execPath, [script, 'keel/features/nao-existe'], { cwd: root, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /requirements\.md ou tasks\.md/);
});
