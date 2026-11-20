import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, readJson, headings } from './helpers.mjs';

function assertHeadings(path, expected) {
  const found = headings(read(path));
  for (const heading of expected) assert.ok(found.includes(heading), `${path}: falta "${heading}"`);
}

test('modelo de requirements.md tem todas as seções', () => {
  assertHeadings('templates/requirements.md', [
    '## História original', '## Objetivo', '## Fora de escopo', '## Regras e critérios de aceite',
    '## Obrigações explícitas', '## Perguntas e suposições', '## Conflitos encontrados',
    '## Mudanças após a confirmação',
  ]);
});

test('modelo de requirements.md usa EARS em inglês e IDs R# e AC-#.#', () => {
  const text = read('templates/requirements.md');
  assert.match(text, /^R1\. WHEN .+ THE .+ SHALL /m);
  assert.match(text, /^R2\. IF .+ THEN THE .+ SHALL /m);
  assert.match(text, /AC-1\.1 GIVEN .+ WHEN .+ THEN /);
});

test('modelo de design.md tem todas as seções', () => {
  assertHeadings('templates/design.md', [
    '## Abordagem', '## Mapa de código', '## Contratos e dados', '## Estrutura nova e justificativa',
    '## Alternativas consideradas', '## Preocupações transversais', '## Riscos e quebras de padrão',
    '## Candidata a ADR?',
  ]);
});

test('modelo de tasks.md traz esqueleto andante, campos da task e convergência', () => {
  const text = read('templates/tasks.md');
  assert.match(text, /^## T1 — Esqueleto andante/m);
  for (const field of ['Cobre:', 'Arquivos:', 'Teste primeiro:', 'Verificação:', 'Pronto quando:',
    'Depende de:', 'Status:', 'Evidência RED:', 'Evidência GREEN:', 'Review:', 'Sem teste:']) {
    assert.ok(text.includes(`\n${field}`), `falta o campo ${field}`);
  }
  assertHeadings('templates/tasks.md', ['## Notas de implementação', '## Convergência (preenchida no fim, conferida por script)']);
});

test('modelo de princípios tem no máximo 10 regras, cada uma [hook] ou [review]', () => {
  const text = read('templates/principles.md');
  assertHeadings('templates/principles.md', ['## Princípios de engenharia', '### Degraus por módulo', '### Exemplares e o que não copiar', '### Checagem']);
  const rules = text.split(/^## Princípios de engenharia$/m)[1].split('\n### ')[0].split(/\n(?=\d+\. )/).slice(1);
  assert.ok(rules.length > 0 && rules.length <= 10, `regras: ${rules.length}`);
  for (const rule of rules) assert.match(rule, /\[(hook|review)\]/, rule);
});

test('modelo de architecture.json tem componentes, regras com correção, ciclos e baseline', () => {
  const arch = readJson('templates/architecture.json');
  assert.ok(Object.keys(arch.components).length > 0);
  for (const rule of arch.rules) {
    assert.ok(rule.name && rule.from && Array.isArray(rule.forbid) && rule.fix, JSON.stringify(rule));
    assert.ok(rule.from in arch.components, `componente desconhecido: ${rule.from}`);
  }
  assert.ok(Array.isArray(arch.noCycles));
  assert.equal(typeof arch.baseline, 'string');
});
