// Issue #37: a SyntaxError printed by a child process the test runs does not make an assertion RED
// look like a broken test file; a syntax error in the test file itself is still refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storyRepo } from './story-repo.mjs';

const childPrintsSyntaxError = `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('login.test.js abre o consentimento', () => {
  const server = spawnSync(process.execPath, ['-e', 'JSON.parse("corrompido")'], { encoding: 'utf8' });
  process.stderr.write(server.stderr);
  assert.equal(server.stdout, 'consentimento aberto');
});
`;

const brokenTestFile = `import { test } from 'node:test';
import assert from 'node:assert/strict';
test('login.test.js abre o consentimento', () => {
  const = 'consentimento';
  assert.ok(true);
});
`;

function redOf(source) {
  const repo = storyRepo({ verification: 'node --test login.test.mjs' });
  try {
    repo.write('login.test.mjs', source);
    assert.equal(repo.state('task', 'start', 'T1').status, 0);
    const run = repo.state('evidence', 'red');
    return { run, red: repo.read().steps.implementation.red };
  } finally {
    repo.cleanup();
  }
}

test('red: an assertion RED is accepted even when a child process prints SyntaxError (#37)', () => {
  const { run, red } = redOf(childPrintsSyntaxError);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(red.exitCode, 1);
  assert.match(red.output, /AssertionError/);
});

test('red: a syntax error in the test file itself is still refused (#37)', () => {
  const { run, red } = redOf(brokenTestFile);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /wrong reason/);
  assert.equal(red, null);
});
