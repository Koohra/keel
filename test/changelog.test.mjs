import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { read, readJson, root } from './helpers.mjs';

const changelog = read('CHANGELOG.md');
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('changelog: every story in keel/features has an entry', () => {
  const keys = readdirSync(join(root, 'keel/features'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name.match(/^(KEEL-\d+)-/)?.[1])
    .filter(Boolean);
  const missing = keys.filter((key) => !new RegExp(`^- .*\\b${key}\\b`, 'm').test(changelog));
  assert.deepEqual(missing, [], `stories without a changelog entry: ${missing.join(', ')}`);
});

test('changelog: the manifest version closes Unreleased with compare links', () => {
  const version = readJson('plugin.json').version;
  const versions = [...changelog.matchAll(/^## \[(\d[^\]]*)\] - \d{4}-\d{2}-\d{2}$/gm)].map((match) => match[1]);
  assert.equal(versions[0], version, 'newest section is the manifest version');
  const previous = versions[1];
  assert.ok(previous, 'a previous version exists');
  const base = 'https://github.com/Koohra/keel';
  assert.match(changelog, new RegExp(`^\\[Unreleased\\]: ${escape(`${base}/compare/v${version}...HEAD`)}$`, 'm'));
  assert.match(changelog, new RegExp(`^\\[${escape(version)}\\]: ${escape(`${base}/compare/v${previous}...v${version}`)}$`, 'm'));
});
