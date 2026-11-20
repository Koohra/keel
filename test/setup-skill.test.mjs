import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, read } from './helpers.mjs';

const skill = read('skills/setup/SKILL.md');

test('setup skill has frontmatter with name and a description of when to use it', () => {
  const front = skill.match(/^---\n([\s\S]+?)\n---\n/);
  assert.ok(front, 'no frontmatter');
  assert.match(front[1], /^name: setup$/m);
  assert.match(front[1], /^description: .{40,1024}$/m);
});

test('setup skill only calls scripts and templates that exist', () => {
  const refs = [...skill.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+)/g)].map((m) => m[1]);
  assert.ok(refs.includes('scripts/keel-context.mjs') && refs.includes('scripts/arch-check.mjs'));
  for (const ref of refs) assert.ok(existsSync(join(root, ref)), `does not exist: ${ref}`);
});

test('setup skill carries the guarantees agreed with the dev', () => {
  for (const rule of [
    /revis[ãa]o .*sem alterar/i,
    /nunca crie (um )?CLAUDE\.md/i,
    /s[óo] move e remove/i,
    /restructure-check/,
    /padr[ãa]o [ée] "?n[ãa]o"?/i,
    /viola[çc][ãa]o plantada/i,
    /--write-baseline/,
  ]) assert.match(skill, rule);
});
