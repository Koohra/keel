import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, readJson, headings } from './helpers.mjs';

function assertHeadings(path, expected) {
  const found = headings(read(path));
  for (const heading of expected) assert.ok(found.includes(heading), `${path}: missing "${heading}"`);
}

test('requirements.md template has every section', () => {
  assertHeadings('templates/requirements.md', [
    '## Original story', '## Goal', '## Out of scope', '## Rules and acceptance criteria',
    '## Explicit obligations', '## Questions and assumptions', '## Conflicts found',
    '## Changes after confirmation',
  ]);
});

test('requirements.md template uses English EARS and R# and AC-#.# IDs', () => {
  const text = read('templates/requirements.md');
  assert.match(text, /^R1\. WHEN .+ THE .+ SHALL /m);
  assert.match(text, /^R2\. IF .+ THEN THE .+ SHALL /m);
  assert.match(text, /AC-1\.1 GIVEN .+ WHEN .+ THEN /);
});

test('design.md template has every section', () => {
  assertHeadings('templates/design.md', [
    '## Approach', '## Code map', '## Contracts and data', '## New structure and rationale',
    '## Alternatives considered', '## Cross-cutting concerns', '## Risks and pattern breaks',
    '## ADR candidate?',
  ]);
});

test('tasks.md template has walking skeleton, task fields and convergence', () => {
  const text = read('templates/tasks.md');
  assert.match(text, /^## T1 — Walking skeleton/m);
  for (const field of ['Covers:', 'Files:', 'Test first:', 'Verification:', 'Done when:',
    'Depends on:', 'Status:', 'RED evidence:', 'GREEN evidence:', 'Review:', 'No test:']) {
    assert.ok(text.includes(`\n${field}`), `missing field ${field}`);
  }
  assertHeadings('templates/tasks.md', ['## Progress', '## Implementation notes', '## Convergence (filled at the end, checked by script)']);
});

test('requirements, design and tasks templates mark the frozen-after-approval block', () => {
  for (const path of ['templates/requirements.md', 'templates/design.md', 'templates/tasks.md']) {
    const text = read(path);
    const start = text.indexOf('\n<!-- frozen after approval: start -->\n');
    const end = text.indexOf('\n<!-- frozen after approval: end -->\n');
    assert.ok(start > 0 && end > start, path);
  }
  const plan = read('templates/tasks.md').split('<!-- frozen after approval: end -->')[0];
  assert.ok(!plan.includes('\nStatus:'), 'Status stays outside the frozen block');
});

test('principles template has at most 10 rules, each [hook] or [review]', () => {
  const text = read('templates/principles.md');
  assertHeadings('templates/principles.md', ['## Engineering principles', '### Rungs per module', '### Exemplars and what not to copy', '### Checks']);
  const rules = text.split(/^## Engineering principles$/m)[1].split('\n### ')[0].split(/\n(?=\d+\. )/).slice(1);
  assert.ok(rules.length > 0 && rules.length <= 10, `rules: ${rules.length}`);
  for (const rule of rules) assert.match(rule, /\[(hook|review)\]/, rule);
});

test('architecture.json template has components, rules with a fix, cycles and baseline', () => {
  const arch = readJson('templates/architecture.json');
  assert.ok(Object.keys(arch.components).length > 0);
  for (const rule of arch.rules) {
    assert.ok(rule.name && rule.from && Array.isArray(rule.forbid) && rule.fix, JSON.stringify(rule));
    assert.ok(rule.from in arch.components, `unknown component: ${rule.from}`);
  }
  assert.ok(Array.isArray(arch.noCycles));
  assert.equal(typeof arch.baseline, 'string');
});

test('AGENTS.md template has the sections in order, points to product.md and fits in 150 lines', () => {
  const text = read('templates/agents.md');
  const order = ['## Commands', '## Conventions', '## Boundaries', '## Done when', '## Pitfalls', '## More details'];
  assert.deepEqual(headings(text).filter((h) => h.startsWith('## ')), order);
  assert.match(text, /`keel\/product\.md`/);
  assert.ok(text.split('\n').length <= 150);
  assert.ok(!text.includes('keel:start'), 'the Keel block is optional and does not come in the template');
});
