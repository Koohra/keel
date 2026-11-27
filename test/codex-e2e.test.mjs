import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.mjs';
import { missingSkills } from '../evals/codex/run.mjs';

test('codex install check names the missing skills', () => {
  const all = '- keel:story: Conduz...\n- keel:setup: Prepara...\n- keel-docs:write: Redige...';
  assert.deepEqual(missingSkills(all), []);
  assert.deepEqual(missingSkills('- keel:story: x\n- keel:setup: y'), ['keel-docs:write']);
  assert.deepEqual(missingSkills(''), ['keel:story', 'keel:setup', 'keel-docs:write']);

  const ci = read('.github/workflows/ci.yml');
  assert.ok(ci.includes('\n  codex:'), 'codex job missing');
  const job = ci.slice(ci.indexOf('\n  codex:'));
  assert.match(job, /os: \[ubuntu-latest, windows-latest\]/);
  assert.match(job, /npm install --global @openai\/codex@\d+\.\d+\.\d+/);
  assert.match(job, /node evals\/codex\/run\.mjs install/);
});
