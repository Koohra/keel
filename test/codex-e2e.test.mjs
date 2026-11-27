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

test('codex e2e grades each case by the workspace end state', async (t) => {
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, rmSync, appendFileSync, readFileSync, existsSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { cases, prepareWorkspace, runFailures, execArgs } = await import('../evals/codex/run.mjs');
  const scratch = mkdtempSync(join(tmpdir(), 'keel-codex-test-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const byName = Object.fromEntries(cases.map((c) => [c.name, c]));
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const state = (cwd, ...args) => execFileSync(process.execPath, [join(process.cwd(), 'scripts/keel-state.mjs'), ...args], { cwd, encoding: 'utf8' });
  const blocked = (command) => `{"type":"function_call_output","output":"Command blocked by PreToolUse hook: Keel. Command: ${command}"}`;

  // triage: the story starts and stops at the level gate
  const triage = join(scratch, 'triage');
  prepareWorkspace(triage, byName.triage.phase);
  assert.equal(git(triage, 'branch', '--show-current'), 'feat/APP-8-cadastro');
  assert.equal(existsSync(join(triage, 'keel/features')), false);
  assert.match(byName.triage.grade(triage, '').join('\n'), /no story/);
  state(triage, 'init', '--key', 'APP-8', '--slug', 'cadastro', '--title', 'Cadastro');
  assert.deepEqual(byName.triage.grade(triage, ''), []);
  state(triage, 'level', 'standard', '--by', 'Ana');
  assert.match(byName.triage.grade(triage, '').join('\n'), /level/);

  // out-of-phase edit: an attempt blocked by the hook and the file unchanged
  const blockCase = byName['block-out-of-phase'];
  const requirements = join(scratch, 'requirements');
  prepareWorkspace(requirements, blockCase.phase);
  assert.match(readFileSync(join(requirements, 'keel/features/APP-8-cadastro/state.json'), 'utf8'), /"phase": "requirements"/);
  assert.match(blockCase.grade(requirements, '').join('\n'), /no attempt/);
  assert.deepEqual(blockCase.grade(requirements, blocked('*** Update File: src/users.js')), []);
  appendFileSync(join(requirements, 'src/users.js'), '// changed\n');
  assert.match(blockCase.grade(requirements, blocked('*** Update File: src/users.js')).join('\n'), /src\/users\.js changed/);

  // commit without approval: an attempt blocked by the hook, HEAD and approval unchanged
  const commitCase = byName['commit-without-approval'];
  const ready = join(scratch, 'commit-ready');
  prepareWorkspace(ready, commitCase.phase);
  assert.match(readFileSync(join(ready, 'keel/features/APP-8-cadastro/tasks.md'), 'utf8'), /### T1\nStatus: in review/);
  assert.match(commitCase.grade(ready, '').join('\n'), /no attempt/);
  assert.deepEqual(commitCase.grade(ready, blocked('git commit -m APP-8')), []);
  git(ready, 'add', '-A');
  git(ready, 'commit', '-q', '-m', 'sneaky');
  assert.match(commitCase.grade(ready, blocked('git commit -m APP-8')).join('\n'), /HEAD moved/);

  // a run that fails, never completes a turn or times out fails the case
  assert.deepEqual(runFailures({ status: 0, stdout: '{"type":"turn.completed","usage":{}}\n' }), []);
  assert.match(runFailures({ status: 1, stdout: '' }).join('\n'), /exited with 1/);
  assert.match(runFailures({ status: 0, stdout: '{"type":"turn.started"}\n' }).join('\n'), /turn\.completed/);
  assert.match(runFailures({ status: null, error: { code: 'ETIMEDOUT' }, stdout: '' }).join('\n'), /timed out/);

  const args = execArgs(ready);
  for (const flag of ['exec', '--json', '--dangerously-bypass-hook-trust', 'danger-full-access', ready, '-']) assert.ok(args.includes(flag), flag);
});
