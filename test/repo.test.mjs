import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, read, listFiles } from './helpers.mjs';

test('arquivos usam LF e não têm BOM', () => {
  for (const file of listFiles()) {
    const bytes = readFileSync(join(root, file));
    assert.ok(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), `${file} tem BOM`);
    assert.ok(!bytes.includes(0x0d), `${file} tem CR`);
  }
});

test('product.md fica dentro do orçamento de 200 linhas e tem princípios de engenharia', () => {
  const text = read('docs/product.md');
  assert.ok(text.split('\n').length <= 200);
  assert.match(text, /^## Princípios de engenharia$/m);
});

test('ADRs seguem ADR-NNN-slug.md e têm as seções do formato Nygard com confirmação', () => {
  const adrs = listFiles().filter((file) => file.startsWith('docs/adrs/'));
  assert.ok(adrs.length > 0, 'nenhuma ADR');
  for (const file of adrs) {
    assert.match(file, /^docs\/adrs\/ADR-\d{3}-[a-z0-9-]+\.md$/);
    const text = read(file);
    for (const section of ['## Status', '## Contexto', '## Decisão', '## Consequências', '## Confirmação']) {
      assert.ok(text.includes(`\n${section}\n`), `${file}: falta ${section}`);
    }
  }
});
