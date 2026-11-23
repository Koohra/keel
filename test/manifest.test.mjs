import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './helpers.mjs';

test('plugin.json declara o plugin keel com versão semver', () => {
  const plugin = readJson('.claude-plugin/plugin.json');
  assert.equal(plugin.name, 'keel');
  assert.match(plugin.version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/);
  assert.ok(plugin.description.length > 0);
});

test('marketplace.json cataloga o plugin da raiz do repo', () => {
  const marketplace = readJson('.claude-plugin/marketplace.json');
  const entry = marketplace.plugins.find((plugin) => plugin.name === 'keel');
  assert.ok(entry, 'plugin keel ausente do catálogo');
  assert.equal(entry.source, './');
});

const manifests = [
  '.claude-plugin/plugin.json',
  'plugin.json',
  'plugins/keel-docs/.claude-plugin/plugin.json',
  'plugins/keel-docs/plugin.json',
];

test('codex: manifesto portátil na raiz de keel e de keel-docs', () => {
  for (const [path, name] of [['plugin.json', 'keel'], ['plugins/keel-docs/plugin.json', 'keel-docs']]) {
    const plugin = readJson(path);
    assert.equal(plugin.name, name, path);
    assert.match(plugin.$schema, /plugin\.schema\.json$/, path);
    assert.ok(plugin.description.length > 0, path);
  }
});

test('codex: marketplace em .agents/plugins cataloga keel e keel-docs', () => {
  const marketplace = readJson('.agents/plugins/marketplace.json');
  assert.equal(marketplace.name, 'keel');
  const sources = Object.fromEntries(marketplace.plugins.map((entry) => [entry.name, entry.source]));
  assert.deepEqual(sources, {
    keel: { source: 'local', path: './' },
    'keel-docs': { source: 'local', path: './plugins/keel-docs' },
  });
  for (const entry of marketplace.plugins) {
    assert.equal(entry.policy.installation, 'AVAILABLE', entry.name);
    assert.ok(entry.policy.authentication, entry.name);
    assert.ok(entry.category, entry.name);
  }
});

test('a versão é a mesma em todos os manifestos', () => {
  const versions = manifests.map((path) => [path, readJson(path).version]);
  const [[, first]] = versions;
  assert.match(first, /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/);
  for (const [path, version] of versions) assert.equal(version, first, path);
});

test('as descrições não prendem o Keel ao Claude Code', () => {
  assert.match(readJson('.claude-plugin/marketplace.json').description, /Claude Code and Codex/);
  for (const path of manifests) {
    assert.doesNotMatch(readJson(path).description, /for Claude Code(?! and Codex)/, path);
  }
});
