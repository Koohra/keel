import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, read, listFiles } from './helpers.mjs';

test('files use LF and have no BOM', () => {
  for (const file of listFiles()) {
    const bytes = readFileSync(join(root, file));
    assert.ok(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), `${file} tem BOM`);
    assert.ok(!bytes.includes(0x0d), `${file} tem CR`);
  }
});

test('product.md stays within the 200-line budget and has engineering principles', () => {
  const text = read('keel/product.md');
  assert.ok(text.split('\n').length <= 200);
  assert.match(text, /^## Engineering principles$/m);
});

test('ADRs follow ADR-NNN-slug.md and have the Nygard sections with confirmation', () => {
  const adrs = listFiles().filter((file) => file.startsWith('keel/adrs/'));
  assert.ok(adrs.length > 0, 'no ADR');
  for (const file of adrs) {
    assert.match(file, /^keel\/adrs\/ADR-\d{3}-[a-z0-9-]+\.md$/);
    const text = read(file);
    for (const section of ['## Status', '## Context', '## Decision', '## Consequences', '## Confirmation']) {
      assert.ok(text.includes(`\n${section}\n`), `${file}: missing ${section}`);
    }
  }
});
