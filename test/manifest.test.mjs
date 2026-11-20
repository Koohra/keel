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
