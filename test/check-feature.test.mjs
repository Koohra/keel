import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync, rmSync, symlinkSync } from 'node:fs';
import { root } from './helpers.mjs';
import { closingRepo } from './story-repo.mjs';

const checkFeature = (repo, ...args) => spawnSync(process.execPath, [join(root, 'scripts', 'check-feature.mjs'), repo.folder, ...args], { cwd: repo.dir, encoding: 'utf8' });

test('a story closed through the flow passes every item (AC-5.1)', () => {
  const repo = closingRepo();
  try {
    repo.close();
    const run = checkFeature(repo);
    assert.equal(run.status, 0, run.stdout + run.stderr);
    for (const item of ['documents', 'state', 'commits', 'scope', 'checks', 'convergence']) assert.match(run.stdout, new RegExp(`^ok +${item}`, 'm'), item);
    assert.match(run.stdout, /^skipped +architecture: no keel\/architecture\.json/m);
    assert.match(run.stdout, /^ok +deltas: none/m);
  } finally {
    repo.cleanup();
  }
});

test('a task commit with a file outside its Files: fails the scope item (AC-5.2)', () => {
  const repo = closingRepo({ extra: { T1: 'src/extra.js' } });
  try {
    repo.close();
    const run = checkFeature(repo);
    assert.equal(run.status, 1);
    assert.match(run.stdout, /^FAIL +scope: T1 \([0-9a-f]+\) changed src\/extra\.js, outside its Files:/m);
  } finally {
    repo.cleanup();
  }
});

test('a story still in closing fails the state item (AC-5.3)', () => {
  const repo = closingRepo();
  try {
    const run = checkFeature(repo);
    assert.equal(run.status, 1);
    assert.match(run.stdout, /^FAIL +state: the story is in phase closing, not done/m);
  } finally {
    repo.cleanup();
  }
});

test('--pr prints the pull request description with rules, evidence per rule and the sections the model fills (AC-6.1)', () => {
  const repo = closingRepo();
  try {
    repo.close();
    const run = checkFeature(repo, '--pr');
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /^# APP-1 — Login$/m);
    assert.match(run.stdout, /^- R1\. WHEN o usuário escolhe Google THE app SHALL abrir o consentimento\./m);
    assert.match(run.stdout, /^\| R1 \| T1 `t1\.test` \([0-9a-f]+\) \| met \|$/m);
    assert.match(run.stdout, /^ok +checks: Tests `node -e 0` exited with 0$/m);
    for (const heading of ['## Requirements', '## Evidence per rule', '## Check', '## Product and ADR deltas', '## Deviations from the spec', '## Scope against the original story']) {
      assert.ok(run.stdout.includes(`\n${heading}`), heading);
    }
  } finally {
    repo.cleanup();
  }
});

test('review fixes: run from another folder, the root comes from the story folder', () => {
  const repo = closingRepo();
  try {
    repo.close();
    const run = spawnSync(process.execPath, [join(root, 'scripts', 'check-feature.mjs'), join(repo.dir, repo.folder)], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stdout + run.stderr);
  } finally {
    repo.cleanup();
  }
});

test('review fixes: two tasks pointing to the same commit with different abbreviations fail', () => {
  const repo = closingRepo();
  try {
    const full = repo.sh('git', ['rev-parse', 'HEAD']);
    repo.setStatus('T2', `done (${full.slice(0, 9)})`);
    repo.setStatus('T3', `done (${full.slice(0, 8)})`);
    const run = checkFeature(repo);
    assert.match(run.stdout, /^FAIL +commits: .*same commit/m);
  } finally {
    repo.cleanup();
  }
});

// On Windows the temp folder comes as a short name (RUNNER~1) and git answers with the long one;
// a symlink gives the same mismatch here. Windows CI covers the real case.
test('review fixes: the story folder through another spelling of the root path', { skip: process.platform === 'win32' }, () => {
  const repo = closingRepo();
  try {
    repo.close();
    symlinkSync(repo.dir, `${repo.dir}-link`);
    const run = spawnSync(process.execPath, [join(root, 'scripts', 'check-feature.mjs'), join(`${repo.dir}-link`, repo.folder)], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stdout + run.stderr);
  } finally {
    rmSync(`${repo.dir}-link`, { force: true });
    repo.cleanup();
  }
});

test('decisions: without architecture.json and without the waiver the architecture item fails; the PR lists the delta by section', () => {
  const repo = closingRepo({ checks: 'Tests: `node -e 0`' });
  try {
    repo.copyConvergence();
    const product = readFileSync(join(repo.dir, 'keel/product.md'), 'utf8');
    repo.write('keel/product.md', product.replace('Tests: `node -e 0`', 'Tests: `node -e 0` · Architecture: não se aplica'));
    repo.ok(repo.state('approve', 'deltas', '--by', 'Ana'));
    repo.ok(repo.state('advance'));
    assert.match(checkFeature(repo, '--pr').stdout, /^- Modified: `keel\/product\.md#Checks`$/m);
    repo.write('keel/product.md', product);
    assert.match(checkFeature(repo).stdout, /^FAIL +architecture: .*Architecture: não se aplica/m);
  } finally {
    repo.cleanup();
  }
});
