import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, read, listFiles } from './helpers.mjs';
import { checkDoc, kindOf } from '../plugins/keel-docs/scripts/doc-check.mjs';
import { validateRequirements } from '../scripts/validate-feature.mjs';
import { requirementsDoc, designDoc } from './fixtures.mjs';

const script = join(root, 'plugins', 'keel-docs', 'scripts', 'doc-check.mjs');
const stories = listFiles().filter((f) => /^keel\/features\/KEEL-[^/]+\/requirements\.md$/.test(f));

function adrDoc() {
  return `# ADR-007 — Banco de dados

## Status
Proposed

## Context
Precisamos guardar inscrições. [source: APP-1]

## Decision
Vamos usar PostgreSQL.

## Consequences
- Mais um serviço para operar.

## Confirmation
not applicable
`;
}

function productDoc(extraLines = 0) {
  const filler = Array.from({ length: extraLines }, (_, i) => `- capacidade ${i} [source: dev on 2026-11-21]`).join('\n');
  return `# App — produto

## Vision
App de inscrições. [source: dev on 2026-11-21]

## What it does
- Inscreve alunos. [source: APP-1]
${filler}

## What it does not do
- Pagamento.

## Glossary
| Term | Meaning |
|---|---|
| Inscrição | Vaga de um aluno numa turma |

## Decisions
- [ADR-001](adrs/ADR-001-banco.md) Banco de dados.

## Engineering principles
1. Sem ciclos entre módulos. [hook]
`;
}

test('kind comes from the file name and folder', () => {
  assert.equal(kindOf('keel/product.md'), 'product');
  assert.equal(kindOf('keel/adrs/ADR-001-banco.md'), 'adr');
  assert.equal(kindOf('keel/adrs/adr-1.md'), 'adr');
  assert.equal(kindOf('keel/features/APP-1-login/requirements.md'), 'requirements');
  assert.equal(kindOf('keel/features/APP-1-login/design.md'), 'design');
  assert.equal(kindOf('README.md'), null);
});

test('clean documents of the four kinds pass', () => {
  assert.deepEqual(checkDoc('product', 'keel/product.md', productDoc()).errors, []);
  assert.deepEqual(checkDoc('adr', 'keel/adrs/ADR-007-banco.md', adrDoc()).errors, []);
  assert.deepEqual(checkDoc('requirements', 'requirements.md', requirementsDoc()).errors, []);
  assert.deepEqual(checkDoc('design', 'design.md', designDoc()).errors, []);
});

test('AC-3.1: a rule without [source:] is reported by id', () => {
  const doc = requirementsDoc().replace('THE app SHALL pedir login. [source: APP-1]', 'THE app SHALL pedir login.');
  assert.match(checkDoc('requirements', 'requirements.md', doc).errors.join('\n'), /R2 has no \[source: \.\.\.\]/);
});

test('requirements: EARS, Given/When/Then, missing and empty sections', () => {
  const doc = requirementsDoc()
    .replace('R3. WHILE', 'R3. Quando')
    .replace('AC-1.1 GIVEN deslogado WHEN clica THEN vê o consentimento', 'AC-1.1 clica e vê')
    .replace('## Out of scope\n- Pagamento.\n', '')
    .replace('## Conflicts found\n- Nenhum.\n', '## Conflicts found\n\n');
  const errors = checkDoc('requirements', 'requirements.md', doc).errors.join('\n');
  assert.match(errors, /R3 does not follow EARS/);
  assert.match(errors, /AC-1\.1 is not GIVEN\/WHEN\/THEN/);
  assert.match(errors, /missing section "Out of scope"/);
  assert.match(errors, /section "Conflicts found" is empty; write "not applicable"/);
});

test('a placeholder line left from the template is reported', () => {
  const doc = requirementsDoc().replace('- Pagamento.', '- <what this story does not do, even if it looks close>');
  assert.match(checkDoc('requirements', 'requirements.md', doc).errors.join('\n'), /template text left: "- <what this story/);
});

test('AC-3.2: product.md above about 200 lines fails and cites the limit', () => {
  const { errors } = checkDoc('product', 'keel/product.md', productDoc(200));
  assert.match(errors.join('\n'), /about 200 lines/);
  assert.deepEqual(checkDoc('product', 'keel/product.md', productDoc(150)).errors, []);
});

test('requirements above about one page is a warning, not an error', () => {
  const long = requirementsDoc().replace('- Edge cases: nenhum.', Array.from({ length: 120 }, () => '- x').join('\n'));
  const result = checkDoc('requirements', 'requirements.md', long);
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings.join('\n'), /about one page/);
});

test('AC-3.3: ADR without Confirmation or with a wrong file name fails', () => {
  const noConfirmation = adrDoc().replace(/## Confirmation\nnot applicable\n/, '');
  assert.match(checkDoc('adr', 'keel/adrs/ADR-007-banco.md', noConfirmation).errors.join('\n'), /missing section "Confirmation"/);
  assert.match(checkDoc('adr', 'keel/adrs/adr-1.md', adrDoc()).errors.join('\n'), /ADR-NNN-<slug>\.md/);
});

test('open [QUESTION] markers are counted and reported, not errors', () => {
  const doc = requirementsDoc().replace('- Nenhuma pergunta.', '- [QUESTION] a? — recommended option: b');
  const result = checkDoc('requirements', 'requirements.md', doc);
  assert.deepEqual(result.errors, []);
  assert.equal(result.questions, 1);
});

test('doc-check agrees with validate-feature on EARS and Given/When/Then', () => {
  const broken = requirementsDoc().replace('R2. IF', 'R2. Quando').replace('AC-3.1 GIVEN offline WHEN abre THEN', 'AC-3.1 offline abre');
  const ours = checkDoc('requirements', 'requirements.md', broken).errors.filter((e) => /EARS|GIVEN/.test(e));
  const keel = validateRequirements(broken).filter((e) => /EARS|GIVEN/.test(e));
  assert.deepEqual(ours, keel);
});

test('AC-3.4: the KEEL-* stories pass by CLI and no file changes', () => {
  assert.ok(stories.length >= 7, `${stories.length} stories`);
  const hash = () => stories.map((f) => createHash('sha256').update(readFileSync(join(root, f))).digest('hex')).join();
  const before = hash();
  const run = spawnSync(process.execPath, [script, ...stories], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /requirements\.md: ok/);
  assert.equal(hash(), before);
});

test('CLI exits 1 with the errors and 2 for an unknown kind or missing file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-docs-'));
  try {
    mkdirSync(join(dir, 'keel', 'adrs'), { recursive: true });
    writeFileSync(join(dir, 'keel', 'adrs', 'adr-1.md'), adrDoc());
    const bad = spawnSync(process.execPath, [script, 'keel/adrs/adr-1.md'], { cwd: dir, encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /adr-1\.md: 1 error/);
    writeFileSync(join(dir, 'README.md'), '# x\n');
    assert.equal(spawnSync(process.execPath, [script, 'README.md'], { cwd: dir, encoding: 'utf8' }).status, 2);
    assert.equal(spawnSync(process.execPath, [script, 'keel/product.md'], { cwd: dir, encoding: 'utf8' }).status, 2);
    assert.equal(spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' }).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('review: the Keel product.md and ADRs pass doc-check', () => {
  const docs = ['keel/product.md', ...listFiles().filter((f) => /^keel\/adrs\/ADR-.*\.md$/.test(f))];
  for (const f of docs) assert.deepEqual(checkDoc(kindOf(f), f, read(f)).errors, [], f);
});

test('review: template prose copied verbatim is a leftover, except the principles section', () => {
  const adr = read('plugins/keel-docs/templates/adr.md').replace(/^# .*$/m, '# ADR-001 — Banco').replace(/^Proposed \|.*$/m, 'Proposed');
  const errors = checkDoc('adr', 'keel/adrs/ADR-001-banco.md', adr).errors.join('\n');
  assert.match(errors, /template text left: "O problema e as forças/);
  assert.match(errors, /template text left: "Vamos|template text left: "O que fica decidido/);
  const req = requirementsDoc().replace('> Quero entrar com Google.', '> Texto da história copiado sem edição.')
    .replace('Dev entra com Google. [source: APP-1]', 'Dev entra com Google. [source: ...]');
  const reqErrors = checkDoc('requirements', 'requirements.md', req).errors.join('\n');
  assert.match(reqErrors, /template text left: "> Texto da história/);
  assert.match(reqErrors, /literal \[source: \.\.\.\]/);
  const product = productDoc() + read('templates/principles.md').split('## Engineering principles')[1];
  assert.deepEqual(checkDoc('product', 'keel/product.md', product).errors, []);
});

test('review: malformed lines, duplicated ids and AC under another rule, same messages as validate-feature', () => {
  const broken = requirementsDoc().replace('R2. IF', 'R1. IF').replace('AC-3.1', 'AC-9.1').replace('R3. WHILE', 'R3 WHILE');
  const ours = checkDoc('requirements', 'requirements.md', broken).errors.filter((e) => !/source|template|section/.test(e));
  assert.deepEqual(ours, validateRequirements(broken).filter((e) => !/section|frozen/.test(e)));
  assert.ok(ours.some((e) => /duplicated/.test(e)) && ours.some((e) => /malformed/.test(e)));
});

test('review: the CLI checks every file even after an unknown or missing one', () => {
  const run = spawnSync(process.execPath, [script, 'README.md', 'keel/product.md'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stdout, /keel\/product\.md: ok/);
});

test('review: kind detection only takes ADR-*.md and keel/product.md; multi-line comment is empty', () => {
  assert.equal(kindOf('keel/adrs/README.md'), null);
  assert.equal(kindOf('keel/adrs/adr-notes.txt'), null);
  assert.equal(kindOf('docs/product.md'), null);
  const doc = requirementsDoc().replace('## Conflicts found\n- Nenhum.\n', '## Conflicts found\n<!--\nnada\n-->\n');
  assert.match(checkDoc('requirements', 'requirements.md', doc).errors.join('\n'), /"Conflicts found" is empty/);
});
