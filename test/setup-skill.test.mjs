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

test('setup skill turns the structure findings into suggestions', () => {
  for (const rule of [
    /`commands`/,
    /`sections`/,
    /`emphasis`/,
    /`rules`/,
    /README/,
    /\/doctor prompt-audit/,
  ]) assert.match(skill, rule);
});

test('setup skill is agent-neutral: <plugin> paths, /doctor marked as Claude Code, Codex visibility cases', () => {
  const body = skill.replace(/^---\n[\s\S]*?\n---\n/, '');
  const varLines = body.split('\n').filter((line) => /\$\{CLAUDE_(PLUGIN_ROOT|SKILL_DIR)\}/.test(line));
  assert.equal(varLines.length, 1, 'only the "Caminhos" line names a Claude Code variable');
  assert.match(varLines[0], /^Caminhos: `<plugin>` é a pasta do plugin: no Claude Code, `\$\{CLAUDE_PLUGIN_ROOT\}`; em outro agente, a pasta dois níveis acima deste SKILL\.md\./);
  const refs = [...body.matchAll(/<plugin>\/([\w./-]+)/g)].map((m) => m[1]);
  assert.ok(refs.includes('scripts/keel-context.mjs') && refs.includes('scripts/arch-check.mjs'));
  for (const ref of refs) assert.ok(existsSync(join(root, 'skills/setup/../..', ref)), `does not exist: <plugin>/${ref}`);
  assert.doesNotMatch(body, /`(templates|scripts)\//, 'plugin files always carry <plugin>/');
  for (const line of body.split('\n').filter((l) => l.includes('/doctor'))) assert.match(line, /Claude Code/);
  const visibility = body.match(/^Visibilidade[\s\S]*?(?=\n## )/m)?.[0] ?? '';
  assert.match(visibility, /Codex/);
  assert.match(visibility, /AGENTS\.override\.md/);
  assert.match(visibility, /Só CLAUDE\.md/);
});
