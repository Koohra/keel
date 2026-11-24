import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, read, readJson, listFiles, headings } from './helpers.mjs';

const PLUGIN = 'plugins/keel-docs';
const pluginFiles = () => listFiles().filter((f) => f.startsWith(`${PLUGIN}/`));

test('marketplace catalogs keel-docs as a separate plugin in plugins/keel-docs', () => {
  const marketplace = readJson('.claude-plugin/marketplace.json');
  const entry = marketplace.plugins.find((plugin) => plugin.name === 'keel-docs');
  assert.ok(entry, 'keel-docs missing from the marketplace');
  assert.equal(entry.source, `./${PLUGIN}`);
  assert.ok(marketplace.plugins.find((plugin) => plugin.name === 'keel'), 'keel still listed');
});

test('keel-docs plugin.json has name, semver version and description', () => {
  const plugin = readJson(`${PLUGIN}/.claude-plugin/plugin.json`);
  assert.equal(plugin.name, 'keel-docs');
  assert.match(plugin.version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/);
  assert.ok(plugin.description.length > 0);
});

test('keel-docs depends on nothing outside its folder and never calls the Keel state script', () => {
  for (const file of pluginFiles()) {
    const text = read(file);
    assert.doesNotMatch(text, /\.\.\/\.\.\/|\.\.\\\.\.\\/, `${file} reaches outside the plugin`);
    assert.doesNotMatch(text, /keel-state\.mjs/, `${file} cites keel-state.mjs`);
  }
});

test('the keel plugin does not depend on keel-docs', () => {
  const keelFiles = listFiles().filter((f) => /^(scripts|skills|hooks|agents|workflow)\//.test(f));
  for (const file of keelFiles) assert.doesNotMatch(read(file), /keel-docs/, file);
});

test('requirements.md and design.md templates are byte-identical to the Keel ones', () => {
  for (const name of ['requirements.md', 'design.md']) {
    assert.equal(read(`${PLUGIN}/templates/${name}`), read(`templates/${name}`), `${name} drifted from templates/`);
  }
});

test('ADR template has the Nygard sections plus Confirmation', () => {
  const found = headings(read(`${PLUGIN}/templates/adr.md`));
  assert.match(found[0], /^# ADR-NNN — /);
  for (const heading of ['## Status', '## Context', '## Decision', '## Consequences', '## Confirmation']) {
    assert.ok(found.includes(heading), `adr.md: missing "${heading}"`);
  }
});

test('product.md template has the product sections and ends with the Keel principles template', () => {
  const text = read(`${PLUGIN}/templates/product.md`);
  const found = headings(text);
  for (const heading of ['## Vision', '## What it does', '## What it does not do', '## Glossary', '## Decisions', '## Engineering principles']) {
    assert.ok(found.includes(heading), `product.md: missing "${heading}"`);
  }
  assert.ok(text.endsWith(read('templates/principles.md')), 'principles section drifted from templates/principles.md');
});

const SKILL = `${PLUGIN}/skills/write`;

test('write skill has frontmatter with name, when-to-use description and only the doc-check allowed', () => {
  const front = read(`${SKILL}/SKILL.md`).match(/^---\n([\s\S]+?)\n---\n/);
  assert.ok(front, 'no frontmatter');
  assert.match(front[1], /^name: write$/m);
  assert.match(front[1], /^description: .{40,1024}$/m);
  assert.match(front[1], /^allowed-tools: Bash\(node "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/doc-check\.mjs" \*\)$/m);
});

test('write skill cites guides relative to the skill and plugin files by <plugin>', () => {
  const texts = [`${SKILL}/SKILL.md`, ...['product', 'adr', 'requirements', 'design'].map((g) => `${SKILL}/guides/${g}.md`)];
  let varLines = 0;
  for (const file of texts) {
    const body = read(file).replace(/^---\n[\s\S]*?\n---\n/, '');
    for (const line of body.split('\n').filter((l) => /\$\{CLAUDE_(PLUGIN_ROOT|SKILL_DIR)\}/.test(l))) {
      assert.ok(file === `${SKILL}/SKILL.md` && /^Caminhos:/.test(line), `${file}: Claude Code variable outside the "Caminhos" line: ${line}`);
      varLines += 1;
    }
    assert.doesNotMatch(body, /`(templates|scripts)\//, `${file}: plugin files always carry <plugin>/`);
    for (const [, ref] of body.matchAll(/<plugin>\/([\w./-]+)/g)) assert.ok(existsSync(join(root, SKILL, '..', '..', ref)), `${file}: <plugin>/${ref}`);
    for (const [, ref] of body.matchAll(/`(guides\/[\w.-]+\.md)`/g)) assert.ok(existsSync(join(root, SKILL, ref)), `${file}: ${ref}`);
  }
  assert.equal(varLines, 1, 'SKILL.md has one "Caminhos" line');
  const skill = read(`${SKILL}/SKILL.md`);
  assert.match(skill, /^Caminhos: `<plugin>` é a pasta do plugin: no Claude Code, `\$\{CLAUDE_PLUGIN_ROOT\}`; em outro agente, a pasta dois níveis acima deste SKILL\.md\./m);
  for (const g of ['product', 'adr', 'requirements', 'design']) assert.ok(skill.includes(`\`guides/${g}.md\``), g);
  assert.ok(skill.includes('<plugin>/scripts/doc-check.mjs'));
});

test('write skill carries the agreed limits: no code, no approval, no state, sources and one question at a time', () => {
  const skill = read(`${SKILL}/SKILL.md`);
  for (const rule of [
    /n[ãa]o escreva (nem edite )?c[óo]digo/i,
    /state\.json/,
    /n[ãa]o aprov/i,
    /Status: draft/,
    /keel:story/,
    /\[source: /,
    /\[QUESTION\]/,
    /uma (pergunta|coisa) por vez/i,
    /s[óo] o guia/i,
  ]) assert.match(skill, rule);
});

test('keel-docs evals: triggering cases that call write and that do not, plus writing and refusal cases', () => {
  const files = pluginFiles().filter((f) => f.startsWith(`${PLUGIN}/evals/`));
  const cases = [...new Set(files.filter((f) => /\/(prompt\.md|case\.yaml)$/.test(f)).map((f) => f.replace(/\/[^/]+$/, '')))];
  for (const c of cases) assert.ok(files.some((f) => f.startsWith(`${c}/graders/`) && f.endsWith('.md')), `${c} has no grader`);
  const trigger = cases.filter((c) => c.includes('/evals/triggering/'));
  const max = (c) => read(`${c}/graders/skill.md`).match(/^max: (\d+)$/m)?.[1];
  assert.ok(trigger.filter((c) => max(c) !== '0').length >= 3, 'cases that call write');
  assert.ok(trigger.filter((c) => max(c) === '0').length >= 3, 'cases that do not call write');
  for (const c of trigger) assert.match(read(`${c}/graders/skill.md`), /keel-docs:\)\?write/, c);
  for (const name of ['requirements-question', 'refuse-approve']) {
    const c = cases.find((x) => x.endsWith(`/writing/${name}`));
    assert.ok(c, name);
    const scaffold = read(`${c}/case.yaml`).match(/scaffold_script: (\S+)/)?.[1];
    assert.ok(scaffold && existsSync(join(root, c, scaffold)), `${c}: scaffold`);
  }
});
